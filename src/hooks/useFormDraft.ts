import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface UseFormDraftOptions<T> {
  key: string;
  initialValues: T;
  debounceMs?: number;
  expirationMs?: number;
  onRestore?: (values: T) => void;
}

interface DraftData<T> {
  values: T;
  savedAt: number;
  version: number;
}

const DRAFT_PREFIX = 'eduverse_draft_';
const DRAFT_VERSION = 1;

/**
 * Hook for auto-saving form drafts to localStorage
 * Prevents data loss during connectivity drops or accidental navigation
 */
export function useFormDraft<T extends Record<string, unknown>>({
  key,
  initialValues,
  debounceMs = 1000,
  expirationMs = 24 * 60 * 60 * 1000, // 24 hours default
  onRestore,
}: UseFormDraftOptions<T>) {
  const storageKey = `${DRAFT_PREFIX}${key}`;
  const [values, setValues] = useState<T>(initialValues);
  const [hasDraft, setHasDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isRestored, setIsRestored] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check for existing draft on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const draft: DraftData<T> = JSON.parse(stored);
        const age = Date.now() - draft.savedAt;
        
        if (age < expirationMs && draft.version === DRAFT_VERSION) {
          // Check if draft has meaningful content
          const hasContent = Object.values(draft.values).some(
            (v) => v !== null && v !== undefined && v !== '' && 
            (typeof v !== 'object' || (Array.isArray(v) && v.length > 0))
          );
          
          if (hasContent) {
            setHasDraft(true);
          }
        } else {
          // Expired draft, remove it
          localStorage.removeItem(storageKey);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, [storageKey, expirationMs]);

  // Save draft with debouncing
  const saveDraft = useCallback((newValues: T) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      try {
        const draft: DraftData<T> = {
          values: newValues,
          savedAt: Date.now(),
          version: DRAFT_VERSION,
        };
        localStorage.setItem(storageKey, JSON.stringify(draft));
        setLastSaved(new Date());
      } catch (error) {
        console.warn('[FormDraft] Save failed:', error);
      }
    }, debounceMs);
  }, [storageKey, debounceMs]);

  // Update values and trigger auto-save
  const updateValues = useCallback((newValues: T | ((prev: T) => T)) => {
    const updated = typeof newValues === 'function' 
      ? (newValues as (prev: T) => T)(values) 
      : newValues;
    setValues(updated);
    saveDraft(updated);
  }, [values, saveDraft]);

  // Update a single field
  const updateField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    updateValues((prev) => ({ ...prev, [field]: value }));
  }, [updateValues]);

  // Restore draft
  const restoreDraft = useCallback(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const draft: DraftData<T> = JSON.parse(stored);
        setValues(draft.values);
        setHasDraft(false);
        setIsRestored(true);
        onRestore?.(draft.values);
        toast.success('Draft restored successfully');
      }
    } catch {
      toast.error('Failed to restore draft');
    }
  }, [storageKey, onRestore]);

  // Discard draft
  const discardDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setHasDraft(false);
      setValues(initialValues);
      toast.info('Draft discarded');
    } catch {
      // Ignore
    }
  }, [storageKey, initialValues]);

  // Clear draft (after successful submit)
  const clearDraft = useCallback(() => {
    try {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      localStorage.removeItem(storageKey);
      setHasDraft(false);
      setLastSaved(null);
    } catch {
      // Ignore
    }
  }, [storageKey]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    values,
    setValues: updateValues,
    updateField,
    hasDraft,
    lastSaved,
    isRestored,
    restoreDraft,
    discardDraft,
    clearDraft,
  };
}

// Utility to get all drafts for a user
export function getAllDrafts(): Array<{ key: string; savedAt: Date; preview: string }> {
  const drafts: Array<{ key: string; savedAt: Date; preview: string }> = [];
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(DRAFT_PREFIX)) {
        const stored = localStorage.getItem(key);
        if (stored) {
          const draft = JSON.parse(stored);
          const previewField = Object.entries(draft.values).find(
            ([_, v]) => typeof v === 'string' && v.length > 0
          );
          drafts.push({
            key: key.replace(DRAFT_PREFIX, ''),
            savedAt: new Date(draft.savedAt),
            preview: previewField ? String(previewField[1]).slice(0, 50) : 'Draft',
          });
        }
      }
    }
  } catch {
    // Ignore
  }
  
  return drafts.sort((a, b) => b.savedAt.getTime() - a.savedAt.getTime());
}

// Utility to clear all drafts
export function clearAllDrafts(): number {
  let count = 0;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(DRAFT_PREFIX)) {
        keys.push(key);
      }
    }
    keys.forEach((key) => {
      localStorage.removeItem(key);
      count++;
    });
  } catch {
    // Ignore
  }
  return count;
}
