/**
 * AJ AI Studio Platform Metadata & Configuration
 * 
 * Defines global platform identity, public canonical URLs, brand attributes,
 * and shared platform container settings.
 */

export interface PlatformConfig {
  name: string;
  fullName: string;
  tagline: string;
  canonicalUrl: string;
  supportEmail: string;
  version: string;
  platformOwner: string;
  copyright: string;
  heroBrand: string;
  subBrand: string;
}

export const platformConfig: PlatformConfig = {
  name: 'AJ AI Studio',
  fullName: 'AJ AI Studio Platform',
  tagline: 'Studio Operations & Client Data Intake Platform',
  canonicalUrl: 'https://ajaxclickaistudio.com/',
  supportEmail: 'support@ajaxclickaistudio.com',
  version: '2.4.0',
  platformOwner: 'AJ AI Studio',
  copyright: '© 2026 AJ AI Studio. All rights reserved.',
  heroBrand: 'AJ AI STUDIO',
  subBrand: 'Studio Operations Platform',
};
