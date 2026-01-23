import { useMemo, useState } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

export type DashboardWidget = {
  id: string;
  title: string;
  description?: string;
  body: React.ReactNode;
  accent?: "primary" | "muted";
};

export function SortableWidgetGrid({ widgets, className }: { widgets: DashboardWidget[]; className?: string }) {
  const [order, setOrder] = useState<string[]>(() => widgets.map((w) => w.id));
  const prefersReducedMotion = useReducedMotion();

  const items = useMemo(() => {
    const byId = new Map(widgets.map((w) => [w.id, w] as const));
    return order.map((id) => byId.get(id)).filter(Boolean) as DashboardWidget[];
  }, [order, widgets]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(String(active.id));
    const newIndex = order.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    setOrder((prev) => arrayMove(prev, oldIndex, newIndex));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={order} strategy={rectSortingStrategy}>
        <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3", className)}>
          {items.map((w, idx) => (
            <SortableWidgetCard key={w.id} widget={w} idx={idx} reducedMotion={prefersReducedMotion} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableWidgetCard({
  widget,
  idx,
  reducedMotion,
}: {
  widget: DashboardWidget;
  idx: number;
  reducedMotion: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={reducedMotion ? undefined : { opacity: 0, y: 10 }}
      animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={reducedMotion ? undefined : { duration: 0.35, delay: Math.min(idx * 0.03, 0.2) }}
      className={cn(
        "group rounded-3xl bg-surface p-5 shadow-soft ring-1 ring-border/60 transition-shadow hover:shadow-elevated",
        "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-80 shadow-elevated",
      )}
      data-widget-id={widget.id}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display text-base font-semibold tracking-tight">{widget.title}</p>
          {widget.description ? <p className="mt-1 text-xs text-muted-foreground">{widget.description}</p> : null}
        </div>
        <div className="mt-1 h-8 w-8 rounded-xl bg-accent/70 ring-1 ring-border/60" aria-hidden="true" />
      </div>
      <div className="mt-4">{widget.body}</div>
      <p className="mt-4 text-[11px] text-muted-foreground/80">Drag to reorder</p>
    </motion.div>
  );
}
