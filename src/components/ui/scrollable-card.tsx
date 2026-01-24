import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ScrollableCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  maxHeight?: string;
  icon?: React.ReactNode;
}

const ScrollableCard = React.forwardRef<HTMLDivElement, ScrollableCardProps>(
  ({ className, title, subtitle, headerAction, maxHeight = "400px", icon, children, ...props }, ref) => {
    return (
      <Card ref={ref} className={cn("shadow-elevated flex flex-col", className)} {...props}>
        {(title || headerAction) && (
          <CardHeader className="pb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {icon && (
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10">
                    {icon}
                  </div>
                )}
                <div>
                  {title && <CardTitle className="font-display text-lg">{title}</CardTitle>}
                  {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
                </div>
              </div>
              {headerAction}
            </div>
          </CardHeader>
        )}
        <CardContent className="flex-1 min-h-0 pb-4">
          <ScrollArea className="h-full" style={{ maxHeight }}>
            {children}
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }
);
ScrollableCard.displayName = "ScrollableCard";

// Inner content wrapper for proper spacing
const ScrollableCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("pr-4", className)} {...props} />
));
ScrollableCardContent.displayName = "ScrollableCardContent";

export { ScrollableCard, ScrollableCardContent };
