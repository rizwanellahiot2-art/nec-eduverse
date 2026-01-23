import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type LeadRow = { id: string; source: string | null; status: string };

export function MarketingSourcesModule() {
  const { schoolSlug } = useParams();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [leads, setLeads] = useState<LeadRow[]>([]);

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
      const { data } = await supabase.from("crm_leads").select("id,source,status").eq("school_id", schoolId);
      if (cancelled) return;
      setLeads((data ?? []) as LeadRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  const rows = useMemo(() => {
    const map = new Map<string, { source: string; total: number; won: number; lost: number }>();
    for (const l of leads) {
      const key = (l.source ?? "unknown").trim() || "unknown";
      const cur = map.get(key) ?? { source: key, total: 0, won: 0, lost: 0 };
      cur.total += 1;
      if (l.status === "won") cur.won += 1;
      if (l.status === "lost") cur.lost += 1;
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [leads]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Source</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Won</TableHead>
          <TableHead>Lost</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.source}>
            <TableCell className="font-medium">{r.source}</TableCell>
            <TableCell className="text-muted-foreground">{r.total}</TableCell>
            <TableCell className="text-muted-foreground">{r.won}</TableCell>
            <TableCell className="text-muted-foreground">{r.lost}</TableCell>
          </TableRow>
        ))}
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={4} className="text-sm text-muted-foreground">No leads yet.</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
