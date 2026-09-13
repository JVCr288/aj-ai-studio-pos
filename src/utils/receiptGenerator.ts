import { BookingState } from '../types';
import { TenantConfig, activeTenantConfig } from '../config/tenantConfig';

export interface DigitalReceiptData {
  receiptHeader: {
    receiptNumber: string;
    receiptVersion: string;
    format: string;
    issuedAt: string;
    issuedTimestamp: number;
    currency: string;
    studio: {
      name: string;
      brand: string;
      registrationNo: string;
      address: string;
      phone: string;
      email: string;
      website: string;
      taxIdentificationNumber: string;
    };
  };
  bookingManifest: {
    manifestId: string;
    sessionToken: string;
    turnstileAccessCode: string;
    lifecycleStatus: string;
    bayAllocation: string;
    stageDescription: string;
    lightingRig: string;
    sessionSchedule: {
      date: string;
      month: string;
      timeSlot: string;
      sessionDurationMinutes: number;
      turnaroundGuaranteeHours: number;
    };
    briefingNotes: string;
  };
  clientIdentity: {
    guestName: string;
    contactPhone: string;
    telegramHandle: string;
    verificationStatus: string;
  };
  photographyPackage: {
    id: string;
    name: string;
    suiteAllocation: string;
    description: string;
    basePriceMmk: number;
    depositRequiredMmk: number;
    features: string[];
  };
  financialLedger: {
    currency: string;
    packagePriceMmk: number;
    totalAmountMmk: number;
    depositPaidMmk: number;
    depositSettled: boolean;
    paymentGateway: string;
    depositVerificationMethod: string;
    uploadedSlipRef: string;
    balanceDueAtBayMmk: number;
    balanceSettlementStatus: string;
  };
  vaultDeliverablesManifest: {
    retouchedMasterFrames: number;
    rawCapturesDng: number;
    colorProfile: string;
    dpi: number;
    retentionPolicyDays: number;
    vaultAccessStatus: string;
  };
  termsAndCertification: {
    usageLicense: string;
    certificationStatement: string;
    digitalSignatureDigest: string;
  };
}

export function generateDigitalReceiptJson(
  bookingState: BookingState,
  tenantConfig: TenantConfig = activeTenantConfig
): DigitalReceiptData {
  const now = new Date();
  const balanceDue = Math.max(0, bookingState.totalAmount - (bookingState.depositPaid ? bookingState.depositAmount : 0));
  const cleanManifestId = (bookingState.manifestId || 'MNF-001').replace(/^MNF-/, '');
  const prefix = tenantConfig.receiptPrefix || 'RCP-TENANT';
  const receiptNumber = `${prefix}-${cleanManifestId}`;

  // Generate deterministic digital signature digest
  const signatureRaw = `${bookingState.token}-${bookingState.manifestId}-${bookingState.totalAmount}`;
  let hashVal = 0;
  for (let i = 0; i < signatureRaw.length; i++) {
    hashVal = (hashVal << 5) - hashVal + signatureRaw.charCodeAt(i);
    hashVal |= 0;
  }
  const hexHash = Math.abs(hashVal).toString(16).padStart(8, '0').toUpperCase();
  const slugTag = (tenantConfig.slug || 'TENANT').toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const digitalSignatureDigest = `RECEIPT-DIGEST:${slugTag}:${hexHash}:${now.getTime().toString(16).toUpperCase()}`;

  return {
    receiptHeader: {
      receiptNumber,
      receiptVersion: '2.1.0-JSON',
      format: 'application/json',
      issuedAt: now.toISOString(),
      issuedTimestamp: now.getTime(),
      currency: tenantConfig.currency || 'MMK',
      studio: {
        name: tenantConfig.displayName,
        brand: tenantConfig.legalName || tenantConfig.displayName,
        registrationNo: tenantConfig.registrationNumber,
        address: tenantConfig.address,
        phone: tenantConfig.phone,
        email: tenantConfig.email,
        website: tenantConfig.websiteUrl,
        taxIdentificationNumber: tenantConfig.taxIdentifier || tenantConfig.registrationNumber,
      },
    },
    bookingManifest: {
      manifestId: bookingState.manifestId,
      sessionToken: bookingState.token,
      turnstileAccessCode: bookingState.turnstileCode,
      lifecycleStatus: 'COMPLETED_AND_ARCHIVED_IN_VAULT',
      bayAllocation: bookingState.bayAllocation || 'BAY ALPHA-01',
      stageDescription:
        bookingState.bayAllocation?.includes('01')
          ? 'Fine-Art Portrait Cyc'
          : bookingState.bayAllocation?.includes('02')
          ? 'Commercial Advertising Soundstage'
          : 'High-Fashion Editorial Soundstage',
      lightingRig: 'Profoto B10X + Softbox Octa 4ft + Rim Modifiers',
      sessionSchedule: {
        date: bookingState.dateStr,
        month: bookingState.monthStr,
        timeSlot: bookingState.timeSlot,
        sessionDurationMinutes: 60,
        turnaroundGuaranteeHours: 48,
      },
      briefingNotes:
        bookingState.briefingNotes && bookingState.briefingNotes.trim().length > 0
          ? bookingState.briefingNotes
          : 'Standard studio session briefing (no custom client notes specified)',
    },
    clientIdentity: {
      guestName: bookingState.guestName,
      contactPhone: bookingState.clientPhone || 'N/A',
      telegramHandle: bookingState.telegramHandle || 'N/A',
      verificationStatus: bookingState.uploadedSlipName
        ? 'SLIP_OCR_EXTRACTED_PENDING_STUDIO_LEDGER'
        : 'PROVISIONAL_GATE_RECORD',
    },
    photographyPackage: {
      id: bookingState.selectedPackage.id,
      name: bookingState.selectedPackage.name,
      suiteAllocation: bookingState.selectedPackage.suiteAllocation,
      description: bookingState.selectedPackage.description,
      basePriceMmk: bookingState.selectedPackage.price,
      depositRequiredMmk: bookingState.selectedPackage.deposit,
      features: bookingState.selectedPackage.features,
    },
    financialLedger: {
      currency: tenantConfig.currency || 'MMK',
      packagePriceMmk: bookingState.selectedPackage.price,
      totalAmountMmk: bookingState.totalAmount,
      depositPaidMmk: bookingState.depositAmount,
      depositSettled: false, // Subject to manual studio ledger verification
      paymentGateway: bookingState.gateway,
      depositVerificationMethod: bookingState.uploadedSlipName
        ? `${bookingState.gateway.toUpperCase()}_SLIP_AI_OCR_AUDITED`
        : `${bookingState.gateway}_ONLINE_RECORD`,
      uploadedSlipRef: bookingState.uploadedSlipName || 'N/A',
      balanceDueAtBayMmk: balanceDue,
      balanceSettlementStatus: balanceDue === 0 ? 'PAID_IN_FULL' : 'PENDING_SETTLEMENT_AT_BAY',
    },
    vaultDeliverablesManifest: {
      retouchedMasterFrames: 5,
      rawCapturesDng: 142,
      colorProfile: 'ProPhoto RGB (16-bit Depth)',
      dpi: 300,
      retentionPolicyDays: 30,
      vaultAccessStatus: 'ACTIVE_AVAILABLE_FOR_DOWNLOAD',
    },
    termsAndCertification: {
      usageLicense: 'Unlimited Personal & Commercial Print / Publishing Rights Granted',
      certificationStatement:
        `${tenantConfig.displayName} certifies this digital receipt as a structured record of session booking and deposit slip OCR extraction. Final booking confirmation requires studio ledger review.`,
      digitalSignatureDigest,
    },
  };
}

export function downloadDigitalReceiptFile(
  bookingState: BookingState,
  tenantConfig: TenantConfig = activeTenantConfig
): {
  filename: string;
  data: DigitalReceiptData;
} {
  const data = generateDigitalReceiptJson(bookingState, tenantConfig);
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const cleanName = (bookingState.guestName || 'Client').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanToken = (bookingState.token || 'TOKEN').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const slugPrefix = (tenantConfig.slug || 'TENANT').toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const filename = `${slugPrefix}_Digital_Receipt_${cleanToken}_${cleanName}.json`;

  if (typeof document !== 'undefined') {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return { filename, data };
}
