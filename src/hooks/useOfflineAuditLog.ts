import { useCallback } from 'react';

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  action: 'create' | 'update' | 'delete' | 'sync' | 'queue' | 'restore';
  entityType: string;
  entityId?: string;
  details: string;
  status: 'success' | 'pending' | 'failed';
  isOffline: boolean;
  syncedAt?: number;
  error?: string;
}

const AUDIT_LOG_KEY = 'eduverse_offline_audit_log';
const MAX_LOG_ENTRIES = 500;

/**
 * Hook for maintaining local audit trail of offline actions
 * Useful for debugging, troubleshooting sync issues, and compliance
 */
export function useOfflineAuditLog() {
  // Get all log entries
  const getLogs = useCallback((): AuditLogEntry[] => {
    try {
      const stored = localStorage.getItem(AUDIT_LOG_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }, []);

  // Add new log entry
  const log = useCallback((
    action: AuditLogEntry['action'],
    entityType: string,
    details: string,
    options?: {
      entityId?: string;
      status?: AuditLogEntry['status'];
      error?: string;
    }
  ): string => {
    const entry: AuditLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      action,
      entityType,
      details,
      entityId: options?.entityId,
      status: options?.status || 'success',
      isOffline: !navigator.onLine,
      error: options?.error,
    };

    try {
      const logs = getLogs();
      logs.unshift(entry);
      
      // Trim to max entries
      const trimmed = logs.slice(0, MAX_LOG_ENTRIES);
      localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(trimmed));
    } catch {
      // Ignore storage errors
    }

    return entry.id;
  }, [getLogs]);

  // Update existing log entry (e.g., when sync completes)
  const updateLog = useCallback((
    id: string,
    updates: Partial<Pick<AuditLogEntry, 'status' | 'syncedAt' | 'error'>>
  ): void => {
    try {
      const logs = getLogs();
      const index = logs.findIndex((l) => l.id === id);
      
      if (index !== -1) {
        logs[index] = { ...logs[index], ...updates };
        localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(logs));
      }
    } catch {
      // Ignore
    }
  }, [getLogs]);

  // Get logs filtered by criteria
  const getFilteredLogs = useCallback((filter: {
    action?: AuditLogEntry['action'];
    entityType?: string;
    status?: AuditLogEntry['status'];
    since?: number;
    limit?: number;
  }): AuditLogEntry[] => {
    let logs = getLogs();
    
    if (filter.action) {
      logs = logs.filter((l) => l.action === filter.action);
    }
    
    if (filter.entityType) {
      logs = logs.filter((l) => l.entityType === filter.entityType);
    }
    
    if (filter.status) {
      logs = logs.filter((l) => l.status === filter.status);
    }
    
    if (filter.since) {
      logs = logs.filter((l) => l.timestamp >= filter.since);
    }
    
    if (filter.limit) {
      logs = logs.slice(0, filter.limit);
    }
    
    return logs;
  }, [getLogs]);

  // Get summary statistics
  const getStats = useCallback(() => {
    const logs = getLogs();
    const last24h = Date.now() - 24 * 60 * 60 * 1000;
    const recentLogs = logs.filter((l) => l.timestamp >= last24h);
    
    return {
      total: logs.length,
      last24h: recentLogs.length,
      pending: logs.filter((l) => l.status === 'pending').length,
      failed: logs.filter((l) => l.status === 'failed').length,
      offlineActions: logs.filter((l) => l.isOffline).length,
      byAction: logs.reduce((acc, l) => {
        acc[l.action] = (acc[l.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byEntityType: logs.reduce((acc, l) => {
        acc[l.entityType] = (acc[l.entityType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }, [getLogs]);

  // Clear all logs
  const clearLogs = useCallback((): void => {
    try {
      localStorage.removeItem(AUDIT_LOG_KEY);
    } catch {
      // Ignore
    }
  }, []);

  // Export logs as JSON
  const exportLogs = useCallback((): string => {
    return JSON.stringify(getLogs(), null, 2);
  }, [getLogs]);

  return {
    log,
    updateLog,
    getLogs,
    getFilteredLogs,
    getStats,
    clearLogs,
    exportLogs,
  };
}
