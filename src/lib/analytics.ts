// Demand-evidence analytics (SPEC F13, EVIDENCE.md §2). First-party only: no third-party
// cookies; visitors are counted by a random id kept in this device's localStorage.

/** The three value-proposition blocks of the /espera fake door. */
export const BLOCKS = ["work", "bonds", "week"] as const;
export type Block = (typeof BLOCKS)[number];

export const BLOCK_LABELS: Record<Block, string> = {
  work: "Trabalhar com confiança",
  bonds: "Vínculos durante a estadia",
  week: "Sua semana numa jornada",
};

export const EVENT_NAMES = [
  "view_espera",
  ...BLOCKS.map((b) => `click_block_${b}` as const),
  "click_block_comunidade", "click_block_trabalho", "click_block_saude_moradia",
  "submit_waitlist",
  "view_map",
  "open_place",
  "create_activity",
  "request_join",
  // SPEC_V2 §12
  "view_radar",
  "radar_filter",
  "checkin_start",
  "checkin_submit",
  "vote_fact",
  "series_create",
  "series_follow",
  "people_view",
  "stay_create",
  "stay_task_toggle",
  "favorite_add",
  "ics_download",
  "budget_add",
  "session_from_place",
  "offer_group_redeem",
  "post_checkin_prompt_shown",
  "post_checkin_submit",
  "city_panel_view",
  "survey_answer",
] as const;
export type EventName = (typeof EVENT_NAMES)[number];

export const AUDIENCES = ["nomad_br", "nomad_foreign", "partner"] as const;
export type Audience = (typeof AUDIENCES)[number];
export const AUDIENCE_LABELS: Record<Audience, string> = {
  nomad_br: "Nômade brasileiro",
  nomad_foreign: "Nômade estrangeiro",
  partner: "Tenho um negócio local",
};

export type EventProps = Record<string, string>;

const MAX_KEYS = 8;
const MAX_LEN = 80;

export function isBlock(v: unknown): v is Block {
  return typeof v === "string" && (BLOCKS as readonly string[]).includes(v);
}

/** Accepts a known event name and a small flat object of short strings; anything else is dropped. */
export function sanitizeEvent(name: unknown, props: unknown): { name: EventName; props: EventProps } | null {
  if (typeof name !== "string" || !(EVENT_NAMES as readonly string[]).includes(name)) return null;
  const clean: EventProps = {};
  if (props && typeof props === "object" && !Array.isArray(props)) {
    for (const [k, v] of Object.entries(props as Record<string, unknown>).slice(0, MAX_KEYS)) {
      if (/^[a-z_]{1,32}$/.test(k) && (typeof v === "string" || typeof v === "number") && String(v).length > 0) {
        clean[k] = String(v).slice(0, MAX_LEN);
      }
    }
  }
  return { name: name as EventName, props: clean };
}

/** utm_* values from a query string: short, lowercase, URL-safe. */
export function cleanUtm(v: string | string[] | undefined): string | null {
  const s = (Array.isArray(v) ? v[0] : v)?.trim().toLowerCase();
  return s && /^[a-z0-9._-]{1,64}$/.test(s) ? s : null;
}

// ---------------------------------------------------------------------------
// Funnel for /admin/metricas
// ---------------------------------------------------------------------------

export type EventRow = { name: string; props: Record<string, unknown> | null };
export type SignupRow = { origin_block: string | null; utm_source: string | null; utm_campaign: string | null; audience: string | null };

export type BlockStats = { block: Block; clickers: number; signups: number; ofVisitors: number | null; ofClickers: number | null };
export type SourceStats = { source: string; campaign: string | null; visitors: number; signups: number; conversion: number | null };

const ratio = (a: number, b: number) => (b > 0 ? a / b : null);
const sidOf = (e: EventRow) => (typeof e.props?.sid === "string" ? e.props.sid : null);

export function funnel(events: EventRow[], signups: SignupRow[]) {
  const visitors = new Set<string>();
  const clickers = new Map<Block, Set<string>>(BLOCKS.map((b) => [b, new Set()]));
  const visitorsBySource = new Map<string, Set<string>>();

  for (const e of events) {
    const sid = sidOf(e);
    if (!sid) continue;
    if (e.name === "view_espera") {
      visitors.add(sid);
      const key = sourceKey(e.props?.utm_source, e.props?.utm_campaign);
      if (!visitorsBySource.has(key)) visitorsBySource.set(key, new Set());
      visitorsBySource.get(key)!.add(sid);
    } else if (e.name.startsWith("click_block_")) {
      const b = e.name.slice("click_block_".length);
      if (isBlock(b)) clickers.get(b)!.add(sid);
    }
  }

  const blocks: BlockStats[] = BLOCKS.map((block) => {
    const n = signups.filter((s) => s.origin_block === block).length;
    const c = clickers.get(block)!.size;
    return { block, clickers: c, signups: n, ofVisitors: ratio(n, visitors.size), ofClickers: ratio(n, c) };
  });

  const signupsBySource = new Map<string, number>();
  for (const s of signups) {
    const key = sourceKey(s.utm_source, s.utm_campaign);
    signupsBySource.set(key, (signupsBySource.get(key) ?? 0) + 1);
  }
  const sources: SourceStats[] = [...new Set([...visitorsBySource.keys(), ...signupsBySource.keys()])]
    .map((key) => {
      const [source, campaign] = key.split("\u0000");
      const v = visitorsBySource.get(key)?.size ?? 0;
      const n = signupsBySource.get(key) ?? 0;
      return { source, campaign: campaign || null, visitors: v, signups: n, conversion: ratio(n, v) };
    })
    .sort((a, b) => b.signups - a.signups || b.visitors - a.visitors);

  const audiences = AUDIENCES.map((a) => ({ audience: a, signups: signups.filter((s) => s.audience === a).length }));

  return {
    visitors: visitors.size,
    signups: signups.length,
    conversion: ratio(signups.length, visitors.size),
    blocks,
    sources,
    audiences,
    noBlock: signups.filter((s) => !isBlock(s.origin_block)).length,
  };
}

function sourceKey(source: unknown, campaign: unknown): string {
  const s = typeof source === "string" && source ? source : "direto";
  const c = typeof campaign === "string" ? campaign : "";
  return `${s}\u0000${c}`;
}

export function percent(r: number | null): string {
  return r == null ? "—" : `${(r * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}
