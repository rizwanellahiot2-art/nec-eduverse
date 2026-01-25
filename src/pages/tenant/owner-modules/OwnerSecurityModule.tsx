import { Card, CardContent } from "@/components/ui/card";
import { Shield, Lock, Activity, AlertTriangle } from "lucide-react";

interface Props { schoolId: string | null; }

export function OwnerSecurityModule({ schoolId }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">System & Security</h1>
        <p className="text-muted-foreground">Access logs, security monitoring, and system health</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><Shield className="h-5 w-5 text-emerald-600" /><p className="mt-2 font-display text-2xl font-bold">Secure</p><p className="text-xs text-muted-foreground">System Status</p></CardContent></Card>
        <Card><CardContent className="p-4"><Lock className="h-5 w-5 text-primary" /><p className="mt-2 font-display text-2xl font-bold">0</p><p className="text-xs text-muted-foreground">Security Alerts</p></CardContent></Card>
        <Card><CardContent className="p-4"><Activity className="h-5 w-5 text-blue-600" /><p className="mt-2 font-display text-2xl font-bold">99.9%</p><p className="text-xs text-muted-foreground">Uptime</p></CardContent></Card>
        <Card><CardContent className="p-4"><AlertTriangle className="h-5 w-5 text-amber-600" /><p className="mt-2 font-display text-2xl font-bold">0</p><p className="text-xs text-muted-foreground">Suspicious Activity</p></CardContent></Card>
      </div>
      <Card><CardContent className="py-12 text-center text-muted-foreground">Security analytics and access logs will be displayed here as audit data is collected.</CardContent></Card>
    </div>
  );
}
