import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Plus, Trash2, Share2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";

interface Section {
  id: string;
  name: string;
  class_name: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string | null;
  section_id: string;
}

interface BehaviorNote {
  id: string;
  student_id: string;
  student_name: string;
  note_type: string;
  title: string;
  content: string;
  is_shared_with_parents: boolean;
  created_at: string;
}

export function TeacherBehaviorModule() {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const [sections, setSections] = useState<Section[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [notes, setNotes] = useState<BehaviorNote[]>([]);
  const [loading, setLoading] = useState(true);

  // Add note dialog
  const [addOpen, setAddOpen] = useState(false);
  const [newNote, setNewNote] = useState({
    student_id: "",
    note_type: "observation",
    title: "",
    content: "",
    is_shared_with_parents: false,
  });

  const [filterType, setFilterType] = useState<string>("all");

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

    // Fetch students
    const { data: enrollments } = await supabase
      .from("student_enrollments")
      .select("student_id, class_section_id")
      .eq("school_id", tenant.schoolId)
      .in("class_section_id", sectionIds);

    if (enrollments?.length) {
      const studentIds = enrollments.map((e) => e.student_id);
      const { data: studentData } = await supabase
        .from("students")
        .select("id, first_name, last_name")
        .in("id", studentIds);

      const enrollmentMap = new Map(enrollments.map((e) => [e.student_id, e.class_section_id]));

      const enrichedStudents = (studentData || []).map((s) => ({
        ...s,
        section_id: enrollmentMap.get(s.id) || "",
      }));

      setStudents(enrichedStudents);

      // Fetch behavior notes
      const { data: notesData } = await supabase
        .from("behavior_notes")
        .select("*")
        .eq("school_id", tenant.schoolId)
        .in("student_id", studentIds)
        .order("created_at", { ascending: false });

      const studentMap = new Map(enrichedStudents.map((s) => [s.id, `${s.first_name} ${s.last_name || ""}`]));

      const enrichedNotes = (notesData || []).map((n) => ({
        ...n,
        student_name: studentMap.get(n.student_id) || "Unknown",
      }));

      setNotes(enrichedNotes);
    }

    setLoading(false);
  };

  const handleAddNote = async () => {
    if (!newNote.student_id || !newNote.title.trim() || !newNote.content.trim()) {
      toast({ title: "Student, title and content are required", variant: "destructive" });
      return;
    }

    const { data: user } = await supabase.auth.getUser();

    const { error } = await supabase.from("behavior_notes").insert({
      school_id: tenant.schoolId,
      student_id: newNote.student_id,
      teacher_user_id: user.user?.id,
      note_type: newNote.note_type,
      title: newNote.title.trim(),
      content: newNote.content.trim(),
      is_shared_with_parents: newNote.is_shared_with_parents,
    });

    if (error) {
      toast({ title: "Failed to add note", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Behavior note added successfully" });
    setAddOpen(false);
    setNewNote({
      student_id: "",
      note_type: "observation",
      title: "",
      content: "",
      is_shared_with_parents: false,
    });
    fetchData();
  };

  const deleteNote = async (id: string) => {
    const { error } = await supabase.from("behavior_notes").delete().eq("id", id);
    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Note deleted" });
    fetchData();
  };

  const toggleShare = async (note: BehaviorNote) => {
    const { error } = await supabase
      .from("behavior_notes")
      .update({ is_shared_with_parents: !note.is_shared_with_parents })
      .eq("id", note.id);

    if (error) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: note.is_shared_with_parents ? "Unshared from parents" : "Shared with parents" });
    fetchData();
  };

  const noteTypeColors: Record<string, string> = {
    observation: "bg-blue-100 text-blue-700",
    positive: "bg-green-100 text-green-700",
    concern: "bg-yellow-100 text-yellow-700",
    incident: "bg-red-100 text-red-700",
  };

  const filteredNotes = filterType === "all" 
    ? notes 
    : notes.filter((n) => n.note_type === filterType);

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
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="observation">Observation</SelectItem>
            <SelectItem value="positive">Positive</SelectItem>
            <SelectItem value="concern">Concern</SelectItem>
            <SelectItem value="incident">Incident</SelectItem>
          </SelectContent>
        </Select>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Note
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Behavior Note</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Student *</Label>
                <Select
                  value={newNote.student_id}
                  onValueChange={(v) => setNewNote((p) => ({ ...p, student_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.first_name} {s.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={newNote.note_type}
                  onValueChange={(v) => setNewNote((p) => ({ ...p, note_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="observation">Observation</SelectItem>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="concern">Concern</SelectItem>
                    <SelectItem value="incident">Incident</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title *</Label>
                <Input
                  value={newNote.title}
                  onChange={(e) => setNewNote((p) => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div>
                <Label>Content *</Label>
                <Textarea
                  value={newNote.content}
                  onChange={(e) => setNewNote((p) => ({ ...p, content: e.target.value }))}
                  rows={4}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="share"
                  checked={newNote.is_shared_with_parents}
                  onCheckedChange={(v) => setNewNote((p) => ({ ...p, is_shared_with_parents: !!v }))}
                />
                <Label htmlFor="share" className="cursor-pointer">
                  Share with parents
                </Label>
              </div>
              <Button onClick={handleAddNote} className="w-full">
                Add Note
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Notes List */}
      <Card>
        <CardHeader>
          <CardTitle>Behavior Notes ({filteredNotes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notes found.</p>
          ) : (
            <div className="space-y-3">
              {filteredNotes.map((n) => (
                <div key={n.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{n.title}</p>
                        <span className={`rounded px-2 py-0.5 text-xs capitalize ${noteTypeColors[n.note_type]}`}>
                          {n.note_type}
                        </span>
                        {n.is_shared_with_parents && (
                          <span className="rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
                            Shared
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{n.student_name}</p>
                      <p className="mt-2 text-sm">{n.content}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {new Date(n.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => toggleShare(n)}
                        title={n.is_shared_with_parents ? "Unshare" : "Share with parents"}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteNote(n.id)}>
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
