import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command";
import { Search, Users, GraduationCap, KanbanSquare, BarChart3 } from "lucide-react";

type Props = {
  basePath: string; // e.g. "/acme/principal" or "/acme/teacher"
};

export function GlobalCommandPalette({ basePath }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isK = e.key.toLowerCase() === "k";
      if ((e.metaKey || e.ctrlKey) && isK) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("eduverse:open-search", onOpen);
    return () => window.removeEventListener("eduverse:open-search", onOpen);
  }, []);

  const items = useMemo(
    () => [
      { label: "Global search", icon: Search, href: `${basePath}/directory` },
      { label: "Students", icon: GraduationCap, href: `${basePath}/academic` },
      { label: "Staff & Users", icon: Users, href: `${basePath}/users` },
      { label: "Admissions CRM", icon: KanbanSquare, href: `${basePath}/crm` },
      { label: "Reports", icon: BarChart3, href: `${basePath}/reports` },
    ],
    [basePath],
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search anything…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {items.map((it) => (
            <CommandItem
              key={it.label}
              value={it.label}
              onSelect={() => {
                setOpen(false);
                navigate(it.href);
              }}
            >
              <it.icon className="mr-2 h-4 w-4" />
              <span>{it.label}</span>
              <CommandShortcut>↵</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Tips">
          <CommandItem disabled>
            <span className="text-muted-foreground">Ctrl/⌘ K to open from anywhere</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
