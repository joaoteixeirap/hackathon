// "Rota do dia" (SPEC F9): up to 5 stops in the order chosen, straight-line distance and a
// walking estimate. No routing service in the MVP.
import { haversine } from "./geo";

export const ROUTE_MAX = 5;
/** Average walking speed used for the estimate. */
export const WALK_KMH = 4.5;

export type RouteStop = { kind: "place" | "activity"; id: string; name: string; lat: number; lng: number };

/** Total straight-line distance in meters along the stops, in order. */
export function routeMeters(stops: Pick<RouteStop, "lat" | "lng">[]): number {
  let total = 0;
  for (let i = 1; i < stops.length; i++) total += haversine(stops[i - 1], stops[i]);
  return total;
}

export function walkMinutes(meters: number): number {
  return Math.round((meters / 1000 / WALK_KMH) * 60);
}

export function formatDistance(meters: number): string {
  return meters < 1000
    ? `${Math.round(meters / 10) * 10} m`
    : `${(meters / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
}

export function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

const same = (a: RouteStop, b: Pick<RouteStop, "kind" | "id">) => a.kind === b.kind && a.id === b.id;

export function hasStop(stops: RouteStop[], s: Pick<RouteStop, "kind" | "id">): boolean {
  return stops.some((x) => same(x, s));
}

/** Adds at the end; ignores duplicates and anything past ROUTE_MAX. */
export function addStop(stops: RouteStop[], s: RouteStop): RouteStop[] {
  if (hasStop(stops, s) || stops.length >= ROUTE_MAX) return stops;
  return [...stops, s];
}

export function removeStop(stops: RouteStop[], s: Pick<RouteStop, "kind" | "id">): RouteStop[] {
  return stops.filter((x) => !same(x, s));
}

/** Moves the stop at `index` up (-1) or down (+1). */
export function moveStop(stops: RouteStop[], index: number, delta: -1 | 1): RouteStop[] {
  const to = index + delta;
  if (index < 0 || index >= stops.length || to < 0 || to >= stops.length) return stops;
  const next = [...stops];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}

/** Parses what was stored on the device; drops anything malformed. */
export function parseStoredRoute(raw: string | null): RouteStop[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v
      .filter(
        (s): s is RouteStop =>
          s &&
          (s.kind === "place" || s.kind === "activity") &&
          typeof s.id === "string" &&
          typeof s.name === "string" &&
          Number.isFinite(s.lat) &&
          Number.isFinite(s.lng),
      )
      .slice(0, ROUTE_MAX);
  } catch {
    return [];
  }
}
