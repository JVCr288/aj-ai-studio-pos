import { WorkspaceView } from '../types';

export const PRIMARY_WORKSPACE_VIEW_STORAGE_KEY = 'aj_workspace_view';
export const LEGACY_WORKSPACE_VIEW_STORAGE_KEY = 'nocturne-workspace-view';
export const WORKSPACE_VIEW_STORAGE_KEY = PRIMARY_WORKSPACE_VIEW_STORAGE_KEY;

/**
 * Retrieve the initial workspace view preference from localStorage.
 * Allowed values: 'compact' | 'full'.
 * Default / fallback on invalid or missing value: 'compact'.
 */
export function getInitialWorkspaceView(): WorkspaceView {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(PRIMARY_WORKSPACE_VIEW_STORAGE_KEY) || localStorage.getItem(LEGACY_WORKSPACE_VIEW_STORAGE_KEY);
      if (saved === 'full') return 'full';
      if (saved === 'compact') return 'compact';
    } catch {
      // ignore storage access errors
    }
  }
  return 'compact';
}

/**
 * Type guard for WorkspaceView.
 */
export function isWorkspaceView(value: unknown): value is WorkspaceView {
  return value === 'compact' || value === 'full';
}
