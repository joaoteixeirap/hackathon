// Lazy wrapper around opening_hours.js (large; loaded only when needed).
import type { PlaceSummary } from "./places";

type OH = {
  getState(date?: Date): boolean;
  getNextChange(date?: Date): Date | undefined;
};
export type OHCtor = new (value: string, nominatim?: unknown, options?: unknown) => OH;

let ctorPromise: Promise<OHCtor> | null = null;
const cache = new Map<string, OH | null>();

// Lets opening_hours.js resolve Brazilian public holidays (PH).
const NOMINATIM_BR = { lat: -23.96, lon: -46.33, address: { country_code: "br", state: "São Paulo" } };

export function loadOpeningHours(): Promise<OHCtor> {
  ctorPromise ??= import("opening_hours").then((m) => (m.default ?? m) as unknown as OHCtor);
  return ctorPromise;
}

function parse(Ctor: OHCtor, value: string): OH | null {
  if (!cache.has(value)) {
    try {
      cache.set(value, new Ctor(value, NOMINATIM_BR, { mode: 0, warnings_severity: 0 }));
    } catch {
      cache.set(value, null);
    }
  }
  return cache.get(value) ?? null;
}

/** true/false when the hours can be interpreted, null otherwise. */
export function makeIsOpen(Ctor: OHCtor, now = new Date()) {
  return (p: Pick<PlaceSummary, "opening_hours">): boolean | null => {
    if (!p.opening_hours) return null;
    const oh = parse(Ctor, p.opening_hours);
    if (!oh) return null;
    try {
      return oh.getState(now);
    } catch {
      return null;
    }
  };
}

export function describeHours(Ctor: OHCtor, value: string | null, now = new Date()): string | null {
  if (!value) return null;
  const oh = parse(Ctor, value);
  if (!oh) return null;
  try {
    const open = oh.getState(now);
    const next = oh.getNextChange(now);
    const time = next?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const sameDay = next && next.toDateString() === now.toDateString();
    if (open) return time ? `Aberto agora · fecha às ${time}` : "Aberto agora";
    if (!next) return "Fechado";
    return sameDay
      ? `Fechado · abre às ${time}`
      : `Fechado · abre ${next.toLocaleDateString("pt-BR", { weekday: "long" })} às ${time}`;
  } catch {
    return null;
  }
}
