import { useMemo } from "react";
import { BookOpen, GraduationCap, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SubjectRow {
  id: string;
  name: string;
  code: string | null;
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

interface Teacher {
  user_id: string;
  email: string;
  display_name: string | null;
}

interface ClassSectionSubject {
  class_section_id: string;
  subject_id: string;
}

interface TeacherSubjectAssignment {
  teacher_user_id: string;
  class_section_id: string;
  subject_id: string;
}

interface SubjectsOverviewCardProps {
  subjects: SubjectRow[];
  classes: ClassRow[];
  sections: SectionRow[];
  teachers: Teacher[];
  classSectionSubjects: ClassSectionSubject[];
  teacherSubjectAssignments: TeacherSubjectAssignment[];
}

export function SubjectsOverviewCard({
  subjects,
  classes,
  sections,
  teachers,
  classSectionSubjects,
  teacherSubjectAssignments,
}: SubjectsOverviewCardProps) {
  const getSectionLabel = (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return "Unknown";
    const cls = classes.find((c) => c.id === section.class_id);
    return `${cls?.name ?? ""} • ${section.name}`;
  };

  const getTeacherName = (userId: string) => {
    const teacher = teachers.find((t) => t.user_id === userId);
    return teacher?.display_name || teacher?.email.split("@")[0] || "Unknown";
  };

  const subjectDetails = useMemo(() => {
    return subjects.map((subject) => {
      // Get sections teaching this subject
      const sectionsTaught = classSectionSubjects
        .filter((css) => css.subject_id === subject.id)
        .map((css) => ({
          sectionId: css.class_section_id,
          label: getSectionLabel(css.class_section_id),
        }));

      // Get teachers for this subject
      const teacherAssignments = teacherSubjectAssignments
        .filter((tsa) => tsa.subject_id === subject.id)
        .map((tsa) => ({
          teacherId: tsa.teacher_user_id,
          teacherName: getTeacherName(tsa.teacher_user_id),
          sectionLabel: getSectionLabel(tsa.class_section_id),
        }));

      // Unique teachers
      const uniqueTeachers = [...new Set(teacherAssignments.map((t) => t.teacherName))];

      return {
        ...subject,
        sectionsTaught,
        teacherAssignments,
        uniqueTeachers,
      };
    });
  }, [subjects, classSectionSubjects, teacherSubjectAssignments, sections, classes, teachers]);

  if (subjects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-5 w-5" />
            Subjects Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No subjects created yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-5 w-5 shrink-0" />
            Subjects Overview
          </CardTitle>
          <Badge variant="secondary">{subjects.length} subjects</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-2 sm:pr-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {subjectDetails.map((subject) => (
              <div
                key={subject.id}
                className="rounded-xl border bg-surface p-3 sm:p-4"
              >
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{subject.name}</p>
                      {subject.code && (
                        <p className="text-xs text-muted-foreground">Code: {subject.code}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {/* Sections */}
                  <div className="flex items-start gap-2">
                    <GraduationCap className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">Taught in</p>
                      {subject.sectionsTaught.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {subject.sectionsTaught.slice(0, 3).map((s, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {s.label}
                            </Badge>
                          ))}
                          {subject.sectionsTaught.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{subject.sectionsTaught.length - 3} more
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No sections assigned</p>
                      )}
                    </div>
                  </div>

                  {/* Teachers */}
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">Teachers</p>
                      {subject.uniqueTeachers.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {subject.uniqueTeachers.map((name, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No teachers assigned</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
