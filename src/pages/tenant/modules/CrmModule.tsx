import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { KanbanSquare, Plus, Star } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useOfflineLeads, useOfflineCrmStages } from "@/hooks/useOfflineData";
import { OfflineDataBanner } from "@/components/offline/OfflineDataBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { SortableLeadCard } from "@/pages/tenant/modules/components/SortableLeadCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LeadActivityTimeline } from "@/pages/tenant/modules/components/LeadActivityTimeline";
import { useSchoolPermissions } from "@/hooks/useSchoolPermissions";

type Stage = { id: string; name: string; sort_order: number };
type Lead = { id: string; full_name: string; score: number; stage_id: string; notes: string | null };

export function CrmModule() {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const schoolId = useMemo(() => (tenant.status === "ready" ? tenant.schoolId : null), [tenant.status, tenant.schoolId]);

  const perms = useSchoolPermissions(schoolId);

  // Offline data hooks
  const offlineLeads = useOfflineLeads(schoolId);
  const offlineStages = useOfflineCrmStages(schoolId);
  const isOffline = offlineLeads.isOffline;
  const isUsingCache = offlineLeads.isUsingCache || offlineStages.isUsingCache;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);

  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadNotes, setNewLeadNotes] = useState("");

  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const openLead = useMemo(() => leads.find((l) => l.id === openLeadId) ?? null, [leads, openLeadId]);

  const refresh = async () => {
    if (!schoolId) return;

    // If offline, use cached data
    if (!navigator.onLine) {
      const cachedStages = offlineStages.data.map(s => ({
        id: s.id,
        name: s.name,
        sort_order: s.sortOrder,
      }));
      const cachedLeads = offlineLeads.data.map(l => ({
        id: l.id,
        full_name: l.fullName,
        score: l.score,
        stage_id: l.stageId,
        notes: l.notes ?? null,
      }));
      setStages(cachedStages);
      setLeads(cachedLeads);
      if (cachedStages.length > 0) {
        setPipelineId(offlineStages.data[0]?.pipelineId ?? null);
      }
      return;
    }

    // ensure defaults
    await supabase.rpc("ensure_default_crm_pipeline", { _school_id: schoolId });

    const { data: p } = await supabase
      .from("crm_pipelines")
      .select("id")
      .eq("school_id", schoolId)
      .eq("is_default", true)
      .maybeSingle();
    const pid = (p as any)?.id as string | undefined;
    if (!pid) return;
    setPipelineId(pid);

    const { data: s } = await supabase
      .from("crm_stages")
      .select("id,name,sort_order")
      .eq("school_id", schoolId)
      .eq("pipeline_id", pid)
      .order("sort_order", { ascending: true });
    setStages((s ?? []) as Stage[]);

    const { data: l } = await supabase
      .from("crm_leads")
      .select("id,full_name,score,stage_id,notes")
      .eq("school_id", schoolId)
      .eq("pipeline_id", pid)
      .order("updated_at", { ascending: false });
    setLeads((l ?? []) as Lead[]);
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, offlineLeads.data, offlineStages.data]);

  const createLead = async (stageId: string) => {
    if (!schoolId || !pipelineId) return;
    if (!newLeadName.trim()) return toast.error("Lead name required");
    const { error } = await supabase.from("crm_leads").insert({
      school_id: schoolId,
      pipeline_id: pipelineId,
      stage_id: stageId,
      full_name: newLeadName.trim(),
      notes: newLeadNotes.trim() || null,
      score: 0,
    });
    if (error) return toast.error(error.message);
    setNewLeadName("");
    setNewLeadNotes("");
    toast.success("Lead created");
    await refresh();
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    // Dropped on a stage column
    if (overId.startsWith("stage:")) {
      const stageId = overId.replace("stage:", "");
      const lead = leads.find((l) => l.id === activeId);
      if (!lead || lead.stage_id === stageId) return;

      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, stage_id: stageId } : l)));
      const { error } = await supabase.from("crm_leads").update({ stage_id: stageId }).eq("id", lead.id);
      if (error) {
        toast.error(error.message);
        await refresh();
      }
      return;
    }

    // Dropped on another lead card within same stage: reorder locally only (persist later with sort column)
    const fromIdx = leads.findIndex((l) => l.id === activeId);
    const toIdx = leads.findIndex((l) => l.id === overId);
    if (fromIdx !== -1 && toIdx !== -1) setLeads((prev) => arrayMove(prev, fromIdx, toIdx));
  };

  const byStage = useMemo(() => {
    const map = new Map<string, Lead[]>();
    stages.forEach((s) => map.set(s.id, []));
    leads.forEach((l) => {
      map.set(l.stage_id, [...(map.get(l.stage_id) ?? []), l]);
    });
    return map;
  }, [leads, stages]);

  return (
    <div className="space-y-4">
      <OfflineDataBanner isOffline={isOffline} isUsingCache={isUsingCache} onRefresh={refresh} />
      {!perms.loading && !perms.canWorkCrm && (
        <Card className="shadow-elevated">
          <CardHeader>
            <CardTitle className="font-display text-xl">Admissions CRM</CardTitle>
            <p className="text-sm text-muted-foreground">Access restricted</p>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl bg-accent p-4 text-sm text-accent-foreground">
              You don’t have CRM permissions in this school (counselor/marketing/staff manager).
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-elevated">
        <CardHeader>
          <CardTitle className="font-display text-xl">Admissions CRM</CardTitle>
          <p className="text-sm text-muted-foreground">Pipelines • Kanban • Lead scoring • Activity timeline</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <Input value={newLeadName} onChange={(e) => setNewLeadName(e.target.value)} placeholder="Lead name" />
            <Textarea value={newLeadNotes} onChange={(e) => setNewLeadNotes(e.target.value)} placeholder="Notes (optional)" />
          </div>
        </CardContent>
      </Card>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {stages.map((s) => {
            const stageLeads = byStage.get(s.id) ?? [];
            return (
              <div key={s.id} className="rounded-3xl bg-surface p-4 shadow-elevated" id={`stage:${s.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KanbanSquare className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{s.name}</p>
                  </div>
                  <Button variant="soft" size="icon" onClick={() => createLead(s.id)} aria-label="Add lead">
                    <Plus />
                  </Button>
                </div>

                <div className="mt-3">
                  <SortableContext items={stageLeads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2" id={`stage:${s.id}`}>
                      {stageLeads.map((l) => (
                        <SortableLeadCard
                          key={l.id}
                          lead={l}
                          onOpen={() => setOpenLeadId(l.id)}
                          onBumpScore={async () => {
                            const next = Math.min(100, (l.score ?? 0) + 5);
                            setLeads((prev) => prev.map((x) => (x.id === l.id ? { ...x, score: next } : x)));
                            const { error } = await supabase.from("crm_leads").update({ score: next }).eq("id", l.id);
                            if (error) {
                              toast.error(error.message);
                              await refresh();
                            }
                          }}
                        />
                      ))}
                      {stageLeads.length === 0 && (
                        <div className="rounded-2xl border border-dashed bg-surface-2 p-4 text-sm text-muted-foreground">
                          Drag leads here
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{stageLeads.length} leads</span>
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3 w-3" /> score
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </DndContext>

      <Dialog open={!!openLeadId} onOpenChange={(v) => !v && setOpenLeadId(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-display">{openLead?.full_name ?? "Lead"}</DialogTitle>
          </DialogHeader>
          {schoolId && openLeadId ? (
            <LeadActivityTimeline schoolId={schoolId} leadId={openLeadId} />
          ) : (
            <div className="text-sm text-muted-foreground">Loading…</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
