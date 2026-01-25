import { useState } from "react";
import { Brain, Send, Sparkles, Lightbulb, TrendingUp, Users, Coins } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props { schoolId: string | null; }

export function OwnerAdvisorModule({ schoolId }: Props) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);

  const suggestedQuestions = [
    { icon: TrendingUp, text: "Should I open a new campus?", color: "text-emerald-600" },
    { icon: Coins, text: "Can I increase fees next year?", color: "text-amber-600" },
    { icon: Users, text: "Which teachers should I retain?", color: "text-blue-600" },
    { icon: Lightbulb, text: "Which department is underperforming?", color: "text-purple-600" },
  ];

  const handleSend = () => {
    if (!query.trim()) return;
    setMessages((prev) => [...prev, { role: "user", content: query }]);
    setMessages((prev) => [...prev, { role: "assistant", content: "AI Strategy Advisor is being configured. This feature will analyze your school data and provide strategic recommendations based on real metrics." }]);
    setQuery("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" /> AI Strategy Advisor
        </h1>
        <p className="text-muted-foreground">Your digital board of directors - strategic insights powered by AI</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {suggestedQuestions.map((q, idx) => (
          <button key={idx} onClick={() => setQuery(q.text)} className="flex items-center gap-3 rounded-xl bg-muted/50 p-4 text-left hover:bg-muted transition-colors">
            <q.icon className={`h-5 w-5 shrink-0 ${q.color}`} />
            <span className="text-sm font-medium">{q.text}</span>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-primary" />Ask the Advisor</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] mb-4 rounded-lg bg-muted/30 p-4">
            {messages.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Ask strategic questions about your institution. The AI will analyze your data and provide insights.</p>
            ) : (
              <div className="space-y-4">
                {messages.map((m, idx) => (
                  <div key={idx} className={`rounded-xl p-3 ${m.role === "user" ? "bg-primary text-primary-foreground ml-8" : "bg-muted mr-8"}`}>
                    <p className="text-sm">{m.content}</p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <div className="flex gap-2">
            <Textarea value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ask a strategic question..." className="min-h-[44px] resize-none" onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())} />
            <Button onClick={handleSend} disabled={!query.trim()}><Send className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
