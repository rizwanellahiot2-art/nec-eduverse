import { Card, CardContent } from "@/components/ui/card";
import { Star, MessageSquare, ThumbsUp, TrendingUp } from "lucide-react";

interface Props { schoolId: string | null; }

export function OwnerBrandModule({ schoolId }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Brand & Experience</h1>
        <p className="text-muted-foreground">Parent satisfaction, reviews, and reputation monitoring</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><Star className="h-5 w-5 text-amber-500" /><p className="mt-2 font-display text-2xl font-bold">4.5</p><p className="text-xs text-muted-foreground">Average Rating</p></CardContent></Card>
        <Card><CardContent className="p-4"><ThumbsUp className="h-5 w-5 text-emerald-600" /><p className="mt-2 font-display text-2xl font-bold">72</p><p className="text-xs text-muted-foreground">NPS Score</p></CardContent></Card>
        <Card><CardContent className="p-4"><MessageSquare className="h-5 w-5 text-blue-600" /><p className="mt-2 font-display text-2xl font-bold">8</p><p className="text-xs text-muted-foreground">Open Complaints</p></CardContent></Card>
        <Card><CardContent className="p-4"><TrendingUp className="h-5 w-5 text-primary" /><p className="mt-2 font-display text-2xl font-bold">Positive</p><p className="text-xs text-muted-foreground">Brand Sentiment</p></CardContent></Card>
      </div>
      <Card><CardContent className="py-12 text-center text-muted-foreground">Brand analytics will be available once parent feedback and survey systems are integrated.</CardContent></Card>
    </div>
  );
}
