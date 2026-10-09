"use client";

import { CalendarClock, MapPin, Share2, Users, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { formatDayShort, formatHour, ringState } from "@/components/map/activityMarker";
import { ActivityIcon } from "@/components/ui/CategoryIcon";
import { DemoTag } from "@/components/ui/DemoTag";
import { buttonPrimary, buttonSecondary } from "@/components/ui/styles";
import { ACTIVITY_LABELS, stripDemo, type ActivitySummary } from "@/lib/places";
import { sharePage } from "@/lib/share";

export function ActivityDetail({ activity, onClose }: { activity: ActivitySummary; onClose?: () => void }) {
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const state = ringState(activity);

  async function share() {
    const result = await sharePage(`/atividade/${activity.id}`, stripDemo(activity.title));
    setShareMsg(result === "copied" ? "Link copiado" : null);
  }

  return (
    <article className="space-y-4" aria-labelledby={`act-${activity.id}`}>
      <header className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full border-[1.5px] border-tinta bg-sol text-[#1f2a30]">
          <ActivityIcon category={activity.category} size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold tracking-wider text-tinta-suave uppercase">
            Roda · {ACTIVITY_LABELS[activity.category]}
            {state === "live" && <span className="ml-2 rounded-full bg-sol px-2 py-0.5 text-[#1f2a30]">acontecendo</span>}
          </p>
          <h2 id={`act-${activity.id}`} className="font-serif text-[22px] leading-tight font-bold text-balance">
            {stripDemo(activity.title)} {activity.is_demo && <DemoTag />}
          </h2>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="-mt-1 -mr-2 grid size-11 shrink-0 place-items-center rounded-full hover:bg-tinta/5"
          >
            <X size={20} strokeWidth={1.75} />
          </button>
        )}
      </header>

      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-sm">
        <dt>
          <CalendarClock size={16} strokeWidth={1.75} aria-label="Quando" />
        </dt>
        <dd className="font-mono">
          {formatDayShort(activity.starts_at)} · {formatHour(activity.starts_at)}–{formatHour(activity.ends_at)}
        </dd>
        <dt>
          <MapPin size={16} strokeWidth={1.75} aria-label="Ponto de encontro" />
        </dt>
        <dd>{activity.meeting_label ?? "Ponto marcado no mapa"}</dd>
        <dt>
          <Users size={16} strokeWidth={1.75} aria-label="Vagas" />
        </dt>
        <dd className="font-mono">
          {activity.status === "full" ? "lotada" : `até ${activity.capacity} pessoas`}
        </dd>
      </dl>

      <p className="rounded-xl border border-dashed border-tinta/30 px-3 py-2 text-xs text-tinta-suave">
        Combine em local público.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/atividade/${activity.id}`} className={buttonPrimary}>
          Ver roda
        </Link>
        <button type="button" onClick={share} className={`${buttonSecondary} gap-2`}>
          <Share2 size={16} strokeWidth={1.75} aria-hidden /> Compartilhar
        </button>
        <span role="status" className="text-sm text-farmacia">
          {shareMsg}
        </span>
      </div>
    </article>
  );
}
