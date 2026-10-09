"use client";

import { ChevronRight, MapPinned, Wifi } from "lucide-react";
import { formatDayShort, formatHour } from "@/components/map/activityMarker";
import { ActivityIcon, CATEGORY_BG, CategoryIcon } from "@/components/ui/CategoryIcon";
import { DemoTag } from "@/components/ui/DemoTag";
import { NomadBadge } from "@/components/ui/NomadBadge";
import { haversine } from "@/lib/geo";
import { stripDemo, subcategoryLabel, type ActivitySummary, type PlaceSummary } from "@/lib/places";

function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
}

const row = "flex min-h-[68px] w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15";

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
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-surface-2 text-muted">
          <MapPinned size={26} aria-hidden />
        </span>
        <p className="max-w-64 text-sm text-muted">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="-mx-2 space-y-4">
      {activities.length > 0 && (
        <section aria-label="Atividades nesta área">
          <h3 className="px-2 pb-1 text-xs font-semibold text-muted">Rodas</h3>
          <ul>
            {activities.map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => onSelectActivity(a.id)} className={row}>
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-live text-white">
                    <ActivityIcon category={a.category} size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">
                      {stripDemo(a.title)}
                      {a.is_demo && <DemoTag />}
                    </span>
                    <span className="block truncate text-[13px] text-muted">{a.meeting_label}</span>
                  </span>
                  <span className="shrink-0 text-right leading-tight">
                    <span className="block text-xs font-semibold text-accent-strong">{formatDayShort(a.starts_at)}</span>
                    <span className="block text-sm font-bold tabular-nums">{formatHour(a.starts_at)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {places.length > 0 && (
        <section aria-label="Lugares nesta área">
          <h3 className="px-2 pb-1 text-xs font-semibold text-muted">Lugares</h3>
          <ul aria-label="Resultados nesta área">
            {places.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => onSelectPlace(p.id)} className={row}>
                  <span className={`grid size-11 shrink-0 place-items-center rounded-2xl text-white ${CATEGORY_BG[p.category]}`}>
                    <CategoryIcon category={p.category} subcategory={p.subcategory} size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">
                      {p.name}
                      {p.is_demo && <DemoTag />}
                    </span>
                    <span className="flex items-center gap-1.5 truncate text-[13px] text-muted">
                      {subcategoryLabel(p)}
                      {p.neighborhood && <> · {p.neighborhood}</>}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1 text-xs">
                    <span className="font-semibold text-muted tabular-nums">{formatDistance(haversine(center, p))}</span>
                    {p.nomad_seal ? (
                      <NomadBadge compact />
                    ) : (
                      p.wifi_mbps != null && (
                        <span className="flex items-center gap-1 font-semibold text-cat-work tabular-nums">
                          <Wifi size={12} aria-hidden />
                          {Math.round(p.wifi_mbps)}
                        </span>
                      )
                    )}
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-muted/60" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
