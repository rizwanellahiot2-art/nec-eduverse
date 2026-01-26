import { useState } from "react";
import { Send, WifiOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface OfflineMessageComposerProps {
  isOnline: boolean;
  recipients: Array<{ id: string; name: string; email?: string }>;
  onSend: (recipientIds: string[], subject: string, content: string, priority: string) => Promise<string>;
  trigger?: React.ReactNode;
}

export function OfflineMessageComposer({
  isOnline,
  recipients,
  onSend,
  trigger,
}: OfflineMessageComposerProps) {
  const [open, setOpen] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState("normal");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (selectedRecipients.length === 0) {
      toast.error("Please select at least one recipient");
      return;
    }
    if (!subject.trim()) {
      toast.error("Please enter a subject");
      return;
    }
    if (!content.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setIsSending(true);
    try {
      await onSend(selectedRecipients, subject.trim(), content.trim(), priority);
      toast.success(isOnline ? "Message sent!" : "Message queued for sending");
      setOpen(false);
      setSelectedRecipients([]);
      setSubject("");
      setContent("");
      setPriority("normal");
    } catch (error) {
      toast.error("Failed to queue message");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Send className="h-4 w-4" />
            Compose
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            New Message
            {!isOnline && (
              <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700">
                <WifiOff className="h-3 w-3" />
                Offline
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {!isOnline && (
          <Alert className="border-accent bg-accent/50">
            <AlertCircle className="h-4 w-4 text-accent-foreground" />
            <AlertDescription className="text-accent-foreground">
              You're offline. This message will be queued and sent automatically when you reconnect.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Recipients</Label>
            <Select
              value={selectedRecipients[0] || ""}
              onValueChange={(value) => setSelectedRecipients([value])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select recipient..." />
              </SelectTrigger>
              <SelectContent>
                {recipients.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} {r.email ? `(${r.email})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Subject</Label>
            <Input
              placeholder="Message subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              placeholder="Type your message..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending} className="gap-2">
            {isSending ? (
              <>Sending...</>
            ) : (
              <>
                <Send className="h-4 w-4" />
                {isOnline ? "Send" : "Queue Message"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
