// Offline Hooks - Barrel Export

// Core offline functionality
export { useOfflineUniversal, type OfflineActionType } from './useOfflineUniversal';
export { useUniversalPrefetch, getCachedStats } from './useUniversalPrefetch';

// Form drafts
export { useFormDraft, getAllDrafts, clearAllDrafts } from './useFormDraft';

// Search
export { useOfflineSearch, type OfflineSearchResult } from './useOfflineSearch';

// Connection
export { useConnectionQuality, type ConnectionQuality } from './useConnectionQuality';

// Settings
export { useSyncSettings, SYNC_PRESETS, type SyncSettings } from './useSyncSettings';

// Audit
export { useOfflineAuditLog, type AuditLogEntry } from './useOfflineAuditLog';
