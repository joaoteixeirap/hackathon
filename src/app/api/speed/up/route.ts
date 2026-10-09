import { type NextRequest } from "next/server";
import { SPEED_MAX_UP_BYTES } from "@/config/nomad";
import { clientKey } from "@/lib/rateLimit";
import { NO_STORE, speedLimiter, tooMany } from "../limits";

export const dynamic = "force-dynamic";

/** Upload sample: reads at most SPEED_MAX_UP_BYTES, discards them and answers 204. */
export async function POST(request: NextRequest) {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > SPEED_MAX_UP_BYTES) return new Response("grande demais", { status: 413, headers: NO_STORE });
  if (!speedLimiter.take(clientKey(request.headers), Math.max(declared, 0))) return tooMany();

  const reader = request.body?.getReader();
  let total = 0;
  if (reader) {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > SPEED_MAX_UP_BYTES) {
        await reader.cancel();
        return new Response("grande demais", { status: 413, headers: NO_STORE });
      }
    }
  }
  return new Response(null, { status: 204, headers: NO_STORE });
}
