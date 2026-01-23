import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Activity = {
  id: string;
  lead_id: string;
  activity_type: string;
  summary: string;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export function MarketingFollowUpsModule() {
  const { schoolSlug } = useParams();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [rows, setRows] = useState<Activity[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!schoolSlug) return;
      const { data: school } = await supabase.from("schools").select("id").eq("slug", schoolSlug).maybeSingle();
      if (cancelled) return;
      setSchoolId(school?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolSlug]);

  const refresh = async () => {
    if (!schoolId) return;
    const { data } = await supabase
      .from("crm_activities")
      .select("id,lead_id,activity_type,summary,due_at,completed_at,created_at")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });
    setRows((data ?? []) as Activity[]);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.summary.toLowerCase().includes(q) || r.activity_type.toLowerCase().includes(q));
  }, [rows, query]);

  const markComplete = async (id: string) => {
    setBusy(true);
    try {
      await supabase.from("crm_activities").update({ completed_at: new Date().toISOString() }).eq("id", id);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search follow-ups…" />
        <Button variant="soft" onClick={refresh}>Refresh</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Summary</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.summary}</TableCell>
              <TableCell className="text-muted-foreground">{r.activity_type}</TableCell>
              <TableCell className="text-muted-foreground">{r.due_at ? new Date(r.due_at).toLocaleString() : "—"}</TableCell>
              <TableCell className="text-muted-foreground">{r.completed_at ? "Completed" : "Open"}</TableCell>
              <TableCell className="text-right">
                {!r.completed_at ? (
                  <Button variant="hero" size="sm" disabled={busy} onClick={() => markComplete(r.id)}>
                    Complete
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-sm text-muted-foreground">No activities found.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
