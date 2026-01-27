import { useState, useEffect, useCallback } from 'react';
import { Search, User, Users, FileText, BookOpen, Loader2, WifiOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useOfflineSearch, OfflineSearchResult } from '@/hooks/useOfflineSearch';

interface OfflineSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string | null;
  onResultClick?: (result: OfflineSearchResult) => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  student: <User className="h-4 w-4" />,
  contact: <Users className="h-4 w-4" />,
  assignment: <FileText className="h-4 w-4" />,
  homework: <BookOpen className="h-4 w-4" />,
};

const typeLabels: Record<string, string> = {
  student: 'Students',
  contact: 'Contacts',
  assignment: 'Assignments',
  homework: 'Homework',
};

const typeColors: Record<string, string> = {
  student: 'bg-blue-500/10 text-blue-700',
  contact: 'bg-purple-500/10 text-purple-700',
  assignment: 'bg-emerald-500/10 text-emerald-700',
  homework: 'bg-amber-500/10 text-amber-700',
};

export function OfflineSearchDialog({
  open,
  onOpenChange,
  schoolId,
  onResultClick,
}: OfflineSearchDialogProps) {
  const [query, setQuery] = useState('');
  const { search, clear, groupedResults, isSearching, hasResults } = useOfflineSearch({
    schoolId,
    enabled: open,
  });

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      clear();
      return;
    }

    const timer = setTimeout(() => {
      search(query.trim());
    }, 200);

    return () => clearTimeout(timer);
  }, [query, search, clear]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery('');
      clear();
    }
  }, [open, clear]);

  const handleResultClick = useCallback((result: OfflineSearchResult) => {
    onResultClick?.(result);
    onOpenChange(false);
  }, [onResultClick, onOpenChange]);

  const isOnline = navigator.onLine;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0">
        <DialogHeader className="border-b p-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            {!isOnline && <WifiOff className="h-4 w-4 text-amber-500" />}
            <Search className="h-4 w-4" />
            Offline Search
          </DialogTitle>
        </DialogHeader>

        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search students, contacts, assignments..."
              className="pl-9"
              autoFocus
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>

          {!isOnline && (
            <p className="mt-2 text-xs text-amber-600">
              Searching cached data only. Some results may be outdated.
            </p>
          )}
        </div>

        <ScrollArea className="max-h-80">
          <div className="space-y-4 p-4 pt-0">
            {query.length < 2 && !hasResults && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search
              </p>
            )}

            {query.length >= 2 && !isSearching && !hasResults && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No results found in offline cache
              </p>
            )}

            {Object.entries(groupedResults).map(([type, results]) => {
              if (results.length === 0) return null;
              
              return (
                <div key={type}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className={cn('rounded p-1', typeColors[type])}>
                      {typeIcons[type]}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {typeLabels[type]} ({results.length})
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    {results.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className="flex w-full items-center justify-between rounded-lg p-2 text-left transition-colors hover:bg-muted/50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{result.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {result.subtitle}
                          </p>
                        </div>
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          {result.matchedField}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
