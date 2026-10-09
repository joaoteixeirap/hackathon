// RFC 5545: CRLF, UTF-8 folding at 75 octets, UTC times and stable UIDs.
export type CalendarEvent = { id: string; title: string; starts_at: string; ends_at: string; meeting_label: string | null; description?: string | null };
export function escapeIcs(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}
export function foldIcs(line: string): string {
  const lines: string[] = [];
  let part = "";
  let size = 0;
  for (const char of line) {
    const bytes = new TextEncoder().encode(char).length;
    if (size + bytes > 75) { lines.push(part); part = " "; size = 1; }
    part += char; size += bytes;
  }
  lines.push(part);
  return lines.join("\r\n");
}
const utc = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
export function calendarIcs(events: CalendarEvent[], origin: string, now = new Date()): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SoloRota//Agenda//PT-BR", "CALSCALE:GREGORIAN"];
  for (const e of events) lines.push("BEGIN:VEVENT", `UID:${e.id}@solorota`, `DTSTAMP:${utc(now.toISOString())}`, `DTSTART:${utc(e.starts_at)}`, `DTEND:${utc(e.ends_at)}`, `SUMMARY:${escapeIcs(e.title)}`, `LOCATION:${escapeIcs(e.meeting_label ?? "Ponto marcado no mapa")}`, `DESCRIPTION:${escapeIcs(e.description ?? "Atividade no SoloRota")}`, `URL:${new URL(`/atividade/${e.id}`, origin).href}`, "END:VEVENT");
  lines.push("END:VCALENDAR");
  return lines.map(foldIcs).join("\r\n") + "\r\n";
}
