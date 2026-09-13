import { PhotographyPackage, GatewayConfig, VaultAsset } from '../types';
import { TenantConfig, activeTenantConfig } from '../config/tenantConfig';

export const PHOTOGRAPHY_PACKAGES: PhotographyPackage[] = [
  {
    id: 'indoor-portrait-master',
    name: 'Indoor Portrait Master',
    price: 210000,
    deposit: 105000,
    recommended: true,
    description: 'Profoto B10X setup, tether monitor, 5 retouched frames + raw digital library.',
    suiteAllocation: 'BAY ALPHA-01',
    features: [
      '5 Master Fine-Art Retouched Frames (TIFF 16-bit)',
      '142 High-Resolution RAW (DNG) captures',
      'Full tether live monitor during shoot',
      'Wardrobe steam & vanity suite access',
    ],
  },
  {
    id: 'commercial-branding',
    name: 'Commercial Branding',
    price: 500000,
    deposit: 250000,
    recommended: false,
    description: '12 High-Res retouches, commercial advertising release & product styling.',
    suiteAllocation: 'BAY BETA-02',
    features: [
      '12 Master Commercial Retouched Frames',
      'Full Advertising & Global Billboard License',
      'Art Direction & Lighting Assistant Included',
      '4K Video B-Roll Social Snippets (3 clips)',
    ],
  },
  {
    id: 'editorial-fashion-atelier',
    name: 'Editorial Fashion Atelier',
    price: 350000,
    deposit: 175000,
    recommended: false,
    description: 'Multi-look fashion portfolio, dual Profoto octa softboxes, magazine-ready grading.',
    suiteAllocation: 'BAY OMEGA-03',
    features: [
      '8 High-End Editorial Retouched Plates',
      '3 Distinct Wardrobe Light Transitions',
      'Color Grading Contact Sheet + RAW Archive',
      'Priority Turnaround (24 Hours)',
    ],
  },
];

export function getGatewayConfigs(tenantConfig: TenantConfig = activeTenantConfig): Record<string, GatewayConfig> {
  const getMethod = (provider: string) =>
    tenantConfig.paymentMethods?.find(
      (m) =>
        m.provider === provider ||
        m.name?.toLowerCase().includes(provider.toLowerCase()) ||
        (provider === 'KBZPay' && m.id === 'kpay') ||
        (provider === 'WavePay' && m.id === 'wavepay') ||
        (provider === 'AYA Pay' && (m.id === 'ayapay' || m.id === 'cbpay'))
    );

  const kpay = getMethod('KBZPay') || tenantConfig.paymentMethods?.[0];
  const wave = getMethod('WavePay') || tenantConfig.paymentMethods?.[1];
  const aya = getMethod('AYA Pay') || tenantConfig.paymentMethods?.[2];

  return {
    KBZPay: {
      id: 'KBZPay',
      label: 'KBZPay',
      accountName: kpay?.accountName || tenantConfig.legalName,
      accountNumber: kpay?.accountNumber || tenantConfig.phone,
      currencyRate: `105,000 ${tenantConfig.currency || 'MMK'} (စပေါ်ငွေ 50%)`,
      badge: kpay?.badge || `${tenantConfig.displayName} KPay`,
      appInstruction: kpay?.instructions || 'Scan with KBZPay QuickPay App',
    },
    WavePay: {
      id: 'WavePay',
      label: 'WavePay',
      accountName: wave?.accountName || tenantConfig.legalName,
      accountNumber: wave?.accountNumber || tenantConfig.phone,
      currencyRate: `105,000 ${tenantConfig.currency || 'MMK'} (စပေါ်ငွေ 50%)`,
      badge: wave?.badge || `${tenantConfig.displayName} Wave`,
      appInstruction: wave?.instructions || 'Scan with WavePay QR Scanner',
    },
    'AYA Pay': {
      id: 'AYA Pay',
      label: 'AYA Pay',
      accountName: aya?.accountName || tenantConfig.legalName,
      accountNumber: aya?.accountNumber || tenantConfig.phone,
      currencyRate: `105,000 ${tenantConfig.currency || 'MMK'} (စပေါ်ငွေ 50%)`,
      badge: aya?.badge || `${tenantConfig.displayName} AYA Pay`,
      appInstruction: aya?.instructions || 'Scan with AYA Pay App or AYA Direct Pay',
    },
    'CB / AYA': {
      id: 'AYA Pay',
      label: 'AYA Pay',
      accountName: aya?.accountName || tenantConfig.legalName,
      accountNumber: aya?.accountNumber || tenantConfig.phone,
      currencyRate: `105,000 ${tenantConfig.currency || 'MMK'} (စပေါ်ငွေ 50%)`,
      badge: aya?.badge || `${tenantConfig.displayName} AYA Pay`,
      appInstruction: aya?.instructions || 'Scan with AYA Pay App or AYA Direct Pay',
    },
  };
}

export const GATEWAY_CONFIGS: Record<string, GatewayConfig> = getGatewayConfigs(activeTenantConfig);

export const VAULT_MASTER_FRAMES: VaultAsset[] = [
  {
    id: 'frame-01',
    frameNumber: 'FRAME #01',
    filename: 'AKK_ROSTOVA_001.TIFF',
    fileSize: '148.4 MB',
    resolution: '8192 × 5464',
    dpi: 300,
    lightingSetup: 'Profoto Key 45°',
    badge: 'TIFF MASTER',
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1000&auto=format&fit=crop',
    exif: {
      camera: 'Sony α1 (ILCE-1)',
      lens: 'FE 85mm F1.4 GM',
      shutter: '1/250s',
      aperture: 'f/2.8',
      iso: 'ISO 100',
    },
  },
  {
    id: 'frame-02',
    frameNumber: 'FRAME #02',
    filename: 'AKK_ROSTOVA_002.TIFF',
    fileSize: '152.1 MB',
    resolution: '8192 × 5464',
    dpi: 300,
    lightingSetup: 'Rim Light Accent',
    badge: 'TIFF MASTER',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000&auto=format&fit=crop',
    exif: {
      camera: 'Sony α1 (ILCE-1)',
      lens: 'FE 85mm F1.4 GM',
      shutter: '1/250s',
      aperture: 'f/2.2',
      iso: 'ISO 100',
    },
  },
  {
    id: 'frame-03',
    frameNumber: 'FRAME #03',
    filename: 'AKK_ROSTOVA_003.TIFF',
    fileSize: '139.8 MB',
    resolution: '8192 × 5464',
    dpi: 300,
    lightingSetup: 'High Key Monochromatic',
    badge: 'TIFF MASTER',
    imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1000&auto=format&fit=crop',
    exif: {
      camera: 'Sony α1 (ILCE-1)',
      lens: 'FE 135mm F1.8 GM',
      shutter: '1/200s',
      aperture: 'f/4.0',
      iso: 'ISO 80',
    },
  },
  {
    id: 'frame-04',
    frameNumber: 'FRAME #04',
    filename: 'AKK_ROSTOVA_004.TIFF',
    fileSize: '144.2 MB',
    resolution: '8192 × 5464',
    dpi: 300,
    lightingSetup: 'Softbox Octa 4ft Fill',
    badge: 'TIFF MASTER',
    imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1000&auto=format&fit=crop',
    exif: {
      camera: 'Sony α1 (ILCE-1)',
      lens: 'FE 50mm F1.2 GM',
      shutter: '1/320s',
      aperture: 'f/1.8',
      iso: 'ISO 100',
    },
  },
  {
    id: 'frame-05',
    frameNumber: 'FRAME #05',
    filename: 'AKK_ROSTOVA_005.TIFF',
    fileSize: '156.0 MB',
    resolution: '8192 × 5464',
    dpi: 300,
    lightingSetup: 'Dual Gel Cyan Accent',
    badge: 'TIFF MASTER',
    imageUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=1000&auto=format&fit=crop',
    exif: {
      camera: 'Sony α1 (ILCE-1)',
      lens: 'FE 85mm F1.4 GM',
      shutter: '1/250s',
      aperture: 'f/2.5',
      iso: 'ISO 100',
    },
  },
];
