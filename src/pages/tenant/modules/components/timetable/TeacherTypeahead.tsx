import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type DirectoryRow = { user_id: string; display_name: string | null; email: string };

interface TeacherTypeaheadProps {
  value: string;
  onValueChange: (value: string) => void;
  directory: DirectoryRow[];
  placeholder?: string;
}

export function TeacherTypeahead({
  value,
  onValueChange,
  directory,
  placeholder = "Search teacher...",
}: TeacherTypeaheadProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return directory;
    const q = search.toLowerCase();
    return directory.filter(
      (d) =>
        (d.display_name?.toLowerCase().includes(q) ?? false) ||
        d.email.toLowerCase().includes(q),
    );
  }, [directory, search]);

  const selectedLabel = useMemo(() => {
    if (!value) return null;
    const d = directory.find((d) => d.user_id === value);
    return d ? d.display_name ?? d.email : null;
  }, [value, directory]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedLabel ?? <span className="text-muted-foreground">{placeholder}</span>}
          <div className="flex items-center gap-1">
            {value && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onValueChange("");
                }}
                className="rounded-sm p-0.5 hover:bg-accent"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={placeholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No teachers found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((d) => (
                <CommandItem
                  key={d.user_id}
                  value={d.user_id}
                  onSelect={() => {
                    onValueChange(d.user_id === value ? "" : d.user_id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === d.user_id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{d.display_name ?? d.email}</span>
                    {d.display_name && (
                      <span className="text-xs text-muted-foreground">{d.email}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
