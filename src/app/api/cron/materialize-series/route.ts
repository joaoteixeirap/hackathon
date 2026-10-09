import { createClient } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";
import { supabaseUrl } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

/**
 * Daily top-up of weekly series occurrences (SPEC_V2 S3). Vercel Cron calls it with
 * `Authorization: Bearer $CRON_SECRET`. Opening a series page also materializes it, so a
 * missed run never leaves a series without dates.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("unauthorized", { status: 401 });
  if (!serviceKey || !supabaseUrl) return new Response("not configured", { status: 503 });

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await admin.rpc("ensure_all_series");
  if (error) return Response.json({ ok: false }, { status: 500 });
  return Response.json({ ok: true, created: data });
}
