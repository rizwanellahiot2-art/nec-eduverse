import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

interface Section {
  id: string;
  name: string;
  class_name: string;
}

interface Homework {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  status: string;
  class_section_id: string;
  section_name: string;
}

export function TeacherHomeworkModule() {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const [sections, setSections] = useState<Section[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);

  // Add homework dialog
  const [addOpen, setAddOpen] = useState(false);
  const [newHomework, setNewHomework] = useState({
    title: "",
    description: "",
    due_date: "",
    class_section_id: "",
  });

  const [filterSection, setFilterSection] = useState<string>("all");

  useEffect(() => {
    if (tenant.status !== "ready") return;
    fetchData();
  }, [tenant.status, tenant.schoolId]);

  const fetchData = async () => {
    setLoading(true);

    // Get current teacher's user id
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }

    // Only get assignments for THIS teacher
    const { data: assignments } = await supabase
      .from("teacher_assignments")
      .select("class_section_id")
      .eq("school_id", tenant.schoolId)
      .eq("teacher_user_id", userId);

    if (!assignments?.length) {
      setLoading(false);
      return;
    }

    const sectionIds = assignments.map((a) => a.class_section_id);

    const { data: sectionData } = await supabase
      .from("class_sections")
      .select("id, name, class_id")
      .in("id", sectionIds);

    if (!sectionData?.length) {
      setLoading(false);
      return;
    }

    const classIds = [...new Set(sectionData.map((s) => s.class_id))];
    const { data: classes } = await supabase
      .from("academic_classes")
      .select("id, name")
      .in("id", classIds);

    const classMap = new Map(classes?.map((c) => [c.id, c.name]) || []);

    const enrichedSections = sectionData.map((s) => ({
      id: s.id,
      name: s.name,
      class_name: classMap.get(s.class_id) || "Unknown",
    }));

    setSections(enrichedSections);

    // Fetch homework - only for THIS teacher's sections OR created by this teacher
    const { data: homeworkData } = await supabase
      .from("homework")
      .select("*")
      .eq("school_id", tenant.schoolId)
      .or(`class_section_id.in.(${sectionIds.join(",")}),teacher_user_id.eq.${userId}`)
      .order("due_date", { ascending: true });

    const sectionMap = new Map(enrichedSections.map((s) => [s.id, `${s.class_name} - ${s.name}`]));

    const enrichedHomework = (homeworkData || []).map((h) => ({
      ...h,
      section_name: sectionMap.get(h.class_section_id) || "",
    }));

    setHomework(enrichedHomework);
    setLoading(false);
  };

  const handleAddHomework = async () => {
    if (!newHomework.title.trim() || !newHomework.due_date || !newHomework.class_section_id) {
      toast({ title: "Title, section and due date are required", variant: "destructive" });
      return;
    }

    const { data: user } = await supabase.auth.getUser();

    const { error } = await supabase.from("homework").insert({
      school_id: tenant.schoolId,
      class_section_id: newHomework.class_section_id,
      teacher_user_id: user.user?.id,
      title: newHomework.title.trim(),
      description: newHomework.description.trim() || null,
      due_date: newHomework.due_date,
    });

    if (error) {
      toast({ title: "Failed to add homework", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Homework added successfully" });
    setAddOpen(false);
    setNewHomework({ title: "", description: "", due_date: "", class_section_id: "" });
    fetchData();
  };

  const markCompleted = async (id: string) => {
    const { error } = await supabase.from("homework").update({ status: "completed" }).eq("id", id);
    if (error) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Marked as completed" });
    fetchData();
  };

  const deleteHomework = async (id: string) => {
    const { error } = await supabase.from("homework").delete().eq("id", id);
    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Homework deleted" });
    fetchData();
  };

  const filteredHomework = filterSection === "all" 
    ? homework 
    : homework.filter((h) => h.class_section_id === filterSection);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  if (sections.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No classes assigned to you yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterSection} onValueChange={setFilterSection}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by section" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            {sections.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.class_name} - {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Homework
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Homework</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Section *</Label>
                <Select
                  value={newHomework.class_section_id}
                  onValueChange={(v) => setNewHomework((p) => ({ ...p, class_section_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.class_name} - {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title *</Label>
                <Input
                  value={newHomework.title}
                  onChange={(e) => setNewHomework((p) => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={newHomework.description}
                  onChange={(e) => setNewHomework((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <div>
                <Label>Due Date *</Label>
                <Input
                  type="date"
                  value={newHomework.due_date}
                  onChange={(e) => setNewHomework((p) => ({ ...p, due_date: e.target.value }))}
                />
              </div>
              <Button onClick={handleAddHomework} className="w-full">
                Add Homework
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Homework List */}
      <Card>
        <CardHeader>
          <CardTitle>Homework ({filteredHomework.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredHomework.length === 0 ? (
            <p className="text-sm text-muted-foreground">No homework found.</p>
          ) : (
            <div className="space-y-3">
              {filteredHomework.map((h) => (
                <div
                  key={h.id}
                  className={`rounded-lg border p-4 ${h.status === "completed" ? "bg-muted/50" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{h.title}</p>
                      <p className="text-sm text-muted-foreground">{h.section_name}</p>
                      {h.description && <p className="mt-2 text-sm">{h.description}</p>}
                      <p className="mt-2 text-xs text-muted-foreground">Due: {h.due_date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          h.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {h.status}
                      </span>
                      {h.status === "active" && (
                        <Button size="sm" variant="outline" onClick={() => markCompleted(h.id)}>
                          Mark Done
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => deleteHomework(h.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
