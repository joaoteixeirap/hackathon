// Browser side of the connection test (SPEC_V2 R2): 10 pings, 1–2 download samples
// (timed from the first to the last byte), 1 upload sample; ≤ 15 s; cancellable.
import {
  SPEED_BUDGET_MS,
  SPEED_DOWN_FIRST_BYTES,
  SPEED_MAX_DOWN_BYTES,
  SPEED_MIN_SAMPLE_MS,
  SPEED_PING_TIMEOUT_MS,
  SPEED_PINGS,
  SPEED_UP_BYTES,
} from "@/config/nomad";
import { mbps, summarize, type PingSeries, type SpeedResult } from "@/lib/speedtest";

export type SpeedProgress = { phase: "ping" | "download" | "upload"; fraction: number; text: string };

const bust = () => `t=${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/** Aborts when either the parent signal fires or `ms` passes. */
function withTimeout(parent: AbortSignal, ms: number): { signal: AbortSignal; done: () => void } {
  const c = new AbortController();
  const onAbort = () => c.abort();
  parent.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => c.abort(), ms);
  return {
    signal: c.signal,
    done: () => {
      clearTimeout(timer);
      parent.removeEventListener("abort", onAbort);
    },
  };
}

async function ping(signal: AbortSignal): Promise<number | null> {
  const t = withTimeout(signal, SPEED_PING_TIMEOUT_MS);
  const t0 = performance.now();
  try {
    const res = await fetch(`/api/speed/ping?${bust()}`, { cache: "no-store", signal: t.signal });
    if (!res.ok && res.status !== 204) return null;
    return performance.now() - t0;
  } catch {
    if (signal.aborted) throw new DOMException("cancelled", "AbortError");
    return null;
  } finally {
    t.done();
  }
}

/** Mbps measured from the first to the last byte (the first chunk only starts the clock). */
async function download(bytes: number, signal: AbortSignal): Promise<{ mbps: number; ms: number }> {
  const res = await fetch(`/api/speed/down?bytes=${bytes}&${bust()}`, { cache: "no-store", signal });
  if (!res.ok || !res.body) throw new Error(`download ${res.status}`);
  const reader = res.body.getReader();
  let first = 0;
  let counted = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!first) first = performance.now();
    else counted += value.byteLength;
  }
  const ms = performance.now() - first;
  return { mbps: mbps(counted, ms), ms };
}

function randomBody(bytes: number): Uint8Array {
  const buf = new Uint8Array(bytes);
  for (let i = 0; i < bytes; i += 65536) crypto.getRandomValues(buf.subarray(i, Math.min(i + 65536, bytes)));
  return buf;
}

async function upload(bytes: number, signal: AbortSignal): Promise<number> {
  const body = randomBody(bytes);
  const t0 = performance.now();
  const res = await fetch(`/api/speed/up?${bust()}`, { method: "POST", body: body as BodyInit, cache: "no-store", signal });
  if (!res.ok && res.status !== 204) throw new Error(`upload ${res.status}`);
  return mbps(bytes, performance.now() - t0);
}

export async function runSpeedTest(cancel: AbortSignal, onProgress: (p: SpeedProgress) => void): Promise<SpeedResult & { partial: boolean }> {
  const budget = withTimeout(cancel, SPEED_BUDGET_MS);
  const signal = budget.signal;
  const started = performance.now();
  const pings: PingSeries = [];
  const downs: number[] = [];
  const ups: number[] = [];
  let partial = false;
  try {
    await ping(signal); // warm up the connection
    for (let i = 0; i < SPEED_PINGS; i++) {
      pings.push(await ping(signal));
      onProgress({ phase: "ping", fraction: ((i + 1) / SPEED_PINGS) * 0.3, text: `Ping ${i + 1}/${SPEED_PINGS}` });
    }
    onProgress({ phase: "download", fraction: 0.35, text: "Download…" });
    const first = await download(SPEED_DOWN_FIRST_BYTES, signal);
    downs.push(first.mbps);
    onProgress({ phase: "download", fraction: 0.55, text: `Download ${first.mbps.toFixed(1)} Mbps` });
    // A quick first sample is mostly latency: take one bigger sample if the budget allows.
    const projected = (SPEED_MAX_DOWN_BYTES / SPEED_DOWN_FIRST_BYTES) * first.ms;
    if (first.ms < SPEED_MIN_SAMPLE_MS && performance.now() - started + projected < SPEED_BUDGET_MS * 0.7) {
      const second = await download(SPEED_MAX_DOWN_BYTES, signal);
      downs.push(second.mbps);
      onProgress({ phase: "download", fraction: 0.75, text: `Download ${second.mbps.toFixed(1)} Mbps` });
    }
    onProgress({ phase: "upload", fraction: 0.85, text: "Upload…" });
    ups.push(await upload(SPEED_UP_BYTES, signal));
    onProgress({ phase: "upload", fraction: 1, text: "Pronto" });
  } catch (err) {
    if (cancel.aborted) throw err; // user cancelled
    partial = true; // budget ran out or the network failed: keep what was measured
  } finally {
    budget.done();
  }
  return { ...summarize(pings, downs, ups), partial };
}
