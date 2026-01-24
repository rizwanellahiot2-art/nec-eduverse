import { useMemo } from "react";
import type { ConflictInfo } from "./ConflictBadge";

type EntryRow = {
  id: string;
  day_of_week: number;
  period_id: string;
  subject_name: string;
  teacher_user_id: string | null;
  room: string | null;
  class_section_id?: string;
};

type ConflictMap = Map<string, ConflictInfo[]>;

/**
 * Detects teacher and room conflicts school-wide.
 * Returns a Map keyed by entry ID with conflict info.
 */
export function useConflictDetection(
  allEntries: EntryRow[],
  currentSectionId: string,
  sectionLabelById: Map<string, string>,
): ConflictMap {
  return useMemo(() => {
    const conflicts: ConflictMap = new Map();

    // Group entries by slot (day+period)
    const slotMap = new Map<string, EntryRow[]>();
    for (const e of allEntries) {
      const key = `${e.day_of_week}:${e.period_id}`;
      const list = slotMap.get(key) ?? [];
      list.push(e);
      slotMap.set(key, list);
    }

    // Check each slot for conflicts
    for (const [, entriesInSlot] of slotMap) {
      // Teacher conflicts
      const byTeacher = new Map<string, EntryRow[]>();
      for (const e of entriesInSlot) {
        if (!e.teacher_user_id) continue;
        const list = byTeacher.get(e.teacher_user_id) ?? [];
        list.push(e);
        byTeacher.set(e.teacher_user_id, list);
      }

      for (const [, group] of byTeacher) {
        if (group.length > 1) {
          // Mark each entry in this group as having a teacher conflict
          for (const e of group) {
            const others = group.filter((x) => x.id !== e.id);
            const sectionNames = others
              .map((x) => sectionLabelById.get(x.class_section_id ?? "") ?? "another section")
              .join(", ");
            const existing = conflicts.get(e.id) ?? [];
            existing.push({
              type: "teacher",
              message: `Teacher already assigned in ${sectionNames}`,
            });
            conflicts.set(e.id, existing);
          }
        }
      }

      // Room conflicts
      const byRoom = new Map<string, EntryRow[]>();
      for (const e of entriesInSlot) {
        const room = e.room?.trim().toLowerCase();
        if (!room) continue;
        const list = byRoom.get(room) ?? [];
        list.push(e);
        byRoom.set(room, list);
      }

      for (const [, group] of byRoom) {
        if (group.length > 1) {
          for (const e of group) {
            const others = group.filter((x) => x.id !== e.id);
            const sectionNames = others
              .map((x) => sectionLabelById.get(x.class_section_id ?? "") ?? "another section")
              .join(", ");
            const existing = conflicts.get(e.id) ?? [];
            existing.push({
              type: "room",
              message: `Room already used in ${sectionNames}`,
            });
            conflicts.set(e.id, existing);
          }
        }
      }
    }

    return conflicts;
  }, [allEntries, currentSectionId, sectionLabelById]);
}
