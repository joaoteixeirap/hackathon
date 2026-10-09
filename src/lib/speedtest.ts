// Connection test statistics (SPEC_V2 R2). Pure functions; the browser loop lives in
// components/checkin/CheckinSheet.tsx and talks to /api/speed/{ping,down,up}.

/** Megabits per second for `bytes` transferred in `ms` milliseconds. */
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

/** Pings in order; `null` marks a timeout/failure. */
export type PingSeries = (number | null)[];

/** Mean absolute difference between consecutive successful pings (RFC 3550-style jitter, simplified). */
export function jitter(series: PingSeries): number | null {
  const ok = series.filter((x): x is number => x != null && Number.isFinite(x));
  if (ok.length < 2) return null;
  let sum = 0;
  for (let i = 1; i < ok.length; i++) sum += Math.abs(ok[i] - ok[i - 1]);
  return sum / (ok.length - 1);
}

export function lossPct(series: PingSeries): number {
  if (series.length === 0) return 0;
  return (series.filter((x) => x == null).length / series.length) * 100;
}

export type SpeedResult = {
  download_mbps: number | null;
  upload_mbps: number | null;
  ping_ms: number | null;
  jitter_ms: number | null;
  loss_pct: number;
};

const round1 = (v: number | null) => (v == null ? null : Math.round(v * 10) / 10);

export function summarize(pings: PingSeries, downloads: number[], uploads: number[]): SpeedResult {
  return {
    download_mbps: round1(median(downloads)),
    upload_mbps: round1(median(uploads)),
    ping_ms: round1(median(pings.filter((x): x is number => x != null))),
    jitter_ms: round1(jitter(pings)),
    loss_pct: Math.round(lossPct(pings) * 10) / 10,
  };
}
