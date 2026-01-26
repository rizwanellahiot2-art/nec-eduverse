import { useMemo, useEffect, useState } from "react";
import { Clock, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Period = {
  id: string;
  label: string;
  start_time: string | null;
  end_time: string | null;
  is_break?: boolean;
};

function parseTime(timeStr: string | null): { hours: number; minutes: number } | null {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return { hours, minutes };
}

function getCurrentMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function useCurrentPeriod(periods: Period[]) {
  const [currentMinutes, setCurrentMinutes] = useState(getCurrentMinutes);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMinutes(getCurrentMinutes());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const result = useMemo(() => {
    const today = new Date().getDay();
    let currentPeriod: Period | null = null;
    let nextPeriod: Period | null = null;
    let minutesUntilNext: number | null = null;

    for (let i = 0; i < periods.length; i++) {
      const p = periods[i];
      const start = parseTime(p.start_time);
      const end = parseTime(p.end_time);

      if (start && end) {
        const startMins = start.hours * 60 + start.minutes;
        const endMins = end.hours * 60 + end.minutes;

        if (currentMinutes >= startMins && currentMinutes < endMins) {
          currentPeriod = p;
          if (i + 1 < periods.length) {
            nextPeriod = periods[i + 1];
            const nextStart = parseTime(periods[i + 1].start_time);
            if (nextStart) {
              minutesUntilNext = nextStart.hours * 60 + nextStart.minutes - currentMinutes;
            }
          }
          break;
        }

        if (currentMinutes < startMins && !nextPeriod) {
          nextPeriod = p;
          minutesUntilNext = startMins - currentMinutes;
        }
      }
    }

    return { currentPeriod, nextPeriod, minutesUntilNext, dayOfWeek: today };
  }, [periods, currentMinutes]);

  return result;
}

export function CurrentPeriodIndicator({
  periods,
  className,
}: {
  periods: Period[];
  className?: string;
}) {
  const { currentPeriod, nextPeriod, minutesUntilNext } = useCurrentPeriod(periods);

  if (!currentPeriod && !nextPeriod) {
    return null;
  }

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {currentPeriod && (
        <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2">
          <Clock className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-sm font-medium">
            Now: <span className="text-primary">{currentPeriod.label}</span>
          </span>
        </div>
      )}

      {nextPeriod && minutesUntilNext !== null && (
        <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2">
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Next: {nextPeriod.label}
            {minutesUntilNext > 0 && (
              <Badge variant="outline" className="ml-2 text-xs">
                in {minutesUntilNext} min
              </Badge>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
