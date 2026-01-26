import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { EduverseRole } from "@/lib/eduverse-roles";

interface AuthzResult {
  state: "checking" | "ok" | "denied";
  message: string | null;
  isPlatformAdmin: boolean;
  isMember: boolean;
  hasRole: boolean;
}

interface AuthzOptions {
  schoolId: string | null;
  userId: string | null;
  role?: EduverseRole | null;
  requiredRoles?: EduverseRole[];
}

// Cache key for storing auth results
const AUTHZ_CACHE_KEY = "eduverse_authz_cache";

interface CachedAuthz {
  schoolId: string;
  userId: string;
  roles: string[];
  result: AuthzResult;
  timestamp: number;
}

// Cache duration: 24 hours (auth doesn't change often)
const CACHE_DURATION = 24 * 60 * 60 * 1000;

function getCachedAuthz(schoolId: string, userId: string, requiredRoles: string[]): AuthzResult | null {
  try {
    const cached = localStorage.getItem(AUTHZ_CACHE_KEY);
    if (!cached) return null;
    
    const data: CachedAuthz = JSON.parse(cached);
    
    // Check if cache is valid
    if (
      data.schoolId === schoolId &&
      data.userId === userId &&
      JSON.stringify(data.roles.sort()) === JSON.stringify(requiredRoles.sort()) &&
      Date.now() - data.timestamp < CACHE_DURATION
    ) {
      return data.result;
    }
    return null;
  } catch {
    return null;
  }
}

function setCachedAuthz(schoolId: string, userId: string, roles: string[], result: AuthzResult) {
  try {
    const data: CachedAuthz = {
      schoolId,
      userId,
      roles,
      result,
      timestamp: Date.now(),
    };
    localStorage.setItem(AUTHZ_CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

export function useAuthz({ schoolId, userId, role, requiredRoles }: AuthzOptions): AuthzResult {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const rolesArray = requiredRoles || (role ? [role] : []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Check for cached result when offline
  const cachedResult = schoolId && userId 
    ? getCachedAuthz(schoolId, userId, rolesArray) 
    : null;

  const { data, isLoading } = useQuery({
    queryKey: ["authz", schoolId, userId, role, requiredRoles],
    queryFn: async (): Promise<AuthzResult> => {
      if (!userId) {
        return { state: "denied", message: "Not authenticated", isPlatformAdmin: false, isMember: false, hasRole: false };
      }

      // If offline and we have cached data, use it
      if (!navigator.onLine && cachedResult) {
        return cachedResult;
      }

      // Run all checks in parallel for speed
      const [psaResult, membershipResult, roleResult] = await Promise.all([
        // Check platform super admin
        supabase
          .from("platform_super_admins")
          .select("user_id")
          .eq("user_id", userId)
          .maybeSingle(),
        
        // Check school membership
        schoolId
          ? supabase
              .from("school_memberships")
              .select("id")
              .eq("school_id", schoolId)
              .eq("user_id", userId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        
        // Check specific role or any of required roles
        schoolId && (role || requiredRoles?.length)
          ? supabase
              .from("user_roles")
              .select("role")
              .eq("school_id", schoolId)
              .eq("user_id", userId)
              .in("role", rolesArray)
          : Promise.resolve({ data: null, error: null }),
      ]);

      const isPlatformAdmin = !!psaResult.data?.user_id;
      const isMember = !!membershipResult.data?.id;
      const hasRole = (roleResult.data?.length ?? 0) > 0;

      let result: AuthzResult;

      // Platform admins bypass all checks
      if (isPlatformAdmin) {
        result = { state: "ok", message: null, isPlatformAdmin: true, isMember: true, hasRole: true };
      } else if (schoolId && !isMember) {
        // Check membership
        result = { state: "denied", message: "You are not a member of this school.", isPlatformAdmin: false, isMember: false, hasRole: false };
      } else if ((role || requiredRoles?.length) && !hasRole) {
        // Check role if required
        result = { 
          state: "denied", 
          message: `You do not have the required role in this school.`, 
          isPlatformAdmin: false, 
          isMember, 
          hasRole: false 
        };
      } else {
        result = { state: "ok", message: null, isPlatformAdmin: false, isMember, hasRole };
      }

      // Cache successful results
      if (schoolId && userId && result.state === "ok") {
        setCachedAuthz(schoolId, userId, rolesArray, result);
      }

      return result;
    },
    enabled: !!userId && (isOnline || !cachedResult), // Skip query if offline with cache
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: isOnline ? 3 : 0, // Don't retry when offline
    retryDelay: 1000,
  });

  if (!userId) {
    return { state: "denied", message: "Not authenticated", isPlatformAdmin: false, isMember: false, hasRole: false };
  }

  // If offline with cached data, use cache immediately
  if (!isOnline && cachedResult) {
    return cachedResult;
  }

  if (isLoading) {
    // If we have cached data, show OK while refreshing in background
    if (cachedResult) {
      return cachedResult;
    }
    return { state: "checking", message: null, isPlatformAdmin: false, isMember: false, hasRole: false };
  }

  return data || { state: "denied", message: "Unknown error", isPlatformAdmin: false, isMember: false, hasRole: false };
}
