import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Metrics = {
  totalLeads: number;
  openLeads: number;
  won: number;
  lost: number;
  openActivities: number;
};

export function MarketingHomeModule() {
  const { schoolSlug } = useParams();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Metrics>({ totalLeads: 0, openLeads: 0, won: 0, lost: 0, openActivities: 0 });

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
      const { data: leads } = await supabase
        .from("crm_leads")
        .select("id,status")
        .eq("school_id", schoolId);
      const { data: activities } = await supabase
        .from("crm_activities")
        .select("id,completed_at")
        .eq("school_id", schoolId);

      if (cancelled) return;
      const totalLeads = leads?.length ?? 0;
      const won = (leads ?? []).filter((l) => l.status === "won").length;
      const lost = (leads ?? []).filter((l) => l.status === "lost").length;
      const openLeads = (leads ?? []).filter((l) => l.status === "open").length;
      const openActivities = (activities ?? []).filter((a) => !a.completed_at).length;
      setMetrics({ totalLeads, openLeads, won, lost, openActivities });
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  const cards = useMemo(
    () => [
      { label: "Total leads", value: metrics.totalLeads },
      { label: "Open leads", value: metrics.openLeads },
      { label: "Won", value: metrics.won },
      { label: "Lost", value: metrics.lost },
      { label: "Open follow-ups", value: metrics.openActivities },
    ],
    [metrics]
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {cards.map((c) => (
        <Card key={c.label} className="shadow-elevated">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">{c.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl font-semibold tracking-tight">{c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
