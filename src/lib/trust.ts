// Trust in local data (SPEC_V2 R3, T1, T2): seals with validity, freshness and the
// "source · date · people" line every fact shows (I2). Pure functions.
import { AGING_DAYS, FRESH_DAYS, OUTDATED_VOTES_FOR_STALE } from "@/config/nomad";

const DAY_MS = 86_400_000;
const TZ = "America/Sao_Paulo";

export type FactField = "wifi" | "outlets" | "noise" | "calls" | "stay_policy" | "opening_hours" | "languages" | "price" | "health_info" | "offer";
export type FactSource = "osm" | "partner" | "user" | "admin";
export type FactMeta = { source: FactSource; observed_at: string | null; confirmations_90d: number; outdated_30d: number };
export type FactsMeta = Partial<Record<FactField, FactMeta>>;

// --- Seals (R3): never read the legacy nomad_seal boolean in the interface ---

type SealDates = { seal_valid_until: string | null; call_ready_valid_until?: string | null };
const t = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : NaN);

export function isSealActive(p: SealDates, now = Date.now()): boolean {
  return t(p.seal_valid_until) > now;
}

export function isCallReady(p: SealDates, now = Date.now()): boolean {
  return t(p.call_ready_valid_until) > now;
}

/** "active" (valid), "expired" (had one; shows "Selo vencido" with its date) or "none". */
export function sealStatus(p: SealDates, now = Date.now()): "active" | "expired" | "none" {
  if (!p.seal_valid_until) return "none";
  return isSealActive(p, now) ? "active" : "expired";
}

// --- Freshness (T2) ---

export type Freshness = "fresh" | "aging" | "stale" | "unknown";

export function daysSince(iso: string | null | undefined, now = Date.now()): number | null {
  const at = t(iso);
  return Number.isFinite(at) ? Math.max(0, Math.floor((now - at) / DAY_MS)) : null;
}

/**
 * fresh ≤ 30 days; aging 31–90; stale > 90 days or ≥ 2 "desatualizado" votes in 30 days;
 * unknown without a date.
 */
export function classifyFreshness(observedAt: string | null | undefined, outdated30d: number, now = Date.now()): Freshness {
  const days = daysSince(observedAt, now);
  if (days == null) return "unknown";
  if (outdated30d >= OUTDATED_VOTES_FOR_STALE) return "stale";
  if (days <= FRESH_DAYS) return "fresh";
  if (days <= AGING_DAYS) return "aging";
  return "stale";
}

export const FRESHNESS_LABEL: Record<Freshness, string> = {
  fresh: "Recente",
  aging: "Envelhecendo",
  stale: "Possivelmente desatualizado",
  unknown: "Sem verificação",
};

export function freshnessOf(meta: FactMeta | undefined, now = Date.now()): Freshness {
  return meta ? classifyFreshness(meta.observed_at, meta.outdated_30d, now) : "unknown";
}

/** Freshness of the place's work data (Wi-Fi first), used by the "Dados recentes" filter. */
export function placeFreshness(facts: FactsMeta | null | undefined, now = Date.now()): Freshness {
  return freshnessOf(facts?.wifi ?? facts?.outlets ?? facts?.noise, now);
}

// --- "Verificado há 12 dias por 3 pessoas" (T1) ---

export function ago(days: number): string {
  if (days === 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  const months = Math.round(days / 30);
  return months <= 1 ? "há 1 mês" : months < 12 ? `há ${months} meses` : "há mais de um ano";
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: TZ });
}

export function sourceLabel(meta: FactMeta, measured = true): string {
  switch (meta.source) {
    case "osm":
      return meta.observed_at ? `OpenStreetMap (importado em ${shortDate(meta.observed_at)})` : "OpenStreetMap";
    case "partner":
      return "Declarado pelo local";
    case "admin":
      return "Equipe SoloRota";
    default:
      return measured ? "Medido por nômades" : "Relatado por nômades";
  }
}

/** Second line of a FactRow. OSM keeps its import date in the source label itself. */
export function factLine(meta: FactMeta | undefined, opts: { measured?: boolean; now?: number } = {}): string {
  if (!meta) return "Sem verificação ainda";
  const src = sourceLabel(meta, opts.measured ?? true);
  if (meta.source === "osm") return src;
  const days = daysSince(meta.observed_at, opts.now);
  const when = days == null ? "" : meta.source === "partner" ? ` · ${ago(days)}` : ` · verificado ${ago(days)}`;
  const n = meta.confirmations_90d;
  const who = n > 0 ? ` por ${n} ${n === 1 ? "pessoa" : "pessoas"}` : "";
  return `${src}${when}${who}`;
}
