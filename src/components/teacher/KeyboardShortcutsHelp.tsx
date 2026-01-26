import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Shortcut {
  key: string;
  path: string;
  description: string;
}

interface Props {
  shortcuts: Shortcut[];
}

export function KeyboardShortcutsHelp({ shortcuts }: Props) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
          <Keyboard className="h-4 w-4" />
          <span className="hidden sm:inline">Shortcuts</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Press these keys anywhere to quickly navigate
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {shortcuts.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between rounded-lg border p-2"
            >
              <span className="text-sm">{s.description}</span>
              <kbd className="rounded bg-muted px-2 py-1 font-mono text-xs font-semibold uppercase">
                {s.key}
              </kbd>
            </div>
          ))}
          <div className="flex items-center justify-between rounded-lg border p-2 sm:col-span-2">
            <span className="text-sm">Global Search</span>
            <div className="flex items-center gap-1">
              <kbd className="rounded bg-muted px-2 py-1 font-mono text-xs font-semibold">
                Ctrl
              </kbd>
              <span className="text-xs">+</span>
              <kbd className="rounded bg-muted px-2 py-1 font-mono text-xs font-semibold">
                K
              </kbd>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-2 sm:col-span-2">
            <span className="text-sm">Back to Dashboard</span>
            <kbd className="rounded bg-muted px-2 py-1 font-mono text-xs font-semibold">
              Esc
            </kbd>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
