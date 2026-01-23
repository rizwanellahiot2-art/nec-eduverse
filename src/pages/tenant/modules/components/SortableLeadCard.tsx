import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Star } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SortableLeadCard({
  lead,
  onBumpScore,
  onOpen,
}: {
  lead: { id: string; full_name: string; score: number; notes: string | null };
  onBumpScore: () => void;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as const;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        "rounded-2xl bg-surface p-3 shadow-elevated " +
        (isDragging ? "opacity-70" : "opacity-100")
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{lead.full_name}</p>
          {lead.notes && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{lead.notes}</p>}
        </div>

        <button
          className="grid h-8 w-8 place-items-center rounded-xl bg-surface-2 text-muted-foreground"
          {...attributes}
          {...listeners}
          aria-label="Drag"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Star className="h-3 w-3" />
          <span className="font-medium text-foreground">{lead.score ?? 0}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="soft" size="sm" onClick={onOpen}>
            Open
          </Button>
          <Button variant="soft" size="sm" onClick={onBumpScore}>
            +5
          </Button>
        </div>
      </div>
    </div>
  );
}
