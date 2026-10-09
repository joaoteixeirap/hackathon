// Check-in payload validation (SPEC_V2 R1). The database re-checks ranges and the cooldown.
import { CHECKIN_COMMENT_MAX } from "@/config/nomad";
import type { CallResult, OutletsLevel, StayPolicy } from "./placeTrust";

export type CheckinInput = {
  place_id: string;
  activity_id?: string | null;
  download_mbps?: number | null;
  upload_mbps?: number | null;
  ping_ms?: number | null;
  jitter_ms?: number | null;
  loss_pct?: number | null;
  on_venue_wifi: boolean;
  near_place: boolean;
  outlets_level?: OutletsLevel | null;
  noise_level?: number | null;
  call_result?: CallResult;
  stay_policy?: StayPolicy | null;
  crowd_level?: number | null;
  comment?: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OUTLETS = ["none", "few", "many"];
const CALLS = ["ok", "choppy", "failed", "not_tested"];
const STAY = ["free", "min_consumption", "time_limit", "pass_required", "unknown"];

function inRange(v: unknown, min: number, max: number): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : NaN;
}
const round1 = (n: number | null) => (n == null ? null : Math.round(n * 10) / 10);

export function parseCheckin(raw: unknown): { ok: true; data: CheckinInput } | { ok: false; message: string } {
  if (!raw || typeof raw !== "object") return { ok: false, message: "Check-in inválido." };
  const r = raw as Record<string, unknown>;
  if (typeof r.place_id !== "string" || !UUID_RE.test(r.place_id)) return { ok: false, message: "Lugar inválido." };

  const down = inRange(r.download_mbps, 0, 5000);
  const up = inRange(r.upload_mbps, 0, 5000);
  const ping = inRange(r.ping_ms, 0, 9999);
  const jit = inRange(r.jitter_ms, 0, 9999);
  const loss = inRange(r.loss_pct, 0, 100);
  if ([down, up, ping, jit, loss].some((v) => Number.isNaN(v))) return { ok: false, message: "Medição fora das faixas esperadas." };

  const noise = inRange(r.noise_level, 1, 5);
  const crowd = inRange(r.crowd_level, 1, 5);
  if (Number.isNaN(noise) || Number.isNaN(crowd)) return { ok: false, message: "Relato inválido." };

  const outlets = r.outlets_level == null || r.outlets_level === "" ? null : String(r.outlets_level);
  if (outlets && !OUTLETS.includes(outlets)) return { ok: false, message: "Relato inválido." };
  const call = r.call_result == null || r.call_result === "" ? "not_tested" : String(r.call_result);
  if (!CALLS.includes(call)) return { ok: false, message: "Relato inválido." };
  const stay = r.stay_policy == null || r.stay_policy === "" ? null : String(r.stay_policy);
  if (stay && !STAY.includes(stay)) return { ok: false, message: "Relato inválido." };

  const comment = typeof r.comment === "string" ? r.comment.trim().slice(0, CHECKIN_COMMENT_MAX) || null : null;
  const onVenue = r.on_venue_wifi === true;
  if (down != null && !onVenue) return { ok: false, message: "Confirme que está no Wi-Fi deste local para salvar a medição." };
  if (down == null && !outlets && noise == null && call === "not_tested" && !stay && crowd == null && !comment) {
    return { ok: false, message: "Meça a conexão ou responda pelo menos uma pergunta." };
  }

  return {
    ok: true,
    data: {
      place_id: r.place_id,
      activity_id: typeof r.activity_id === "string" && UUID_RE.test(r.activity_id) ? r.activity_id : null,
      download_mbps: round1(down),
      upload_mbps: round1(up),
      ping_ms: round1(ping),
      jitter_ms: round1(jit),
      loss_pct: round1(loss),
      on_venue_wifi: onVenue,
      near_place: r.near_place === true,
      outlets_level: outlets as OutletsLevel | null,
      noise_level: noise,
      call_result: call as CallResult,
      stay_policy: stay as StayPolicy | null,
      crowd_level: crowd,
      comment,
    },
  };
}

/** Postgres exceptions from submit_checkin / vote_fact → interface text. */
export function trustErrorMessage(raw: string | undefined): string {
  const m = raw ?? "";
  if (/checkin cooldown/.test(m)) return "Você já registrou este lugar há pouco. Volte daqui a algumas horas.";
  if (/confirm venue wifi/.test(m)) return "Confirme que está no Wi-Fi deste local para salvar a medição.";
  if (/vote cooldown/.test(m)) return "Você já votou nesta informação nos últimos 7 dias.";
  if (/own place/.test(m)) return "Parceiros não votam no próprio lugar.";
  if (/work places and cafes/.test(m)) return "Check-in só em locais de trabalho e cafés.";
  return "Não foi possível salvar agora. Tente de novo.";
}
