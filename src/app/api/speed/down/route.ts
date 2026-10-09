import { randomFillSync } from "node:crypto";
import { type NextRequest } from "next/server";
import { SPEED_MAX_DOWN_BYTES } from "@/config/nomad";
import { clientKey } from "@/lib/rateLimit";
import { NO_STORE, speedLimiter, tooMany } from "../limits";

export const dynamic = "force-dynamic";

// One random block reused for every response; random bytes cannot be compressed by proxies.
const BLOCK = randomFillSync(Buffer.alloc(256 * 1024));

/** Download sample: `bytes` pseudo-random bytes (1 … SPEED_MAX_DOWN_BYTES). */
export function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("bytes") ?? "";
  if (!/^\d{1,8}$/.test(raw)) return new Response("bytes inválido", { status: 400, headers: NO_STORE });
  const bytes = Number(raw);
  if (bytes < 1 || bytes > SPEED_MAX_DOWN_BYTES) return new Response("bytes fora do limite", { status: 400, headers: NO_STORE });
  if (!speedLimiter.take(clientKey(request.headers), bytes)) return tooMany();

  let sent = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      const n = Math.min(BLOCK.length, bytes - sent);
      controller.enqueue(new Uint8Array(BLOCK.buffer, BLOCK.byteOffset, n));
      sent += n;
      if (sent >= bytes) controller.close();
    },
  });
  return new Response(stream, {
    headers: { ...NO_STORE, "Content-Type": "application/octet-stream", "Content-Encoding": "identity", "Content-Length": String(bytes) },
  });
}
