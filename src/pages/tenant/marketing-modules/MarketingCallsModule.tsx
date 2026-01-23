import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Lead = { id: string; full_name: string };
type CallLog = {
  id: string;
  lead_id: string;
  called_at: string;
  duration_seconds: number;
  outcome: string;
  notes: string | null;
};

export function MarketingCallsModule() {
  const { schoolSlug } = useParams();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [logs, setLogs] = useState<CallLog[]>([]);

  const [leadId, setLeadId] = useState<string>("");
  const [duration, setDuration] = useState("0");
  const [outcome, setOutcome] = useState("connected");
  const [notes, setNotes] = useState("");
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
    const [{ data: leadsData }, { data: logsData }] = await Promise.all([
      supabase.from("crm_leads").select("id,full_name").eq("school_id", schoolId).order("created_at", { ascending: false }),
      supabase
        .from("crm_call_logs")
        .select("id,lead_id,called_at,duration_seconds,outcome,notes")
        .eq("school_id", schoolId)
        .order("called_at", { ascending: false }),
    ]);
    setLeads((leadsData ?? []) as Lead[]);
    setLogs((logsData ?? []) as CallLog[]);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const leadNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of leads) m.set(l.id, l.full_name);
    return m;
  }, [leads]);

  const add = async () => {
    if (!schoolId || !leadId) return;
    setBusy(true);
    try {
      const durationSeconds = Math.max(0, Number(duration || 0));
      await supabase.from("crm_call_logs").insert({
        school_id: schoolId,
        lead_id: leadId,
        duration_seconds: durationSeconds,
        outcome,
        notes: notes.trim() ? notes.trim() : null,
      });
      setNotes("");
      setDuration("0");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Select value={leadId} onValueChange={setLeadId}>
          <SelectTrigger>
            <SelectValue placeholder="Select lead" />
          </SelectTrigger>
          <SelectContent>
            {leads.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Duration (sec)" />

        <Select value={outcome} onValueChange={setOutcome}>
          <SelectTrigger>
            <SelectValue placeholder="Outcome" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="connected">Connected</SelectItem>
            <SelectItem value="no_answer">No answer</SelectItem>
            <SelectItem value="busy">Busy</SelectItem>
            <SelectItem value="wrong_number">Wrong number</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="hero" disabled={busy || !leadId} onClick={add}>
          Add call log
        </Button>
      </div>

      <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Lead</TableHead>
            <TableHead>When</TableHead>
            <TableHead>Outcome</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="font-medium">{leadNameById.get(l.lead_id) ?? l.lead_id}</TableCell>
              <TableCell className="text-muted-foreground">{new Date(l.called_at).toLocaleString()}</TableCell>
              <TableCell className="text-muted-foreground">{l.outcome}</TableCell>
              <TableCell className="text-muted-foreground">{l.duration_seconds}s</TableCell>
              <TableCell className="text-muted-foreground">{l.notes ?? "—"}</TableCell>
            </TableRow>
          ))}
          {logs.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-sm text-muted-foreground">No call logs yet.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
