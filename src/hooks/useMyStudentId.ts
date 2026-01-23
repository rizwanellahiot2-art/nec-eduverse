import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type State =
  | { status: "idle" | "loading"; studentId: null; error: null }
  | { status: "ready"; studentId: string; error: null }
  | { status: "error"; studentId: null; error: string };

export function useMyStudentId(schoolId: string | null) {
  const [state, setState] = useState<State>({ status: "idle", studentId: null, error: null });

  useEffect(() => {
    if (!schoolId) {
      setState({ status: "idle", studentId: null, error: null });
      return;
    }

    let cancelled = false;
    setState({ status: "loading", studentId: null, error: null });

    (async () => {
      const { data, error } = await supabase.rpc("my_student_id", { _school_id: schoolId });
      if (cancelled) return;
      if (error) {
        setState({ status: "error", studentId: null, error: error.message });
        return;
      }
      if (!data) {
        setState({ status: "error", studentId: null, error: "No student profile is linked to this account." });
        return;
      }
      setState({ status: "ready", studentId: data as string, error: null });
    })();

    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  return state;
}
