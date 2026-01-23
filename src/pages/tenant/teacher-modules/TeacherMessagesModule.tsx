import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Send, Mail, MailOpen } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Student {
  id: string;
  first_name: string;
  last_name: string | null;
}

interface Guardian {
  id: string;
  user_id: string | null;
  full_name: string;
  student_id: string;
  student_name: string;
}

interface Message {
  id: string;
  subject: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
  sender_user_id: string;
  recipient_user_id: string;
  student_name: string;
  is_sent: boolean; // true if current user is sender
}

export function TeacherMessagesModule() {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const [students, setStudents] = useState<Student[]>([]);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Compose dialog
  const [composeOpen, setComposeOpen] = useState(false);
  const [newMessage, setNewMessage] = useState({
    guardian_user_id: "",
    student_id: "",
    subject: "",
    content: "",
  });

  useEffect(() => {
    if (tenant.status !== "ready") return;
    fetchData();
  }, [tenant.status, tenant.schoolId]);

  const fetchData = async () => {
    setLoading(true);

    const { data: user } = await supabase.auth.getUser();
    setCurrentUserId(user.user?.id || null);

    // Get assigned sections
    const { data: assignments } = await supabase
      .from("teacher_assignments")
      .select("class_section_id")
      .eq("school_id", tenant.schoolId);

    if (!assignments?.length) {
      setLoading(false);
      return;
    }

    const sectionIds = assignments.map((a) => a.class_section_id);

    // Get students
    const { data: enrollments } = await supabase
      .from("student_enrollments")
      .select("student_id")
      .eq("school_id", tenant.schoolId)
      .in("class_section_id", sectionIds);

    if (!enrollments?.length) {
      setLoading(false);
      return;
    }

    const studentIds = enrollments.map((e) => e.student_id);
    const { data: studentData } = await supabase
      .from("students")
      .select("id, first_name, last_name")
      .in("id", studentIds);

    setStudents(studentData || []);

    const studentMap = new Map(
      (studentData || []).map((s) => [s.id, `${s.first_name} ${s.last_name || ""}`])
    );

    // Get guardians with user accounts
    const { data: guardianData } = await supabase
      .from("student_guardians")
      .select("id, user_id, full_name, student_id")
      .in("student_id", studentIds)
      .not("user_id", "is", null);

    const enrichedGuardians = (guardianData || []).map((g) => ({
      ...g,
      student_name: studentMap.get(g.student_id) || "Unknown",
    }));

    setGuardians(enrichedGuardians);

    // Get messages
    const { data: messageData } = await supabase
      .from("parent_messages")
      .select("*")
      .eq("school_id", tenant.schoolId)
      .or(`sender_user_id.eq.${user.user?.id},recipient_user_id.eq.${user.user?.id}`)
      .order("created_at", { ascending: false });

    const enrichedMessages = (messageData || []).map((m) => ({
      ...m,
      student_name: studentMap.get(m.student_id) || "Unknown",
      is_sent: m.sender_user_id === user.user?.id,
    }));

    setMessages(enrichedMessages);
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!newMessage.guardian_user_id || !newMessage.content.trim()) {
      toast({ title: "Recipient and content are required", variant: "destructive" });
      return;
    }

    const guardian = guardians.find((g) => g.user_id === newMessage.guardian_user_id);

    const { error } = await supabase.from("parent_messages").insert({
      school_id: tenant.schoolId,
      student_id: guardian?.student_id || newMessage.student_id,
      sender_user_id: currentUserId,
      recipient_user_id: newMessage.guardian_user_id,
      subject: newMessage.subject.trim() || null,
      content: newMessage.content.trim(),
    });

    if (error) {
      toast({ title: "Failed to send message", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Message sent successfully" });
    setComposeOpen(false);
    setNewMessage({ guardian_user_id: "", student_id: "", subject: "", content: "" });
    fetchData();
  };

  const markAsRead = async (messageId: string) => {
    await supabase
      .from("parent_messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", messageId);
    fetchData();
  };

  const inboxMessages = messages.filter((m) => !m.is_sent);
  const sentMessages = messages.filter((m) => m.is_sent);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="space-y-4">
      {/* Compose Button */}
      <div className="flex justify-end">
        <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
          <DialogTrigger asChild>
            <Button>
              <Send className="mr-2 h-4 w-4" /> Compose Message
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Message to Parent</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Recipient (Parent with account) *</Label>
                <Select
                  value={newMessage.guardian_user_id}
                  onValueChange={(v) => setNewMessage((p) => ({ ...p, guardian_user_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent" />
                  </SelectTrigger>
                  <SelectContent>
                    {guardians.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        No parents with accounts
                      </SelectItem>
                    ) : (
                      guardians.map((g) => (
                        <SelectItem key={g.user_id!} value={g.user_id!}>
                          {g.full_name} (Parent of {g.student_name})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subject</Label>
                <Input
                  value={newMessage.subject}
                  onChange={(e) => setNewMessage((p) => ({ ...p, subject: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label>Message *</Label>
                <Textarea
                  value={newMessage.content}
                  onChange={(e) => setNewMessage((p) => ({ ...p, content: e.target.value }))}
                  rows={5}
                />
              </div>
              <Button onClick={sendMessage} className="w-full" disabled={guardians.length === 0}>
                Send Message
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Parent Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="inbox">
            <TabsList className="mb-4">
              <TabsTrigger value="inbox">
                Inbox ({inboxMessages.filter((m) => !m.is_read).length} unread)
              </TabsTrigger>
              <TabsTrigger value="sent">Sent ({sentMessages.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="inbox">
              {inboxMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No messages in inbox.</p>
              ) : (
                <div className="space-y-3">
                  {inboxMessages.map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-lg border p-4 ${!m.is_read ? "bg-accent/50" : ""}`}
                      onClick={() => !m.is_read && markAsRead(m.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {m.is_read ? (
                            <MailOpen className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Mail className="h-4 w-4 text-primary" />
                          )}
                          <div>
                            <p className="font-medium">{m.subject || "(No subject)"}</p>
                            <p className="text-sm text-muted-foreground">
                              From parent of {m.student_name}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(m.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="mt-3 text-sm">{m.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="sent">
              {sentMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sent messages.</p>
              ) : (
                <div className="space-y-3">
                  {sentMessages.map((m) => (
                    <div key={m.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{m.subject || "(No subject)"}</p>
                          <p className="text-sm text-muted-foreground">To parent of {m.student_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {new Date(m.created_at).toLocaleDateString()}
                          </p>
                          {m.is_read && (
                            <span className="text-xs text-green-600">Read</span>
                          )}
                        </div>
                      </div>
                      <p className="mt-3 text-sm">{m.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {guardians.length === 0 && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Tip:</strong> To message parents, they need to have user accounts linked to their
              guardian profiles. Ask your admin to set this up.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
