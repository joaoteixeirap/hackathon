import { NextResponse, type NextRequest } from "next/server";
import { sanitizeEvent } from "@/lib/analytics";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";

const MAX_BODY = 2048;

/** First-party analytics sink (track() in the browser). Unknown events are ignored. */
export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (raw.length > MAX_BODY) return new NextResponse(null, { status: 413 });
  let body: { name?: unknown; props?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const ev = sanitizeEvent(body.name, body.props);
  if (!ev) return new NextResponse(null, { status: 400 });
  // session_id: the random per-device id (no personal data), also kept in props for old queries.
  if (isSupabaseConfigured()) await createPublicClient().from("events").insert({ ...ev, session_id: ev.props.sid ?? null });
  return new NextResponse(null, { status: 204 });
}
