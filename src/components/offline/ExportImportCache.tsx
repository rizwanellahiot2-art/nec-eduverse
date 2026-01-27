import { useState, useCallback } from 'react';
import { Download, Upload, FileJson, Trash2, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getOfflineDB } from '@/lib/offline-db';

interface ExportImportCacheProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
}

interface ExportData {
  version: number;
  exportedAt: string;
  schoolId: string;
  stores: Record<string, unknown[]>;
  localStorage: Record<string, string>;
}

const EXPORT_VERSION = 1;
const EXPORTABLE_STORES = [
  'students',
  'timetable',
  'assignments',
  'subjects',
  'classSections',
  'attendance',
  'homework',
  'contacts',
  'conversations',
  'messages',
];

export function ExportImportCache({
  open,
  onOpenChange,
  schoolId,
}: ExportImportCacheProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<Record<string, number>>({});

  // Calculate current cache stats
  const calculateStats = useCallback(async () => {
    const db = await getOfflineDB();
    const newStats: Record<string, number> = {};
    
    for (const store of EXPORTABLE_STORES) {
      try {
        const items = await db.getAll(store);
        const schoolItems = items.filter((item: any) => item.schoolId === schoolId);
        newStats[store] = schoolItems.length;
      } catch {
        newStats[store] = 0;
      }
    }
    
    setStats(newStats);
    return newStats;
  }, [schoolId]);

  // Export cache to JSON file
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setProgress(0);
    
    try {
      const db = await getOfflineDB();
      const exportData: ExportData = {
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        schoolId,
        stores: {},
        localStorage: {},
      };
      
      // Export IndexedDB stores
      for (let i = 0; i < EXPORTABLE_STORES.length; i++) {
        const store = EXPORTABLE_STORES[i];
        try {
          const items = await db.getAll(store);
          exportData.stores[store] = items.filter((item: any) => item.schoolId === schoolId);
        } catch {
          exportData.stores[store] = [];
        }
        setProgress(((i + 1) / EXPORTABLE_STORES.length) * 80);
      }
      
      // Export relevant localStorage items
      const prefixes = ['eduverse_stats_', 'eduverse_tenant_', 'eduverse_auth_'];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && prefixes.some(p => key.startsWith(p))) {
          exportData.localStorage[key] = localStorage.getItem(key) || '';
        }
      }
      
      setProgress(90);
      
      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eduverse-cache-${schoolId.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setProgress(100);
      toast.success('Cache exported successfully');
    } catch (error) {
      console.error('[ExportCache] Error:', error);
      toast.error('Failed to export cache');
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  }, [schoolId]);

  // Import cache from JSON file
  const handleImport = useCallback(async (file: File) => {
    setIsImporting(true);
    setProgress(0);
    
    try {
      const text = await file.text();
      const importData: ExportData = JSON.parse(text);
      
      // Validate import data
      if (importData.version !== EXPORT_VERSION) {
        throw new Error('Incompatible export version');
      }
      
      if (importData.schoolId !== schoolId) {
        throw new Error('Cache is from a different school');
      }
      
      const db = await getOfflineDB();
      const storeNames = Object.keys(importData.stores);
      
      // Import IndexedDB stores
      for (let i = 0; i < storeNames.length; i++) {
        const store = storeNames[i];
        const items = importData.stores[store];
        
        if (items && items.length > 0) {
          try {
            const tx = db.transaction(store, 'readwrite');
            for (const item of items) {
              await tx.store.put(item);
            }
            await tx.done;
          } catch (e) {
            console.warn(`[ImportCache] Failed to import ${store}:`, e);
          }
        }
        
        setProgress(((i + 1) / storeNames.length) * 80);
      }
      
      // Import localStorage items
      Object.entries(importData.localStorage).forEach(([key, value]) => {
        try {
          localStorage.setItem(key, value);
        } catch {
          // Ignore
        }
      });
      
      setProgress(100);
      await calculateStats();
      toast.success('Cache imported successfully');
    } catch (error) {
      console.error('[ImportCache] Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import cache');
    } finally {
      setIsImporting(false);
      setProgress(0);
    }
  }, [schoolId, calculateStats]);

  // Clear all cached data
  const handleClearCache = useCallback(async () => {
    if (!confirm('Are you sure you want to clear all cached data? This cannot be undone.')) {
      return;
    }
    
    try {
      const db = await getOfflineDB();
      
      for (const store of EXPORTABLE_STORES) {
        try {
          const tx = db.transaction(store, 'readwrite');
          const items = await tx.store.getAll();
          for (const item of items) {
            if ((item as any).schoolId === schoolId) {
              await tx.store.delete((item as any).id);
            }
          }
          await tx.done;
        } catch {
          // Ignore
        }
      }
      
      // Clear relevant localStorage
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes(schoolId)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      await calculateStats();
      toast.success('Cache cleared successfully');
    } catch (error) {
      toast.error('Failed to clear cache');
    }
  }, [schoolId, calculateStats]);

  // File input handler
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImport(file);
    }
    e.target.value = ''; // Reset input
  }, [handleImport]);

  // Load stats when dialog opens
  useState(() => {
    if (open) {
      calculateStats();
    }
  });

  const totalItems = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Export / Import Cache
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Cache Stats */}
          <div className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">Cached Data</span>
              <Badge variant="secondary">{totalItems} items</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(stats)
                .filter(([_, count]) => count > 0)
                .map(([store, count]) => (
                  <div key={store} className="flex justify-between text-muted-foreground">
                    <span className="capitalize">{store}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Progress indicator */}
          {(isExporting || isImporting) && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>{isExporting ? 'Exporting...' : 'Importing...'}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Action buttons */}
          <div className="grid gap-2">
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={isExporting || isImporting || totalItems === 0}
              className="justify-start gap-2"
            >
              <Download className="h-4 w-4" />
              Export Cache to File
            </Button>

            <label>
              <Button
                variant="outline"
                disabled={isExporting || isImporting}
                className="w-full justify-start gap-2"
                asChild
              >
                <span>
                  <Upload className="h-4 w-4" />
                  Import Cache from File
                </span>
              </Button>
              <input
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>

            <Button
              variant="outline"
              onClick={handleClearCache}
              disabled={isExporting || isImporting || totalItems === 0}
              className="justify-start gap-2 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              Clear All Cached Data
            </Button>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>
              Exported cache files contain school data and can be imported on 
              other devices for offline access. Keep these files secure.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
