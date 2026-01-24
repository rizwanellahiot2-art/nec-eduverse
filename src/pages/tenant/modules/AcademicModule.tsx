import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { GraduationCap, Plus, UserCog } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

import { SubjectCatalogCard, type SubjectRow } from "@/pages/tenant/modules/components/SubjectCatalogCard";
import {
  SectionSubjectsCard,
  type ClassSectionSubjectRow,
} from "@/pages/tenant/modules/components/SectionSubjectsCard";
import {
  TeacherSubjectAssignmentsCard,
  type TeacherSubjectAssignmentRow,
} from "@/pages/tenant/modules/components/TeacherSubjectAssignmentsCard";

import { AssessmentManagerCard } from "@/pages/tenant/modules/components/AssessmentManagerCard";
import { GradeThresholdsCard } from "@/pages/tenant/modules/components/GradeThresholdsCard";

type ClassRow = { id: string; name: string; grade_level: number | null };
type SectionRow = { id: string; name: string; class_id: string; room: string | null };
type StudentRow = { id: string; first_name: string; last_name: string | null; status: string; profile_id: string | null };
type DirectoryProfileRow = { user_id: string; profile_id: string | null; email: string; display_name: string | null };

export function AcademicModule() {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const schoolId = useMemo(() => (tenant.status === "ready" ? tenant.schoolId : null), [tenant.status, tenant.schoolId]);

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [directoryUsers, setDirectoryUsers] = useState<DirectoryProfileRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [classSectionSubjects, setClassSectionSubjects] = useState<ClassSectionSubjectRow[]>([]);
  const [teacherSubjectAssignments, setTeacherSubjectAssignments] = useState<TeacherSubjectAssignmentRow[]>([]);

  const [newClassName, setNewClassName] = useState("");
  const [newSectionName, setNewSectionName] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");

  const [studentFirst, setStudentFirst] = useState("");
  const [studentLast, setStudentLast] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");

  const [linkStudentId, setLinkStudentId] = useState<string>("");
  const [linkUserId, setLinkUserId] = useState<string>("");

  const [teachers, setTeachers] = useState<{ user_id: string; email: string; display_name: string | null }[]>([]);
  const [teacherUserId, setTeacherUserId] = useState<string>("");
  const [assignSectionId, setAssignSectionId] = useState<string>("");

  const refresh = async () => {
    if (!schoolId) return;

    const [c, s, st, dirUsers, roleRows, dir, subj, css, tsa] = await Promise.all([
      supabase.from("academic_classes").select("id,name,grade_level").eq("school_id", schoolId),
      supabase.from("class_sections").select("id,name,class_id,room").eq("school_id", schoolId).order("name"),
      supabase
        .from("students")
        .select("id,first_name,last_name,status,profile_id")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.rpc("list_school_user_profiles", { _school_id: schoolId }),
      supabase.from("user_roles").select("user_id").eq("school_id", schoolId).eq("role", "teacher"),
      supabase.from("school_user_directory").select("user_id,email,display_name").eq("school_id", schoolId).order("email"),
      supabase.from("subjects").select("id,name,code").eq("school_id", schoolId).order("name"),
      supabase.from("class_section_subjects").select("id,class_section_id,subject_id").eq("school_id", schoolId),
      supabase
        .from("teacher_subject_assignments")
        .select("id,class_section_id,subject_id,teacher_user_id")
        .eq("school_id", schoolId),
    ]);

    setClasses((c.data ?? []) as ClassRow[]);
    setSections((s.data ?? []) as SectionRow[]);
    setStudents((st.data ?? []) as StudentRow[]);
    setDirectoryUsers((dirUsers.data ?? []) as DirectoryProfileRow[]);
    setSubjects((subj.data ?? []) as SubjectRow[]);
    setClassSectionSubjects((css.data ?? []) as ClassSectionSubjectRow[]);
    setTeacherSubjectAssignments((tsa.data ?? []) as TeacherSubjectAssignmentRow[]);

    const ids = new Set((roleRows.data ?? []).map((r: any) => r.user_id as string));
    setTeachers(((dir.data ?? []) as any[]).filter((d) => ids.has(d.user_id)) as any);
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const createClass = async () => {
    if (!schoolId) return;
    if (!newClassName.trim()) return toast.error("Class name required");
    const { error } = await supabase.from("academic_classes").insert({ school_id: schoolId, name: newClassName.trim() });
    if (error) return toast.error(error.message);
    setNewClassName("");
    toast.success("Class created");
    await refresh();
  };

  const createSection = async () => {
    if (!schoolId) return;
    if (!selectedClassId) return toast.error("Pick a class");
    if (!newSectionName.trim()) return toast.error("Section name required");
    const { error } = await supabase
      .from("class_sections")
      .insert({ school_id: schoolId, class_id: selectedClassId, name: newSectionName.trim() });
    if (error) return toast.error(error.message);
    setNewSectionName("");
    toast.success("Section created");
    await refresh();
  };

  const createStudentAndEnroll = async () => {
    if (!schoolId) return;
    if (!studentFirst.trim()) return toast.error("First name required");
    if (!selectedSectionId) return toast.error("Pick a section");

    const { data: student, error } = await supabase
      .from("students")
      .insert({ school_id: schoolId, first_name: studentFirst.trim(), last_name: studentLast.trim() || null })
      .select("id")
      .single();
    if (error) return toast.error(error.message);

    const { error: enrErr } = await supabase
      .from("student_enrollments")
      .insert({ school_id: schoolId, student_id: student.id, class_section_id: selectedSectionId });
    if (enrErr) return toast.error(enrErr.message);

    setStudentFirst("");
    setStudentLast("");
    toast.success("Student created + enrolled");
    await refresh();
  };

  const assignTeacher = async () => {
    if (!schoolId) return;
    if (!teacherUserId) return toast.error("Pick a teacher");
    if (!assignSectionId) return toast.error("Pick a section");
    const { error } = await supabase
      .from("teacher_assignments")
      .upsert({ school_id: schoolId, teacher_user_id: teacherUserId, class_section_id: assignSectionId }, { onConflict: "school_id,teacher_user_id,class_section_id" });
    if (error) return toast.error(error.message);
    toast.success("Teacher assigned");
  };

  const linkStudentToProfile = async () => {
    if (!schoolId) return;
    if (!linkStudentId) return toast.error("Pick a student");
    if (!linkUserId) return toast.error("Pick a user");
    const row = directoryUsers.find((u) => u.user_id === linkUserId);
    if (!row?.profile_id) return toast.error("That user does not have a profile yet (ask them to sign in once).");

    const { error } = await supabase
      .from("students")
      .update({ profile_id: row.profile_id })
      .eq("school_id", schoolId)
      .eq("id", linkStudentId);
    if (error) return toast.error(error.message);
    toast.success("Student linked to user profile");
    await refresh();
  };

  const unlinkStudentProfile = async (studentId: string) => {
    if (!schoolId) return;
    const { error } = await supabase.from("students").update({ profile_id: null }).eq("school_id", schoolId).eq("id", studentId);
    if (error) return toast.error(error.message);
    toast.success("Student unlinked");
    await refresh();
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-elevated">
        <CardHeader>
          <CardTitle className="font-display text-xl">Academic Core</CardTitle>
          <p className="text-sm text-muted-foreground">Classes, sections, students, assignments</p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-surface-2 p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium">Classes</p>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-3 flex gap-2">
              <Input value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="e.g. Grade 5" />
              <Button variant="hero" onClick={createClass}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="h-[250px] mt-4 rounded-2xl border bg-surface">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.grade_level ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {classes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-muted-foreground">
                        No classes yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          <div className="rounded-2xl bg-surface-2 p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium">Sections</p>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Input value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)} placeholder="e.g. A" />
                <Button variant="hero" onClick={createSection}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[250px] mt-4 rounded-2xl border bg-surface">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Section</TableHead>
                    <TableHead>Class</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sections.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{classes.find((c) => c.id === s.class_id)?.name ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {sections.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-muted-foreground">
                        No sections yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-elevated">
        <CardHeader>
          <CardTitle className="font-display text-xl">Students</CardTitle>
          <p className="text-sm text-muted-foreground">Create and enroll students into sections</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <Input value={studentFirst} onChange={(e) => setStudentFirst(e.target.value)} placeholder="First name" />
            <Input value={studentLast} onChange={(e) => setStudentLast(e.target.value)} placeholder="Last name" />
            <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
              <SelectTrigger>
                <SelectValue placeholder="Enroll to section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {classes.find((c) => c.id === s.class_id)?.name ?? "Class"} • {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="hero" onClick={createStudentAndEnroll}>
              <Plus className="mr-2 h-4 w-4" /> Add student
            </Button>
          </div>

          <ScrollArea className="h-[300px] rounded-2xl border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Linked profile</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.first_name} {s.last_name ?? ""}</TableCell>
                    <TableCell>{s.status}</TableCell>
                    <TableCell className="text-muted-foreground">{s.profile_id ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {s.profile_id ? (
                        <Button variant="outline" size="sm" onClick={() => unlinkStudentProfile(s.id)}>
                          Unlink
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {students.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      No students yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>

          <div className="rounded-2xl bg-surface-2 p-4">
            <p className="font-medium">Link student to portal user</p>
            <p className="mt-1 text-xs text-muted-foreground">This enables the Student panel to show the correct data for that login.</p>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
              <Select value={linkStudentId} onValueChange={setLinkStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.first_name} {s.last_name ?? ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={linkUserId} onValueChange={setLinkUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick user" />
                </SelectTrigger>
                <SelectContent>
                  {directoryUsers.map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      {u.display_name ?? u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="hero" onClick={linkStudentToProfile}>
                Link
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-elevated">
        <CardHeader>
          <CardTitle className="font-display text-xl">Teacher Assignments</CardTitle>
          <p className="text-sm text-muted-foreground">Teachers only see their assigned sections & students</p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <Select value={teacherUserId} onValueChange={setTeacherUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Pick teacher" />
            </SelectTrigger>
            <SelectContent>
              {teachers.map((t) => (
                <SelectItem key={t.user_id} value={t.user_id}>
                  {t.display_name ?? t.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={assignSectionId} onValueChange={setAssignSectionId}>
            <SelectTrigger>
              <SelectValue placeholder="Pick section" />
            </SelectTrigger>
            <SelectContent>
              {sections.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {classes.find((c) => c.id === s.class_id)?.name ?? "Class"} • {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="hero" onClick={assignTeacher}>
            <UserCog className="mr-2 h-4 w-4" /> Assign
          </Button>
        </CardContent>
      </Card>

      <SubjectCatalogCard schoolId={schoolId} subjects={subjects} onChanged={refresh} />

      <SectionSubjectsCard
        schoolId={schoolId}
        classes={classes}
        sections={sections}
        subjects={subjects}
        classSectionSubjects={classSectionSubjects}
        onChanged={refresh}
      />

      <TeacherSubjectAssignmentsCard
        schoolId={schoolId}
        classes={classes}
        sections={sections}
        subjects={subjects}
        classSectionSubjects={classSectionSubjects}
        teachers={teachers}
        teacherSubjectAssignments={teacherSubjectAssignments}
        onChanged={refresh}
      />

      <AssessmentManagerCard schoolId={schoolId} />

      {schoolId && <GradeThresholdsCard schoolId={schoolId} />}
    </div>
  );
}
