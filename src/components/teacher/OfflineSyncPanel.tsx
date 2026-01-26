import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  CloudOff,
  Wifi,
  RefreshCw,
  Download,
  Database,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Trash2,
  HardDrive,
  Users,
  Calendar,
  FileText,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SyncMetadata } from "@/lib/offline-db";
import { clearAllOfflineData } from "@/lib/offline-db";
import { toast } from "sonner";

interface OfflineSyncPanelProps {
  isOnline: boolean;
  isSyncing: boolean;
  stats: {
    pending: number;
    synced: number;
    failed: number;
    byType: Record<string, number>;
  };
  lastSyncAt: Date | null;
  syncProgress: { current: number; total: number; currentType: string } | null;
  storageInfo: { usageFormatted: string; quotaFormatted: string; percentUsed: number } | null;
  syncMetadata: SyncMetadata[];
  onSync: () => void;
  onPrefetchAll: () => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  attendance: <CheckCircle2 className="h-3.5 w-3.5" />,
  period_log: <Clock className="h-3.5 w-3.5" />,
  behavior_note: <FileText className="h-3.5 w-3.5" />,
  homework: <BookOpen className="h-3.5 w-3.5" />,
  quick_grade: <FileText className="h-3.5 w-3.5" />,
  message: <FileText className="h-3.5 w-3.5" />,
};

const typeLabels: Record<string, string> = {
  attendance: "Attendance",
  period_log: "Period Logs",
  behavior_note: "Behavior Notes",
  homework: "Homework",
  quick_grade: "Grades",
  message: "Messages",
};

const cacheIcons: Record<string, React.ReactNode> = {
  students: <Users className="h-4 w-4" />,
  timetable: <Calendar className="h-4 w-4" />,
  assignments: <FileText className="h-4 w-4" />,
  subjects: <BookOpen className="h-4 w-4" />,
  classSections: <Database className="h-4 w-4" />,
};

export function OfflineSyncPanel({
  isOnline,
  isSyncing,
  stats,
  lastSyncAt,
  syncProgress,
  storageInfo,
  syncMetadata,
  onSync,
  onPrefetchAll,
}: OfflineSyncPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClearCache = async () => {
    if (confirm("This will clear all cached data. Pending changes will be lost. Continue?")) {
      await clearAllOfflineData();
      toast.success("Offline cache cleared");
      window.location.reload();
    }
  };

  return (
    <Card className="shadow-elevated">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-display">
            {isOnline ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <CloudOff className="h-5 w-5 text-destructive" />
            )}
            Offline Sync
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {stats.pending > 0 && (
              <Badge variant="secondary" className="font-mono">
                {stats.pending} pending
              </Badge>
            )}
            {stats.failed > 0 && (
              <Badge variant="destructive" className="font-mono">
                {stats.failed} failed
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Sync Progress */}
        {syncProgress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Syncing {typeLabels[syncProgress.currentType] || syncProgress.currentType}...
              </span>
              <span className="font-mono text-xs">
                {syncProgress.current}/{syncProgress.total}
              </span>
            </div>
            <Progress value={(syncProgress.current / syncProgress.total) * 100} className="h-2" />
          </div>
        )}
        
        {/* Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "h-2 w-2 rounded-full",
                isOnline ? "bg-primary" : "bg-destructive"
              )}
            />
            <span className="text-sm">
              {isOnline ? "Connected" : "Offline Mode"}
            </span>
          </div>
          
          {lastSyncAt && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-muted-foreground">
                  Last sync: {formatDistanceToNow(lastSyncAt, { addSuffix: true })}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {format(lastSyncAt, "PPpp")}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onSync}
            disabled={isSyncing || !isOnline || stats.pending === 0}
            className="flex-1 min-w-[120px]"
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", isSyncing && "animate-spin")} />
            {isSyncing ? "Syncing..." : "Sync Now"}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onPrefetchAll}
            disabled={isSyncing || !isOnline}
            className="flex-1 min-w-[120px]"
          >
            <Download className="mr-2 h-4 w-4" />
            Prefetch Data
          </Button>
        </div>
        
        <Separator />
        
        {/* Expandable Details */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Cache Details
              </span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-4 pt-4">
            {/* Pending Queue by Type */}
            {Object.keys(stats.byType).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Pending by Type</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(stats.byType).map(([type, count]) => (
                    <div
                      key={type}
                      className="flex items-center justify-between rounded-md border p-2"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        {typeIcons[type]}
                        <span>{typeLabels[type] || type}</span>
                      </div>
                      <Badge variant="outline" className="font-mono">
                        {count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Cached Data */}
            {syncMetadata.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Cached Data</h4>
                <div className="space-y-1.5">
                  {syncMetadata.map((meta) => (
                    <div
                      key={meta.key}
                      className="flex items-center justify-between rounded-md border p-2"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        {cacheIcons[meta.key] || <Database className="h-4 w-4" />}
                        <span className="capitalize">{meta.key}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {meta.itemCount} items
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(meta.lastSyncAt, { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Storage Info */}
            {storageInfo && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <HardDrive className="h-4 w-4" />
                    Storage Usage
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {storageInfo.usageFormatted} / {storageInfo.quotaFormatted}
                  </span>
                </div>
                <Progress value={storageInfo.percentUsed} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {storageInfo.percentUsed.toFixed(1)}% of available storage used
                </p>
              </div>
            )}
            
            {/* Clear Cache */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearCache}
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear All Cache
            </Button>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
