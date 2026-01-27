import { useState } from 'react';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  Check,
  AlertTriangle,
  Database,
  Loader2,
  Settings,
  Search,
  Download,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { ConnectionQualityBadge } from './ConnectionQualityBadge';
import { PendingChangesCounter } from './PendingChangesCounter';
import { SyncSettingsDialog } from './SyncSettingsDialog';
import { OfflineSearchDialog } from './OfflineSearchDialog';
import { ExportImportCache } from './ExportImportCache';
import { OfflineHelpDocs } from './OfflineHelpDocs';
import { ConnectionQuality } from '@/hooks/useConnectionQuality';

interface OfflineStats {
  pending: number;
  synced: number;
  failed: number;
  byType: Record<string, number>;
}

interface SyncProgress {
  current: number;
  total: number;
  currentType: string;
}

interface StorageInfo {
  usageFormatted: string;
  quotaFormatted: string;
  percentUsed: number;
}

interface EnhancedOfflineStatusProps {
  isOnline: boolean;
  isSyncing: boolean;
  stats: OfflineStats;
  lastSyncAt: Date | null;
  syncProgress: SyncProgress | null;
  storageInfo: StorageInfo | null;
  onSync: () => void;
  schoolId: string | null;
  // Connection quality props
  connectionQuality?: ConnectionQuality;
  effectiveType?: string;
  rtt?: number;
  downlink?: number;
  estimatedSyncTime?: string;
  variant?: 'floating' | 'inline' | 'compact';
  className?: string;
}

export function EnhancedOfflineStatus({
  isOnline,
  isSyncing,
  stats,
  lastSyncAt,
  syncProgress,
  storageInfo,
  onSync,
  schoolId,
  connectionQuality = isOnline ? 'fair' : 'offline',
  effectiveType,
  rtt,
  downlink,
  estimatedSyncTime,
  variant = 'floating',
  className,
}: EnhancedOfflineStatusProps) {
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const hasIssues = stats.pending > 0 || stats.failed > 0;
  const showBadge = !isOnline || hasIssues || isSyncing;

  const getStatusIcon = () => {
    if (isSyncing) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (!isOnline) return <CloudOff className="h-4 w-4" />;
    if (stats.failed > 0) return <AlertTriangle className="h-4 w-4" />;
    if (stats.pending > 0) return <RefreshCw className="h-4 w-4" />;
    return <Cloud className="h-4 w-4" />;
  };

  const getStatusColor = () => {
    if (!isOnline) return 'bg-amber-500';
    if (stats.failed > 0) return 'bg-destructive';
    if (isSyncing || stats.pending > 0) return 'bg-primary';
    return 'bg-emerald-500';
  };

  if (variant === 'compact') {
    return (
      <>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'relative h-8 w-8',
                !isOnline && 'text-amber-500',
                className
              )}
            >
              {getStatusIcon()}
              {showBadge && (
                <span
                  className={cn(
                    'absolute -right-0.5 -top-0.5 flex h-3 w-3 items-center justify-center rounded-full text-[8px] font-bold text-primary-foreground',
                    getStatusColor()
                  )}
                >
                  {stats.pending > 0 ? (stats.pending > 9 ? '9+' : stats.pending) : ''}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-3">
            <StatusContent
              isOnline={isOnline}
              isSyncing={isSyncing}
              stats={stats}
              lastSyncAt={lastSyncAt}
              syncProgress={syncProgress}
              storageInfo={storageInfo}
              connectionQuality={connectionQuality}
              effectiveType={effectiveType}
              rtt={rtt}
              downlink={downlink}
              estimatedSyncTime={estimatedSyncTime}
              onSync={onSync}
              onOpenSettings={() => {
                setOpen(false);
                setShowSettings(true);
              }}
              onOpenSearch={() => {
                setOpen(false);
                setShowSearch(true);
              }}
              onOpenExport={() => {
                setOpen(false);
                setShowExport(true);
              }}
              onOpenHelp={() => {
                setOpen(false);
                setShowHelp(true);
              }}
            />
          </PopoverContent>
        </Popover>

        <SyncSettingsDialog open={showSettings} onOpenChange={setShowSettings} />
        <OfflineSearchDialog open={showSearch} onOpenChange={setShowSearch} schoolId={schoolId} />
        {schoolId && (
          <ExportImportCache open={showExport} onOpenChange={setShowExport} schoolId={schoolId} />
        )}
        <OfflineHelpDocs open={showHelp} onOpenChange={setShowHelp} />
      </>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <ConnectionQualityBadge
          quality={connectionQuality}
          effectiveType={effectiveType}
          rtt={rtt}
          downlink={downlink}
          pendingCount={stats.pending}
          isSyncing={isSyncing}
          estimatedSyncTime={estimatedSyncTime}
        />
        <PendingChangesCounter
          pending={stats.pending}
          failed={stats.failed}
          synced={stats.synced}
          byType={stats.byType}
          isSyncing={isSyncing}
          isOnline={isOnline}
          onSync={onSync}
        />
      </div>
    );
  }

  // Floating variant (default)
  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'fixed bottom-20 right-4 z-40 gap-2 rounded-full shadow-lg transition-all lg:bottom-4',
              !isOnline && 'border-amber-500 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20',
              isSyncing && 'animate-pulse',
              className
            )}
          >
            {getStatusIcon()}
            <span className="hidden sm:inline">
              {isSyncing ? 'Syncing...' : isOnline ? 'Online' : 'Offline'}
            </span>
            {stats.pending > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 rounded-full px-1.5 text-[10px]">
                {stats.pending}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" side="top" className="w-80 p-4">
          <StatusContent
            isOnline={isOnline}
            isSyncing={isSyncing}
            stats={stats}
            lastSyncAt={lastSyncAt}
            syncProgress={syncProgress}
            storageInfo={storageInfo}
            connectionQuality={connectionQuality}
            effectiveType={effectiveType}
            rtt={rtt}
            downlink={downlink}
            estimatedSyncTime={estimatedSyncTime}
            onSync={onSync}
            onOpenSettings={() => {
              setOpen(false);
              setShowSettings(true);
            }}
            onOpenSearch={() => {
              setOpen(false);
              setShowSearch(true);
            }}
            onOpenExport={() => {
              setOpen(false);
              setShowExport(true);
            }}
            onOpenHelp={() => {
              setOpen(false);
              setShowHelp(true);
            }}
          />
        </PopoverContent>
      </Popover>

      <SyncSettingsDialog open={showSettings} onOpenChange={setShowSettings} />
      <OfflineSearchDialog open={showSearch} onOpenChange={setShowSearch} schoolId={schoolId} />
      {schoolId && (
        <ExportImportCache open={showExport} onOpenChange={setShowExport} schoolId={schoolId} />
      )}
      <OfflineHelpDocs open={showHelp} onOpenChange={setShowHelp} />
    </>
  );
}

interface StatusContentProps {
  isOnline: boolean;
  isSyncing: boolean;
  stats: OfflineStats;
  lastSyncAt: Date | null;
  syncProgress: SyncProgress | null;
  storageInfo: StorageInfo | null;
  connectionQuality: ConnectionQuality;
  effectiveType?: string;
  rtt?: number;
  downlink?: number;
  estimatedSyncTime?: string;
  onSync: () => void;
  onOpenSettings: () => void;
  onOpenSearch: () => void;
  onOpenExport: () => void;
  onOpenHelp: () => void;
}

function StatusContent({
  isOnline,
  isSyncing,
  stats,
  lastSyncAt,
  syncProgress,
  storageInfo,
  connectionQuality,
  effectiveType,
  rtt,
  downlink,
  estimatedSyncTime,
  onSync,
  onOpenSettings,
  onOpenSearch,
  onOpenExport,
  onOpenHelp,
}: StatusContentProps) {
  return (
    <div className="space-y-4">
      {/* Status Header with Connection Quality */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ConnectionQualityBadge
            quality={connectionQuality}
            effectiveType={effectiveType}
            rtt={rtt}
            downlink={downlink}
            pendingCount={stats.pending}
            isSyncing={isSyncing}
            estimatedSyncTime={estimatedSyncTime}
            showDetails={false}
          />
          <div>
            <p className="text-sm font-medium">{isOnline ? 'Connected' : 'Offline Mode'}</p>
            {lastSyncAt && (
              <p className="text-xs text-muted-foreground">
                Last sync: {lastSyncAt.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onSync} disabled={isSyncing || !isOnline}>
          {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      {/* Sync Progress */}
      {syncProgress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span>Syncing {syncProgress.currentType}...</span>
            <span>
              {syncProgress.current}/{syncProgress.total}
            </span>
          </div>
          <Progress value={(syncProgress.current / syncProgress.total) * 100} className="h-1.5" />
          {estimatedSyncTime && (
            <p className="text-xs text-muted-foreground">Est. time remaining: {estimatedSyncTime}</p>
          )}
        </div>
      )}

      {/* Queue Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-muted/50 p-2 text-center">
          <p className="text-lg font-semibold">{stats.pending}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </div>
        <div className="rounded-lg bg-emerald-500/10 p-2 text-center">
          <Check className="mx-auto h-4 w-4 text-emerald-600" />
          <p className="text-xs text-muted-foreground">{stats.synced} Synced</p>
        </div>
        <div className="rounded-lg bg-destructive/10 p-2 text-center">
          <p className="text-lg font-semibold text-destructive">{stats.failed}</p>
          <p className="text-xs text-muted-foreground">Failed</p>
        </div>
      </div>

      {/* Pending by Type */}
      {Object.keys(stats.byType).length > 0 && stats.pending > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Pending by type:</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(stats.byType)
              .filter(([_, count]) => count > 0)
              .map(([type, count]) => (
                <Badge key={type} variant="secondary" className="text-xs">
                  {type}: {count}
                </Badge>
              ))}
          </div>
        </div>
      )}

      {/* Storage Info */}
      {storageInfo && (
        <div className="space-y-1.5 border-t pt-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Database className="h-3.5 w-3.5" />
            <span>
              Local Storage: {storageInfo.usageFormatted} / {storageInfo.quotaFormatted}
            </span>
          </div>
          <Progress value={storageInfo.percentUsed} className="h-1" />
        </div>
      )}

      <Separator />

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-1">
        <Button variant="ghost" size="sm" onClick={onOpenSearch} className="flex-col gap-1 h-auto py-2">
          <Search className="h-4 w-4" />
          <span className="text-[10px]">Search</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={onOpenSettings} className="flex-col gap-1 h-auto py-2">
          <Settings className="h-4 w-4" />
          <span className="text-[10px]">Settings</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={onOpenExport} className="flex-col gap-1 h-auto py-2">
          <Download className="h-4 w-4" />
          <span className="text-[10px]">Export</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={onOpenHelp} className="flex-col gap-1 h-auto py-2">
          <HelpCircle className="h-4 w-4" />
          <span className="text-[10px]">Help</span>
        </Button>
      </div>

      {/* Offline Tips */}
      {!isOnline && (
        <div className="rounded-lg bg-amber-500/10 p-2.5 text-xs text-amber-700">
          <p className="font-medium">Working offline</p>
          <p className="mt-1 text-amber-600">
            Your changes are saved locally and will sync automatically when you're back online.
          </p>
        </div>
      )}
    </div>
  );
}
