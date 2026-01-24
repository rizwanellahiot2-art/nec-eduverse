import { useMemo } from "react";
import { Building2, GraduationCap, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ClassRow {
  id: string;
  name: string;
  grade_level: number | null;
}

interface SectionRow {
  id: string;
  name: string;
  class_id: string;
  room: string | null;
}

interface SubjectRow {
  id: string;
  name: string;
  code: string | null;
}

interface ClassSectionSubject {
  class_section_id: string;
  subject_id: string;
}

interface StudentEnrollment {
  student_id: string;
  class_section_id: string;
}

interface ClassStructureCardProps {
  classes: ClassRow[];
  sections: SectionRow[];
  subjects: SubjectRow[];
  classSectionSubjects: ClassSectionSubject[];
  enrollments: StudentEnrollment[];
}

export function ClassStructureCard({
  classes,
  sections,
  subjects,
  classSectionSubjects,
  enrollments,
}: ClassStructureCardProps) {
  const classDetails = useMemo(() => {
    return classes.map((cls) => {
      const classSections = sections.filter((s) => s.class_id === cls.id);

      const sectionDetails = classSections.map((section) => {
        // Count students
        const studentCount = enrollments.filter(
          (e) => e.class_section_id === section.id
        ).length;

        // Get subjects
        const sectionSubjects = classSectionSubjects
          .filter((css) => css.class_section_id === section.id)
          .map((css) => {
            const subj = subjects.find((s) => s.id === css.subject_id);
            return subj?.name ?? "Unknown";
          });

        return {
          ...section,
          studentCount,
          subjects: sectionSubjects,
        };
      });

      const totalStudents = sectionDetails.reduce((sum, s) => sum + s.studentCount, 0);

      return {
        ...cls,
        sections: sectionDetails,
        totalStudents,
      };
    });
  }, [classes, sections, subjects, classSectionSubjects, enrollments]);

  if (classes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" />
            Class Structure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No classes created yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" />
            Class Structure
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="secondary">{classes.length} classes</Badge>
            <Badge variant="outline">{sections.length} sections</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {classDetails.map((cls) => (
              <div
                key={cls.id}
                className="rounded-xl border bg-surface p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10">
                      <GraduationCap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{cls.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {cls.grade_level ? `Grade ${cls.grade_level}` : "Grade level not set"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {cls.sections.length} sections
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      <Users className="mr-1 h-3 w-3" />
                      {cls.totalStudents} students
                    </Badge>
                  </div>
                </div>

                {cls.sections.length === 0 ? (
                  <p className="text-sm text-muted-foreground pl-[52px]">
                    No sections created for this class.
                  </p>
                ) : (
                  <div className="grid gap-2 pl-[52px]">
                    {cls.sections.map((section) => (
                      <div
                        key={section.id}
                        className="rounded-lg bg-muted/50 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              Section {section.name}
                            </span>
                            {section.room && (
                              <span className="text-xs text-muted-foreground">
                                (Room: {section.room})
                              </span>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            <Users className="mr-1 h-3 w-3" />
                            {section.studentCount}
                          </Badge>
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
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
