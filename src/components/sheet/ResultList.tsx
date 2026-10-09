"use client";

import { Wifi } from "lucide-react";
import { formatDayShort, formatHour } from "@/components/map/activityMarker";
import { ActivityIcon, CATEGORY_BG, CategoryIcon } from "@/components/ui/CategoryIcon";
import { DemoTag } from "@/components/ui/DemoTag";
import { haversine } from "@/lib/geo";
import { stripDemo, subcategoryLabel, type ActivitySummary, type PlaceSummary } from "@/lib/places";

function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
}

export function ResultList({
  places,
  activities,
  center,
  onSelectPlace,
  onSelectActivity,
  emptyText,
}: {
  places: PlaceSummary[];
  activities: ActivitySummary[];
  center: { lat: number; lng: number };
  onSelectPlace: (id: string) => void;
  onSelectActivity: (id: string) => void;
  emptyText: string;
}) {
  if (places.length === 0 && activities.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center text-tinta-suave">
        <svg width="72" height="40" viewBox="0 0 72 40" aria-hidden className="text-tinta/50">
          <path d="M2 26c8 0 8-8 16-8s8 8 16 8 8-8 16-8 8 8 16 8" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 36c6 0 6-5 12-5s6 5 12 5 6-5 12-5 6 5 12 5" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
        <p className="max-w-64 text-sm">{emptyText}</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-dashed divide-tinta/20" aria-label="Resultados nesta área">
      {activities.map((a) => (
        <li key={a.id}>
          <button
            type="button"
            onClick={() => onSelectActivity(a.id)}
            className="flex min-h-16 w-full items-center gap-3 py-2.5 text-left hover:bg-tinta/[0.03]"
          >
            <span className="relative grid size-10 shrink-0 place-items-center rounded-full border-[1.5px] border-tinta bg-sol text-[#1f2a30] ring-2 ring-sol/40 ring-offset-2 ring-offset-papel-claro">
              <ActivityIcon category={a.category} size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-serif text-[15px] font-semibold">
                {stripDemo(a.title)} {a.is_demo && <DemoTag />}
              </span>
              <span className="block truncate text-xs text-tinta-suave">{a.meeting_label}</span>
            </span>
            <span className="shrink-0 text-right font-mono text-xs leading-tight">
              {formatDayShort(a.starts_at)}
              <br />
              <span className="text-sm">{formatHour(a.starts_at)}</span>
            </span>
          </button>
        </li>
      ))}
      {places.map((p) => (
        <li key={p.id}>
          <button
            type="button"
            onClick={() => onSelectPlace(p.id)}
            className="flex min-h-16 w-full items-center gap-3 py-2.5 text-left hover:bg-tinta/[0.03]"
          >
            <span className={`grid size-10 shrink-0 place-items-center rounded-full border-[1.5px] border-tinta text-on-fill ${CATEGORY_BG[p.category]}`}>
              <CategoryIcon category={p.category} subcategory={p.subcategory} size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-serif text-[15px] font-semibold">
                {p.name} {p.is_demo && <DemoTag />}
              </span>
              <span className="block truncate text-xs text-tinta-suave">
                {subcategoryLabel(p)}
                {p.neighborhood && <span className="font-serif italic"> · {p.neighborhood}</span>}
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-0.5 font-mono text-xs">
              <span>{formatDistance(haversine(center, p))}</span>
              {p.wifi_mbps != null && (
                <span className="flex items-center gap-1 text-mare">
                  <Wifi size={12} aria-hidden />
                  {Math.round(p.wifi_mbps)}
                </span>
              )}
              {p.nomad_seal && <span className="text-[10px] font-bold tracking-wider text-mare uppercase">Selo</span>}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
