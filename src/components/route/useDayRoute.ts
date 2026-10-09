"use client";

import { useCallback, useEffect, useState } from "react";
import { addStop, hasStop, moveStop, parseStoredRoute, removeStop, ROUTE_MAX, type RouteStop } from "@/lib/route";

/** "Rota do dia" kept on this device only (F9), one per city. */
export function useDayRoute(citySlug: string) {
  const key = `sr_route_${citySlug}`;
  const [stops, setStops] = useState<RouteStop[]>([]);

  useEffect(() => {
    try {
      setStops(parseStoredRoute(localStorage.getItem(key)));
    } catch {
      setStops([]);
    }
  }, [key]);

  const update = useCallback(
    (fn: (s: RouteStop[]) => RouteStop[]) =>
      setStops((prev) => {
        const next = fn(prev);
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // Private mode: the route still works for this visit.
        }
        return next;
      }),
    [key],
  );

  const toggle = useCallback(
    (s: RouteStop) => update((prev) => (hasStop(prev, s) ? removeStop(prev, s) : addStop(prev, s))),
    [update],
  );

  return {
    stops,
    full: stops.length >= ROUTE_MAX,
    has: (s: Pick<RouteStop, "kind" | "id">) => hasStop(stops, s),
    toggle,
    remove: (s: Pick<RouteStop, "kind" | "id">) => update((prev) => removeStop(prev, s)),
    move: (index: number, delta: -1 | 1) => update((prev) => moveStop(prev, index, delta)),
    clear: () => update(() => []),
  };
}
