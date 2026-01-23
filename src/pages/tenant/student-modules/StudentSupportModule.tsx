import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Conversation = { id: string; status: string };
type Message = { id: string; content: string; sender_user_id: string; created_at: string };

export function StudentSupportModule({ myStudent, schoolId }: { myStudent: any; schoolId: string }) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    if (myStudent.status !== "ready") return;
    const { data: conv } = await supabase
      .from("support_conversations")
      .select("id,status")
      .eq("school_id", schoolId)
      .eq("student_id", myStudent.studentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setConversation((conv as Conversation) ?? null);

    if (!conv?.id) {
      setMessages([]);
      return;
    }
    const { data: msgs } = await supabase
      .from("support_messages")
      .select("id,content,sender_user_id,created_at")
      .eq("school_id", schoolId)
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true })
      .limit(200);
    setMessages((msgs ?? []) as Message[]);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myStudent.status]);

  const ensureConversation = async () => {
    if (myStudent.status !== "ready") return null;
    if (conversation) return conversation;
    const { data } = await supabase
      .from("support_conversations")
      .insert({ school_id: schoolId, student_id: myStudent.studentId })
      .select("id,status")
      .maybeSingle();
    const c = (data as Conversation) ?? null;
    setConversation(c);
    return c;
  };

  const send = async () => {
    const content = draft.trim();
    if (!content) return;
    setBusy(true);
    try {
      const conv = await ensureConversation();
      if (!conv) return;
      await supabase.from("support_messages").insert({
        school_id: schoolId,
        conversation_id: conv.id,
        sender_user_id: (await supabase.auth.getUser()).data.user?.id,
        content,
      });
      setDraft("");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const statusLabel = useMemo(() => conversation?.status ?? "no ticket", [conversation]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Support ticket: {statusLabel}</p>
        <Button variant="soft" onClick={refresh}>Refresh</Button>
      </div>

      <div className="rounded-3xl bg-background p-4 shadow-elevated">
        <div className="space-y-2">
          {messages.map((m) => (
            <div key={m.id} className="rounded-2xl bg-surface p-3">
              <p className="text-sm">{m.content}</p>
              <p className="mt-1 text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</p>
            </div>
          ))}
          {messages.length === 0 && <p className="text-sm text-muted-foreground">No messages yet.</p>}
        </div>

        <div className="mt-4 flex gap-2">
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type your message…" />
          <Button variant="hero" disabled={busy} onClick={send}>Send</Button>
        </div>
      </div>
    </div>
  );
}
