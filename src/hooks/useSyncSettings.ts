import { useState, useEffect, useCallback } from 'react';

export interface SyncSettings {
  // Data retention
  attendanceRetentionDays: number; // 7, 14, 30, 90
  messagesRetentionDays: number;
  assignmentsRetentionDays: number;
  
  // Sync behavior
  autoSyncOnConnection: boolean;
  syncOnLowBattery: boolean;
  backgroundSyncEnabled: boolean;
  
  // Data types to cache
  cacheStudents: boolean;
  cacheTimetable: boolean;
  cacheAttendance: boolean;
  cacheAssignments: boolean;
  cacheHomework: boolean;
  cacheMessages: boolean;
  cacheContacts: boolean;
  
  // Priority
  syncPriority: 'attendance' | 'messages' | 'balanced';
  
  // Storage
  maxStorageMb: number; // 50, 100, 200, 500
}

const DEFAULT_SETTINGS: SyncSettings = {
  attendanceRetentionDays: 30,
  messagesRetentionDays: 14,
  assignmentsRetentionDays: 30,
  
  autoSyncOnConnection: true,
  syncOnLowBattery: false,
  backgroundSyncEnabled: true,
  
  cacheStudents: true,
  cacheTimetable: true,
  cacheAttendance: true,
  cacheAssignments: true,
  cacheHomework: true,
  cacheMessages: true,
  cacheContacts: true,
  
  syncPriority: 'balanced',
  maxStorageMb: 100,
};

const STORAGE_KEY = 'eduverse_sync_settings';

/**
 * Hook for managing user-configurable sync settings
 * Persists to localStorage
 */
export function useSyncSettings() {
  const [settings, setSettings] = useState<SyncSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch {
      // Use defaults
    }
    setIsLoaded(true);
  }, []);

  // Save settings to localStorage
  const saveSettings = useCallback((newSettings: Partial<SyncSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
  }, []);

  // Reset to defaults
  const resetSettings = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
    setSettings(DEFAULT_SETTINGS);
  }, []);

  // Get cutoff date for data type
  const getCutoffDate = useCallback((type: 'attendance' | 'messages' | 'assignments'): Date => {
    const days = {
      attendance: settings.attendanceRetentionDays,
      messages: settings.messagesRetentionDays,
      assignments: settings.assignmentsRetentionDays,
    }[type];
    
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return cutoff;
  }, [settings]);

  // Check if a data type should be cached
  const shouldCache = useCallback((type: keyof Pick<SyncSettings, 
    'cacheStudents' | 'cacheTimetable' | 'cacheAttendance' | 
    'cacheAssignments' | 'cacheHomework' | 'cacheMessages' | 'cacheContacts'
  >): boolean => {
    return settings[type];
  }, [settings]);

  // Get priority order for sync
  const getSyncPriorityOrder = useCallback((): string[] => {
    switch (settings.syncPriority) {
      case 'attendance':
        return ['attendance', 'period_log', 'behavior_note', 'quick_grade', 'homework', 'message', 'expense', 'payment'];
      case 'messages':
        return ['message', 'support_ticket', 'attendance', 'period_log', 'behavior_note', 'quick_grade', 'homework', 'expense', 'payment'];
      default:
        return ['attendance', 'message', 'period_log', 'quick_grade', 'homework', 'behavior_note', 'expense', 'payment', 'support_ticket'];
    }
  }, [settings.syncPriority]);

  return {
    settings,
    isLoaded,
    saveSettings,
    resetSettings,
    getCutoffDate,
    shouldCache,
    getSyncPriorityOrder,
  };
}

// Preset configurations
export const SYNC_PRESETS = {
  minimal: {
    name: 'Minimal',
    description: 'Essential data only, saves storage',
    settings: {
      attendanceRetentionDays: 7,
      messagesRetentionDays: 7,
      assignmentsRetentionDays: 14,
      cacheHomework: false,
      cacheContacts: false,
      maxStorageMb: 50,
    } as Partial<SyncSettings>,
  },
  balanced: {
    name: 'Balanced',
    description: 'Good balance of data and storage',
    settings: DEFAULT_SETTINGS,
  },
  comprehensive: {
    name: 'Comprehensive',
    description: 'Maximum data retention',
    settings: {
      attendanceRetentionDays: 90,
      messagesRetentionDays: 30,
      assignmentsRetentionDays: 60,
      maxStorageMb: 500,
    } as Partial<SyncSettings>,
  },
};
