import { useState, useEffect, useRef, useCallback } from 'react';
import { StudioOnboardingProject } from '../types';
import { saveOnboardingDraft } from '../services/onboardingPersistenceService';
import { computeCompletedSteps, computeCompletionPercentage } from '../services/onboardingValidationService';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutosaveOptions {
  projectId: string;
  project: StudioOnboardingProject;
  debounceMs?: number;
  onSaved?: (updated: StudioOnboardingProject) => void;
}

export const useAutosave = ({
  projectId,
  project,
  debounceMs = 1000,
  onSaved,
}: UseAutosaveOptions) => {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(project.progress?.lastSavedAt || null);

  const lastSavedPayloadRef = useRef<string>('');
  const isFirstRenderRef = useRef<boolean>(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const performSave = useCallback(
    async (currentProject: StudioOnboardingProject): Promise<StudioOnboardingProject | null> => {
      setSaveStatus('saving');
      try {
        const completedSteps = computeCompletedSteps(currentProject);
        const completionPercentage = computeCompletionPercentage(completedSteps);

        const projectToSave: StudioOnboardingProject = {
          ...currentProject,
          progress: {
            ...currentProject.progress,
            completedSteps,
            completionPercentage,
          },
        };

        const saved = await saveOnboardingDraft(projectId, projectToSave);
        lastSavedPayloadRef.current = JSON.stringify(saved);
        setLastSavedAt(saved.progress.lastSavedAt);
        setSaveStatus('saved');
        if (onSaved) onSaved(saved);

        // Reset to idle after 3s
        setTimeout(() => {
          setSaveStatus((prev) => (prev === 'saved' ? 'idle' : prev));
        }, 3000);

        return saved;
      } catch {
        setSaveStatus('error');
        return null;
      }
    },
    [projectId, onSaved]
  );

  // Debounced Autosave Effect
  useEffect(() => {
    // Skip initial mount
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      lastSavedPayloadRef.current = JSON.stringify(project);
      return;
    }

    const currentPayload = JSON.stringify(project);
    if (currentPayload === lastSavedPayloadRef.current) {
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      performSave(project);
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [project, debounceMs, performSave]);

  const triggerManualSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    return performSave(project);
  }, [performSave, project]);

  return {
    saveStatus,
    lastSavedAt,
    triggerManualSave,
  };
};
