// Collaborative Wi-Fi test (SPEC F12): download bytes of known size from our own server,
// time it, plus a few tiny requests for ping. Pure helpers here; the browser loop lives in
// components/wifi/WifiTest.tsx.

/** Download sizes tried in order; stops when one takes long enough to be a fair sample. */
export const DOWNLOAD_STEPS = [256 * 1024, 1024 * 1024, 4 * 1024 * 1024, 8 * 1024 * 1024];
export const MAX_DOWNLOAD_BYTES = 8 * 1024 * 1024;
/** A sample shorter than this is dominated by latency; try the next size. */
export const MIN_SAMPLE_MS = 1500;
/** Whole test budget (SPEC: under 15 s). */
export const TEST_BUDGET_MS = 12_000;
export const PING_SAMPLES = 5;

export function mbps(bytes: number, ms: number): number {
  if (!(ms > 0) || !(bytes > 0)) return 0;
  return (bytes * 8) / (ms / 1000) / 1_000_000;
}

export function median(values: number[]): number | null {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

/**
 * Next download size, or null to stop: stop once a sample lasted MIN_SAMPLE_MS, or when the
 * next (bigger) step would likely blow the remaining budget at the speed seen so far.
 */
export function nextStep(lastBytes: number, lastMs: number, elapsedMs: number): number | null {
  if (lastMs >= MIN_SAMPLE_MS) return null;
  const next = DOWNLOAD_STEPS.find((s) => s > lastBytes);
  if (!next) return null;
  const expectedMs = lastMs > 0 ? (next / lastBytes) * lastMs : 0;
  return elapsedMs + expectedMs > TEST_BUDGET_MS ? null : next;
}

/** One decimal, as stored and shown. */
export function roundMbps(v: number): number {
  return Math.round(v * 10) / 10;
}

/** Server-side sanity check before saving a result. */
export function validWifiResult(downloadMbps: unknown, pingMs: unknown): { download_mbps: number; ping_ms: number | null } | null {
  const d = Number(downloadMbps);
  const p = pingMs == null || pingMs === "" ? null : Number(pingMs);
  if (!Number.isFinite(d) || d <= 0 || d >= 10_000) return null;
  if (p != null && (!Number.isFinite(p) || p < 0 || p > 10_000)) return null;
  return { download_mbps: roundMbps(d), ping_ms: p == null ? null : Math.round(p) };
}
