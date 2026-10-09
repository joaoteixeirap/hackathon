"use client";

import { Armchair, CalendarPlus, Gauge, Navigation, Plug, Video, Volume2, Wifi } from "lucide-react";
import Link from "next/link";
import { FavoriteStar } from "@/components/stay/FavoriteStar";
import { FreshnessBadge, CallReadyBadge, SealStatus } from "@/components/trust/TrustBadges";
import { DemoTag } from "@/components/ui/DemoTag";
import { NOISE_LABEL, outletsText, STAY_LABEL } from "@/lib/placeTrust";
import type { RadarPlace } from "@/lib/radarData";
import { measuredDownload } from "@/lib/radarFilters";
import type { RadarScore } from "@/lib/radarScore";
import { directionsUrl } from "@/lib/share";
import { factLineShort, freshnessOf, type FactMeta } from "@/lib/trust";
import { subcategoryLabel } from "@/lib/places";
import { track } from "@/lib/track";

function Criterion({ icon, label, value, meta }: { icon: React.ReactNode; label: string; value: string | null; meta: FactMeta | undefined }) {
  const known = value != null && meta != null;
  return (
    <li className="grid grid-cols-[1.25rem_1fr] gap-x-2 py-1.5">
      <span className="pt-0.5 text-muted">{icon}</span>
      <div className="min-w-0">
        <p className="flex flex-wrap items-baseline justify-between gap-x-2 text-sm">
          <span className="text-muted">{label}</span>
          <span className={`font-semibold tabular-nums ${known ? "" : "font-normal text-muted"}`}>{known ? value : "sem dados"}</span>
        </p>
        {known && (
          <p className="flex flex-wrap items-center justify-between gap-x-2 text-xs text-muted">
            <span className="min-w-0">{factLineShort(meta)}</span>
            <FreshnessBadge freshness={freshnessOf(meta)} />
          </p>
        )}
      </div>
    </li>
  );
}

/** Radar card (SPEC_V2 R4): the criteria with source and date first, the score small after. */
export function RadarCard({ place, rank, score, onCheckin, favorite }: { place: RadarPlace; rank: number; score: RadarScore; onCheckin: () => void; favorite: boolean }) {
  const meta = place.facts_meta;
  const down = measuredDownload(place);
  const wifi = down != null ? `${down.toLocaleString("pt-BR")} Mbps` : null;
  const calls = place.call_ok_share != null ? `${Math.round(place.call_ok_share * 100)}% ok` : null;
  const stay = place.stay_policy !== "unknown" ? STAY_LABEL[place.stay_policy] : null;

  return (
    <article className="rounded-3xl border border-line bg-surface p-4 shadow-soft-sm" aria-labelledby={`radar-${place.id}`} data-radar-card={place.id}>
      <header className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary font-display text-sm font-bold text-on-fill tabular-nums" aria-label={`Posição ${rank}`}>
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={`radar-${place.id}`} className="font-display text-lg leading-tight font-bold">
            <Link href={`/lugar/${place.id}`} onClick={() => track("open_place", { place_id: place.id, source: "radar" })} className="underline-offset-4 hover:underline">
              {place.name}
            </Link>
            {place.is_demo && <DemoTag />}
          </h2>
          <p className="text-sm text-muted">
            {subcategoryLabel(place)}
            {place.neighborhood && ` · ${place.neighborhood}`}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <SealStatus place={place} compact />
            <CallReadyBadge place={place} />
          </div>
        </div>
      </header>

      <ul className="mt-2 divide-y divide-line">
        <Criterion icon={<Wifi size={15} aria-hidden />} label="Wi-Fi medido" value={wifi} meta={meta.wifi?.source === "user" ? meta.wifi : undefined} />
        <Criterion icon={<Plug size={15} aria-hidden />} label="Tomadas" value={outletsText(place)} meta={meta.outlets} />
        <Criterion icon={<Volume2 size={15} aria-hidden />} label="Ruído" value={place.quiet_level ? NOISE_LABEL[place.quiet_level] : null} meta={meta.noise} />
        <Criterion icon={<Video size={15} aria-hidden />} label="Chamadas" value={calls} meta={meta.calls} />
        <Criterion icon={<Armchair size={15} aria-hidden />} label="Permanência" value={stay} meta={meta.stay_policy} />
      </ul>

      <p className="mt-2 text-xs text-muted tabular-nums" data-testid="radar-score">
        Adequação {score.total}/100{score.confidence === "low" ? " · provisório" : ""}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onCheckin} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-on-fill">
          <Gauge size={15} aria-hidden /> Medir agora
        </button>
        <Link href={`/atividade/nova?lugar=${place.id}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line px-4 text-sm font-semibold">
          <CalendarPlus size={15} aria-hidden /> Marcar sessão aqui
        </Link>
        <a href={directionsUrl(place.lat, place.lng)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-primary">
          <Navigation size={15} aria-hidden /> Como chegar
        </a>
        <FavoriteStar placeId={place.id} initial={favorite} compact />
      </div>
    </article>
  );
}
