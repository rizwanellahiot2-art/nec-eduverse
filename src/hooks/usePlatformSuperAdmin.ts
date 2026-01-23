import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

type PlatformAuthz = {
  loading: boolean;
  allowed: boolean;
  message: string | null;
};

/**
 * Server-verified platform super admin check.
 * Uses RLS on platform_super_admins (user can only see their own row).
 */
export function usePlatformSuperAdmin(userId: string | null | undefined): PlatformAuthz {
  const [state, setState] = useState<PlatformAuthz>({ loading: true, allowed: false, message: null });

  useEffect(() => {
    if (!userId) {
      setState({ loading: false, allowed: false, message: "Not signed in." });
      return;
    }

    let cancelled = false;
    setState({ loading: true, allowed: false, message: null });

    (async () => {
      const { data: psa, error } = await supabase
        .from("platform_super_admins")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        setState({ loading: false, allowed: false, message: error.message });
        return;
      }

      setState({ loading: false, allowed: !!psa?.user_id, message: psa?.user_id ? null : "Access denied. Platform Super Admin only." });
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return state;
}
