/**
 * AJ Studio Desk Platform Metadata & Configuration
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
  name: 'AJ Studio Desk',
  fullName: 'AJ Studio Desk — Studio Booking & POS',
  tagline: 'Studio Booking & POS Operations Desk',
  canonicalUrl: 'https://ajaxclickaistudio.com/',
  supportEmail: 'support@ajaxclickaistudio.com',
  version: '2.4.0',
  platformOwner: 'AJ Studio Desk',
  copyright: '© 2026 AJ Studio Desk. All rights reserved.',
  heroBrand: 'AJ STUDIO DESK',
  subBrand: 'Studio Booking & POS Desk',
};
