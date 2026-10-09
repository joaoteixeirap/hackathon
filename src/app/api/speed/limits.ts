import { SPEED_RATE_BYTES_PER_MIN, SPEED_RATE_REQUESTS_PER_MIN } from "@/config/nomad";
import { createLimiter } from "@/lib/rateLimit";

/** Shared per-IP budget for /api/speed/* (per server instance). */
export const speedLimiter = createLimiter({ requests: SPEED_RATE_REQUESTS_PER_MIN, bytes: SPEED_RATE_BYTES_PER_MIN });

export const NO_STORE = { "Cache-Control": "no-store, no-transform" };

export function tooMany() {
  return new Response(null, { status: 429, headers: { ...NO_STORE, "Retry-After": "60" } });
}
