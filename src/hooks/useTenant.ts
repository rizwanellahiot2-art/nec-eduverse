import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type TenantState =
  | { status: "idle" | "loading"; school: null; schoolId: null; error: null }
  | { status: "ready"; school: { id: string; slug: string; name: string }; schoolId: string; error: null }
  | { status: "error"; school: null; schoolId: null; error: string };

// LocalStorage cache key builder
const getTenantCacheKey = (slug: string) => `eduverse_tenant_basic_${slug}`;

// Get cached tenant data from localStorage
function getCachedTenant(slug: string): { id: string; slug: string; name: string } | null {
  try {
    const cached = localStorage.getItem(getTenantCacheKey(slug));
    if (!cached) return null;
    
    const parsed = JSON.parse(cached);
    const age = Date.now() - parsed.timestamp;
    
    // Cache valid for 24 hours
    if (age > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(getTenantCacheKey(slug));
      return null;
    }
    
    return parsed.data;
  } catch {
    return null;
  }
}

// Save tenant data to localStorage
function cacheTenant(slug: string, data: { id: string; slug: string; name: string }) {
  try {
    localStorage.setItem(
      getTenantCacheKey(slug),
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {
    // Ignore storage errors
  }
}

export function useTenant(schoolSlug: string | undefined) {
  const normalizedSlug = useMemo(
    () => (schoolSlug ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, ""),
    [schoolSlug],
  );

  // Check for cached data immediately for offline support
  const cachedData = useMemo(() => {
    if (!normalizedSlug) return null;
    return getCachedTenant(normalizedSlug);
  }, [normalizedSlug]);

  // Initialize state with cached data if available (offline-first)
  const [state, setState] = useState<TenantState>(() => {
    if (cachedData) {
      return {
        status: "ready",
        school: cachedData,
        schoolId: cachedData.id,
        error: null,
      };
    }
    return { status: "idle", school: null, schoolId: null, error: null };
  });

  useEffect(() => {
    if (!normalizedSlug) return;

    // If offline, use cached data immediately
    if (!navigator.onLine) {
      if (cachedData) {
        setState({
          status: "ready",
          school: cachedData,
          schoolId: cachedData.id,
          error: null,
        });
      } else {
        setState({ status: "error", school: null, schoolId: null, error: "Offline - no cached data" });
      }
      return;
    }

    let cancelled = false;
    
    // Only show loading if we don't have cached data
    if (!cachedData) {
      setState({ status: "loading", school: null, schoolId: null, error: null });
    }

    supabase
      .rpc("get_school_public_by_slug", { _slug: normalizedSlug })
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          // If we have cached data, keep using it on error
          if (cachedData) {
            setState({
              status: "ready",
              school: cachedData,
              schoolId: cachedData.id,
              error: null,
            });
          } else {
            setState({ status: "error", school: null, schoolId: null, error: error.message });
          }
          return;
        }
        if (!data) {
          if (cachedData) {
            setState({
              status: "ready",
              school: cachedData,
              schoolId: cachedData.id,
              error: null,
            });
          } else {
            setState({ status: "error", school: null, schoolId: null, error: "School not found." });
          }
          return;
        }
        
        // Cache the fresh data
        const tenantData = { id: data.id, slug: data.slug, name: data.name };
        cacheTenant(normalizedSlug, tenantData);
        
        setState({ status: "ready", school: tenantData, schoolId: data.id, error: null });
      });

    return () => {
      cancelled = true;
    };
  }, [normalizedSlug, cachedData]);

  return { ...state, slug: normalizedSlug };
}
