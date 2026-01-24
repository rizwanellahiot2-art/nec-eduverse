import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";

interface AttendancePercentageBadgeProps {
  percentage: number;
  showIcon?: boolean;
  className?: string;
}

export function AttendancePercentageBadge({
  percentage,
  showIcon = true,
  className,
}: AttendancePercentageBadgeProps) {
  const isLow = percentage < 75;
  const isWarning = percentage >= 75 && percentage < 85;
  const isGood = percentage >= 85;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        isLow && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        isWarning && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        isGood && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        className
      )}
    >
      {showIcon && (
        <>
          {isLow && <AlertTriangle className="h-3 w-3" />}
          {isWarning && <TrendingDown className="h-3 w-3" />}
          {isGood && <TrendingUp className="h-3 w-3" />}
        </>
      )}
      {percentage.toFixed(1)}%
    </span>
  );
}
