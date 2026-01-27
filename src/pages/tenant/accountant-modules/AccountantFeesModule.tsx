import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Edit, DollarSign, WifiOff, RefreshCw } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useOfflineFeePlans } from "@/hooks/useOfflineData";
import { OfflineDataBanner } from "@/components/offline/OfflineDataBanner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type FeePlan = {
  id: string;
  name: string;
  currency: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
};

type Installment = {
  id: string;
  fee_plan_id: string;
  label: string;
  amount: number;
  due_day: number | null;
  sort_order: number;
};

export function AccountantFeesModule() {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const queryClient = useQueryClient();
  const schoolId = tenant.status === "ready" ? tenant.schoolId : null;

  // Offline hook for fee plans
  const { isOffline, isUsingCache, refresh: refreshOffline } = useOfflineFeePlans(schoolId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<FeePlan | null>(null);
  const [formName, setFormName] = useState("");
  const [formCurrency, setFormCurrency] = useState("PKR");
  const [formNotes, setFormNotes] = useState("");
  const [formActive, setFormActive] = useState(true);

  const [installmentDialog, setInstallmentDialog] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [instLabel, setInstLabel] = useState("");
  const [instAmount, setInstAmount] = useState("");
  const [instDueDay, setInstDueDay] = useState("");

  const { data: feePlans = [], isLoading } = useQuery({
    queryKey: ["fee_plans", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fee_plans")
        .select("*")
        .eq("school_id", schoolId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as FeePlan[];
    },
    enabled: !!schoolId,
  });

  const { data: installments = [] } = useQuery({
    queryKey: ["fee_plan_installments", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fee_plan_installments")
        .select("*")
        .eq("school_id", schoolId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Installment[];
    },
    enabled: !!schoolId,
  });

  const resetForm = () => {
    setFormName("");
    setFormCurrency("PKR");
    setFormNotes("");
    setFormActive(true);
    setEditingPlan(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (plan: FeePlan) => {
    setEditingPlan(plan);
    setFormName(plan.name);
    setFormCurrency(plan.currency);
    setFormNotes(plan.notes || "");
    setFormActive(plan.is_active);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!schoolId) return;
    if (!formName.trim()) {
      toast.error("Plan name is required");
      return;
    }

    if (editingPlan) {
      const { error } = await supabase
        .from("fee_plans")
        .update({
          name: formName.trim(),
          currency: formCurrency.trim(),
          notes: formNotes.trim() || null,
          is_active: formActive,
        })
        .eq("id", editingPlan.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Fee plan updated");
    } else {
      const { error } = await supabase.from("fee_plans").insert({
        school_id: schoolId,
        name: formName.trim(),
        currency: formCurrency.trim(),
        notes: formNotes.trim() || null,
        is_active: formActive,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Fee plan created");
    }

    setDialogOpen(false);
    resetForm();
    queryClient.invalidateQueries({ queryKey: ["fee_plans", schoolId] });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("fee_plans").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Fee plan deleted");
    queryClient.invalidateQueries({ queryKey: ["fee_plans", schoolId] });
  };

  const openInstallmentDialog = (planId: string) => {
    setSelectedPlanId(planId);
    setInstLabel("");
    setInstAmount("");
    setInstDueDay("");
    setInstallmentDialog(true);
  };

  const handleAddInstallment = async () => {
    if (!schoolId || !selectedPlanId) return;
    if (!instLabel.trim()) {
      toast.error("Installment label required");
      return;
    }
    const amount = Number(instAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Amount must be a positive number");
      return;
    }

    const currentInstallments = installments.filter((i) => i.fee_plan_id === selectedPlanId);
    const sortOrder = currentInstallments.length + 1;

    const { error } = await supabase.from("fee_plan_installments").insert({
      school_id: schoolId,
      fee_plan_id: selectedPlanId,
      label: instLabel.trim(),
      amount,
      due_day: instDueDay ? Number(instDueDay) : null,
      sort_order: sortOrder,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Installment added");
    setInstallmentDialog(false);
    queryClient.invalidateQueries({ queryKey: ["fee_plan_installments", schoolId] });
  };

  const handleDeleteInstallment = async (id: string) => {
    const { error } = await supabase.from("fee_plan_installments").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Installment deleted");
    queryClient.invalidateQueries({ queryKey: ["fee_plan_installments", schoolId] });
  };

  const getInstallmentsForPlan = (planId: string) => installments.filter((i) => i.fee_plan_id === planId);

  if (isLoading && !isUsingCache) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <OfflineDataBanner isOffline={isOffline} isUsingCache={isUsingCache} onRefresh={refreshOffline} />
      <Card className="shadow-elevated">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-display text-xl">Fee Plans</CardTitle>
            <p className="text-sm text-muted-foreground">Create and manage fee structures with installments</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> Create Fee Plan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingPlan ? "Edit Fee Plan" : "Create Fee Plan"}</DialogTitle>
                <DialogDescription>Configure fee plan details and settings</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Plan Name</Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. 2026 Tuition Fee"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Input
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    placeholder="PKR"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Input
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Additional notes..."
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={formActive} onCheckedChange={setFormActive} />
                  <Label>Active</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>{editingPlan ? "Update" : "Create"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
      </Card>

      <div className="grid gap-4">
        {feePlans.map((plan) => (
          <Card key={plan.id} className="shadow-elevated">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Currency: {plan.currency} • Created {new Date(plan.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={plan.is_active ? "default" : "secondary"}>
                  {plan.is_active ? "Active" : "Inactive"}
                </Badge>
                <Button variant="ghost" size="icon" onClick={() => openEdit(plan)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete fee plan?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will also delete all installments. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(plan.id)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardHeader>
            <CardContent>
              {plan.notes && <p className="mb-4 text-sm text-muted-foreground">{plan.notes}</p>}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Installments</p>
                  <Button variant="outline" size="sm" onClick={() => openInstallmentDialog(plan.id)}>
                    <Plus className="mr-1 h-3 w-3" /> Add Installment
                  </Button>
                </div>

                <ScrollArea className="h-[150px] rounded-xl border bg-surface">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Label</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Due Day</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getInstallmentsForPlan(plan.id).map((inst) => (
                        <TableRow key={inst.id}>
                          <TableCell className="font-medium">{inst.label}</TableCell>
                          <TableCell>
                            {plan.currency} {inst.amount.toLocaleString()}
                          </TableCell>
                          <TableCell>{inst.due_day || "—"}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteInstallment(inst.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {getInstallmentsForPlan(plan.id).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No installments configured
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>

                <div className="flex justify-end text-sm font-medium">
                  Total: {plan.currency}{" "}
                  {getInstallmentsForPlan(plan.id)
                    .reduce((sum, i) => sum + i.amount, 0)
                    .toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {feePlans.length === 0 && (
          <Card className="shadow-elevated">
            <CardContent className="py-12 text-center">
              <DollarSign className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">No Fee Plans</p>
              <p className="text-sm text-muted-foreground">Create your first fee plan to get started</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Installment Dialog */}
      <Dialog open={installmentDialog} onOpenChange={setInstallmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Installment</DialogTitle>
            <DialogDescription>Add a new payment installment to this fee plan</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={instLabel}
                onChange={(e) => setInstLabel(e.target.value)}
                placeholder="e.g. Term 1 Fee"
              />
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                value={instAmount}
                onChange={(e) => setInstAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Due Day (optional)</Label>
              <Input
                type="number"
                value={instDueDay}
                onChange={(e) => setInstDueDay(e.target.value)}
                placeholder="e.g. 15 (day of month)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInstallmentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddInstallment}>Add Installment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
