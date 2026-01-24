import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Campaign = { id: string; name: string; channel: string; status: string; budget: number };
type Lead = { id: string; full_name: string };
type Attribution = { lead_id: string; campaign_id: string };

export function MarketingCampaignsModule() {
  const { schoolSlug } = useParams();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [attribs, setAttribs] = useState<Attribution[]>([]);

  const [name, setName] = useState("");
  const [channel, setChannel] = useState("other");
  const [budget, setBudget] = useState("0");
  const [status, setStatus] = useState("active");

  const [leadId, setLeadId] = useState("");
  const [campaignId, setCampaignId] = useState("");
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
    const [{ data: c }, { data: l }, { data: a }] = await Promise.all([
      supabase.from("crm_campaigns").select("id,name,channel,status,budget").eq("school_id", schoolId).order("created_at", { ascending: false }),
      supabase.from("crm_leads").select("id,full_name").eq("school_id", schoolId).order("created_at", { ascending: false }),
      supabase.from("crm_lead_attributions").select("lead_id,campaign_id").eq("school_id", schoolId),
    ]);
    setCampaigns((c ?? []) as Campaign[]);
    setLeads((l ?? []) as Lead[]);
    setAttribs((a ?? []) as Attribution[]);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const createCampaign = async () => {
    if (!schoolId) return;
    setBusy(true);
    try {
      await supabase.from("crm_campaigns").insert({
        school_id: schoolId,
        name: name.trim() || "Untitled",
        channel,
        budget: Number(budget || 0),
        status,
      });
      setName("");
      setBudget("0");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const attribute = async () => {
    if (!schoolId || !leadId || !campaignId) return;
    setBusy(true);
    try {
      await supabase.from("crm_lead_attributions").upsert({
        school_id: schoolId,
        lead_id: leadId,
        campaign_id: campaignId,
      }, { onConflict: "lead_id,campaign_id" });
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const attributedLeadIds = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const a of attribs) {
      m.set(a.campaign_id, [...(m.get(a.campaign_id) ?? []), a.lead_id]);
    }
    return m;
  }, [attribs]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Campaign name" />
        <Select value={channel} onValueChange={setChannel}>
          <SelectTrigger><SelectValue placeholder="Channel" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="google">Google</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="referral">Referral</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Budget" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="ended">Ended</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="hero" disabled={busy} onClick={createCampaign}>Create</Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Select value={campaignId} onValueChange={setCampaignId}>
          <SelectTrigger><SelectValue placeholder="Select campaign" /></SelectTrigger>
          <SelectContent>
            {campaigns.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={leadId} onValueChange={setLeadId}>
          <SelectTrigger><SelectValue placeholder="Select lead" /></SelectTrigger>
          <SelectContent>
            {leads.map((l) => (
              <SelectItem key={l.id} value={l.id}>{l.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="soft" disabled={busy || !leadId || !campaignId} onClick={attribute}>Attribute lead</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Channel</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Budget</TableHead>
            <TableHead>Attributed leads</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.name}</TableCell>
              <TableCell className="text-muted-foreground">{c.channel}</TableCell>
              <TableCell className="text-muted-foreground">{c.status}</TableCell>
              <TableCell className="text-muted-foreground">{c.budget}</TableCell>
              <TableCell className="text-muted-foreground">{(attributedLeadIds.get(c.id) ?? []).length}</TableCell>
            </TableRow>
          ))}
          {campaigns.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-sm text-muted-foreground">No campaigns yet.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
