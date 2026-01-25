import { useState } from "react";
import { Trash2, Loader2, AlertTriangle, EyeOff, UserX } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type DeleteMode = "clear_for_me" | "delete_for_everyone";

interface Props {
  recipientName: string;
  onDelete: (mode: DeleteMode) => Promise<void>;
  trigger?: React.ReactNode;
  className?: string;
}

export function DeleteConversationDialog({ recipientName, onDelete, trigger, className }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<DeleteMode>("clear_for_me");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(mode);
      setOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {/* Custom trigger that opens dialog on click */}
      {trigger ? (
        <span onClick={handleTriggerClick}>{trigger}</span>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-7 w-7 shrink-0", className)}
          onClick={handleTriggerClick}
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
        </Button>
      )}
      
      <AlertDialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete Conversation
          </AlertDialogTitle>
          <AlertDialogDescription>
            Choose how you want to delete this conversation with <strong>{recipientName}</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as DeleteMode)} className="space-y-3">
            {/* Clear for me */}
            <div
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                mode === "clear_for_me" ? "border-primary bg-primary/5" : "hover:bg-accent/50"
              )}
              onClick={() => setMode("clear_for_me")}
            >
              <RadioGroupItem value="clear_for_me" id="clear_for_me" className="mt-0.5" />
              <div className="flex-1">
                <Label htmlFor="clear_for_me" className="flex items-center gap-2 font-medium cursor-pointer">
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                  Clear chat for me
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  This conversation will be hidden from your inbox. {recipientName} will still see it.
                  If they message you again, the conversation will reappear.
                </p>
              </div>
            </div>

            {/* Delete for everyone */}
            <div
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                mode === "delete_for_everyone" ? "border-destructive bg-destructive/5" : "hover:bg-accent/50"
              )}
              onClick={() => setMode("delete_for_everyone")}
            >
              <RadioGroupItem value="delete_for_everyone" id="delete_for_everyone" className="mt-0.5" />
              <div className="flex-1">
                <Label htmlFor="delete_for_everyone" className="flex items-center gap-2 font-medium cursor-pointer">
                  <UserX className="h-4 w-4 text-destructive" />
                  Delete for everyone
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Messages you sent will be permanently deleted for both you and {recipientName}. 
                  Messages you received will be removed from your view only.
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  <span>This action cannot be undone</span>
                </div>
              </div>
            </div>
          </RadioGroup>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <Button
            variant={mode === "delete_for_everyone" ? "destructive" : "default"}
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : mode === "delete_for_everyone" ? (
              "Delete for everyone"
            ) : (
              "Clear for me"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
