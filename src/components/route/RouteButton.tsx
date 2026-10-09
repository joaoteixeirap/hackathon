"use client";

import { Check, Route } from "lucide-react";
import { ROUTE_MAX } from "@/lib/route";

export type RouteToggle = { inRoute: boolean; full: boolean; onToggle: () => void };

/** "Adicionar à rota do dia" (F9), shown in place and activity cards on the map. */
export function RouteButton({ inRoute, full, onToggle }: RouteToggle) {
  const disabled = full && !inRoute;
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={inRoute}
      title={disabled ? `A rota já tem ${ROUTE_MAX} paradas` : undefined}
      className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary disabled:text-muted"
    >
      {inRoute ? <Check size={16} strokeWidth={2.5} aria-hidden /> : <Route size={16} aria-hidden />}
      {inRoute ? "Na rota do dia" : disabled ? `Rota cheia (${ROUTE_MAX})` : "Rota do dia"}
    </button>
  );
}
