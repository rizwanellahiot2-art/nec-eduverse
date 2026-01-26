import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const DAYS = [
  { id: -1, label: "All", short: "All" },
  { id: 0, label: "Sunday", short: "Su" },
  { id: 1, label: "Monday", short: "Mo" },
  { id: 2, label: "Tuesday", short: "Tu" },
  { id: 3, label: "Wednesday", short: "We" },
  { id: 4, label: "Thursday", short: "Th" },
  { id: 5, label: "Friday", short: "Fr" },
  { id: 6, label: "Saturday", short: "Sa" },
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
    <ScrollArea className="w-full">
      <div className="flex gap-1 sm:gap-1.5 pb-2">
        {DAYS.map((day) => {
          const isSelected = selectedDay === day.id;
          const isToday = day.id === today && todayHighlight;

          return (
            <button
              key={day.id}
              onClick={() => onSelectDay(day.id)}
              className={cn(
                "relative shrink-0 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                isToday && !isSelected && "ring-2 ring-primary/50"
              )}
            >
              <span className="hidden md:inline">{day.label}</span>
              <span className="md:hidden">{day.short}</span>
              {isToday && (
                <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-primary animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" className="h-1.5" />
    </ScrollArea>
  );
}
