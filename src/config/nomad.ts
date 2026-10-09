// All limits, weights and windows of SPEC_V2_NOMADE.md in one place.
// Every number here is a product HYPOTHESIS (not validated); change it here, never inline.
// Values used inside SQL (recompute_place, submit_checkin, vote_fact) are mirrored in
// supabase/migrations/0008_nomad_v2.sql functions with the same names; keep both in sync.

// --- Check-in (R1) ---
/** hipótese: one check-in per user and place every 6 h */
export const CHECKIN_COOLDOWN_HOURS = 6;
/** hipótese: "near the place" radius for the optional geolocation check */
export const NEAR_PLACE_METERS = 150;
/** hipótese: short report comment */
export const CHECKIN_COMMENT_MAX = 200;

// --- Speed test (R2) ---
/** hipótese: download sample cap */
export const SPEED_MAX_DOWN_BYTES = 4 * 1024 * 1024;
/** hipótese: upload sample cap */
export const SPEED_MAX_UP_BYTES = 1024 * 1024;
export const SPEED_PINGS = 10;
export const SPEED_PING_TIMEOUT_MS = 2000;
/** whole test budget (SPEC: ≤ 15 s) */
export const SPEED_BUDGET_MS = 15_000;
/** first download sample; a second, bigger one only if the first was quick */
export const SPEED_DOWN_FIRST_BYTES = 1024 * 1024;
/** a sample shorter than this is mostly latency, so try one bigger sample */
export const SPEED_MIN_SAMPLE_MS = 1500;
export const SPEED_UP_BYTES = 512 * 1024;
/**
 * hipótese: per-IP budget on the speed routes. Requests per minute is generous because
 * judges share one venue IP; bytes per minute is what actually protects bandwidth.
 */
export const SPEED_RATE_REQUESTS_PER_MIN = 240;
export const SPEED_RATE_BYTES_PER_MIN = 80 * 1024 * 1024;

// --- Seals (R3) ---
/** hipótese: check-ins that count for the seals */
export const SEAL_WINDOW_DAYS = 60;
export const SEAL_MIN_DISTINCT_USERS = 2;
export const SEAL_MIN_DOWN_MBPS = 25;
/** "Pronto para chamadas" thresholds (hipóteses) */
export const CALL_MIN_DOWN_MBPS = 15;
export const CALL_MIN_UP_MBPS = 5;
export const CALL_MAX_PING_MS = 80;
export const CALL_MAX_JITTER_MS = 30;
export const CALL_MAX_LOSS_PCT = 2;
export const CALL_MIN_NOISE = 3;

// --- Facts and freshness (T1, T2) ---
export const FRESH_DAYS = 30;
export const AGING_DAYS = 90;
/** ≥ this many "desatualizado" votes in OUTDATED_WINDOW_DAYS makes a fact stale */
export const OUTDATED_VOTES_FOR_STALE = 2;
export const OUTDATED_WINDOW_DAYS = 30;
/** one vote per user, place and field every N days */
export const VOTE_COOLDOWN_DAYS = 7;
/** hipótese: measured vs declared Wi-Fi difference that makes us show both */
export const DECLARED_DIVERGENCE_PCT = 30;

// --- Radar (R4) ---
export const RADAR_MAX_PLACES = 300;

// --- Stay, series, people (S/E) ---
export const SERIES_WEEKS_AHEAD = 6;
export const MIN_OVERLAP_DAYS = 7;
export const COMPAT_MIN_COUNT = 2;
export const DEFAULT_STAY_DAYS = 30;
/** hipóteses: session defaults and group benefit window (mirrored in SQL) */
export const SESSION_DEFAULT_HOUR = "14:00";
export const SESSION_DEFAULT_CAPACITY = 6;
export const SESSION_MIN_NOTICE_MINUTES = 15;
export const GROUP_EARLY_MINUTES = 30;
/** hipóteses: safe monetary input limit, city statistics and survey minimum sample */
export const MONEY_MAX_CENTS = 100_000_000;
export const CITY_STATS_MIN_SAMPLE = 2;
export const SURVEY_SMALL_SAMPLE = 30;
/** Compatibility hypotheses, mirrored in compatible_people SQL. */
export const COMPAT_OVERLAP_MAX_DAYS = 30;
export const COMPAT_INTERESTS_MAX = 3;
export const COMPAT_WEIGHTS = { overlap: 50, interests: 30, rhythm: 20 } as const;
export const BUDGET_MONTH_DAYS = 30;
export const MEASUREMENT_WINDOW_DAYS = 90;
