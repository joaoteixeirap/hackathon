import "server-only";
import { sanitizeEvent, type EventName, type EventProps } from "./analytics";
import { isSupabaseConfigured } from "./supabase/env";
import { createPublicClient } from "./supabase/public";
export function sessionProps(raw: unknown): EventProps { return typeof raw === "string" && /^[0-9a-f-]{36}$/i.test(raw) ? {sid:raw} : {}; }

/** Server-side event (actions); never throws. */
export async function logEvent(name: EventName, props: EventProps = {}): Promise<void> {
  const ev = sanitizeEvent(name, props);
  if (!ev || !isSupabaseConfigured()) return;
  try {
    await createPublicClient().from("events").insert({ ...ev, session_id: ev.props.sid ?? null });
  } catch {
    // Analytics must never break the app.
  }
}
