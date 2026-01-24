import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ConflictInfo } from "@/pages/tenant/modules/components/timetable/ConflictBadge";

interface TimetableConflictAlertProps {
  conflicts: Map<string, ConflictInfo[]>;
  entryLabels: Map<string, string>;
}

export function TimetableConflictAlert({ conflicts, entryLabels }: TimetableConflictAlertProps) {
  const conflictEntries = Array.from(conflicts.entries()).filter(([, c]) => c.length > 0);
  
  if (conflictEntries.length === 0) return null;

  const teacherConflicts = conflictEntries.filter(([, c]) => c.some((x) => x.type === "teacher"));
  const roomConflicts = conflictEntries.filter(([, c]) => c.some((x) => x.type === "room"));

  return (
    <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Schedule Conflicts Detected</AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        {teacherConflicts.length > 0 && (
          <div>
            <span className="font-medium">Teacher double-bookings:</span>{" "}
            <span className="text-sm">
              {teacherConflicts.length} period{teacherConflicts.length > 1 ? "s" : ""} where you're assigned to multiple sections simultaneously.
            </span>
          </div>
        )}
        {roomConflicts.length > 0 && (
          <div>
            <span className="font-medium">Room collisions:</span>{" "}
            <span className="text-sm">
              {roomConflicts.length} period{roomConflicts.length > 1 ? "s" : ""} where the same room is used by multiple sections.
            </span>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          Please contact your administrator to resolve these conflicts.
        </p>
      </AlertDescription>
    </Alert>
  );
}
