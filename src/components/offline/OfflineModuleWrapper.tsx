// Universal Offline Module Wrapper
// Provides consistent offline handling for all tenant shell modules

import { ReactNode } from 'react';
import { WifiOff } from 'lucide-react';
import { OfflineDataBanner } from './OfflineDataBanner';

interface OfflineModuleWrapperProps {
  children: ReactNode;
  isOffline: boolean;
  isUsingCache: boolean;
  loading: boolean;
  hasData: boolean;
  entityName?: string;
}

export function OfflineModuleWrapper({
  children,
  isOffline,
  isUsingCache,
  loading,
  hasData,
  entityName = 'data',
}: OfflineModuleWrapperProps) {
  // Show loading only when online and actually loading
  if (loading && !isOffline && !isUsingCache) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // No data state
  if (!hasData && !loading) {
    return (
      <div className="space-y-4">
        {isOffline && <OfflineDataBanner isOffline={isOffline} isUsingCache={true} />}
        <div className="rounded-2xl border bg-surface p-8 text-center">
          <WifiOff className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            {isOffline 
              ? `No cached ${entityName} available. Connect to the internet to load ${entityName}.`
              : `No ${entityName} found.`
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isUsingCache && <OfflineDataBanner isOffline={isOffline} isUsingCache={isUsingCache} />}
      {children}
    </div>
  );
}

// Simple offline loading fallback
export function OfflineLoadingState({ entityName = 'data' }: { entityName?: string }) {
  return (
    <div className="rounded-2xl border bg-surface p-8 text-center">
      <WifiOff className="mx-auto h-8 w-8 text-muted-foreground" />
      <p className="mt-3 text-sm text-muted-foreground">
        Loading cached {entityName}...
      </p>
    </div>
  );
}
