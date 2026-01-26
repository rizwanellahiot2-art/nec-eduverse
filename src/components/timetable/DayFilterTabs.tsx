import { useMemo } from "react";
import { cn } from "@/lib/utils";

const DAYS = [
  { id: -1, label: "All", short: "All" },
  { id: 0, label: "Sunday", short: "Sun" },
  { id: 1, label: "Monday", short: "Mon" },
  { id: 2, label: "Tuesday", short: "Tue" },
  { id: 3, label: "Wednesday", short: "Wed" },
  { id: 4, label: "Thursday", short: "Thu" },
  { id: 5, label: "Friday", short: "Fri" },
  { id: 6, label: "Saturday", short: "Sat" },
];

export function DayFilterTabs({
  selectedDay,
  onSelectDay,
  todayHighlight = true,
}: {
  selectedDay: number;
  onSelectDay: (day: number) => void;
  todayHighlight?: boolean;
}) {
  const today = useMemo(() => new Date().getDay(), []);

  return (
    <div className="flex flex-wrap gap-1.5">
      {DAYS.map((day) => {
        const isSelected = selectedDay === day.id;
        const isToday = day.id === today && todayHighlight;

        return (
          <button
            key={day.id}
            onClick={() => onSelectDay(day.id)}
            className={cn(
              "relative px-3 py-1.5 text-sm font-medium rounded-lg transition-all",
              isSelected
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
              isToday && !isSelected && "ring-2 ring-primary/50"
            )}
          >
            <span className="hidden sm:inline">{day.label}</span>
            <span className="sm:hidden">{day.short}</span>
            {isToday && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary animate-pulse" />
            )}
          </button>
        );
      })}
    </div>
  );
}
