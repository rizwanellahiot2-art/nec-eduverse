import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Calendar, Plus, Search, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Section {
  id: string;
  name: string;
  class_name: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string | null;
  parent_name: string | null;
  student_code: string | null;
  status: string;
  section_id: string;
  section_name: string;
}

interface Guardian {
  id: string;
  full_name: string;
  relationship: string;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
}

export function TeacherStudentsModule() {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Add student dialog
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({
    first_name: "",
    last_name: "",
    parent_name: "",
    date_of_birth: "",
    student_code: "",
    status: "enrolled",
  });
  const [submitting, setSubmitting] = useState(false);

  // Add parent dialog
  const [addParentOpen, setAddParentOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [newParent, setNewParent] = useState({ full_name: "", relationship: "parent", phone: "", email: "" });

  // View guardians
  const [viewGuardiansOpen, setViewGuardiansOpen] = useState(false);
  const [guardians, setGuardians] = useState<Guardian[]>([]);

  useEffect(() => {
    if (tenant.status !== "ready") return;

    const fetchSections = async () => {
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

      const enriched = sectionData.map((s) => ({
        id: s.id,
        name: s.name,
        class_name: classMap.get(s.class_id) || "Unknown",
      }));

      setSections(enriched);
      if (enriched.length > 0) {
        setSelectedSection(enriched[0].id);
      }
      setLoading(false);
    };

    fetchSections();
  }, [tenant.status, tenant.schoolId]);

  useEffect(() => {
    if (!selectedSection || tenant.status !== "ready") return;

    const fetchStudents = async () => {
      const { data: enrollments } = await supabase
        .from("student_enrollments")
        .select("student_id, class_section_id")
        .eq("school_id", tenant.schoolId)
        .eq("class_section_id", selectedSection);

      if (!enrollments?.length) {
        setStudents([]);
        return;
      }

      const studentIds = enrollments.map((e) => e.student_id);
      const { data: studentData } = await supabase
        .from("students")
        .select("id, first_name, last_name, parent_name, student_code, status")
        .in("id", studentIds)
        .eq("status", "enrolled"); // Only show enrolled students to teachers

      const section = sections.find((s) => s.id === selectedSection);
      const mapped = (studentData || []).map((s) => ({
        ...s,
        section_id: selectedSection,
        section_name: section?.name || "",
      }));

      setStudents(mapped);
    };

    fetchStudents();
  }, [selectedSection, tenant.status, tenant.schoolId, sections]);

  const resetNewStudentForm = () => {
    setNewStudent({
      first_name: "",
      last_name: "",
      parent_name: "",
      date_of_birth: "",
      student_code: "",
      status: "enrolled",
    });
  };

  const handleAddStudent = async () => {
    if (!newStudent.first_name.trim()) {
      toast.error("First name is required");
      return;
    }
    if (!newStudent.parent_name.trim()) {
      toast.error("Parent name is required for identification");
      return;
    }
    if (!selectedSection) {
      toast.error("Please select a section first");
      return;
    }

    setSubmitting(true);
    try {
      const { data: student, error: studentErr } = await supabase
        .from("students")
        .insert({
          school_id: tenant.schoolId,
          first_name: newStudent.first_name.trim(),
          last_name: newStudent.last_name.trim() || null,
          parent_name: newStudent.parent_name.trim(),
          date_of_birth: newStudent.date_of_birth || null,
          student_code: newStudent.student_code.trim() || null,
          status: newStudent.status,
        })
        .select()
        .single();

      if (studentErr) throw studentErr;

      // Enroll in selected section
      const { error: enrollErr } = await supabase.from("student_enrollments").insert({
        school_id: tenant.schoolId,
        student_id: student.id,
        class_section_id: selectedSection,
      });

      if (enrollErr) throw enrollErr;

      toast.success("Student added successfully");
      setAddStudentOpen(false);
      resetNewStudentForm();

      // Refresh students list
      const section = sections.find((s) => s.id === selectedSection);
      setStudents((prev) => [
        ...prev,
        {
          id: student.id,
          first_name: student.first_name,
          last_name: student.last_name,
          parent_name: student.parent_name,
          student_code: student.student_code,
          status: student.status,
          section_id: selectedSection,
          section_name: section?.name || "",
        },
      ]);
    } catch (error: any) {
      toast.error(error.message || "Failed to add student");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddParent = async () => {
    if (!selectedStudentId || !newParent.full_name.trim()) {
      toast.error("Name is required");
      return;
    }

    const { error } = await supabase.from("student_guardians").insert({
      school_id: tenant.schoolId,
      student_id: selectedStudentId,
      full_name: newParent.full_name.trim(),
      relationship: newParent.relationship,
      phone: newParent.phone.trim() || null,
      email: newParent.email.trim() || null,
    });

    if (error) {
      toast.error(error.message || "Failed to add parent");
      return;
    }

    toast.success("Parent/Guardian added successfully");
    setAddParentOpen(false);
    setNewParent({ full_name: "", relationship: "parent", phone: "", email: "" });
    setSelectedStudentId(null);
  };

  const openAddParent = (studentId: string) => {
    setSelectedStudentId(studentId);
    setAddParentOpen(true);
  };

  const viewStudentGuardians = async (studentId: string) => {
    setSelectedStudentId(studentId);
    const { data } = await supabase
      .from("student_guardians")
      .select("*")
      .eq("student_id", studentId)
      .order("is_primary", { ascending: false });

    setGuardians(data || []);
    setViewGuardiansOpen(true);
  };

  const filteredStudents = students.filter((s) => {
    const fullName = `${s.first_name} ${s.last_name || ""}`.toLowerCase();
    const parentName = (s.parent_name || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return (
      fullName.includes(query) ||
      parentName.includes(query) ||
      (s.student_code?.toLowerCase().includes(query))
    );
  });

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
        <Select value={selectedSection} onValueChange={setSelectedSection}>
          <SelectTrigger className="w-[200px]">
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

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, parent, or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Dialog open={addStudentOpen} onOpenChange={setAddStudentOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Student
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Student</DialogTitle>
              <DialogDescription>
                Add a new student to {sections.find((s) => s.id === selectedSection)?.class_name} - {sections.find((s) => s.id === selectedSection)?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={newStudent.first_name}
                    onChange={(e) => setNewStudent((p) => ({ ...p, first_name: e.target.value }))}
                    placeholder="e.g., Ahmed"
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={newStudent.last_name}
                    onChange={(e) => setNewStudent((p) => ({ ...p, last_name: e.target.value }))}
                    placeholder="e.g., Khan"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="parent_name">Parent/Guardian Name *</Label>
                <Input
                  id="parent_name"
                  value={newStudent.parent_name}
                  onChange={(e) => setNewStudent((p) => ({ ...p, parent_name: e.target.value }))}
                  placeholder="Required for identification"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  This helps differentiate students with the same name
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Date of Birth</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newStudent.date_of_birth && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {newStudent.date_of_birth
                          ? format(new Date(newStudent.date_of_birth), "PPP")
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={newStudent.date_of_birth ? new Date(newStudent.date_of_birth) : undefined}
                        onSelect={(date) =>
                          setNewStudent((p) => ({
                            ...p,
                            date_of_birth: date ? format(date, "yyyy-MM-dd") : "",
                          }))
                        }
                        disabled={(date) => date > new Date() || date < new Date("1990-01-01")}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label htmlFor="student_code">Student Code</Label>
                  <Input
                    id="student_code"
                    value={newStudent.student_code}
                    onChange={(e) => setNewStudent((p) => ({ ...p, student_code: e.target.value }))}
                    placeholder="Optional ID/Code"
                  />
                </div>
              </div>

              <div>
                <Label>Status</Label>
                <Select
                  value={newStudent.status}
                  onValueChange={(v) => setNewStudent((p) => ({ ...p, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enrolled">Enrolled</SelectItem>
                    <SelectItem value="inquiry">Inquiry</SelectItem>
                    <SelectItem value="withdrawn">Withdrawn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setAddStudentOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleAddStudent} disabled={submitting}>
                {submitting ? "Adding..." : "Add Student"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>Students ({filteredStudents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        {s.first_name} {s.last_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.parent_name || "—"}
                      </TableCell>
                      <TableCell>{s.student_code || "—"}</TableCell>
                      <TableCell>
                        <span className="rounded-full bg-accent px-2 py-1 text-xs capitalize">{s.status}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openAddParent(s.id)}>
                            <UserPlus className="mr-1 h-3 w-3" /> Add Parent
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => viewStudentGuardians(s.id)}>
                            View Parents
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Parent Dialog */}
      <Dialog open={addParentOpen} onOpenChange={setAddParentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Parent/Guardian</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Full Name *</Label>
              <Input
                value={newParent.full_name}
                onChange={(e) => setNewParent((p) => ({ ...p, full_name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Relationship</Label>
              <Select
                value={newParent.relationship}
                onValueChange={(v) => setNewParent((p) => ({ ...p, relationship: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="mother">Mother</SelectItem>
                  <SelectItem value="father">Father</SelectItem>
                  <SelectItem value="guardian">Guardian</SelectItem>
                  <SelectItem value="grandparent">Grandparent</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={newParent.phone}
                onChange={(e) => setNewParent((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={newParent.email}
                onChange={(e) => setNewParent((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <Button onClick={handleAddParent} className="w-full">
              Add Parent/Guardian
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Guardians Dialog */}
      <Dialog open={viewGuardiansOpen} onOpenChange={setViewGuardiansOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Parents/Guardians</DialogTitle>
          </DialogHeader>
          <div className="pt-4">
            {guardians.length === 0 ? (
              <p className="text-sm text-muted-foreground">No parents/guardians added yet.</p>
            ) : (
              <div className="space-y-3">
                {guardians.map((g) => (
                  <div key={g.id} className="rounded-lg border p-3">
                    <p className="font-medium">{g.full_name}</p>
                    <p className="text-sm text-muted-foreground capitalize">{g.relationship}</p>
                    {g.phone && <p className="text-sm">📞 {g.phone}</p>}
                    {g.email && <p className="text-sm">✉️ {g.email}</p>}
                    {g.is_primary && (
                      <span className="mt-1 inline-block rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        Primary Contact
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
