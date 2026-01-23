import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

type Assignment = { id: string; title: string; due_date: string | null; status: string };
type Homework = { id: string; title: string; due_date: string; status: string };

export function StudentAssignmentsModule({ myStudent, schoolId }: { myStudent: any; schoolId: string }) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);

  const refresh = async () => {
    if (myStudent.status !== "ready") return;
    const { data: enrollments } = await supabase
      .from("student_enrollments")
      .select("class_section_id")
      .eq("school_id", schoolId)
      .eq("student_id", myStudent.studentId);
    const sectionIds = (enrollments ?? []).map((e: any) => e.class_section_id);
    if (!sectionIds.length) {
      setAssignments([]);
      setHomework([]);
      return;
    }

    const [{ data: a }, { data: h }] = await Promise.all([
      supabase
        .from("assignments")
        .select("id,title,due_date,status")
        .eq("school_id", schoolId)
        .in("class_section_id", sectionIds)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("homework")
        .select("id,title,due_date,status")
        .eq("school_id", schoolId)
        .in("class_section_id", sectionIds)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    setAssignments((a ?? []) as Assignment[]);
    setHomework((h ?? []) as Homework[]);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myStudent.status]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Assignments & homework</p>
        <Button variant="soft" onClick={refresh}>Refresh</Button>
      </div>

      <Tabs defaultValue="assignments">
        <TabsList>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="homework">Homework</TabsTrigger>
        </TabsList>
        <TabsContent value="assignments" className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.title}</TableCell>
                  <TableCell className="text-muted-foreground">{a.due_date ? new Date(a.due_date).toLocaleDateString() : "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{a.status}</TableCell>
                </TableRow>
              ))}
              {assignments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-sm text-muted-foreground">No assignments found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="homework" className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {homework.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">{h.title}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(h.due_date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-muted-foreground">{h.status}</TableCell>
                </TableRow>
              ))}
              {homework.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-sm text-muted-foreground">No homework found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}
