"use client";

import { useEffect, useRef, useState } from "react";

export type Snap = "collapsed" | "half" | "full";
const ORDER: Snap[] = ["collapsed", "half", "full"];
const COLLAPSED_PX = 96;

function heights(vh: number, bottomOffset: number): Record<Snap, number> {
  const full = Math.round(vh * 0.92) - bottomOffset;
  return { collapsed: COLLAPSED_PX, half: Math.min(Math.round(vh * 0.45), full), full };
}

/**
 * Draggable sheet with three stops (DESIGN.md §6): 96 px, 45%, 92%.
 * Content scrolls only when full. The handle is also a button for keyboard users.
 */
export function BottomSheet({
  snap,
  onSnapChange,
  bottomOffset,
  onVisibleHeight,
  header,
  children,
  label,
  scrollFrom = "full",
}: {
  snap: Snap;
  onSnapChange: (s: Snap) => void;
  bottomOffset: number;
  onVisibleHeight?: (px: number) => void;
  header: React.ReactNode;
  children: React.ReactNode;
  label: string;
  /** Lists scroll only when full (DESIGN.md §6); details may scroll from half. */
  scrollFrom?: "half" | "full";
}) {
  const [vh, setVh] = useState(800);
  const [drag, setDrag] = useState<number | null>(null);
  const start = useRef<{ y: number; h: number; t: number } | null>(null);
  const moved = useRef(false);

  useEffect(() => {
    const update = () => setVh(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const h = heights(vh, bottomOffset);
  const current = drag ?? h[snap];

  const visible = Math.min(h[snap], h.half);
  useEffect(() => {
    onVisibleHeight?.(visible);
  }, [visible, onVisibleHeight]);

  function onPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    start.current = { y: e.clientY, h: current, t: performance.now() };
    moved.current = false;
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!start.current) return;
    const dy = e.clientY - start.current.y;
    if (!moved.current) {
      if (Math.abs(dy) <= 4) return;
      moved.current = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    setDrag(Math.max(COLLAPSED_PX - 20, Math.min(h.full, start.current.h - dy)));
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!start.current) return;
    const dy = e.clientY - start.current.y;
    const velocity = dy / Math.max(1, performance.now() - start.current.t); // px/ms, + = down
    const target = start.current.h - dy;
    start.current = null;
    setDrag(null);
    if (!moved.current) return;
    // Swallow the click that follows a drag.
    setTimeout(() => (moved.current = false), 0);

    let next: Snap;
    const idx = ORDER.indexOf(snap);
    if (velocity < -0.5) next = ORDER[Math.min(2, idx + 1)];
    else if (velocity > 0.5) next = ORDER[Math.max(0, idx - 1)];
    else next = ORDER.reduce((best, s) => (Math.abs(h[s] - target) < Math.abs(h[best] - target) ? s : best), snap);
    onSnapChange(next);
  }

  const cycle = () => onSnapChange(snap === "collapsed" ? "half" : snap === "half" ? "full" : "collapsed");

  return (
    <section
      aria-label={label}
      className="fixed inset-x-0 z-20 flex flex-col rounded-t-[28px] bg-surface shadow-[0_-8px_30px_rgb(15_31_42/0.12)]"
      style={{
        bottom: bottomOffset,
        // Height (not translate) so the scroll area always matches what is visible.
        height: current,
        transition: drag == null ? "height 320ms cubic-bezier(0.2, 0.9, 0.25, 1)" : "none",
      }}
    >
      <div
        className="shrink-0 cursor-grab touch-none px-5 pt-1.5 select-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <button
          type="button"
          onClick={() => !moved.current && cycle()}
          aria-label={snap === "full" ? "Recolher painel" : "Expandir painel"}
          className="mx-auto -my-2.5 flex h-11 w-24 items-center justify-center"
        >
          <span className="h-1.5 w-10 rounded-full bg-line" />
        </button>
        {header}
        <div className="mt-2 border-t border-line" aria-hidden />
      </div>
      <div
        className={`min-h-0 flex-1 overscroll-contain px-5 pt-2 pb-6 ${drag == null && (snap === "full" || (scrollFrom === "half" && snap === "half")) ? "overflow-y-auto" : "overflow-hidden"}`}
      >
        {children}
      </div>
    </section>
  );
}
