"use client";

import type { EventName, EventProps } from "./analytics";

const SID_KEY = "sr_sid";

/** Random first-party visitor id for this device (no cookies, no personal data). */
export function visitorId(): string {
  try {
    let sid = localStorage.getItem(SID_KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem(SID_KEY, sid);
    }
    return sid;
  } catch {
    return "no-storage";
  }
}

/** Fire-and-forget event; survives page navigation thanks to sendBeacon. */
export function track(name: EventName, props: EventProps = {}): void {
  try {
    const body = JSON.stringify({ name, props: { sid: visitorId(), ...props } });
    if (navigator.sendBeacon?.(`/api/eventos`, new Blob([body], { type: "application/json" }))) return;
    void fetch("/api/eventos", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
  } catch {
    // Analytics must never break the app.
  }
}
