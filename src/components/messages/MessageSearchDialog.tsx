import { useState } from "react";
import { Search, Loader2, MessageCircle, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  subject: string | null;
  content: string;
  sender_user_id: string;
  created_at: string;
  is_sent: boolean;
  relevance: number;
}

interface Props {
  schoolId: string;
  currentUserId: string;
  profileMap: Record<string, string>;
  onSelectMessage?: (messageId: string) => void;
}

export function MessageSearchDialog({ schoolId, currentUserId, profileMap, onSelectMessage }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim() || query.trim().length < 2) return;
    
    setSearching(true);
    setHasSearched(true);

    try {
      const { data, error } = await supabase.rpc("search_messages", {
        _school_id: schoolId,
        _user_id: currentUserId,
        _query: query.trim(),
        _limit: 50,
      });

      if (error) throw error;
      setResults((data as SearchResult[]) || []);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleSelectResult = (result: SearchResult) => {
    onSelectMessage?.(result.id);
    setOpen(false);
    setQuery("");
    setResults([]);
    setHasSearched(false);
  };

  const highlightText = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text;
    const parts = text.split(new RegExp(`(${searchQuery})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-primary/20 text-primary px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Search</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Search Messages</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search message content..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-9"
                autoFocus
              />
              {query && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => {
                    setQuery("");
                    setResults([]);
                    setHasSearched(false);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Button onClick={handleSearch} disabled={searching || !query.trim()}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </div>

          <ScrollArea className="h-[400px]">
            {searching ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : results.length === 0 && hasSearched ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground/30" />
                <p className="mt-3 text-sm text-muted-foreground">
                  No messages found for "{query}"
                </p>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-2">
                {results.map((result) => {
                  const senderName = result.is_sent ? "You" : (profileMap[result.sender_user_id] || "User");
                  return (
                    <button
                      key={result.id}
                      onClick={() => handleSelectResult(result)}
                      className={cn(
                        "w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent/50",
                        "focus:outline-none focus:ring-2 focus:ring-primary/50"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{senderName}</span>
                          <Badge variant={result.is_sent ? "secondary" : "default"} className="text-[10px] h-4">
                            {result.is_sent ? "Sent" : "Received"}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {format(parseISO(result.created_at), "MMM d, yyyy")}
                        </span>
                      </div>
                      {result.subject && (
                        <p className="text-sm font-medium truncate mb-1">
                          {highlightText(result.subject, query)}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {highlightText(result.content, query)}
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="h-12 w-12 text-muted-foreground/30" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Enter at least 2 characters to search
                </p>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
