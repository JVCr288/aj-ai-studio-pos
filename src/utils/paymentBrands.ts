const kbzpayLogo = '/src/assets/payment/kbzpay-logo.png';
const wavemoneyLogo = '/src/assets/payment/wavemoney-logo.svg';
const ayapayLogo = '/src/assets/payment/ayapay-logo.png';
import { PaymentGateway } from '../types';
import { TenantConfig, activeTenantConfig } from '../config/tenantConfig';

export interface PaymentBrandDefinition {
  id: PaymentGateway;
  displayName: string;
  shortName: string;
  logo: string;
  altText: string;
  accountTypeLabel: string;
  defaultBadge: string;
  aspectRatio: 'square' | 'wide';
}

export const PAYMENT_BRAND_DEFINITIONS: Record<string, PaymentBrandDefinition> = {
  KBZPay: {
    id: 'KBZPay',
    displayName: 'KBZPay',
    shortName: 'KPay',
    logo: kbzpayLogo,
    altText: 'KBZPay official brand logo',
    accountTypeLabel: 'KBZPay Mobile Account',
    defaultBadge: 'KPay',
    aspectRatio: 'square',
  },
  WavePay: {
    id: 'WavePay',
    displayName: 'WavePay',
    shortName: 'Wave',
    logo: wavemoneyLogo,
    altText: 'Wave Money official brand logo',
    accountTypeLabel: 'WavePay Mobile Account',
    defaultBadge: 'Wave',
    aspectRatio: 'wide',
  },
  'AYA Pay': {
    id: 'AYA Pay',
    displayName: 'AYA Pay',
    shortName: 'AYA Pay',
    logo: ayapayLogo,
    altText: 'AYA Pay official brand logo',
    accountTypeLabel: 'AYA Pay Direct Account',
    defaultBadge: 'AYA Pay',
    aspectRatio: 'wide',
  },
  // Alias for backwards-compatibility
  'CB / AYA': {
    id: 'AYA Pay',
    displayName: 'AYA Pay',
    shortName: 'AYA Pay',
    logo: ayapayLogo,
    altText: 'AYA Pay official brand logo',
    accountTypeLabel: 'AYA Pay Direct Account',
    defaultBadge: 'AYA Pay',
    aspectRatio: 'wide',
  },
};

export const SUPPORTED_PAYMENT_GATEWAYS: PaymentGateway[] = [
  'KBZPay',
  'WavePay',
  'AYA Pay',
];

export function getPaymentBrand(
  gateway: string | undefined,
  tenantConfig: TenantConfig = activeTenantConfig
): PaymentBrandDefinition {
  const targetGw = gateway || 'KBZPay';
  const base = PAYMENT_BRAND_DEFINITIONS[targetGw] || PAYMENT_BRAND_DEFINITIONS['KBZPay'];

  const tenantMethod = tenantConfig.paymentMethods?.find(
    (m) =>
      m.provider === targetGw ||
      m.name?.toLowerCase().includes(targetGw.toLowerCase()) ||
      (targetGw === 'KBZPay' && m.id === 'kpay') ||
      (targetGw === 'WavePay' && m.id === 'wavepay') ||
      (targetGw === 'AYA Pay' && (m.id === 'ayapay' || m.id === 'cbpay'))
  );

  const defaultBadge = tenantMethod?.badge || `${tenantConfig.displayName} ${base.shortName}`;

  return {
    ...base,
    defaultBadge,
  };
}
