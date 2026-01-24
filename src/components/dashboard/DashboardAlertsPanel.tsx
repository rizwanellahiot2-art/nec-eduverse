import { AlertTriangle, Bell, CheckCircle, Info, Ticket, Users, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DashboardAlert } from "@/hooks/useDashboardAlerts";

type Props = {
  alerts: DashboardAlert[];
  onDismiss: (id: string) => void;
  onNavigate?: (path: string) => void;
};

const severityColors = {
  info: "bg-muted text-muted-foreground border-border",
  warning: "bg-accent text-accent-foreground border-border",
  critical: "bg-destructive/10 text-destructive border-destructive/20",
};

const severityIcons = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertTriangle,
};

const typeIcons = {
  support_ticket: Ticket,
  low_attendance: Users,
  pending_invoice: FileText,
};

export function DashboardAlertsPanel({ alerts, onDismiss, onNavigate }: Props) {
  if (alerts.length === 0) {
    return null;
  }

  return (
    <Card className="border-accent bg-accent/50 shadow-elevated">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">
              Active Alerts
            </CardTitle>
            <Badge variant="secondary">
              {alerts.length}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => {
          const SeverityIcon = severityIcons[alert.severity];
          const TypeIcon = typeIcons[alert.type];

          return (
            <div
              key={alert.id}
              className={`relative flex items-start gap-3 rounded-xl border p-4 ${severityColors[alert.severity]}`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/80">
                <TypeIcon className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{alert.title}</p>
                  {alert.severity === "critical" && (
                    <Badge variant="destructive" className="text-xs">
                      Critical
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm opacity-80">{alert.message}</p>
                <div className="mt-2 flex items-center gap-2">
                  {alert.type === "support_ticket" && onNavigate && (
                    <Button
                      variant="soft"
                      size="sm"
                      onClick={() => onNavigate("support")}
                      className="h-7 text-xs"
                    >
                      View Tickets
                    </Button>
                  )}
                  {alert.type === "low_attendance" && onNavigate && (
                    <Button
                      variant="soft"
                      size="sm"
                      onClick={() => onNavigate("reports")}
                      className="h-7 text-xs"
                    >
                      View Reports
                    </Button>
                  )}
                  {alert.type === "pending_invoice" && onNavigate && (
                    <Button
                      variant="soft"
                      size="sm"
                      onClick={() => onNavigate("finance")}
                      className="h-7 text-xs"
                    >
                      View Finance
                    </Button>
                  )}
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 opacity-60 hover:opacity-100"
                onClick={() => onDismiss(alert.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function AlertsSummaryBadge({
  criticalCount,
  warningCount,
}: {
  criticalCount: number;
  warningCount: number;
}) {
  if (criticalCount === 0 && warningCount === 0) {
    return (
      <Badge variant="outline" className="gap-1 bg-primary/10 text-primary">
        <CheckCircle className="h-3 w-3" />
        All Good
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {criticalCount > 0 && (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          {criticalCount} Critical
        </Badge>
      )}
      {warningCount > 0 && (
        <Badge variant="secondary" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          {warningCount} Warning
        </Badge>
      )}
    </div>
  );
}
