import { useEffect, useRef } from "react";

/**
 * Signature moment: a subtle pointer-reactive spotlight that follows the cursor.
 * GPU-friendly + respects reduced motion (via reduced pointer activity when unavailable).
 */
export function SpotlightBackdrop() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mql = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (mql?.matches) return;

    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const x = Math.round((e.clientX / window.innerWidth) * 100);
        const y = Math.round((e.clientY / window.innerHeight) * 100);
        el.style.setProperty("--spot-x", `${x}%`);
        el.style.setProperty("--spot-y", `${y}%`);
      });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-70"
      style={{
        // default spotlight position
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        "--spot-x": "20%",
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        "--spot-y": "10%",
        background:
          "radial-gradient(800px circle at var(--spot-x) var(--spot-y), hsl(var(--brand) / 0.20), transparent 55%)",
      }}
    />
  );
}
