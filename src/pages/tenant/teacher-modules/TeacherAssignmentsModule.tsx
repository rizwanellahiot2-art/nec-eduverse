import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Plus, Edit, Users } from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Section {
  id: string;
  name: string;
  class_name: string;
}

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  max_marks: number;
  assignment_type: string;
  due_date: string | null;
  class_section_id: string;
  section_name: string;
}

interface StudentResult {
  student_id: string;
  first_name: string;
  last_name: string | null;
  marks_obtained: number | null;
  grade: string | null;
  remarks: string | null;
}

export function TeacherAssignmentsModule() {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const [sections, setSections] = useState<Section[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Add assignment dialog
  const [addOpen, setAddOpen] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    title: "",
    description: "",
    max_marks: "100",
    assignment_type: "assignment",
    due_date: "",
    class_section_id: "",
  });

  // Enter results dialog
  const [resultsOpen, setResultsOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [savingResults, setSavingResults] = useState(false);

  const [filterSection, setFilterSection] = useState<string>("all");

  useEffect(() => {
    if (tenant.status !== "ready") return;
    fetchData();
  }, [tenant.status, tenant.schoolId]);

  const fetchData = async () => {
    setLoading(true);

    const { data: teacherAssignments } = await supabase
      .from("teacher_assignments")
      .select("class_section_id")
      .eq("school_id", tenant.schoolId);

    if (!teacherAssignments?.length) {
      setLoading(false);
      return;
    }

    const sectionIds = teacherAssignments.map((a) => a.class_section_id);

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

    // Fetch assignments
    const { data: assignmentData } = await supabase
      .from("assignments")
      .select("*")
      .eq("school_id", tenant.schoolId)
      .in("class_section_id", sectionIds)
      .order("created_at", { ascending: false });

    const sectionMap = new Map(enrichedSections.map((s) => [s.id, `${s.class_name} - ${s.name}`]));

    const enrichedAssignments = (assignmentData || []).map((a) => ({
      ...a,
      section_name: sectionMap.get(a.class_section_id) || "",
    }));

    setAssignments(enrichedAssignments);
    setLoading(false);
  };

  const handleAddAssignment = async () => {
    if (!newAssignment.title.trim() || !newAssignment.class_section_id) {
      toast({ title: "Title and section are required", variant: "destructive" });
      return;
    }

    const { data: user } = await supabase.auth.getUser();

    const { error } = await supabase.from("assignments").insert({
      school_id: tenant.schoolId,
      class_section_id: newAssignment.class_section_id,
      teacher_user_id: user.user?.id,
      title: newAssignment.title.trim(),
      description: newAssignment.description.trim() || null,
      max_marks: parseFloat(newAssignment.max_marks) || 100,
      assignment_type: newAssignment.assignment_type,
      due_date: newAssignment.due_date || null,
    });

    if (error) {
      toast({ title: "Failed to add assignment", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Assignment created successfully" });
    setAddOpen(false);
    setNewAssignment({
      title: "",
      description: "",
      max_marks: "100",
      assignment_type: "assignment",
      due_date: "",
      class_section_id: "",
    });
    fetchData();
  };

  const openResultsDialog = async (assignment: Assignment) => {
    setSelectedAssignment(assignment);

    // Load students
    const { data: enrollments } = await supabase
      .from("student_enrollments")
      .select("student_id")
      .eq("school_id", tenant.schoolId)
      .eq("class_section_id", assignment.class_section_id);

    if (!enrollments?.length) {
      setResults([]);
      setResultsOpen(true);
      return;
    }

    const studentIds = enrollments.map((e) => e.student_id);
    const { data: students } = await supabase
      .from("students")
      .select("id, first_name, last_name")
      .in("id", studentIds);

    // Load existing results
    const { data: existingResults } = await supabase
      .from("student_results")
      .select("student_id, marks_obtained, grade, remarks")
      .eq("assignment_id", assignment.id);

    const resultMap = new Map(existingResults?.map((r) => [r.student_id, r]) || []);

    const studentResults: StudentResult[] = (students || []).map((s) => {
      const existing = resultMap.get(s.id);
      return {
        student_id: s.id,
        first_name: s.first_name,
        last_name: s.last_name,
        marks_obtained: existing?.marks_obtained ?? null,
        grade: existing?.grade ?? null,
        remarks: existing?.remarks ?? null,
      };
    });

    setResults(studentResults);
    setResultsOpen(true);
  };

  const updateResult = (studentId: string, field: keyof StudentResult, value: string | number | null) => {
    setResults((prev) =>
      prev.map((r) => (r.student_id === studentId ? { ...r, [field]: value } : r))
    );
  };

  const saveResults = async () => {
    if (!selectedAssignment) return;

    setSavingResults(true);

    const { data: user } = await supabase.auth.getUser();

    const payload = results
      .filter((r) => r.marks_obtained !== null)
      .map((r) => ({
        school_id: tenant.schoolId,
        student_id: r.student_id,
        assignment_id: selectedAssignment.id,
        marks_obtained: r.marks_obtained,
        grade: r.grade,
        remarks: r.remarks,
        graded_by: user.user?.id,
        graded_at: new Date().toISOString(),
      }));

    const { error } = await supabase.from("student_results").upsert(payload, {
      onConflict: "student_id,assignment_id",
    });

    if (error) {
      toast({ title: "Failed to save results", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Results saved successfully" });
      setResultsOpen(false);
    }

    setSavingResults(false);
  };

  const filteredAssignments = filterSection === "all"
    ? assignments
    : assignments.filter((a) => a.class_section_id === filterSection);

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
              <Plus className="mr-2 h-4 w-4" /> Create Assignment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Assignment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Section *</Label>
                <Select
                  value={newAssignment.class_section_id}
                  onValueChange={(v) => setNewAssignment((p) => ({ ...p, class_section_id: v }))}
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
                <Label>Type</Label>
                <Select
                  value={newAssignment.assignment_type}
                  onValueChange={(v) => setNewAssignment((p) => ({ ...p, assignment_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assignment">Assignment</SelectItem>
                    <SelectItem value="quiz">Quiz</SelectItem>
                    <SelectItem value="test">Test</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title *</Label>
                <Input
                  value={newAssignment.title}
                  onChange={(e) => setNewAssignment((p) => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={newAssignment.description}
                  onChange={(e) => setNewAssignment((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Max Marks</Label>
                  <Input
                    type="number"
                    value={newAssignment.max_marks}
                    onChange={(e) => setNewAssignment((p) => ({ ...p, max_marks: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={newAssignment.due_date}
                    onChange={(e) => setNewAssignment((p) => ({ ...p, due_date: e.target.value }))}
                  />
                </div>
              </div>
              <Button onClick={handleAddAssignment} className="w-full">
                Create Assignment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Assignments List */}
      <Card>
        <CardHeader>
          <CardTitle>Assignments ({filteredAssignments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAssignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assignments found.</p>
          ) : (
            <div className="space-y-3">
              {filteredAssignments.map((a) => (
                <div key={a.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{a.title}</p>
                        <span className="rounded bg-accent px-2 py-0.5 text-xs capitalize">
                          {a.assignment_type}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{a.section_name}</p>
                      {a.description && <p className="mt-2 text-sm">{a.description}</p>}
                      <p className="mt-2 text-xs text-muted-foreground">
                        Max: {a.max_marks} marks {a.due_date && `• Due: ${a.due_date}`}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openResultsDialog(a)}>
                      <Users className="mr-1 h-4 w-4" /> Enter Results
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enter Results Dialog */}
      <Dialog open={resultsOpen} onOpenChange={setResultsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Enter Results: {selectedAssignment?.title}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                (Max: {selectedAssignment?.max_marks})
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="pt-4">
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground">No students enrolled.</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Marks</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((r) => (
                      <TableRow key={r.student_id}>
                        <TableCell className="font-medium">
                          {r.first_name} {r.last_name}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="w-20"
                            value={r.marks_obtained ?? ""}
                            onChange={(e) =>
                              updateResult(
                                r.student_id,
                                "marks_obtained",
                                e.target.value ? parseFloat(e.target.value) : null
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="w-16"
                            value={r.grade ?? ""}
                            onChange={(e) => updateResult(r.student_id, "grade", e.target.value || null)}
                            placeholder="A/B/C"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={r.remarks ?? ""}
                            onChange={(e) => updateResult(r.student_id, "remarks", e.target.value || null)}
                            placeholder="Optional"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4">
                  <Button onClick={saveResults} disabled={savingResults}>
                    {savingResults ? "Saving..." : "Save Results"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
