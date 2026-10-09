"use client";
import { calendarIcs, type CalendarEvent } from "@/lib/ics";
import { track } from "@/lib/track";
import { buttonSecondary } from "@/components/ui/styles";
export function CalendarDownload({ events, single = false }: { events: CalendarEvent[]; single?: boolean }) {
  return <button type="button" className={buttonSecondary} disabled={!events.length} onClick={() => {
    const url = URL.createObjectURL(new Blob([calendarIcs(events, location.origin)], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "solorota.ics"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    track("ics_download", { count: String(events.length) });
  }}>{single ? "Adicionar ao calendário" : "Baixar agenda (.ics)"}</button>;
}
