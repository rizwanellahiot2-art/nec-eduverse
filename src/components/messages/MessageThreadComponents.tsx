import { Reply, CornerDownRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface ThreadedMessage {
  id: string;
  content: string;
  sender_user_id: string;
  created_at: string;
  is_mine: boolean;
  is_read: boolean;
  attachment_urls?: string[];
  subject?: string;
  reply_to_id?: string;
  replies?: ThreadedMessage[];
}

interface ReplyPreviewProps {
  parentMessage: ThreadedMessage | undefined;
  onClear: () => void;
  isMine?: boolean;
}

export function ReplyPreview({ parentMessage, onClear, isMine }: ReplyPreviewProps) {
  if (!parentMessage) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border-l-4 border-primary bg-muted/50 p-2">
      <CornerDownRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="flex-1 overflow-hidden">
        <p className="text-xs font-medium text-muted-foreground">
          Replying to {isMine ? "yourself" : "message"}
        </p>
        <p className="truncate text-sm">{parentMessage.content}</p>
      </div>
      <button
        onClick={onClear}
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        ×
      </button>
    </div>
  );
}

interface ReplyIndicatorProps {
  parentMessage: ThreadedMessage | undefined;
  profileMap: Record<string, string>;
}

export function ReplyIndicator({ parentMessage, profileMap }: ReplyIndicatorProps) {
  if (!parentMessage) return null;

  const senderName = parentMessage.is_mine
    ? "You"
    : profileMap[parentMessage.sender_user_id] || "User";

  return (
    <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
      <Reply className="h-3 w-3" />
      <span>
        Reply to {senderName}: "{parentMessage.content.substring(0, 30)}
        {parentMessage.content.length > 30 ? "..." : ""}"
      </span>
    </div>
  );
}

interface TypingIndicatorProps {
  isTyping: boolean;
  userName?: string;
}

export function TypingIndicator({ isTyping, userName }: TypingIndicatorProps) {
  if (!isTyping) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="flex items-center gap-1">
        <div className="flex gap-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.3s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.15s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" />
        </div>
      </div>
      <span className="text-xs text-muted-foreground">
        {userName ? `${userName} is typing...` : "typing..."}
      </span>
    </div>
  );
}

// Helper to group messages by threads
export function groupMessagesByThread(messages: ThreadedMessage[]): ThreadedMessage[] {
  const messageMap = new Map<string, ThreadedMessage>();
  const rootMessages: ThreadedMessage[] = [];

  // First pass: create map of all messages
  messages.forEach((msg) => {
    messageMap.set(msg.id, { ...msg, replies: [] });
  });

  // Second pass: organize into threads
  messages.forEach((msg) => {
    const message = messageMap.get(msg.id)!;
    if (msg.reply_to_id) {
      const parent = messageMap.get(msg.reply_to_id);
      if (parent) {
        parent.replies = parent.replies || [];
        parent.replies.push(message);
      } else {
        // Parent not found, treat as root
        rootMessages.push(message);
      }
    } else {
      rootMessages.push(message);
    }
  });

  return rootMessages;
}
