import path from 'path';

export interface AssetUploadAuthorization {
  assetId: string;
  projectId: string;
  tenantId: string;
  storageBucket: string;
  storageKey: string;
  uploadUrl: string;
  headers?: Record<string, string>;
  isSimulated: boolean;
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
]);

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.svg', '.pdf']);
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

export const sanitizeFilename = (fileName: string): string => {
  const basename = path.basename(fileName);
  return basename.replace(/[^a-zA-Z0-9_.-]/g, '_');
};

export const validateAssetMetadata = (
  fileName: string,
  mimeType: string,
  sizeBytes: number
): { valid: boolean; error?: string } => {
  if (!fileName || typeof fileName !== 'string') {
    return { valid: false, error: 'INVALID_FILENAME: File name is required.' };
  }

  const sanitized = sanitizeFilename(fileName);
  const ext = path.extname(sanitized).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, error: `UNSUPPORTED_EXTENSION: File extension '${ext}' is not permitted.` };
  }

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return { valid: false, error: `UNSUPPORTED_MIME_TYPE: MIME type '${mimeType}' is not permitted.` };
  }

  if (sizeBytes <= 0 || sizeBytes > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `FILE_SIZE_EXCEEDED: File size (${Math.round(sizeBytes / 1024)}KB) exceeds limit of 15MB.`,
    };
  }

  return { valid: true };
};

export const authorizeAssetUpload = async (
  projectId: string,
  tenantId: string,
  role: string,
  fileName: string,
  mimeType: string,
  fileSizeBytes: number
): Promise<AssetUploadAuthorization> => {
  const validation = validateAssetMetadata(fileName, mimeType, fileSizeBytes);
  if (!validation.valid) {
    throw new Error(validation.error || 'INVALID_ASSET_METADATA');
  }

  const sanitizedName = sanitizeFilename(fileName);
  const uniqueId = Math.random().toString(36).substring(2, 7);
  const assetId = `asset-${role.toLowerCase()}-${Date.now()}-${uniqueId}`;
  const storageBucket = process.env.SUPABASE_ONBOARDING_BUCKET || 'onboarding-assets';
  const storageKey = `tenants/${tenantId}/projects/${projectId}/${assetId}_${sanitizedName}`;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceRoleKey) {
    try {
      // Generate a signed upload URL via Supabase Storage REST API
      const signEndpoint = `${supabaseUrl}/storage/v1/object/upload/sign/${storageBucket}/${storageKey}`;
      const response = await fetch(signEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresIn: 3600 }),
      });

      if (response.ok) {
        const data = (await response.json()) as { url?: string; token?: string };
        const uploadUrl = data.url ? `${supabaseUrl}/storage/v1${data.url}` : `${supabaseUrl}/storage/v1/object/${storageBucket}/${storageKey}`;
        return {
          assetId,
          projectId,
          tenantId,
          storageBucket,
          storageKey,
          uploadUrl,
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            'x-upsert': 'true',
          },
          isSimulated: false,
        };
      }
    } catch (err) {
      console.warn('[SupabaseStorageService] Signed URL generation failed, falling back to local metadata');
    }
  }

  // Local development / fallback simulation
  return {
    assetId,
    projectId,
    tenantId,
    storageBucket,
    storageKey,
    uploadUrl: `/api/simulated-upload/${assetId}`,
    isSimulated: true,
  };
};

const inMemoryStorageObjects = new Map<string, { sizeBytes: number; mimeType: string; uploadedAt: string }>();

export const registerSimulatedUpload = (storageKey: string, sizeBytes: number, mimeType: string) => {
  inMemoryStorageObjects.set(storageKey, {
    sizeBytes,
    mimeType,
    uploadedAt: new Date().toISOString(),
  });
};

export const verifyAssetObjectExistence = async (storageKey: string): Promise<boolean> => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const storageBucket = process.env.SUPABASE_ONBOARDING_BUCKET || 'onboarding-assets';

  if (supabaseUrl && serviceRoleKey) {
    try {
      const infoEndpoint = `${supabaseUrl}/storage/v1/object/info/${storageBucket}/${storageKey}`;
      const response = await fetch(infoEndpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  return inMemoryStorageObjects.has(storageKey);
};

export const confirmAssetUpload = async (
  assetId: string,
  storageKey: string
): Promise<{ success: boolean; assetId: string; storageKey: string; uploadStatus: 'READY' }> => {
  const exists = await verifyAssetObjectExistence(storageKey);
  if (!exists) {
    throw new Error(`OBJECT_NOT_FOUND: Asset object '${storageKey}' does not exist on storage destination.`);
  }

  return {
    success: true,
    assetId,
    storageKey,
    uploadStatus: 'READY',
  };
};
