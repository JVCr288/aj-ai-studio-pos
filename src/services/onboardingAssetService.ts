import { AssetReference, AssetCategory } from '../types';

/**
 * STUDIO ONBOARDING ASSET SERVICE
 * Handles creation and lifecycle management of AssetReference contract objects.
 * Stores asset references in project.assets[] metadata without embedding raw Base64 data.
 */

export const createAssetReference = (
  projectId: string,
  category: AssetCategory,
  fileName: string,
  mimeType: string,
  fileSizeBytes: number,
  storageRef?: string
): AssetReference => {
  const now = new Date().toISOString();
  const uniqueId = Math.random().toString(36).substring(2, 7);
  const assetId = `asset-${category.toLowerCase()}-${Date.now()}-${uniqueId}`;

  return {
    assetId,
    projectId,
    category,
    provider: 'DEV_LOCAL',
    storageRef: storageRef || `/uploads/onboarding/${assetId}_${fileName}`,
    originalFilename: fileName,
    mimeType,
    fileSizeBytes,
    uploadStatus: 'READY',
    uploadedAt: now,
  };
};

export const getAssetById = (assets: AssetReference[], assetId?: string): AssetReference | undefined => {
  if (!assetId) return undefined;
  return assets.find((a) => a.assetId === assetId);
};

export const filterAssetsByCategory = (assets: AssetReference[], category: AssetCategory): AssetReference[] => {
  return assets.filter((a) => a.category === category && a.uploadStatus !== 'REMOVED');
};
