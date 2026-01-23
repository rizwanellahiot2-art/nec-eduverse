import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Lead = { id: string; status: string; assigned_to: string | null };
type Activity = { id: string; completed_at: string | null; created_by: string | null };

export function MarketingReportsModule() {
  const { schoolSlug } = useParams();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

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

  useEffect(() => {
    if (!schoolId) return;
    let cancelled = false;
    (async () => {
      const [{ data: l }, { data: a }] = await Promise.all([
        supabase.from("crm_leads").select("id,status,assigned_to").eq("school_id", schoolId),
        supabase.from("crm_activities").select("id,completed_at,created_by").eq("school_id", schoolId),
      ]);
      if (cancelled) return;
      setLeads((l ?? []) as Lead[]);
      setActivities((a ?? []) as Activity[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  const metrics = useMemo(() => {
    const total = leads.length;
    const won = leads.filter((l) => l.status === "won").length;
    const lost = leads.filter((l) => l.status === "lost").length;
    const open = leads.filter((l) => l.status === "open").length;
    const conversion = total ? Math.round((won / total) * 100) : 0;
    return { total, won, lost, open, conversion };
  }, [leads]);

  const counselorPerf = useMemo(() => {
    const byCounselor = new Map<string, { counselor: string; leads: number; won: number; activitiesCompleted: number }>();
    for (const l of leads) {
      if (!l.assigned_to) continue;
      const key = l.assigned_to;
      const cur = byCounselor.get(key) ?? { counselor: key, leads: 0, won: 0, activitiesCompleted: 0 };
      cur.leads += 1;
      if (l.status === "won") cur.won += 1;
      byCounselor.set(key, cur);
    }
    for (const a of activities) {
      if (!a.created_by) continue;
      if (!a.completed_at) continue;
      const key = a.created_by;
      const cur = byCounselor.get(key) ?? { counselor: key, leads: 0, won: 0, activitiesCompleted: 0 };
      cur.activitiesCompleted += 1;
      byCounselor.set(key, cur);
    }
    return [...byCounselor.values()].sort((a, b) => b.won - a.won);
  }, [leads, activities]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[{ k: "Leads", v: metrics.total }, { k: "Open", v: metrics.open }, { k: "Won", v: metrics.won }, { k: "Conversion %", v: metrics.conversion }].map(
          (m) => (
            <Card key={m.k} className="shadow-elevated">
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">{m.k}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-display text-3xl font-semibold tracking-tight">{m.v}</p>
              </CardContent>
            </Card>
          )
        )}
      </div>

      <div className="rounded-3xl bg-surface p-4 shadow-elevated">
        <p className="font-display text-lg font-semibold tracking-tight">Counselor performance</p>
        <p className="mt-1 text-sm text-muted-foreground">(IDs shown until we add name lookup)</p>
        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Counselor</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Won</TableHead>
                <TableHead>Completed follow-ups</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {counselorPerf.map((r) => (
                <TableRow key={r.counselor}>
                  <TableCell className="font-medium">{r.counselor}</TableCell>
                  <TableCell className="text-muted-foreground">{r.leads}</TableCell>
                  <TableCell className="text-muted-foreground">{r.won}</TableCell>
                  <TableCell className="text-muted-foreground">{r.activitiesCompleted}</TableCell>
                </TableRow>
              ))}
              {counselorPerf.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-sm text-muted-foreground">No counselor metrics yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
