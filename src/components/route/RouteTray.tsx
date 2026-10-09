"use client";

import { ChevronDown, ChevronUp, Footprints, Route, X } from "lucide-react";
import { useState } from "react";
import { formatDistance, formatDuration, ROUTE_MAX, routeMeters, walkMinutes, type RouteStop } from "@/lib/route";

type Props = {
  stops: RouteStop[];
  onOpen: (s: RouteStop) => void;
  onRemove: (s: RouteStop) => void;
  onMove: (index: number, delta: -1 | 1) => void;
  onClear: () => void;
};

/** Floating summary of the "Rota do dia" (F9): stops in order, straight-line distance, walking time. */
export function RouteTray({ stops, onOpen, onRemove, onMove, onClear }: Props) {
  const [open, setOpen] = useState(false);
  if (stops.length === 0) return null;

  const meters = routeMeters(stops);
  const summary =
    stops.length < 2
      ? "Adicione mais uma parada"
      : `${formatDistance(meters)} em linha reta · ~${formatDuration(walkMinutes(meters))} a pé`;

  return (
    <section aria-label="Rota do dia" className="flex w-full max-w-md flex-col-reverse rounded-3xl border border-line bg-surface shadow-soft-lg">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-on-fill">
          <Route size={18} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">
            Rota do dia · {stops.length} {stops.length === 1 ? "parada" : "paradas"}
          </span>
          <span className="block truncate text-xs text-muted tabular-nums" data-testid="route-summary">
            {summary}
          </span>
        </span>
        {open ? <ChevronDown size={18} aria-hidden /> : <ChevronUp size={18} aria-hidden />}
      </button>

      {open && (
        <div className="max-h-[50dvh] overflow-y-auto border-b border-line px-4 pt-2 pb-3">
          <ol className="divide-y divide-line">
            {stops.map((s, i) => (
              <li key={`${s.kind}-${s.id}`} className="flex items-center gap-2 py-1.5">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-on-fill">{i + 1}</span>
                <button type="button" onClick={() => onOpen(s)} className="min-h-11 min-w-0 flex-1 truncate text-left text-sm font-semibold hover:underline">
                  {s.name}
                </button>
                <button type="button" onClick={() => onMove(i, -1)} disabled={i === 0} aria-label={`Subir ${s.name}`} className="grid size-11 place-items-center rounded-full hover:bg-surface-2 disabled:opacity-30">
                  <ChevronUp size={16} aria-hidden />
                </button>
                <button type="button" onClick={() => onMove(i, 1)} disabled={i === stops.length - 1} aria-label={`Descer ${s.name}`} className="grid size-11 place-items-center rounded-full hover:bg-surface-2 disabled:opacity-30">
                  <ChevronDown size={16} aria-hidden />
                </button>
                <button type="button" onClick={() => onRemove(s)} aria-label={`Tirar ${s.name} da rota`} className="grid size-11 place-items-center rounded-full hover:bg-surface-2">
                  <X size={16} aria-hidden />
                </button>
              </li>
            ))}
          </ol>
          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted">
            <span className="flex items-center gap-1">
              <Footprints size={14} aria-hidden /> Estimativa em linha reta, sem considerar ruas. Até {ROUTE_MAX} paradas.
            </span>
            <button type="button" onClick={onClear} className="min-h-11 shrink-0 px-2 font-semibold text-danger">
              Limpar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
