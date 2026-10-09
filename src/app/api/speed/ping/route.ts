import { type NextRequest } from "next/server";
import { clientKey } from "@/lib/rateLimit";
import { NO_STORE, speedLimiter, tooMany } from "../limits";

export const dynamic = "force-dynamic";

/** Ping for the connection test (SPEC_V2 R2). */
export function GET(request: NextRequest) {
  if (!speedLimiter.take(clientKey(request.headers), 0)) return tooMany();
  return new Response(null, { status: 204, headers: NO_STORE });
}
