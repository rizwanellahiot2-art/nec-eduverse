import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle, Clock, FileText, Send, Eye } from "lucide-react";

type Assignment = { 
  id: string; 
  title: string; 
  description: string | null;
  due_date: string | null; 
  status: string;
  max_marks: number;
  assignment_type: string;
};

type Submission = {
  id: string;
  assignment_id: string;
  submission_text: string | null;
  submitted_at: string;
  status: string;
  marks_obtained: number | null;
  feedback: string | null;
};

type Homework = { id: string; title: string; due_date: string; status: string };

export function StudentAssignmentsModule({ myStudent, schoolId }: { myStudent: any; schoolId: string }) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Map<string, Submission>>(new Map());
  const [homework, setHomework] = useState<Homework[]>([]);
  
  // Submit dialog state
  const [submitOpen, setSubmitOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissionText, setSubmissionText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  // View result dialog
  const [viewOpen, setViewOpen] = useState(false);
  const [viewSubmission, setViewSubmission] = useState<Submission | null>(null);

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

    const [{ data: a }, { data: h }, { data: subs }] = await Promise.all([
      supabase
        .from("assignments")
        .select("id,title,description,due_date,status,max_marks,assignment_type")
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
      supabase
        .from("assignment_submissions")
        .select("id,assignment_id,submission_text,submitted_at,status,marks_obtained,feedback")
        .eq("school_id", schoolId)
        .eq("student_id", myStudent.studentId),
    ]);
    
    setAssignments((a ?? []) as Assignment[]);
    setHomework((h ?? []) as Homework[]);
    
    const subMap = new Map<string, Submission>();
    (subs ?? []).forEach((s: any) => subMap.set(s.assignment_id, s as Submission));
    setSubmissions(subMap);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myStudent.status]);

  const openSubmitDialog = (assignment: Assignment) => {
    const existing = submissions.get(assignment.id);
    setSelectedAssignment(assignment);
    setSubmissionText(existing?.submission_text || "");
    setSubmitOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedAssignment || myStudent.status !== "ready") return;
    
    setSubmitting(true);
    const existing = submissions.get(selectedAssignment.id);
    const isLate = selectedAssignment.due_date && new Date(selectedAssignment.due_date) < new Date();
    
    if (existing) {
      // Update existing submission
      const { error } = await supabase
        .from("assignment_submissions")
        .update({
          submission_text: submissionText,
          status: isLate ? "late" : "submitted",
          submitted_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Submission updated!");
        setSubmitOpen(false);
        refresh();
      }
    } else {
      // Create new submission
      const { error } = await supabase
        .from("assignment_submissions")
        .insert({
          school_id: schoolId,
          assignment_id: selectedAssignment.id,
          student_id: myStudent.studentId,
          submission_text: submissionText,
          status: isLate ? "late" : "submitted",
        });
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Assignment submitted!");
        setSubmitOpen(false);
        refresh();
      }
    }
    setSubmitting(false);
  };

  const openViewDialog = (assignment: Assignment) => {
    const sub = submissions.get(assignment.id);
    if (sub) {
      setViewSubmission(sub);
      setSelectedAssignment(assignment);
      setViewOpen(true);
    }
  };

  const getSubmissionStatus = (assignment: Assignment) => {
    const sub = submissions.get(assignment.id);
    if (!sub) return { label: "Not Submitted", variant: "outline" as const, icon: Clock };
    if (sub.status === "graded") return { label: `Graded: ${sub.marks_obtained}/${assignment.max_marks}`, variant: "default" as const, icon: CheckCircle };
    if (sub.status === "late") return { label: "Submitted Late", variant: "secondary" as const, icon: Send };
    return { label: "Submitted", variant: "secondary" as const, icon: CheckCircle };
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

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
        
        <TabsContent value="assignments" className="mt-4 space-y-3">
          {assignments.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No assignments found.
              </CardContent>
            </Card>
          ) : (
            assignments.map((a) => {
              const status = getSubmissionStatus(a);
              const sub = submissions.get(a.id);
              const overdue = isOverdue(a.due_date) && !sub;
              
              return (
                <Card key={a.id} className={overdue ? "border-destructive/50" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{a.title}</CardTitle>
                          <Badge variant="outline" className="text-xs capitalize">
                            {a.assignment_type}
                          </Badge>
                        </div>
                        {a.description && (
                          <CardDescription className="mt-1">{a.description}</CardDescription>
                        )}
                      </div>
                      <Badge variant={status.variant} className="flex items-center gap-1">
                        <status.icon className="h-3 w-3" />
                        {status.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        <span>Max: {a.max_marks} marks</span>
                        {a.due_date && (
                          <span className={overdue ? "text-destructive ml-3" : "ml-3"}>
                            Due: {new Date(a.due_date).toLocaleDateString()}
                            {overdue && " (Overdue)"}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {sub?.status === "graded" && (
                          <Button size="sm" variant="outline" onClick={() => openViewDialog(a)}>
                            <Eye className="h-4 w-4 mr-1" /> View Result
                          </Button>
                        )}
                        {sub?.status !== "graded" && (
                          <Button size="sm" onClick={() => openSubmitDialog(a)}>
                            <Send className="h-4 w-4 mr-1" /> {sub ? "Update" : "Submit"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
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

      {/* Submit Assignment Dialog */}
      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Assignment</DialogTitle>
            <DialogDescription>
              {selectedAssignment?.title}
              {selectedAssignment?.due_date && (
                <span className="block mt-1">
                  Due: {new Date(selectedAssignment.due_date).toLocaleDateString()}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Your Answer / Work</label>
              <Textarea
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
                placeholder="Enter your answer or paste your work here..."
                rows={8}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || !submissionText.trim()}>
              {submitting ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Result Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assignment Result</DialogTitle>
            <DialogDescription>{selectedAssignment?.title}</DialogDescription>
          </DialogHeader>
          {viewSubmission && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between rounded-lg bg-muted p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Your Score</p>
                  <p className="text-2xl font-bold">
                    {viewSubmission.marks_obtained}/{selectedAssignment?.max_marks}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Percentage</p>
                  <p className="text-2xl font-bold">
                    {selectedAssignment && viewSubmission.marks_obtained !== null
                      ? ((viewSubmission.marks_obtained / selectedAssignment.max_marks) * 100).toFixed(0)
                      : 0}%
                  </p>
                </div>
              </div>
              
              {viewSubmission.feedback && (
                <div>
                  <p className="text-sm font-medium mb-2">Teacher Feedback</p>
                  <div className="rounded-lg border p-3 text-sm">
                    {viewSubmission.feedback}
                  </div>
                </div>
              )}
              
              <div>
                <p className="text-sm font-medium mb-2">Your Submission</p>
                <div className="rounded-lg border p-3 text-sm text-muted-foreground max-h-40 overflow-y-auto">
                  {viewSubmission.submission_text || "No text submitted"}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
