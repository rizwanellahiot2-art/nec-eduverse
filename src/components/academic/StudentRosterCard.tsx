import { useMemo, useState } from "react";
import { GraduationCap, Search, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ClassRow {
  id: string;
  name: string;
}

interface SectionRow {
  id: string;
  name: string;
  class_id: string;
}

interface StudentRow {
  id: string;
  first_name: string;
  last_name: string | null;
  status: string;
  profile_id: string | null;
}

interface StudentEnrollment {
  student_id: string;
  class_section_id: string;
}

interface StudentRosterCardProps {
  students: StudentRow[];
  classes: ClassRow[];
  sections: SectionRow[];
  enrollments: StudentEnrollment[];
}

export function StudentRosterCard({
  students,
  classes,
  sections,
  enrollments,
}: StudentRosterCardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSection, setFilterSection] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const getSectionLabel = (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return "";
    const cls = classes.find((c) => c.id === section.class_id);
    return `${cls?.name ?? ""} • ${section.name}`;
  };

  const enrichedStudents = useMemo(() => {
    return students.map((student) => {
      const enrollment = enrollments.find((e) => e.student_id === student.id);
      return {
        ...student,
        sectionId: enrollment?.class_section_id || null,
        sectionLabel: enrollment ? getSectionLabel(enrollment.class_section_id) : "Not enrolled",
      };
    });
  }, [students, enrollments, sections, classes]);

  const filteredStudents = useMemo(() => {
    return enrichedStudents.filter((student) => {
      // Search filter
      const fullName = `${student.first_name} ${student.last_name || ""}`.toLowerCase();
      if (searchTerm && !fullName.includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Section filter
      if (filterSection !== "all" && student.sectionId !== filterSection) {
        return false;
      }

      // Status filter
      if (filterStatus !== "all" && student.status !== filterStatus) {
        return false;
      }

      return true;
    });
  }, [enrichedStudents, searchTerm, filterSection, filterStatus]);

  const statusCounts = useMemo(() => {
    const counts = { enrolled: 0, inquiry: 0, other: 0 };
    students.forEach((s) => {
      if (s.status === "enrolled") counts.enrolled++;
      else if (s.status === "inquiry") counts.inquiry++;
      else counts.other++;
    });
    return counts;
  }, [students]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "enrolled":
        return <Badge className="bg-primary/10 text-primary border-primary/20">Enrolled</Badge>;
      case "inquiry":
        return <Badge variant="secondary">Inquiry</Badge>;
      case "graduated":
        return <Badge variant="outline">Graduated</Badge>;
      case "withdrawn":
        return <Badge variant="destructive">Withdrawn</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Student Roster
          </CardTitle>
          <div className="flex gap-2">
            <Badge className="bg-primary/10 text-primary border-primary/20">
              {statusCounts.enrolled} enrolled
            </Badge>
            <Badge variant="secondary">{statusCounts.inquiry} inquiry</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterSection} onValueChange={setFilterSection}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All sections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sections</SelectItem>
              {sections.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {getSectionLabel(s.id)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="enrolled">Enrolled</SelectItem>
              <SelectItem value="inquiry">Inquiry</SelectItem>
              <SelectItem value="graduated">Graduated</SelectItem>
              <SelectItem value="withdrawn">Withdrawn</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <ScrollArea className="h-[350px] rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Student Name</TableHead>
                <TableHead className="font-semibold">Class / Section</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Portal Access</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-muted">
                        <span className="text-xs font-medium">
                          {student.first_name[0]}
                          {student.last_name?.[0] || ""}
                        </span>
                      </div>
                      <span className="font-medium">
                        {student.first_name} {student.last_name || ""}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {student.sectionLabel ? (
                      <div className="flex items-center gap-1.5">
                        <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{student.sectionLabel}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Not enrolled</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(student.status)}</TableCell>
                  <TableCell>
                    {student.profile_id ? (
                      <Badge variant="outline" className="text-xs">
                        Linked
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not linked</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredStudents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    {searchTerm || filterSection !== "all" || filterStatus !== "all"
                      ? "No students match your filters"
                      : "No students found"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        <p className="text-xs text-muted-foreground">
          Showing {filteredStudents.length} of {students.length} students
        </p>
      </CardContent>
    </Card>
  );
}
