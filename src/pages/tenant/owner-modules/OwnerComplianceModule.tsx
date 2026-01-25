import { Card, CardContent } from "@/components/ui/card";
import { Scale, Shield, FileText, CheckCircle } from "lucide-react";

interface Props { schoolId: string | null; }

export function OwnerComplianceModule({ schoolId }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Compliance & Governance</h1>
        <p className="text-muted-foreground">Audit trails, accreditation reports, and policy compliance</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><Scale className="h-5 w-5 text-primary" /><p className="mt-2 font-display text-2xl font-bold">Active</p><p className="text-xs text-muted-foreground">Accreditation Status</p></CardContent></Card>
        <Card><CardContent className="p-4"><Shield className="h-5 w-5 text-emerald-600" /><p className="mt-2 font-display text-2xl font-bold">Compliant</p><p className="text-xs text-muted-foreground">Policy Status</p></CardContent></Card>
        <Card><CardContent className="p-4"><FileText className="h-5 w-5 text-blue-600" /><p className="mt-2 font-display text-2xl font-bold">15</p><p className="text-xs text-muted-foreground">Audit Records</p></CardContent></Card>
        <Card><CardContent className="p-4"><CheckCircle className="h-5 w-5 text-purple-600" /><p className="mt-2 font-display text-2xl font-bold">100%</p><p className="text-xs text-muted-foreground">Compliance Score</p></CardContent></Card>
      </div>
      <Card><CardContent className="py-12 text-center text-muted-foreground">Compliance and governance reports will be available once audit logging is fully integrated.</CardContent></Card>
    </div>
  );
}
