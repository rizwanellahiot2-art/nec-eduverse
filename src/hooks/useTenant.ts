import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type TenantState =
  | { status: "idle" | "loading"; school: null; schoolId: null; error: null }
  | { status: "ready"; school: { id: string; slug: string; name: string }; schoolId: string; error: null }
  | { status: "error"; school: null; schoolId: null; error: string };

export function useTenant(schoolSlug: string | undefined) {
  const [state, setState] = useState<TenantState>({ status: "idle", school: null, schoolId: null, error: null });

  const normalizedSlug = useMemo(
    () => (schoolSlug ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, ""),
    [schoolSlug],
  );

  useEffect(() => {
    if (!normalizedSlug) return;

    let cancelled = false;
    setState({ status: "loading", school: null, schoolId: null, error: null });

    supabase
      .from("schools")
      .select("id,slug,name")
      .eq("slug", normalizedSlug)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setState({ status: "error", school: null, schoolId: null, error: error.message });
          return;
        }
        if (!data) {
          setState({ status: "error", school: null, schoolId: null, error: "School not found." });
          return;
        }
        setState({ status: "ready", school: data, schoolId: data.id, error: null });
      });

    return () => {
      cancelled = true;
    };
  }, [normalizedSlug]);

  return { ...state, slug: normalizedSlug };
}
