import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  BookOpen,
  CalendarCheck,
  ChevronUp,
  ClipboardCheck,
  FileText,
  MessageSquare,
  NotebookPen,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  schoolSlug: string;
}

export function QuickActionsBar({ schoolSlug }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const navigate = useNavigate();

  if (!isVisible) return null;

  const quickActions = [
    {
      icon: ClipboardCheck,
      label: "Mark Attendance",
      shortcut: "A",
      path: `/${schoolSlug}/teacher/attendance`,
      color: "text-green-500",
    },
    {
      icon: NotebookPen,
      label: "Log Period",
      shortcut: "L",
      path: `/${schoolSlug}/teacher/timetable`,
      color: "text-blue-500",
    },
    {
      icon: BookOpen,
      label: "Add Homework",
      shortcut: "H",
      path: `/${schoolSlug}/teacher/homework`,
      color: "text-orange-500",
    },
    {
      icon: FileText,
      label: "Grade Work",
      shortcut: "G",
      path: `/${schoolSlug}/teacher/assignments`,
      color: "text-purple-500",
    },
    {
      icon: MessageSquare,
      label: "Messages",
      shortcut: "M",
      path: `/${schoolSlug}/teacher/messages`,
      color: "text-cyan-500",
    },
    {
      icon: Bell,
      label: "Behavior Note",
      shortcut: "B",
      path: `/${schoolSlug}/teacher/behavior`,
      color: "text-amber-500",
    },
  ];

  return (
    <>
      {/* Desktop Floating Bar */}
      <div className="fixed bottom-4 left-1/2 z-50 hidden -translate-x-1/2 md:block">
        <div
          className={cn(
            "flex items-center gap-1 rounded-2xl border bg-background/95 p-1.5 shadow-lg backdrop-blur-md transition-all duration-300",
            isExpanded ? "gap-2 px-3" : ""
          )}
        >
          {isExpanded ? (
            <>
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  to={action.path}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                >
                  <action.icon className={cn("h-4 w-4", action.color)} />
                  <span className="hidden lg:inline">{action.label}</span>
                  <kbd className="hidden rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground lg:inline">
                    {action.shortcut}
                  </kbd>
                </Link>
              ))}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setIsExpanded(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="default"
                size="sm"
                className="gap-2"
                onClick={() => setIsExpanded(true)}
              >
                <ChevronUp className="h-4 w-4" />
                Quick Actions
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Mobile Floating Action Button */}
      <div className="fixed bottom-20 right-4 z-50 md:hidden">
        {isExpanded ? (
          <div className="flex flex-col items-end gap-2 animate-in slide-in-from-bottom-4">
            {quickActions.slice(0, 4).map((action) => (
              <Link
                key={action.label}
                to={action.path}
                className="flex items-center gap-2 rounded-full bg-background/95 px-4 py-2 text-sm font-medium shadow-lg backdrop-blur-md transition-transform hover:scale-105"
              >
                <action.icon className={cn("h-4 w-4", action.color)} />
                {action.label}
              </Link>
            ))}
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full shadow-lg"
              onClick={() => setIsExpanded(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <Button
            variant="default"
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg"
            onClick={() => setIsExpanded(true)}
          >
            <ClipboardCheck className="h-6 w-6" />
          </Button>
        )}
      </div>
    </>
  );
}
