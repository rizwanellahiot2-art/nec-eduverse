import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Edit,
  GraduationCap,
  Percent,
  Plus,
  Search,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { format, subDays } from "date-fns";

interface Student {
  id: string;
  first_name: string;
  last_name: string | null;
  parent_name: string | null;
  student_code: string | null;
  date_of_birth: string | null;
  status: string;
  profile_id: string | null;
  created_at: string;
}

interface ClassRow {
  id: string;
  name: string;
}

interface SectionRow {
  id: string;
  name: string;
  class_id: string;
}

interface Enrollment {
  student_id: string;
  class_section_id: string;
}

interface AttendanceStats {
  student_id: string;
  total: number;
  present: number;
  absent: number;
  late: number;
}

interface PrincipalStudentsTabProps {
  schoolId: string;
}

export function PrincipalStudentsTab({ schoolId }: PrincipalStudentsTabProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<Map<string, AttendanceStats>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSection, setFilterSection] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Form states for add/edit
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    parent_name: "",
    date_of_birth: "",
    section_id: "",
    status: "enrolled",
  });
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();

      const [
        { data: studentsData },
        { data: classesData },
        { data: sectionsData },
        { data: enrollmentsData },
        { data: attendanceData },
      ] = await Promise.all([
        supabase
          .from("students")
          .select("id, first_name, last_name, parent_name, student_code, date_of_birth, status, profile_id, created_at")
          .eq("school_id", schoolId)
          .order("first_name"),
        supabase.from("academic_classes").select("id, name").eq("school_id", schoolId).order("name"),
        supabase.from("class_sections").select("id, name, class_id").eq("school_id", schoolId),
        supabase.from("student_enrollments").select("student_id, class_section_id").eq("school_id", schoolId),
        supabase
          .from("attendance_entries")
          .select("student_id, status")
          .eq("school_id", schoolId)
          .gte("created_at", sevenDaysAgo),
      ]);

      setStudents((studentsData ?? []) as Student[]);
      setClasses((classesData ?? []) as ClassRow[]);
      setSections((sectionsData ?? []) as SectionRow[]);
      setEnrollments((enrollmentsData ?? []) as Enrollment[]);

      // Process attendance stats
      const statsMap = new Map<string, AttendanceStats>();
      (attendanceData ?? []).forEach((entry: any) => {
        const existing = statsMap.get(entry.student_id) || {
          student_id: entry.student_id,
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
        };
        existing.total++;
        if (entry.status === "present") existing.present++;
        else if (entry.status === "absent") existing.absent++;
        else if (entry.status === "late") existing.late++;
        statsMap.set(entry.student_id, existing);
      });
      setAttendanceStats(statsMap);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const getSectionLabel = useCallback(
    (sectionId: string) => {
      const section = sections.find((s) => s.id === sectionId);
      if (!section) return "Unassigned";
      const cls = classes.find((c) => c.id === section.class_id);
      return `${cls?.name ?? "Class"} • ${section.name}`;
    },
    [sections, classes]
  );

  const getStudentSection = useCallback(
    (studentId: string) => {
      const enrollment = enrollments.find((e) => e.student_id === studentId);
      return enrollment ? enrollment.class_section_id : null;
    },
    [enrollments]
  );

  // Enriched students with section and stats
  const enrichedStudents = useMemo(() => {
    return students.map((student) => {
      const sectionId = getStudentSection(student.id);
      const attendance = attendanceStats.get(student.id);
      const attendanceRate = attendance && attendance.total > 0
        ? Math.round((attendance.present / attendance.total) * 100)
        : null;

      return {
        ...student,
        sectionId,
        sectionLabel: sectionId ? getSectionLabel(sectionId) : "Unassigned",
        attendanceRate,
        attendanceStats: attendance,
      };
    });
  }, [students, getStudentSection, getSectionLabel, attendanceStats]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    let result = enrichedStudents;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.first_name.toLowerCase().includes(q) ||
          s.last_name?.toLowerCase().includes(q) ||
          s.parent_name?.toLowerCase().includes(q) ||
          s.student_code?.toLowerCase().includes(q)
      );
    }

    if (filterSection !== "all") {
      result = result.filter((s) => s.sectionId === filterSection);
    }

    if (filterStatus !== "all") {
      result = result.filter((s) => s.status === filterStatus);
    }

    return result;
  }, [enrichedStudents, searchQuery, filterSection, filterStatus]);

  const selectedStudent = useMemo(() => {
    return enrichedStudents.find((s) => s.id === selectedStudentId) ?? null;
  }, [enrichedStudents, selectedStudentId]);

  // Stats
  const stats = useMemo(() => {
    const enrolled = students.filter((s) => s.status === "enrolled").length;
    const inquiry = students.filter((s) => s.status === "inquiry").length;
    const avgAttendance = enrichedStudents
      .filter((s) => s.attendanceRate !== null)
      .reduce((sum, s, _, arr) => sum + (s.attendanceRate ?? 0) / arr.length, 0);

    return {
      total: students.length,
      enrolled,
      inquiry,
      avgAttendance: Math.round(avgAttendance),
    };
  }, [students, enrichedStudents]);

  // CRUD Operations
  const handleAddStudent = async () => {
    if (!formData.first_name.trim()) return toast.error("First name is required");
    if (!formData.parent_name.trim()) return toast.error("Parent name is required for identification");
    if (!formData.section_id) return toast.error("Please select a section");

    setSubmitting(true);
    try {
      const { data: student, error } = await supabase
        .from("students")
        .insert({
          school_id: schoolId,
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim() || null,
          parent_name: formData.parent_name.trim(),
          date_of_birth: formData.date_of_birth || null,
          status: formData.status,
        })
        .select("id")
        .single();

      if (error) throw error;

      const { error: enrollError } = await supabase.from("student_enrollments").insert({
        school_id: schoolId,
        student_id: student.id,
        class_section_id: formData.section_id,
      });

      if (enrollError) throw enrollError;

      toast.success("Student added successfully");
      setShowAddDialog(false);
      resetForm();
      await fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditStudent = async () => {
    if (!editingStudent) return;
    if (!formData.first_name.trim()) return toast.error("First name is required");
    if (!formData.parent_name.trim()) return toast.error("Parent name is required");

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("students")
        .update({
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim() || null,
          parent_name: formData.parent_name.trim(),
          date_of_birth: formData.date_of_birth || null,
          status: formData.status,
        })
        .eq("id", editingStudent.id);

      if (error) throw error;

      // Update enrollment if section changed
      const currentEnrollment = enrollments.find((e) => e.student_id === editingStudent.id);
      if (formData.section_id && formData.section_id !== currentEnrollment?.class_section_id) {
        if (currentEnrollment) {
          await supabase
            .from("student_enrollments")
            .update({ class_section_id: formData.section_id })
            .eq("school_id", schoolId)
            .eq("student_id", editingStudent.id);
        } else {
          await supabase.from("student_enrollments").insert({
            school_id: schoolId,
            student_id: editingStudent.id,
            class_section_id: formData.section_id,
          });
        }
      }

      toast.success("Student updated successfully");
      setShowEditDialog(false);
      setEditingStudent(null);
      resetForm();
      await fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!editingStudent) return;

    setSubmitting(true);
    try {
      // Delete enrollments first (with school_id filter for RLS)
      const { error: enrollError } = await supabase
        .from("student_enrollments")
        .delete()
        .eq("school_id", schoolId)
        .eq("student_id", editingStudent.id);

      if (enrollError) {
        console.error("Enrollment delete error:", enrollError);
      }

      // Then delete student (with school_id filter for RLS)
      const { error } = await supabase
        .from("students")
        .delete()
        .eq("school_id", schoolId)
        .eq("id", editingStudent.id);

      if (error) throw error;

      toast.success("Student deleted successfully");
      setShowDeleteDialog(false);
      setEditingStudent(null);
      setSelectedStudentId(null);
      await fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      parent_name: "",
      date_of_birth: "",
      section_id: "",
      status: "enrolled",
    });
  };

  const openEditDialog = (student: typeof enrichedStudents[0]) => {
    setEditingStudent(student);
    setFormData({
      first_name: student.first_name,
      last_name: student.last_name || "",
      parent_name: student.parent_name || "",
      date_of_birth: student.date_of_birth || "",
      section_id: student.sectionId || "",
      status: student.status,
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (student: typeof enrichedStudents[0]) => {
    setEditingStudent(student);
    setShowDeleteDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading students...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border bg-surface-2 p-4">
          <p className="text-sm text-muted-foreground">Total Students</p>
          <p className="mt-1 font-display text-2xl font-semibold">{stats.total}</p>
        </div>
        <div className="rounded-2xl border bg-surface-2 p-4">
          <p className="text-sm text-muted-foreground">Enrolled</p>
          <p className="mt-1 font-display text-2xl font-semibold text-primary">{stats.enrolled}</p>
        </div>
        <div className="rounded-2xl border bg-surface-2 p-4">
          <p className="text-sm text-muted-foreground">Inquiries</p>
          <p className="mt-1 font-display text-2xl font-semibold text-accent-foreground">{stats.inquiry}</p>
        </div>
        <div className="rounded-2xl border bg-surface-2 p-4">
          <p className="text-sm text-muted-foreground">Avg Attendance (7d)</p>
          <p className="mt-1 font-display text-2xl font-semibold">{stats.avgAttendance}%</p>
        </div>
      </div>

      {/* Search, Filters & Add Button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, parent name, or student code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterSection} onValueChange={setFilterSection}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Sections" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            {sections.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {getSectionLabel(s.id)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="enrolled">Enrolled</SelectItem>
            <SelectItem value="inquiry">Inquiry</SelectItem>
            <SelectItem value="withdrawn">Withdrawn</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Student
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Student List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Students ({filteredStudents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {filteredStudents.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => setSelectedStudentId(student.id)}
                    className={`w-full rounded-xl border p-3 text-left transition-colors hover:bg-muted/50 ${
                      selectedStudentId === student.id
                        ? "border-primary bg-primary/5"
                        : "border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate font-medium">
                          {student.first_name} {student.last_name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {student.parent_name ? `Parent: ${student.parent_name}` : student.sectionLabel}
                        </p>
                      </div>
                      <Badge
                        variant={student.status === "enrolled" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {student.status}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs">
                        {student.sectionLabel}
                      </Badge>
                      {student.attendanceRate !== null && (
                        <Badge
                          variant={student.attendanceRate >= 75 ? "secondary" : "destructive"}
                          className="text-xs"
                        >
                          {student.attendanceRate}% att
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}
                {filteredStudents.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No students found
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Student Details Panel */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  {selectedStudent
                    ? `${selectedStudent.first_name} ${selectedStudent.last_name || ""}`
                    : "Select a Student"}
                </CardTitle>
                {selectedStudent && (
                  <p className="text-sm text-muted-foreground">
                    {selectedStudent.student_code || "No student code"}
                  </p>
                )}
              </div>
              {selectedStudent && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(selectedStudent)}>
                    <Edit className="mr-1 h-4 w-4" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => openDeleteDialog(selectedStudent)}
                  >
                    <Trash2 className="mr-1 h-4 w-4" /> Delete
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedStudent ? (
              <div className="flex h-[400px] items-center justify-center">
                <p className="text-muted-foreground">
                  Select a student from the list to view details
                </p>
              </div>
            ) : (
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="attendance">Attendance</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-muted/50 p-3 text-center">
                      <GraduationCap className="mx-auto h-5 w-5 text-muted-foreground" />
                      <p className="mt-1 text-sm font-medium">{selectedStudent.sectionLabel}</p>
                      <p className="text-xs text-muted-foreground">Section</p>
                    </div>
                    <div className="rounded-xl bg-muted/50 p-3 text-center">
                      <Percent className="mx-auto h-5 w-5 text-muted-foreground" />
                      <p className="mt-1 text-xl font-semibold">
                        {selectedStudent.attendanceRate ?? "—"}%
                      </p>
                      <p className="text-xs text-muted-foreground">Attendance (7d)</p>
                    </div>
                  </div>

                  {/* Student Info */}
                  <div className="rounded-xl border bg-surface p-4">
                    <h4 className="mb-3 font-medium">Student Information</h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Full Name</p>
                        <p className="font-medium">
                          {selectedStudent.first_name} {selectedStudent.last_name}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Parent/Guardian</p>
                        <p className="font-medium">{selectedStudent.parent_name || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Date of Birth</p>
                        <p className="font-medium">
                          {selectedStudent.date_of_birth
                            ? format(new Date(selectedStudent.date_of_birth), "MMM d, yyyy")
                            : "Not specified"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Student Code</p>
                        <p className="font-medium">{selectedStudent.student_code || "Not assigned"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <Badge variant={selectedStudent.status === "enrolled" ? "default" : "secondary"}>
                          {selectedStudent.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Joined</p>
                        <p className="font-medium">
                          {format(new Date(selectedStudent.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="attendance" className="space-y-4">
                  <AttendanceDetailView
                    stats={selectedStudent.attendanceStats}
                    attendanceRate={selectedStudent.attendanceRate}
                  />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Student Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
            <DialogDescription>
              Add a new student to the school. Parent name is required for identification.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Last name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Parent/Guardian Name *</Label>
              <Input
                value={formData.parent_name}
                onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                placeholder="Parent or guardian's full name"
              />
              <p className="text-xs text-muted-foreground">
                Required to differentiate students with similar names
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enrolled">Enrolled</SelectItem>
                    <SelectItem value="inquiry">Inquiry</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Section *</Label>
              <Select
                value={formData.section_id}
                onValueChange={(v) => setFormData({ ...formData, section_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {getSectionLabel(s.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddStudent} disabled={submitting}>
              {submitting ? "Adding..." : "Add Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>Update student information.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Last name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Parent/Guardian Name *</Label>
              <Input
                value={formData.parent_name}
                onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                placeholder="Parent or guardian's full name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
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
            <div className="space-y-2">
              <Label>Section</Label>
              <Select
                value={formData.section_id}
                onValueChange={(v) => setFormData({ ...formData, section_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {getSectionLabel(s.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditStudent} disabled={submitting}>
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {editingStudent?.first_name} {editingStudent?.last_name}? 
              This action cannot be undone and will remove all associated data including enrollments 
              and attendance records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStudent}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? "Deleting..." : "Delete Student"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Sub-component for attendance detail
function AttendanceDetailView({
  stats,
  attendanceRate,
}: {
  stats?: AttendanceStats;
  attendanceRate: number | null;
}) {
  if (!stats) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <p className="text-muted-foreground">No attendance data for the last 7 days</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="font-medium">Attendance Rate (Last 7 Days)</h4>
          <Badge variant={attendanceRate && attendanceRate >= 75 ? "default" : "destructive"}>
            {attendanceRate}%
          </Badge>
        </div>
        <Progress value={attendanceRate || 0} className="h-3" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-primary/10 p-4 text-center">
          <CheckCircle className="mx-auto h-6 w-6 text-primary" />
          <p className="mt-2 text-2xl font-semibold text-primary">{stats.present}</p>
          <p className="text-sm text-muted-foreground">Present</p>
        </div>
        <div className="rounded-xl bg-destructive/10 p-4 text-center">
          <X className="mx-auto h-6 w-6 text-destructive" />
          <p className="mt-2 text-2xl font-semibold text-destructive">{stats.absent}</p>
          <p className="text-sm text-muted-foreground">Absent</p>
        </div>
        <div className="rounded-xl bg-accent/50 p-4 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-accent-foreground" />
          <p className="mt-2 text-2xl font-semibold text-accent-foreground">{stats.late}</p>
          <p className="text-sm text-muted-foreground">Late</p>
        </div>
      </div>
    </div>
  );
}
