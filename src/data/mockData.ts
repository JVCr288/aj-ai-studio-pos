import { PhotographyPackage, GatewayConfig, VaultAsset } from '../types';
import { TenantConfig, activeTenantConfig } from '../config/tenantConfig';

export const PHOTOGRAPHY_PACKAGES: PhotographyPackage[] = [
  {
    id: 'pre-born-maternity',
    name: 'Pre-Born & Maternity Atelier',
    category: 'PRE_BORN',
    price: 260000,
    deposit: 130000,
    recommended: false,
    description: 'Delicate natural lighting, private vanity lounge suite, and serene atmosphere for maternity and pre-born fine-art memories.',
    suiteAllocation: 'BAY ALPHA-01',
    heroImage: '/images/preborn/preborn_hero_01.jpg',
    features: [
      '8 Fine-Art Retouched Plates (TIFF 16-bit)',
      'Temperature-Controlled Baby & Mother Vanity Suite',
      'Diffused Organic Softbox & Gentle Silk Drapes',
      'Family & Partner Complementary Shots Included',
    ],
  },
  {
    id: 'pre-wedding-cinematic',
    name: 'Pre-Wedding & Romance Cinematic',
    category: 'PRE_WEDDING',
    price: 480000,
    deposit: 240000,
    recommended: true,
    description: 'Modern editorial lighting, 3 wardrobe transitions, and curated color backdrops for couple and wedding romance.',
    suiteAllocation: 'BAY BETA-02',
    heroImage: '/images/prewedding/prewedding_hero_01.jpg',
    features: [
      '15 Master Pre-Wedding Retouched Frames',
      '3 Distinct Wardrobe Changes & Light Shifts',
      'Tethered 4K Live Preview for Couple Review',
      'Signature Fine-Art Cinematic Color Grading',
    ],
  },
  {
    id: 'editorial-fashion-atelier',
    name: 'Editorial Fashion Atelier',
    category: 'FASHION',
    price: 380000,
    deposit: 190000,
    recommended: false,
    description: 'Multi-look fashion portfolio, dual Profoto octa softboxes, motorized color backdrops, magazine-ready grading.',
    suiteAllocation: 'BAY BETA-02',
    heroImage: '/images/fashion/fashion_hero_01.jpg',
    features: [
      '12 High-End Editorial Retouched Plates',
      'Dual Profoto Octa Softbox Lighting Rigs',
      'Motorized 6-Color Seamless Backdrop Rolls',
      'Priority Turnaround (24 Hours) + RAW Archive',
    ],
  },
  {
    id: 'indoor-portrait-master',
    name: 'Solo Portrait & Executive Profile',
    category: 'SOLO',
    price: 180000,
    deposit: 90000,
    recommended: false,
    description: 'Precision Profoto B10X lighting, live 4K tethered screen, and dedicated vanity access for executive branding and solo portraits.',
    suiteAllocation: 'BAY ALPHA-01',
    heroImage: '/images/solo/solo_1.jpg',
    features: [
      '6 Master Retouched Frames (TIFF 16-bit)',
      '2 Lighting Shifts (High-Key / Dramatic Contrast)',
      'Full Tether Live Monitor During Shoot',
      'Social Media & LinkedIn Multi-Crop Deliverables',
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
      currencyRate: `105,000 ${tenantConfig.currency || 'MMK'} (50% Deposit)`,
      badge: kpay?.badge || `${tenantConfig.displayName} KPay`,
      appInstruction: kpay?.instructions || 'Scan with KBZPay QuickPay App',
    },
    WavePay: {
      id: 'WavePay',
      label: 'WavePay',
      accountName: wave?.accountName || tenantConfig.legalName,
      accountNumber: wave?.accountNumber || tenantConfig.phone,
      currencyRate: `105,000 ${tenantConfig.currency || 'MMK'} (50% Deposit)`,
      badge: wave?.badge || `${tenantConfig.displayName} Wave`,
      appInstruction: wave?.instructions || 'Scan with WavePay QR Scanner',
    },
    'AYA Pay': {
      id: 'AYA Pay',
      label: 'AYA Pay',
      accountName: aya?.accountName || tenantConfig.legalName,
      accountNumber: aya?.accountNumber || tenantConfig.phone,
      currencyRate: `105,000 ${tenantConfig.currency || 'MMK'} (50% Deposit)`,
      badge: aya?.badge || `${tenantConfig.displayName} AYA Pay`,
      appInstruction: aya?.instructions || 'Scan with AYA Pay App or AYA Direct Pay',
    },
    'CB / AYA': {
      id: 'AYA Pay',
      label: 'AYA Pay',
      accountName: aya?.accountName || tenantConfig.legalName,
      accountNumber: aya?.accountNumber || tenantConfig.phone,
      currencyRate: `105,000 ${tenantConfig.currency || 'MMK'} (50% Deposit)`,
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
    filename: 'AJ_STUDIO_001.TIFF',
    fileSize: '148.4 MB',
    resolution: '8192 × 5464',
    dpi: 300,
    lightingSetup: 'Profoto Key 45°',
    badge: 'TIFF MASTER',
    imageUrl: '/images/solo/solo_1.jpg',
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
    filename: 'AJ_STUDIO_002.TIFF',
    fileSize: '152.1 MB',
    resolution: '8192 × 5464',
    dpi: 300,
    lightingSetup: 'Rim Light Accent',
    badge: 'TIFF MASTER',
    imageUrl: '/images/solo/solo_2.jpg',
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
    filename: 'AJ_STUDIO_003.TIFF',
    fileSize: '139.8 MB',
    resolution: '8192 × 5464',
    dpi: 300,
    lightingSetup: 'High Key Monochromatic',
    badge: 'TIFF MASTER',
    imageUrl: '/images/solo/solo_3.jpg',
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
    filename: 'AJ_STUDIO_004.TIFF',
    fileSize: '144.2 MB',
    resolution: '8192 × 5464',
    dpi: 300,
    lightingSetup: 'Softbox Octa 4ft Fill',
    badge: 'TIFF MASTER',
    imageUrl: '/images/solo/solo_4.jpg',
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
    filename: 'AJ_STUDIO_005.TIFF',
    fileSize: '156.0 MB',
    resolution: '8192 × 5464',
    dpi: 300,
    lightingSetup: 'Dual Gel Cyan Accent',
    badge: 'TIFF MASTER',
    imageUrl: '/images/solo/solo_5.jpg',
    exif: {
      camera: 'Sony α1 (ILCE-1)',
      lens: 'FE 85mm F1.4 GM',
      shutter: '1/250s',
      aperture: 'f/2.5',
      iso: 'ISO 100',
    },
  },
];
