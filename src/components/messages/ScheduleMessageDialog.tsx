import { useState } from "react";
import { format, addHours, setHours, setMinutes, isBefore } from "date-fns";
import { CalendarIcon, Clock, Send, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchedule: (scheduledAt: Date) => Promise<void>;
  messagePreview?: string;
}

export function ScheduleMessageDialog({ open, onOpenChange, onSchedule, messagePreview }: Props) {
  const [date, setDate] = useState<Date | undefined>(addHours(new Date(), 1));
  const [hour, setHour] = useState("09");
  const [minute, setMinute] = useState("00");
  const [period, setPeriod] = useState<"AM" | "PM">("AM");
  const [scheduling, setScheduling] = useState(false);

  const handleSchedule = async () => {
    if (!date) {
      toast({ title: "Please select a date", variant: "destructive" });
      return;
    }

    // Build the scheduled time
    let hourNum = parseInt(hour, 10);
    if (period === "PM" && hourNum !== 12) hourNum += 12;
    if (period === "AM" && hourNum === 12) hourNum = 0;

    const scheduledAt = setMinutes(setHours(date, hourNum), parseInt(minute, 10));

    if (isBefore(scheduledAt, new Date())) {
      toast({ title: "Cannot schedule in the past", variant: "destructive" });
      return;
    }

    setScheduling(true);
    try {
      await onSchedule(scheduledAt);
      onOpenChange(false);
      toast({ title: "Message scheduled", description: `Will be sent on ${format(scheduledAt, "MMM d, yyyy 'at' h:mm a")}` });
    } catch (err: any) {
      toast({ title: "Failed to schedule", description: err.message, variant: "destructive" });
    } finally {
      setScheduling(false);
    }
  };

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const minutes = ["00", "15", "30", "45"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Schedule Message
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {messagePreview && (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Message preview:</p>
              <p className="text-sm line-clamp-2">{messagePreview}</p>
            </div>
          )}

          {/* Date picker */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => isBefore(d, new Date(new Date().setHours(0, 0, 0, 0)))}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time picker */}
          <div className="space-y-2">
            <Label>Time</Label>
            <div className="flex gap-2">
              <Select value={hour} onValueChange={setHour}>
                <SelectTrigger className="w-20">
                  <SelectValue placeholder="HH" />
                </SelectTrigger>
                <SelectContent>
                  {hours.map((h) => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="flex items-center text-muted-foreground">:</span>
              <Select value={minute} onValueChange={setMinute}>
                <SelectTrigger className="w-20">
                  <SelectValue placeholder="MM" />
                </SelectTrigger>
                <SelectContent>
                  {minutes.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={period} onValueChange={(v) => setPeriod(v as "AM" | "PM")}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AM">AM</SelectItem>
                  <SelectItem value="PM">PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {date && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-sm text-primary">
                Message will be sent on{" "}
                <strong>
                  {format(date, "EEEE, MMMM d, yyyy")} at {hour}:{minute} {period}
                </strong>
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSchedule} disabled={scheduling || !date}>
            {scheduling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scheduling...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Schedule
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
