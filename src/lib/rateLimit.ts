// Tiny fixed-window limiter for the speed-test routes (SPEC_V2 R2). In memory, per server
// instance: enough to stop one client from turning the routes into a bandwidth pump.

export type Budget = { requests: number; bytes: number };

export function createLimiter(limit: Budget, windowMs = 60_000) {
  const windows = new Map<string, { start: number; requests: number; bytes: number }>();

  return {
    /** Charges one request of `bytes` to `key`; false when it would exceed the budget. */
    take(key: string, bytes: number, now = Date.now()): boolean {
      let w = windows.get(key);
      if (!w || now - w.start >= windowMs) {
        w = { start: now, requests: 0, bytes: 0 };
        windows.set(key, w);
        if (windows.size > 5000) {
          for (const [k, v] of windows) if (now - v.start >= windowMs) windows.delete(k);
        }
      }
      if (w.requests + 1 > limit.requests || w.bytes + bytes > limit.bytes) return false;
      w.requests += 1;
      w.bytes += bytes;
      return true;
    },
  };
}

/** Client IP behind Vercel/proxies; falls back to a shared bucket. */
export function clientKey(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "local";
}
