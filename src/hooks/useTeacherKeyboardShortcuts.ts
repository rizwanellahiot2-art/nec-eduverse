import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

interface ShortcutConfig {
  key: string;
  path: string;
  description: string;
}

export function useTeacherKeyboardShortcuts(schoolSlug: string, enabled: boolean = true) {
  const navigate = useNavigate();

  const shortcuts: ShortcutConfig[] = [
    { key: "a", path: `/${schoolSlug}/teacher/attendance`, description: "Attendance" },
    { key: "g", path: `/${schoolSlug}/teacher/gradebook`, description: "Gradebook" },
    { key: "m", path: `/${schoolSlug}/teacher/messages`, description: "Messages" },
    { key: "s", path: `/${schoolSlug}/teacher/students`, description: "Students" },
    { key: "t", path: `/${schoolSlug}/teacher/timetable`, description: "Timetable" },
    { key: "h", path: `/${schoolSlug}/teacher/homework`, description: "Homework" },
    { key: "b", path: `/${schoolSlug}/teacher/behavior`, description: "Behavior Notes" },
    { key: "p", path: `/${schoolSlug}/teacher/progress`, description: "Progress" },
    { key: "l", path: `/${schoolSlug}/teacher/lesson-plans`, description: "Lesson Planner" },
    { key: "r", path: `/${schoolSlug}/teacher/reports`, description: "Reports" },
    { key: "d", path: `/${schoolSlug}/teacher`, description: "Dashboard" },
  ];

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        !enabled
      ) {
        return;
      }

      // Ignore if any modifier keys are pressed (except for Ctrl+K which opens search)
      if (event.metaKey || event.altKey) {
        return;
      }

      // Check for Ctrl+K (open search)
      if (event.ctrlKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        window.dispatchEvent(new Event("eduverse:open-search"));
        return;
      }

      // Skip if ctrl is pressed for other keys
      if (event.ctrlKey) {
        return;
      }

      const key = event.key.toLowerCase();
      const shortcut = shortcuts.find((s) => s.key === key);

      if (shortcut) {
        event.preventDefault();
        navigate(shortcut.path);
      }

      // Escape key to go back to dashboard
      if (event.key === "Escape") {
        navigate(`/${schoolSlug}/teacher`);
      }
    },
    [navigate, shortcuts, enabled, schoolSlug]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown, enabled]);

  return { shortcuts };
}
