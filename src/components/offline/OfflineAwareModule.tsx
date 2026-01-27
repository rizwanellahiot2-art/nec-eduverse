// OfflineAwareModule - Universal wrapper for offline-first module loading
// Use this component to wrap any module that needs offline support

import { ReactNode, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useTenant } from "@/hooks/useTenant";
import { WifiOff } from "lucide-react";

interface OfflineAwareModuleProps {
  children: (props: {
    schoolId: string;
    schoolSlug: string;
    schoolName: string;
    isOffline: boolean;
  }) => ReactNode;
  loadingFallback?: ReactNode;
  requiresSchoolId?: boolean;
}

/**
 * OfflineAwareModule - Wraps tenant modules to provide offline-first loading.
 * 
 * Usage:
 * ```tsx
 * <OfflineAwareModule>
 *   {({ schoolId, isOffline }) => (
 *     <YourModuleContent schoolId={schoolId} isOffline={isOffline} />
 *   )}
 * </OfflineAwareModule>
 * ```
 */
export function OfflineAwareModule({
  children,
  loadingFallback,
  requiresSchoolId = true,
}: OfflineAwareModuleProps) {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;

  const schoolId = useMemo(() => {
    if (tenant.status === "ready") return tenant.schoolId;
    return null;
  }, [tenant.status, tenant.schoolId]);

  const schoolName = useMemo(() => {
    if (tenant.status === "ready") return tenant.school?.name || "School";
    return "School";
  }, [tenant.status, tenant.school]);

  // If we need a schoolId and don't have one, show loading or offline message
  if (requiresSchoolId && !schoolId) {
    if (isOffline) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <WifiOff className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="font-medium text-foreground">Offline Mode</p>
            <p className="text-sm text-muted-foreground">
              School data not cached. Connect to the internet and visit this page to cache it for offline use.
            </p>
          </div>
        </div>
      );
    }

    // Show minimal loading or custom fallback
    if (loadingFallback) {
      return <>{loadingFallback}</>;
    }

    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      {children({
        schoolId: schoolId!,
        schoolSlug: schoolSlug || tenant.slug || "",
        schoolName,
        isOffline,
      })}
    </>
  );
}

/**
 * OfflineBanner - Shows a banner when the user is offline
 */
export function OfflineBanner({ isUsingCache = false }: { isUsingCache?: boolean }) {
  const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;

  if (!isOffline && !isUsingCache) return null;

  return (
    <div className="rounded-2xl bg-warning/10 border border-warning/20 p-3 text-sm text-warning text-center">
      <WifiOff className="inline-block h-4 w-4 mr-2" />
      {isOffline ? "Offline Mode — Showing cached data" : "Showing cached data"}
    </div>
  );
}

/**
 * OfflineLoadingState - Replacement for generic loading spinners
 * Shows a message when offline instead of hanging on a spinner
 */
export function OfflineLoadingState({
  loading,
  hasData,
  children,
  emptyMessage = "No data available",
}: {
  loading: boolean;
  hasData: boolean;
  children: ReactNode;
  emptyMessage?: string;
}) {
  const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;

  if (loading) {
    if (isOffline) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <WifiOff className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {hasData ? "Loading cached data..." : "No cached data available offline"}
          </p>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!hasData) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>
    );
  }

  return <>{children}</>;
}
