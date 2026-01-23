import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchStudentLabelMap } from "@/lib/student-display";

type Conversation = {
  id: string;
  school_id: string;
  student_id: string;
  status: string;
  created_at: string;
};

type Message = { id: string; content: string; sender_user_id: string; created_at: string };

export function SupportInbox({ schoolId }: { schoolId?: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [labels, setLabels] = useState<Record<string, string>>({});

  const refreshConversations = async () => {
    let q = supabase
      .from("support_conversations")
      .select("id,school_id,student_id,status,created_at")
      .order("updated_at", { ascending: false })
      .limit(200);
    if (schoolId) q = q.eq("school_id", schoolId);
    const { data } = await q;
    const next = (data ?? []) as Conversation[];
    setConversations(next);

    const studentIds = next.map((c) => c.student_id);
    const map = await fetchStudentLabelMap(supabase, {
      schoolId,
      studentIds,
    });
    setLabels(map);
  };

  const refreshMessages = async (conversationId: string) => {
    const { data } = await supabase
      .from("support_messages")
      .select("id,content,sender_user_id,created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(500);
    setMessages((data ?? []) as Message[]);
  };

  useEffect(() => {
    void refreshConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  useEffect(() => {
    if (!selected?.id) return;
    void refreshMessages(selected.id);
  }, [selected?.id]);

  useEffect(() => {
    if (!selected?.id) return;

    const channel = supabase
      .channel(`support:staff:${selected.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_messages", filter: `conversation_id=eq.${selected.id}` },
        () => {
          void refreshMessages(selected.id);
          void refreshConversations();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  const send = async () => {
    const content = draft.trim();
    if (!content) return;
    if (!selected?.id) return;
    setBusy(true);
    try {
      const authed = await supabase.auth.getUser();
      const senderId = authed.data.user?.id;
      if (!senderId) return;
      await supabase.from("support_messages").insert({
        school_id: selected.school_id,
        conversation_id: selected.id,
        sender_user_id: senderId,
        content,
      });
      setDraft("");
    } finally {
      setBusy(false);
    }
  };

  const selectedLabel = useMemo(() => {
    if (!selected) return "Select a ticket";
    const who = labels[selected.student_id] ?? selected.student_id;
    return `${who} • ${selected.status}`;
  }, [labels, selected]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
      <div className="rounded-3xl bg-surface p-4 shadow-elevated">
        <div className="flex items-center justify-between">
          <p className="font-display text-lg font-semibold tracking-tight">Support inbox</p>
          <Button variant="soft" size="sm" onClick={refreshConversations}>
            Refresh
          </Button>
        </div>
        <div className="mt-4 overflow-auto rounded-2xl border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conversations.map((c) => (
                <TableRow
                  key={c.id}
                  className={selected?.id === c.id ? "bg-accent/40" : undefined}
                  onClick={() => setSelected(c)}
                >
                  <TableCell className="font-medium">{labels[c.student_id] ?? c.student_id}</TableCell>
                  <TableCell className="text-muted-foreground">{c.status}</TableCell>
                </TableRow>
              ))}
              {conversations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-sm text-muted-foreground">
                    No tickets yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="rounded-3xl bg-surface p-4 shadow-elevated">
        <p className="font-display text-lg font-semibold tracking-tight">{selectedLabel}</p>
        <div className="mt-4 space-y-2">
          {messages.map((m) => (
            <div key={m.id} className="rounded-2xl bg-background p-3">
              <p className="text-sm">{m.content}</p>
              <p className="mt-1 text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</p>
            </div>
          ))}
          {selected && messages.length === 0 && <p className="text-sm text-muted-foreground">No messages yet.</p>}
          {!selected && <p className="text-sm text-muted-foreground">Pick a conversation to view messages.</p>}
        </div>

        {selected && (
          <div className="mt-4 flex gap-2">
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Reply…" />
            <Button variant="hero" disabled={busy} onClick={send}>
              Send
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
