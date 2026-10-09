import { describe, expect, it } from "vitest";
import { calendarIcs, escapeIcs, foldIcs } from "./ics";
describe("calendar export", () => {
  it("escapes text including backslashes and CRLF without injecting properties", () => {
    expect(escapeIcs("Café, mesa; 1\\2\r\nURL:evil")).toBe("Café\\, mesa\\; 1\\\\2\\nURL:evil");
  });
  it("folds by UTF-8 octets without splitting multibyte characters", () => {
    const original = "SUMMARY:" + "☕ ação ".repeat(25);
    const folded = foldIcs(original);
    expect(folded.replace(/\r\n /g, "")).toBe(original);
    for (const line of folded.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
  it("uses stable UID and UTC instants", () => {
    const s = calendarIcs([{ id: "abc", title: "Sessão", starts_at: "2026-10-09T14:00:00-03:00", ends_at: "2026-10-09T17:00:00-03:00", meeting_label: "Café" }], "https://example.com", new Date("2026-10-08T00:00:00Z"));
    expect(s).toContain("UID:abc@solorota\r\n");
    expect(s).toContain("DTSTART:20261009T170000Z\r\n");
    expect(s).toContain("DTEND:20261009T200000Z\r\n");
    expect(s).toContain("URL:https://example.com/atividade/abc");
  });
});
