import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { ChildInfo } from "@/hooks/useMyChildren";
import { format } from "date-fns";
import { Send, Reply } from "lucide-react";

interface ParentMessagesModuleProps {
  child: ChildInfo | null;
  schoolId: string | null;
}

interface Message {
  id: string;
  subject: string | null;
  content: string;
  sender_user_id: string;
  recipient_user_id: string;
  is_read: boolean;
  created_at: string;
  parent_message_id: string | null;
}

const ParentMessagesModule = ({ child, schoolId }: ParentMessagesModuleProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // New message form
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newContent, setNewContent] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [teachers, setTeachers] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!child || !currentUserId) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("parent_messages")
      .select("*")
      .eq("student_id", child.student_id)
      .or(`sender_user_id.eq.${currentUserId},recipient_user_id.eq.${currentUserId}`)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Failed to fetch messages:", error);
    } else {
      setMessages(data || []);
    }

    setLoading(false);
  }, [child, currentUserId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Fetch teachers for sending new messages
  useEffect(() => {
    if (!schoolId) return;

    const fetchTeachers = async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("school_id", schoolId)
        .eq("role", "teacher");

      if (roles && roles.length > 0) {
        // Use user IDs as labels since we don't have email in school_memberships
        setTeachers(
          roles.map((r) => ({
            id: r.user_id,
            label: `Teacher (${r.user_id.slice(0, 8)}...)`,
          }))
        );
      }
    };

    fetchTeachers();
  }, [schoolId]);

  // Realtime subscription
  useEffect(() => {
    if (!child) return;

    const channel = supabase
      .channel(`parent-messages-${child.student_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "parent_messages",
          filter: `student_id=eq.${child.student_id}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [child, fetchMessages]);

  const handleReply = async () => {
    if (!selectedMessage || !replyContent.trim() || !currentUserId || !child || !schoolId) return;

    setSending(true);

    const recipientId =
      selectedMessage.sender_user_id === currentUserId
        ? selectedMessage.recipient_user_id
        : selectedMessage.sender_user_id;

    const { error } = await supabase.from("parent_messages").insert({
      school_id: schoolId,
      student_id: child.student_id,
      sender_user_id: currentUserId,
      recipient_user_id: recipientId,
      content: replyContent.trim(),
      parent_message_id: selectedMessage.id,
    });

    if (error) {
      console.error("Failed to send reply:", error);
    } else {
      setReplyContent("");
      fetchMessages();
    }

    setSending(false);
  };

  const handleSendNew = async () => {
    if (!newContent.trim() || !recipientId || !currentUserId || !child || !schoolId) return;

    setSending(true);

    const { error } = await supabase.from("parent_messages").insert({
      school_id: schoolId,
      student_id: child.student_id,
      sender_user_id: currentUserId,
      recipient_user_id: recipientId,
      subject: newSubject.trim() || null,
      content: newContent.trim(),
    });

    if (error) {
      console.error("Failed to send message:", error);
    } else {
      setNewSubject("");
      setNewContent("");
      setRecipientId("");
      setShowNewMessage(false);
      fetchMessages();
    }

    setSending(false);
  };

  const markAsRead = async (message: Message) => {
    if (message.is_read || message.recipient_user_id !== currentUserId) return;

    await supabase
      .from("parent_messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", message.id);
  };

  if (!child) {
    return (
      <div className="text-center text-muted-foreground py-12">
        Please select a child to view messages.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground">
            Communicate with teachers about {child.first_name || "your child"}
          </p>
        </div>
        <Button onClick={() => setShowNewMessage(true)}>
          <Send className="mr-2 h-4 w-4" /> New Message
        </Button>
      </div>

      {showNewMessage && (
        <Card>
          <CardHeader>
            <CardTitle>New Message</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">To (Teacher)</label>
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
              >
                <option value="">Select a teacher...</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Subject</label>
              <Input
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="Optional subject"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Type your message..."
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSendNew} disabled={sending || !recipientId || !newContent.trim()}>
                {sending ? "Sending..." : "Send"}
              </Button>
              <Button variant="outline" onClick={() => setShowNewMessage(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Inbox</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : messages.length === 0 ? (
              <p className="text-muted-foreground">No messages yet.</p>
            ) : (
              <ScrollArea className="h-80">
                <div className="space-y-2">
                  {messages
                    .filter((m) => !m.parent_message_id)
                    .map((message) => (
                      <div
                        key={message.id}
                        className={`cursor-pointer rounded-lg border p-3 transition-colors hover:bg-accent ${
                          selectedMessage?.id === message.id ? "bg-accent" : ""
                        }`}
                        onClick={() => {
                          setSelectedMessage(message);
                          markAsRead(message);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm truncate">
                            {message.subject || "(No subject)"}
                          </p>
                          {!message.is_read && message.recipient_user_id === currentUserId && (
                            <Badge variant="secondary" className="text-xs">
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {message.content}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(message.created_at), "MMM d, h:mm a")}
                        </p>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {selectedMessage ? selectedMessage.subject || "Message" : "Select a message"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedMessage ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm whitespace-pre-wrap">{selectedMessage.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {format(new Date(selectedMessage.created_at), "MMMM d, yyyy h:mm a")}
                  </p>
                </div>

                {/* Replies */}
                {messages
                  .filter((m) => m.parent_message_id === selectedMessage.id)
                  .map((reply) => (
                    <div
                      key={reply.id}
                      className={`rounded-lg p-3 ${
                        reply.sender_user_id === currentUserId
                          ? "bg-primary/10 ml-4"
                          : "bg-muted mr-4"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(reply.created_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                  ))}

                {/* Reply input */}
                <div className="flex gap-2">
                  <Textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Type your reply..."
                    rows={2}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleReply}
                    disabled={sending || !replyContent.trim()}
                    size="icon"
                  >
                    <Reply className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">
                Select a message from the inbox to view details.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ParentMessagesModule;
