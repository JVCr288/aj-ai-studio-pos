/**
 * Legacy Local Storage Key Compatibility & Migration Utility
 * 
 * Provides dual-read fallback support for legacy storage keys (akk_..., nocturne-...)
 * while writing to clean, versioned platform/tenant keys (aj_...).
 */

export interface StorageMigrationConfig {
  primaryKey: string;
  legacyKeys: string[];
}

export function getMigratedStorageItem<T>(
  primaryKey: string,
  legacyKeys: string[] = []
): T | null {
  if (typeof window === 'undefined') return null;

  try {
    // 1. Try reading from the primary key
    const primaryValue = localStorage.getItem(primaryKey);
    if (primaryValue !== null) {
      return JSON.parse(primaryValue) as T;
    }

    // 2. Fall back to legacy keys in order
    for (const legacyKey of legacyKeys) {
      const legacyValue = localStorage.getItem(legacyKey);
      if (legacyValue !== null) {
        const parsed = JSON.parse(legacyValue) as T;
        // Migrate to primary key for future reads
        localStorage.setItem(primaryKey, legacyValue);
        return parsed;
      }
    }
  } catch (error) {
    console.warn(`[AJ Storage Migration] Error reading key ${primaryKey}:`, error);
  }

  return null;
}

export function setMigratedStorageItem<T>(
  primaryKey: string,
  value: T,
  legacyKeysToSync: string[] = []
): void {
  if (typeof window === 'undefined') return;

  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(primaryKey, serialized);
    // Optionally keep legacy keys in sync for backward compatibility during rollout
    for (const legacyKey of legacyKeysToSync) {
      localStorage.setItem(legacyKey, serialized);
    }
  } catch (error) {
    console.warn(`[AJ Storage Migration] Error writing key ${primaryKey}:`, error);
  }
}
