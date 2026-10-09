"use client";

import { Accessibility, Armchair, Clock, Gauge, Languages, MapPin, Navigation, Plug, Plus, Share2, Stethoscope, Video, Volume2, Wallet, Wifi, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { voteFact } from "@/app/lugar/[id]/actions";
import { ReportButton } from "@/components/activity/ReportButton";
import { CheckinSheet } from "@/components/checkin/CheckinSheet";
import { PlaceOffers } from "@/components/offers/PlaceOffers";
import { RouteButton, type RouteToggle } from "@/components/route/RouteButton";
import { FactRow } from "@/components/trust/FactRow";
import { CallReadyBadge, SealStatus, VerifiedStamp } from "@/components/trust/TrustBadges";
import { CATEGORY_BG, CategoryIcon } from "@/components/ui/CategoryIcon";
import { DemoTag } from "@/components/ui/DemoTag";
import { SponsoredTag } from "@/components/ui/SponsoredTag";
import { WifiMeter } from "@/components/ui/WifiMeter";
import { buttonPrimary, buttonSecondary } from "@/components/ui/styles";
import { DECLARED_DIVERGENCE_PCT } from "@/config/nomad";
import { describeHours, loadOpeningHours } from "@/lib/openingHours";
import { NOISE_LABEL, outletsText, STAY_LABEL, toPlaceTrust, type PlaceTrust } from "@/lib/placeTrust";
import { subcategoryLabel, type PlaceSummary } from "@/lib/places";
import { directionsUrl, sharePage } from "@/lib/share";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/track";
import { freshnessOf, type FactField } from "@/lib/trust";

const WHEELCHAIR = { yes: "Acessível", limited: "Acesso parcial", no: "Sem acesso" } as const;
const ico = (I: typeof Wifi) => <I size={13} aria-hidden />;

/** Trust fields known from the map payload, until the full place_trust arrives. */
function initialTrust(p: PlaceSummary): PlaceTrust {
  return {
    wifi_mbps: p.wifi_mbps,
    wifi_source: p.wifi_source,
    declared_wifi_mbps: null,
    upload_mbps: null,
    ping_ms: null,
    jitter_ms: null,
    loss_pct: null,
    outlets_level: null,
    has_power_outlets: p.has_power_outlets,
    quiet_level: p.quiet_level,
    call_ok_share: null,
    stay_policy: "unknown",
    stay_note: null,
    facts_meta: p.wifi_fact ? { wifi: p.wifi_fact } : {},
    last_verified_at: p.last_verified_at,
    distinct_users_90d: 0,
    seal_valid_until: p.seal_valid_until,
    call_ready_valid_until: p.call_ready_valid_until,
  };
}

export function PlaceDetail({
  place,
  trust: trustProp,
  onClose,
  standalone = false,
  route,
}: {
  place: PlaceSummary;
  /** Full trust data when the server already has it (/lugar/[id]); otherwise fetched on open. */
  trust?: PlaceTrust | null;
  onClose?: () => void;
  standalone?: boolean;
  /** "Rota do dia" toggle; only on the map. */
  route?: RouteToggle;
}) {
  const [hours, setHours] = useState<string | null | undefined>(undefined);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [trust, setTrust] = useState<PlaceTrust>(() => trustProp ?? initialTrust(place));
  const [checkin, setCheckin] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let alive = true;
    setHours(undefined);
    loadOpeningHours()
      .then((Ctor) => alive && setHours(describeHours(Ctor, place.opening_hours)))
      .catch(() => alive && setHours(null));
    return () => {
      alive = false;
    };
  }, [place.opening_hours]);

  // The map only carries a summary; load sources, dates and confirmations when the card opens.
  useEffect(() => {
    if (trustProp) return;
    let alive = true;
    supabase.rpc("place_trust", { p_place_id: place.id }).then(({ data }) => {
      const t = toPlaceTrust(data);
      if (alive && t) setTrust(t);
    });
    return () => {
      alive = false;
    };
  }, [supabase, place.id, trustProp]);

  const onVote = useCallback(
    async (field: FactField, vote: "confirm" | "outdated") => {
      const res = await voteFact(place.id, field, vote);
      if (!res.ok) return res.message;
      setTrust(res.trust);
      track("vote_fact", { field, vote });
      return null;
    },
    [place.id],
  );

  const isWork = place.category === "work" || place.subcategory === "cafe";
  const canCheckin = place.category === "work" || place.category === "eat";
  const isHealth = place.category === "health";
  const open = hours?.startsWith("Aberto");
  const meta = trust.facts_meta;
  const fresh = trust.last_verified_at && freshnessOf(meta.wifi) === "fresh";

  async function share() {
    const result = await sharePage(`/lugar/${place.id}`, place.name);
    setShareMsg(result === "copied" ? "Link copiado" : null);
  }

  // Wi-Fi: measured median first; the partner's number only next to it when they diverge (T1).
  const declaredDiverges =
    trust.wifi_source === "user_test" &&
    trust.declared_wifi_mbps != null &&
    trust.wifi_mbps != null &&
    Math.abs(trust.wifi_mbps - trust.declared_wifi_mbps) / trust.declared_wifi_mbps > DECLARED_DIVERGENCE_PCT / 100;
  const wifiValue =
    trust.wifi_mbps != null || trust.wifi_source ? (
      <div className="space-y-1">
        <WifiMeter mbps={trust.wifi_mbps} source={trust.wifi_source} hideSource />
        {(trust.upload_mbps != null || trust.ping_ms != null) && (
          <p className="text-xs font-normal text-muted tabular-nums">
            {trust.upload_mbps != null && `upload ${trust.upload_mbps.toLocaleString("pt-BR")} Mbps`}
            {trust.ping_ms != null && ` · ping ${Math.round(trust.ping_ms)} ms`}
            {trust.jitter_ms != null && ` · jitter ${trust.jitter_ms.toLocaleString("pt-BR")} ms`}
            {trust.loss_pct != null && ` · perda ${trust.loss_pct.toLocaleString("pt-BR")}%`}
          </p>
        )}
      </div>
    ) : null;
  const noise = trust.quiet_level ? NOISE_LABEL[trust.quiet_level] : null;
  const calls = trust.call_ok_share != null ? `Funcionou em ${Math.round(trust.call_ok_share * 100)}% dos testes` : null;
  const stay = trust.stay_policy !== "unknown" ? `${STAY_LABEL[trust.stay_policy]}${trust.stay_note ? ` · ${trust.stay_note}` : ""}` : null;

  return (
    <article className="space-y-4 pt-1" aria-labelledby={`place-${place.id}`}>
      <header className="flex items-start gap-3">
        <span className={`grid size-12 shrink-0 place-items-center rounded-2xl text-white ${CATEGORY_BG[place.category]}`}>
          <CategoryIcon category={place.category} subcategory={place.subcategory} size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={`place-${place.id}`} className="font-display text-[22px] leading-tight font-bold tracking-[-0.01em] text-balance">
            {place.name}
            {place.is_demo && <DemoTag />}
            {place.featured && <SponsoredTag />}
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            {subcategoryLabel(place)}
            {place.neighborhood && <> · {place.neighborhood}</>}
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm">
            <Clock size={14} className={open ? "text-success" : "text-muted"} aria-hidden />
            <span className={open ? "font-semibold text-success" : "text-muted"}>
              {hours === undefined ? "Carregando horário…" : (hours ?? "Horário sem informação")}
            </span>
          </p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Fechar" className="-mt-1 -mr-1 grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 text-ink hover:brightness-95">
            <X size={18} strokeWidth={2} />
          </button>
        )}
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <a href={directionsUrl(place.lat, place.lng)} target="_blank" rel="noopener noreferrer" className={`${buttonPrimary} min-h-11 gap-2 px-5`}>
          <Navigation size={16} strokeWidth={2} aria-hidden /> Como chegar
        </a>
        <button type="button" onClick={share} className={`${buttonSecondary} min-h-11 gap-2 px-5`}>
          <Share2 size={16} strokeWidth={2} aria-hidden /> Compartilhar
        </button>
        <span role="status" className="text-sm font-semibold text-success">
          {shareMsg}
        </span>
        {fresh && trust.last_verified_at && (
          <span className="ml-auto">
            <VerifiedStamp at={trust.last_verified_at} />
          </span>
        )}
      </div>

      <SealStatus place={trust} />
      <CallReadyBadge place={trust} />

      {canCheckin && (
        <div className="space-y-1">
          <button type="button" onClick={() => setCheckin(true)} className={`${buttonSecondary} min-h-11 w-full gap-2 px-4`}>
            <Gauge size={16} aria-hidden /> Medir agora
          </button>
          <p className="text-center text-xs text-muted">Wi-Fi, tomadas e ruído em cerca de 1 minuto</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
        {(isWork || wifiValue) && (
          <div className="min-[420px]:col-span-2">
            <FactRow
              field="wifi"
              label="Wi-Fi"
              icon={ico(Wifi)}
              value={wifiValue}
              meta={meta.wifi}
              measured
              note={declaredDiverges ? `(declarado: ${trust.declared_wifi_mbps!.toLocaleString("pt-BR")} Mbps)` : undefined}
              onVote={onVote}
            />
          </div>
        )}
        {isWork && (
          <>
            <FactRow field="outlets" label="Tomadas" icon={ico(Plug)} value={outletsText(trust)} meta={meta.outlets} onVote={onVote} />
            <FactRow field="noise" label="Ruído" icon={ico(Volume2)} value={noise} meta={meta.noise} onVote={onVote} />
            <FactRow field="calls" label="Chamadas de vídeo" icon={ico(Video)} value={calls} meta={meta.calls} onVote={onVote} />
            <FactRow field="stay_policy" label="Permanência" icon={ico(Armchair)} value={stay} meta={meta.stay_policy} onVote={onVote} />
          </>
        )}
        {isHealth && (
          <>
            <FactRow
              field="health_info"
              label="Atende sem plano"
              icon={ico(Stethoscope)}
              value={place.accepts_without_plan == null ? null : place.accepts_without_plan ? "Sim" : "Só convênio"}
              meta={meta.health_info}
              onVote={onVote}
            />
            <FactRow field="languages" label="Idiomas" icon={ico(Languages)} value={place.languages?.length ? place.languages.join(", ") : null} meta={meta.languages} onVote={onVote} />
          </>
        )}
        {place.opening_hours && (
          <FactRow field="opening_hours" label="Horário" icon={ico(Clock)} value={<span className="text-sm">{place.opening_hours}</span>} meta={meta.opening_hours} onVote={onVote} />
        )}
        {place.price_hint && <FactRow field="price" label="Preço" icon={ico(Wallet)} value={place.price_hint} meta={meta.price} onVote={onVote} />}
        {place.wheelchair && (
          <div className="rounded-2xl bg-surface-2 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
              <Accessibility size={13} aria-hidden /> Acessibilidade
            </p>
            <p className="mt-1 text-[15px] font-semibold">{WHEELCHAIR[place.wheelchair]}</p>
            <p className="mt-0.5 text-xs text-muted">OpenStreetMap</p>
          </div>
        )}
      </div>

      <PlaceOffers placeId={place.id} count={place.offers} meta={meta.offer} />

      {place.address && (
        <p className="flex items-start gap-2 text-sm text-muted">
          <MapPin size={16} className="mt-0.5 shrink-0" aria-hidden />
          {place.address}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3">
        {route && <RouteButton {...route} />}
        <Link href={`/atividade/nova?lugar=${place.id}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent-strong">
          <Plus size={16} strokeWidth={2.5} aria-hidden /> Criar roda aqui
        </Link>
        {!standalone && (
          <Link href={`/lugar/${place.id}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">
            Ver página do lugar
          </Link>
        )}
        <span className="ml-auto">
          <ReportButton targetType="place" targetId={place.id} label="Denunciar lugar" />
        </span>
      </div>

      {checkin && (
        <CheckinSheet
          place={place}
          onClose={() => setCheckin(false)}
          onSaved={(t) => setTrust(t)}
        />
      )}
    </article>
  );
}
