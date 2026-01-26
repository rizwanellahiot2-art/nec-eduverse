import { openDB, IDBPDatabase } from 'idb';

// ==================== Types ====================

export type OfflineActionType = 
  | 'attendance' 
  | 'period_log' 
  | 'behavior_note' 
  | 'homework' 
  | 'quick_grade' 
  | 'message'
  | 'support_ticket'
  | 'expense'
  | 'payment'
  | 'leave_request'
  | 'lead_update'
  | 'call_log';

export interface OfflineQueueItem {
  id: string;
  type: OfflineActionType;
  data: Record<string, unknown>;
  timestamp: number;
  synced: boolean;
  retryCount: number;
  priority: 'high' | 'medium' | 'low';
  error?: string;
}

export interface CachedStudent {
  id: string;
  schoolId: string;
  firstName: string;
  lastName: string | null;
  classSectionId: string;
  classSectionName: string;
  className: string;
  cachedAt: number;
}

export interface CachedTimetableEntry {
  id: string;
  schoolId: string;
  dayOfWeek: number;
  periodId: string;
  periodLabel: string;
  subjectName: string;
  classSectionId: string | null;
  sectionLabel: string | null;
  room: string | null;
  startTime: string | null;
  endTime: string | null;
  sortOrder: number;
  cachedAt: number;
}

export interface CachedAssignment {
  id: string;
  schoolId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  classSectionId: string;
  sectionLabel: string;
  maxMarks: number;
  status: string;
  cachedAt: number;
}

export interface CachedSubject {
  id: string;
  schoolId: string;
  name: string;
  code: string | null;
  cachedAt: number;
}

export interface CachedClassSection {
  id: string;
  schoolId: string;
  name: string;
  classId: string;
  className: string;
  room: string | null;
  cachedAt: number;
}

export interface SyncMetadata {
  key: string;
  lastSyncAt: number;
  itemCount: number;
}

// ==================== Messaging Types ====================

export interface CachedConversation {
  id: string; // recipientId as key
  schoolId: string;
  recipientId: string;
  recipientName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  hasAttachment: boolean;
  lastSenderName: string;
  isSentByMe: boolean;
  cachedAt: number;
}

export interface CachedMessage {
  id: string;
  schoolId: string;
  conversationPartnerId: string; // for indexing
  content: string;
  senderUserId: string;
  createdAt: string;
  isMine: boolean;
  isRead: boolean;
  attachmentUrls: string[];
  subject: string | null;
  replyToId: string | null;
  cachedAt: number;
  isPending?: boolean; // true if queued offline
  localId?: string; // for matching with queue
}

export interface CachedContact {
  id: string;
  schoolId: string;
  userId: string;
  displayName: string;
  email: string | null;
  role: string | null;
  canMessage: boolean;
  cachedAt: number;
}

// ==================== Database Instance ====================

const DB_NAME = 'eduverse-offline-db';
const DB_VERSION = 2; // Bumped for messaging stores

let dbPromise: Promise<IDBPDatabase> | null = null;

export async function getOfflineDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Offline Queue Store
        if (!db.objectStoreNames.contains('offlineQueue')) {
          const queueStore = db.createObjectStore('offlineQueue', { keyPath: 'id' });
          queueStore.createIndex('by-synced', 'synced');
          queueStore.createIndex('by-type', 'type');
          queueStore.createIndex('by-priority', 'priority');
          queueStore.createIndex('by-timestamp', 'timestamp');
        }

        // Messaging stores (added in version 2)
        if (oldVersion < 2) {
          // Conversations Cache Store
          if (!db.objectStoreNames.contains('conversations')) {
            const convStore = db.createObjectStore('conversations', { keyPath: 'id' });
            convStore.createIndex('by-school', 'schoolId');
            convStore.createIndex('by-time', 'lastMessageTime');
          }

          // Messages Cache Store
          if (!db.objectStoreNames.contains('messages')) {
            const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
            msgStore.createIndex('by-school', 'schoolId');
            msgStore.createIndex('by-partner', 'conversationPartnerId');
            msgStore.createIndex('by-pending', 'isPending');
          }

          // Contacts Cache Store
          if (!db.objectStoreNames.contains('contacts')) {
            const contactStore = db.createObjectStore('contacts', { keyPath: 'id' });
            contactStore.createIndex('by-school', 'schoolId');
          }
        }

        // Students Cache Store
        if (!db.objectStoreNames.contains('students')) {
          const studentsStore = db.createObjectStore('students', { keyPath: 'id' });
          studentsStore.createIndex('by-school', 'schoolId');
          studentsStore.createIndex('by-section', 'classSectionId');
        }

        // Timetable Cache Store
        if (!db.objectStoreNames.contains('timetable')) {
          const timetableStore = db.createObjectStore('timetable', { keyPath: 'id' });
          timetableStore.createIndex('by-school', 'schoolId');
          timetableStore.createIndex('by-day', 'dayOfWeek');
        }

        // Assignments Cache Store
        if (!db.objectStoreNames.contains('assignments')) {
          const assignmentsStore = db.createObjectStore('assignments', { keyPath: 'id' });
          assignmentsStore.createIndex('by-school', 'schoolId');
          assignmentsStore.createIndex('by-section', 'classSectionId');
        }

        // Subjects Cache Store
        if (!db.objectStoreNames.contains('subjects')) {
          const subjectsStore = db.createObjectStore('subjects', { keyPath: 'id' });
          subjectsStore.createIndex('by-school', 'schoolId');
        }

        // Class Sections Cache Store
        if (!db.objectStoreNames.contains('classSections')) {
          const sectionsStore = db.createObjectStore('classSections', { keyPath: 'id' });
          sectionsStore.createIndex('by-school', 'schoolId');
        }

        // Sync Metadata Store
        if (!db.objectStoreNames.contains('syncMetadata')) {
          db.createObjectStore('syncMetadata', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

// ==================== Queue Operations ====================

export async function addToOfflineQueue(item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'synced' | 'retryCount'>): Promise<string> {
  const db = await getOfflineDB();
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const queueItem: OfflineQueueItem = {
    ...item,
    id,
    timestamp: Date.now(),
    synced: false,
    retryCount: 0,
  };
  await db.put('offlineQueue', queueItem);
  return id;
}

export async function getPendingQueueItems(): Promise<OfflineQueueItem[]> {
  const db = await getOfflineDB();
  const allItems = await db.getAll('offlineQueue');
  const items = allItems.filter((item: OfflineQueueItem) => !item.synced);
  // Sort by priority (high first) then timestamp (oldest first)
  return items.sort((a: OfflineQueueItem, b: OfflineQueueItem) => {
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return a.timestamp - b.timestamp;
  });
}

export async function markQueueItemSynced(id: string): Promise<void> {
  const db = await getOfflineDB();
  const item = await db.get('offlineQueue', id);
  if (item) {
    item.synced = true;
    await db.put('offlineQueue', item);
  }
}

export async function incrementRetryCount(id: string, error?: string): Promise<void> {
  const db = await getOfflineDB();
  const item = await db.get('offlineQueue', id);
  if (item) {
    item.retryCount += 1;
    item.error = error;
    await db.put('offlineQueue', item);
  }
}

export async function getQueueStats(): Promise<{
  pending: number;
  synced: number;
  failed: number;
  byType: Record<string, number>;
}> {
  const db = await getOfflineDB();
  const allItems = await db.getAll('offlineQueue');
  
  const stats = {
    pending: 0,
    synced: 0,
    failed: 0,
    byType: {} as Record<string, number>,
  };
  
  for (const item of allItems) {
    if (item.synced) {
      stats.synced++;
    } else if (item.retryCount >= 3) {
      stats.failed++;
    } else {
      stats.pending++;
    }
    stats.byType[item.type] = (stats.byType[item.type] || 0) + (item.synced ? 0 : 1);
  }
  
  return stats;
}

export async function clearSyncedItems(olderThanHours: number = 24): Promise<number> {
  const db = await getOfflineDB();
  const cutoff = Date.now() - olderThanHours * 60 * 60 * 1000;
  const tx = db.transaction('offlineQueue', 'readwrite');
  const items = await tx.store.getAll();
  let deleted = 0;
  
  for (const item of items) {
    if (item.synced && item.timestamp < cutoff) {
      await tx.store.delete(item.id);
      deleted++;
    }
  }
  
  await tx.done;
  return deleted;
}

// ==================== Cache Operations ====================

export async function cacheStudents(students: CachedStudent[]): Promise<void> {
  const db = await getOfflineDB();
  const tx = db.transaction('students', 'readwrite');
  const now = Date.now();
  
  for (const student of students) {
    await tx.store.put({ ...student, cachedAt: now });
  }
  
  await tx.done;
  await updateSyncMetadata('students', students.length);
}

export async function getCachedStudents(schoolId: string, sectionId?: string): Promise<CachedStudent[]> {
  const db = await getOfflineDB();
  
  if (sectionId) {
    return db.getAllFromIndex('students', 'by-section', sectionId);
  }
  
  return db.getAllFromIndex('students', 'by-school', schoolId);
}

export async function cacheTimetable(entries: CachedTimetableEntry[]): Promise<void> {
  const db = await getOfflineDB();
  const tx = db.transaction('timetable', 'readwrite');
  const now = Date.now();
  
  for (const entry of entries) {
    await tx.store.put({ ...entry, cachedAt: now });
  }
  
  await tx.done;
  await updateSyncMetadata('timetable', entries.length);
}

export async function getCachedTimetable(schoolId: string, dayOfWeek?: number): Promise<CachedTimetableEntry[]> {
  const db = await getOfflineDB();
  
  if (dayOfWeek !== undefined) {
    const entries = await db.getAllFromIndex('timetable', 'by-day', dayOfWeek);
    return entries.filter(e => e.schoolId === schoolId);
  }
  
  return db.getAllFromIndex('timetable', 'by-school', schoolId);
}

export async function cacheAssignments(assignments: CachedAssignment[]): Promise<void> {
  const db = await getOfflineDB();
  const tx = db.transaction('assignments', 'readwrite');
  const now = Date.now();
  
  for (const assignment of assignments) {
    await tx.store.put({ ...assignment, cachedAt: now });
  }
  
  await tx.done;
  await updateSyncMetadata('assignments', assignments.length);
}

export async function getCachedAssignments(schoolId: string, sectionId?: string): Promise<CachedAssignment[]> {
  const db = await getOfflineDB();
  
  if (sectionId) {
    return db.getAllFromIndex('assignments', 'by-section', sectionId);
  }
  
  return db.getAllFromIndex('assignments', 'by-school', schoolId);
}

export async function cacheSubjects(subjects: CachedSubject[]): Promise<void> {
  const db = await getOfflineDB();
  const tx = db.transaction('subjects', 'readwrite');
  const now = Date.now();
  
  for (const subject of subjects) {
    await tx.store.put({ ...subject, cachedAt: now });
  }
  
  await tx.done;
  await updateSyncMetadata('subjects', subjects.length);
}

export async function getCachedSubjects(schoolId: string): Promise<CachedSubject[]> {
  const db = await getOfflineDB();
  return db.getAllFromIndex('subjects', 'by-school', schoolId);
}

export async function cacheClassSections(sections: CachedClassSection[]): Promise<void> {
  const db = await getOfflineDB();
  const tx = db.transaction('classSections', 'readwrite');
  const now = Date.now();
  
  for (const section of sections) {
    await tx.store.put({ ...section, cachedAt: now });
  }
  
  await tx.done;
  await updateSyncMetadata('classSections', sections.length);
}

export async function getCachedClassSections(schoolId: string): Promise<CachedClassSection[]> {
  const db = await getOfflineDB();
  return db.getAllFromIndex('classSections', 'by-school', schoolId);
}

// ==================== Sync Metadata ====================

export async function updateSyncMetadata(key: string, itemCount: number): Promise<void> {
  const db = await getOfflineDB();
  await db.put('syncMetadata', {
    key,
    lastSyncAt: Date.now(),
    itemCount,
  });
}

export async function getSyncMetadata(key: string): Promise<SyncMetadata | undefined> {
  const db = await getOfflineDB();
  return db.get('syncMetadata', key);
}

export async function getAllSyncMetadata(): Promise<SyncMetadata[]> {
  const db = await getOfflineDB();
  return db.getAll('syncMetadata');
}

// ==================== Storage Info ====================

export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
  usageFormatted: string;
  quotaFormatted: string;
  percentUsed: number;
}> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    
    const formatBytes = (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };
    
    return {
      usage,
      quota,
      usageFormatted: formatBytes(usage),
      quotaFormatted: formatBytes(quota),
      percentUsed: quota > 0 ? (usage / quota) * 100 : 0,
    };
  }
  
  return {
    usage: 0,
    quota: 0,
    usageFormatted: 'Unknown',
    quotaFormatted: 'Unknown',
    percentUsed: 0,
  };
}

// ==================== Clear All Data ====================

export async function clearAllOfflineData(): Promise<void> {
  const db = await getOfflineDB();
  const storeNames = [
    'offlineQueue', 'students', 'timetable', 'assignments', 
    'subjects', 'classSections', 'syncMetadata',
    'conversations', 'messages', 'contacts'
  ].filter(name => db.objectStoreNames.contains(name));
  
  const tx = db.transaction(storeNames, 'readwrite');
  
  await Promise.all(storeNames.map(name => tx.objectStore(name).clear()));
  await tx.done;
}

// ==================== Messaging Cache Operations ====================

export async function cacheConversations(conversations: CachedConversation[]): Promise<void> {
  const db = await getOfflineDB();
  if (!db.objectStoreNames.contains('conversations')) return;
  
  const tx = db.transaction('conversations', 'readwrite');
  const now = Date.now();
  
  for (const conv of conversations) {
    await tx.store.put({ ...conv, cachedAt: now });
  }
  
  await tx.done;
  await updateSyncMetadata('conversations', conversations.length);
}

export async function getCachedConversations(schoolId: string): Promise<CachedConversation[]> {
  const db = await getOfflineDB();
  if (!db.objectStoreNames.contains('conversations')) return [];
  
  const all = await db.getAllFromIndex('conversations', 'by-school', schoolId);
  return (all as CachedConversation[]).sort(
    (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
  );
}

export async function updateCachedConversation(conv: Partial<CachedConversation> & { id: string; schoolId: string }): Promise<void> {
  const db = await getOfflineDB();
  if (!db.objectStoreNames.contains('conversations')) return;
  
  const existing = await db.get('conversations', conv.id);
  if (existing) {
    await db.put('conversations', { ...existing, ...conv, cachedAt: Date.now() });
  } else {
    await db.put('conversations', { ...conv, cachedAt: Date.now() });
  }
}

export async function cacheMessages(messages: CachedMessage[]): Promise<void> {
  const db = await getOfflineDB();
  if (!db.objectStoreNames.contains('messages')) return;
  
  const tx = db.transaction('messages', 'readwrite');
  const now = Date.now();
  
  for (const msg of messages) {
    await tx.store.put({ ...msg, cachedAt: now });
  }
  
  await tx.done;
}

export async function getCachedMessages(schoolId: string, partnerId: string): Promise<CachedMessage[]> {
  const db = await getOfflineDB();
  if (!db.objectStoreNames.contains('messages')) return [];
  
  const all = await db.getAllFromIndex('messages', 'by-partner', partnerId);
  return (all as CachedMessage[])
    .filter(m => m.schoolId === schoolId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function addPendingMessage(message: CachedMessage): Promise<void> {
  const db = await getOfflineDB();
  if (!db.objectStoreNames.contains('messages')) return;
  
  await db.put('messages', { ...message, isPending: true, cachedAt: Date.now() });
}

export async function markMessageSynced(localId: string, realId: string): Promise<void> {
  const db = await getOfflineDB();
  if (!db.objectStoreNames.contains('messages')) return;
  
  const pending = await db.get('messages', localId);
  if (pending) {
    await db.delete('messages', localId);
    await db.put('messages', { ...pending, id: realId, isPending: false, localId: undefined });
  }
}

export async function getPendingMessages(schoolId: string): Promise<CachedMessage[]> {
  const db = await getOfflineDB();
  if (!db.objectStoreNames.contains('messages')) return [];
  
  const all = await db.getAll('messages');
  return (all as CachedMessage[]).filter(m => m.schoolId === schoolId && m.isPending === true);
}

export async function cacheContacts(contacts: CachedContact[]): Promise<void> {
  const db = await getOfflineDB();
  if (!db.objectStoreNames.contains('contacts')) return;
  
  const tx = db.transaction('contacts', 'readwrite');
  const now = Date.now();
  
  for (const contact of contacts) {
    await tx.store.put({ ...contact, cachedAt: now });
  }
  
  await tx.done;
  await updateSyncMetadata('contacts', contacts.length);
}

export async function getCachedContacts(schoolId: string): Promise<CachedContact[]> {
  const db = await getOfflineDB();
  if (!db.objectStoreNames.contains('contacts')) return [];
  
  return db.getAllFromIndex('contacts', 'by-school', schoolId) as Promise<CachedContact[]>;
}

export async function clearMessagesForConversation(schoolId: string, partnerId: string): Promise<void> {
  const db = await getOfflineDB();
  if (!db.objectStoreNames.contains('messages')) return;
  
  const tx = db.transaction('messages', 'readwrite');
  const all = await tx.store.index('by-partner').getAll(partnerId);
  
  for (const msg of all) {
    if ((msg as CachedMessage).schoolId === schoolId) {
      await tx.store.delete(msg.id);
    }
  }
  
  await tx.done;
}
