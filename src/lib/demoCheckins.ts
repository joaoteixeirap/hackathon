// Demo check-ins (SPEC_V2 §11): three demo places in different freshness states, one with
// "Pronto para chamadas" and one with an expired seal. Only on is_demo places, by demo users.
import { DEMO_PROFILE_IDS } from "./demo";

const [ANA, BRUNO, CARLA] = DEMO_PROFILE_IDS;
const GONZAGA = "00000000-0000-4000-8000-0000000000c1"; // fresh: seal + call-ready
const CENTRO = "00000000-0000-4000-8000-0000000000c2"; // 120 days: possibly outdated, seal expired long ago
const PONTA = "00000000-0000-4000-8000-0000000000c3"; // 70 days: aging, seal expired 10 days ago

export const DEMO_CHECKIN_PLACES = [GONZAGA, CENTRO, PONTA];

type Row = {
  place_id: string;
  user_id: string;
  daysAgo: number;
  download_mbps: number;
  upload_mbps: number;
  ping_ms: number;
  jitter_ms: number;
  noise_level: number;
  outlets_level: "few" | "many";
  call_result: "ok" | "choppy";
  stay_policy: "free" | "min_consumption" | "pass_required";
};

const ROWS: Row[] = [
  { place_id: GONZAGA, user_id: ANA, daysAgo: 25, download_mbps: 92, upload_mbps: 38, ping_ms: 14, jitter_ms: 3, noise_level: 4, outlets_level: "many", call_result: "ok", stay_policy: "pass_required" },
  { place_id: GONZAGA, user_id: BRUNO, daysAgo: 2, download_mbps: 105, upload_mbps: 41, ping_ms: 12, jitter_ms: 2, noise_level: 5, outlets_level: "many", call_result: "ok", stay_policy: "pass_required" },
  { place_id: PONTA, user_id: ANA, daysAgo: 72, download_mbps: 61, upload_mbps: 20, ping_ms: 18, jitter_ms: 5, noise_level: 5, outlets_level: "many", call_result: "ok", stay_policy: "pass_required" },
  { place_id: PONTA, user_id: CARLA, daysAgo: 70, download_mbps: 57, upload_mbps: 18, ping_ms: 19, jitter_ms: 6, noise_level: 4, outlets_level: "few", call_result: "ok", stay_policy: "pass_required" },
  { place_id: CENTRO, user_id: BRUNO, daysAgo: 122, download_mbps: 38, upload_mbps: 8, ping_ms: 25, jitter_ms: 9, noise_level: 3, outlets_level: "few", call_result: "choppy", stay_policy: "min_consumption" },
  { place_id: CENTRO, user_id: CARLA, daysAgo: 120, download_mbps: 44, upload_mbps: 9, ping_ms: 22, jitter_ms: 8, noise_level: 3, outlets_level: "few", call_result: "ok", stay_policy: "min_consumption" },
];

/** Rows for place_checkins, dated relative to `now` (all measured on the venue Wi-Fi, near the place). */
export function demoCheckinRows(now = Date.now()) {
  return ROWS.map(({ daysAgo, ...r }) => ({
    ...r,
    loss_pct: 0,
    measured: true,
    on_venue_wifi: true,
    near_place: true,
    created_at: new Date(now - daysAgo * 86_400_000).toISOString(),
  }));
}
