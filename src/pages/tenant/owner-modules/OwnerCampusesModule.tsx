import { Card, CardContent } from "@/components/ui/card";
import { Building2, TrendingUp, Users, BarChart3 } from "lucide-react";

interface Props { schoolId: string | null; }

export function OwnerCampusesModule({ schoolId }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Multi-Campus View</h1>
        <p className="text-muted-foreground">Campus comparison, rankings, and performance benchmarking</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><Building2 className="h-5 w-5 text-primary" /><p className="mt-2 font-display text-2xl font-bold">1</p><p className="text-xs text-muted-foreground">Total Campuses</p></CardContent></Card>
        <Card><CardContent className="p-4"><Users className="h-5 w-5 text-blue-600" /><p className="mt-2 font-display text-2xl font-bold">—</p><p className="text-xs text-muted-foreground">Cross-Campus Staff</p></CardContent></Card>
        <Card><CardContent className="p-4"><TrendingUp className="h-5 w-5 text-emerald-600" /><p className="mt-2 font-display text-2xl font-bold">—</p><p className="text-xs text-muted-foreground">Best Performer</p></CardContent></Card>
        <Card><CardContent className="p-4"><BarChart3 className="h-5 w-5 text-purple-600" /><p className="mt-2 font-display text-2xl font-bold">—</p><p className="text-xs text-muted-foreground">Avg Performance</p></CardContent></Card>
      </div>
      <Card><CardContent className="py-12 text-center text-muted-foreground">Multi-campus comparison will be available when additional campuses are configured.</CardContent></Card>
    </div>
  );
}
