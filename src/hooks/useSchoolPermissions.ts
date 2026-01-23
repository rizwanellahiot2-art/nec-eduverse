import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

type Permissions = {
  loading: boolean;
  error: string | null;
  isPlatformSuperAdmin: boolean;
  canManageStaff: boolean;
  canManageStudents: boolean;
  canWorkCrm: boolean;
};

export function useSchoolPermissions(schoolId: string | null) {
  const [state, setState] = useState<Permissions>({
    loading: true,
    error: null,
    isPlatformSuperAdmin: false,
    canManageStaff: false,
    canManageStudents: false,
    canWorkCrm: false,
  });

  const resolvedSchoolId = useMemo(() => schoolId ?? null, [schoolId]);

  useEffect(() => {
    if (!resolvedSchoolId) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id ?? null;
      if (!userId) {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: "Not signed in." }));
        return;
      }

      const { data: psa, error: psaErr } = await supabase
        .from("platform_super_admins")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (psaErr) {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: psaErr.message }));
        return;
      }
      const isPlatformSuperAdmin = !!psa?.user_id;

      if (isPlatformSuperAdmin) {
        if (!cancelled)
          setState({
            loading: false,
            error: null,
            isPlatformSuperAdmin: true,
            canManageStaff: true,
            canManageStudents: true,
            canWorkCrm: true,
          });
        return;
      }

      const [staff, students, crm] = await Promise.all([
        supabase.rpc("can_manage_staff", { _school_id: resolvedSchoolId }),
        supabase.rpc("can_manage_students", { _school_id: resolvedSchoolId }),
        supabase.rpc("can_work_crm", { _school_id: resolvedSchoolId }),
      ]);

      const err = staff.error ?? students.error ?? crm.error;
      if (err) {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: err.message }));
        return;
      }

      if (!cancelled)
        setState({
          loading: false,
          error: null,
          isPlatformSuperAdmin: false,
          canManageStaff: !!staff.data,
          canManageStudents: !!students.data,
          canWorkCrm: !!crm.data,
        });
    })();

    return () => {
      cancelled = true;
    };
  }, [resolvedSchoolId]);

  return state;
}
