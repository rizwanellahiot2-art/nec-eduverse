import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, HeartPulse, Users, Activity } from "lucide-react";

interface Props { schoolId: string | null; }

export function OwnerWellbeingModule({ schoolId }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Student Wellbeing & Safety</h1>
        <p className="text-muted-foreground">Welfare tracking, behavior analytics, and safety monitoring</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><HeartPulse className="h-5 w-5 text-pink-600" /><p className="mt-2 font-display text-2xl font-bold">Good</p><p className="text-xs text-muted-foreground">Overall Wellbeing</p></CardContent></Card>
        <Card><CardContent className="p-4"><Users className="h-5 w-5 text-blue-600" /><p className="mt-2 font-display text-2xl font-bold">12</p><p className="text-xs text-muted-foreground">Counseling Sessions</p></CardContent></Card>
        <Card><CardContent className="p-4"><AlertTriangle className="h-5 w-5 text-amber-600" /><p className="mt-2 font-display text-2xl font-bold">3</p><p className="text-xs text-muted-foreground">Behavior Incidents</p></CardContent></Card>
        <Card><CardContent className="p-4"><Activity className="h-5 w-5 text-emerald-600" /><p className="mt-2 font-display text-2xl font-bold">Low</p><p className="text-xs text-muted-foreground">Dropout Risk</p></CardContent></Card>
      </div>
      <Card><CardContent className="py-12 text-center text-muted-foreground">Wellbeing analytics will be populated as counseling and behavior data is collected.</CardContent></Card>
    </div>
  );
}
