import { useQuery } from "@tanstack/react-query";
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

export function useAuthz({ schoolId, userId, role, requiredRoles }: AuthzOptions): AuthzResult {
  const { data, isLoading } = useQuery({
    queryKey: ["authz", schoolId, userId, role, requiredRoles],
    queryFn: async (): Promise<AuthzResult> => {
      if (!userId) {
        return { state: "denied", message: "Not authenticated", isPlatformAdmin: false, isMember: false, hasRole: false };
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
              .in("role", requiredRoles || (role ? [role] : []))
          : Promise.resolve({ data: null, error: null }),
      ]);

      const isPlatformAdmin = !!psaResult.data?.user_id;
      const isMember = !!membershipResult.data?.id;
      const hasRole = (roleResult.data?.length ?? 0) > 0;

      // Platform admins bypass all checks
      if (isPlatformAdmin) {
        return { state: "ok", message: null, isPlatformAdmin: true, isMember: true, hasRole: true };
      }

      // Check membership
      if (schoolId && !isMember) {
        return { state: "denied", message: "You are not a member of this school.", isPlatformAdmin: false, isMember: false, hasRole: false };
      }

      // Check role if required
      if ((role || requiredRoles?.length) && !hasRole) {
        return { 
          state: "denied", 
          message: `You do not have the required role in this school.`, 
          isPlatformAdmin: false, 
          isMember, 
          hasRole: false 
        };
      }

      return { state: "ok", message: null, isPlatformAdmin: false, isMember, hasRole };
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // Cache for 30 seconds
    gcTime: 60 * 1000, // Keep in cache for 1 minute
  });

  if (!userId) {
    return { state: "denied", message: "Not authenticated", isPlatformAdmin: false, isMember: false, hasRole: false };
  }

  if (isLoading) {
    return { state: "checking", message: null, isPlatformAdmin: false, isMember: false, hasRole: false };
  }

  return data || { state: "denied", message: "Unknown error", isPlatformAdmin: false, isMember: false, hasRole: false };
}
