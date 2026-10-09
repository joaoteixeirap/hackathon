"use client";

import { CalendarClock, MapPin, Share2, ShieldCheck, Users, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { formatDayShort, formatHour, ringState } from "@/components/map/activityMarker";
import { ActivityIcon } from "@/components/ui/CategoryIcon";
import { DemoTag } from "@/components/ui/DemoTag";
import { buttonAccent, buttonSecondary } from "@/components/ui/styles";
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
    <article className="space-y-4 pt-1" aria-labelledby={`act-${activity.id}`}>
      <header className="flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-live text-white">
          <ActivityIcon category={activity.category} size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-xs font-semibold text-accent-strong">
            {ACTIVITY_LABELS[activity.category]}
            {state === "live" && <span className="rounded-full bg-live px-2 py-0.5 text-white">Acontecendo agora</span>}
          </p>
          <h2 id={`act-${activity.id}`} className="font-display text-[22px] leading-tight font-bold tracking-[-0.01em] text-balance">
            {stripDemo(activity.title)}
            {activity.is_demo && <DemoTag />}
          </h2>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Fechar" className="-mt-1 -mr-1 grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 text-ink hover:brightness-95">
            <X size={18} strokeWidth={2} />
          </button>
        )}
      </header>

      <dl className="space-y-2.5 text-[15px]">
        <div className="flex items-center gap-3">
          <dt>
            <CalendarClock size={18} className="text-muted" aria-label="Quando" />
          </dt>
          <dd className="font-semibold tabular-nums first-letter:uppercase">
            {formatDayShort(activity.starts_at)}, {formatHour(activity.starts_at)}–{formatHour(activity.ends_at)}
          </dd>
        </div>
        <div className="flex items-center gap-3">
          <dt>
            <MapPin size={18} className="text-muted" aria-label="Ponto de encontro" />
          </dt>
          <dd>{activity.meeting_label ?? "Ponto marcado no mapa"}</dd>
        </div>
        <div className="flex items-center gap-3">
          <dt>
            <Users size={18} className="text-muted" aria-label="Vagas" />
          </dt>
          <dd>{activity.status === "full" ? "Grupo completo" : `Até ${activity.capacity} pessoas`}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/atividade/${activity.id}`} className={`${buttonAccent} min-h-11 px-5`}>
          Ver roda
        </Link>
        <button type="button" onClick={share} className={`${buttonSecondary} min-h-11 gap-2 px-5`}>
          <Share2 size={16} strokeWidth={2} aria-hidden /> Compartilhar
        </button>
        <span role="status" className="text-sm font-semibold text-success">
          {shareMsg}
        </span>
      </div>

      <p className="flex items-center gap-2 text-sm text-muted">
        <ShieldCheck size={16} className="text-success" aria-hidden /> Combine em local público.
      </p>
    </article>
  );
}
