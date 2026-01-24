import { useMemo } from "react";
import { BookOpen, GraduationCap, Mail, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface Teacher {
  user_id: string;
  email: string;
  display_name: string | null;
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

interface SubjectRow {
  id: string;
  name: string;
  code: string | null;
}

interface TeacherAssignment {
  teacher_user_id: string;
  class_section_id: string;
}

interface TeacherSubjectAssignment {
  teacher_user_id: string;
  class_section_id: string;
  subject_id: string;
}

interface TeacherDetailsCardProps {
  teachers: Teacher[];
  classes: ClassRow[];
  sections: SectionRow[];
  subjects: SubjectRow[];
  teacherAssignments: TeacherAssignment[];
  teacherSubjectAssignments: TeacherSubjectAssignment[];
}

export function TeacherDetailsCard({
  teachers,
  classes,
  sections,
  subjects,
  teacherAssignments,
  teacherSubjectAssignments,
}: TeacherDetailsCardProps) {
  const getSectionLabel = (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return "Unknown";
    const cls = classes.find((c) => c.id === section.class_id);
    return `${cls?.name ?? "Class"} • ${section.name}`;
  };

  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find((s) => s.id === subjectId);
    return subject?.name ?? "Unknown";
  };

  const teacherDetails = useMemo(() => {
    return teachers.map((teacher) => {
      // Get section assignments
      const assignedSections = teacherAssignments
        .filter((a) => a.teacher_user_id === teacher.user_id)
        .map((a) => ({
          sectionId: a.class_section_id,
          label: getSectionLabel(a.class_section_id),
        }));

      // Get subject assignments grouped by section
      const subjectsBySection = new Map<string, string[]>();
      teacherSubjectAssignments
        .filter((tsa) => tsa.teacher_user_id === teacher.user_id)
        .forEach((tsa) => {
          const existing = subjectsBySection.get(tsa.class_section_id) || [];
          existing.push(getSubjectName(tsa.subject_id));
          subjectsBySection.set(tsa.class_section_id, existing);
        });

      // Combine all unique sections
      const allSectionIds = new Set([
        ...assignedSections.map((s) => s.sectionId),
        ...subjectsBySection.keys(),
      ]);

      const sectionDetails = Array.from(allSectionIds).map((sectionId) => ({
        sectionId,
        label: getSectionLabel(sectionId),
        subjects: subjectsBySection.get(sectionId) || [],
        isClassTeacher: assignedSections.some((s) => s.sectionId === sectionId),
      }));

      return {
        ...teacher,
        sectionDetails,
        totalSections: sectionDetails.length,
        totalSubjects: teacherSubjectAssignments.filter(
          (tsa) => tsa.teacher_user_id === teacher.user_id
        ).length,
      };
    });
  }, [teachers, teacherAssignments, teacherSubjectAssignments, sections, classes, subjects]);

  if (teachers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" />
            Teachers Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No teachers found. Add teachers from the Users module first.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 shrink-0" />
            Teachers Overview
          </CardTitle>
          <Badge variant="secondary">{teachers.length} teachers</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-2 sm:pr-4">
          <Accordion type="multiple" className="space-y-2">
            {teacherDetails.map((teacher) => (
              <AccordionItem
                key={teacher.user_id}
                value={teacher.user_id}
                className="rounded-xl border bg-surface px-3 sm:px-4"
              >
                <AccordionTrigger className="py-3 hover:no-underline">
                  <div className="flex flex-1 flex-col gap-2 pr-2 sm:flex-row sm:items-center sm:justify-between sm:pr-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="text-left min-w-0">
                        <p className="font-medium truncate">
                          {teacher.display_name || teacher.email.split("@")[0]}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{teacher.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        <GraduationCap className="mr-1 h-3 w-3" />
                        {teacher.totalSections} sec
                      </Badge>
                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        <BookOpen className="mr-1 h-3 w-3" />
                        {teacher.totalSubjects} subj
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  {teacher.sectionDetails.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      No sections or subjects assigned yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {teacher.sectionDetails.map((section) => (
                        <div
                          key={section.sectionId}
                          className="rounded-lg bg-muted/50 p-2 sm:p-3"
                        >
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <GraduationCap className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <span className="font-medium text-sm truncate">{section.label}</span>
                            </div>
                            {section.isClassTeacher && (
                              <Badge className="text-xs w-fit shrink-0">Class Teacher</Badge>
                            )}
                          </div>
                          {section.subjects.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {section.subjects.map((subj, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {subj}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
