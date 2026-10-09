"use client";

import { Accessibility, Clock, MapPin, Navigation, Plug, Plus, Share2, Ticket, Volume2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ReportButton } from "@/components/activity/ReportButton";
import { PlaceOffers } from "@/components/offers/PlaceOffers";
import { RouteButton, type RouteToggle } from "@/components/route/RouteButton";
import { CATEGORY_BG, CategoryIcon } from "@/components/ui/CategoryIcon";
import { DemoTag } from "@/components/ui/DemoTag";
import { NomadBadge } from "@/components/ui/NomadBadge";
import { WifiMeter } from "@/components/ui/WifiMeter";
import { WifiTest } from "@/components/wifi/WifiTest";
import { buttonPrimary, buttonSecondary } from "@/components/ui/styles";
import { describeHours, loadOpeningHours } from "@/lib/openingHours";
import { subcategoryLabel, type PlaceSummary } from "@/lib/places";
import { directionsUrl, sharePage } from "@/lib/share";

const QUIET = ["", "Barulhento", "Movimentado", "Moderado", "Tranquilo", "Silencioso"];
const WHEELCHAIR = { yes: "Acessível", limited: "Acesso parcial", no: "Sem acesso" } as const;

function Stat({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface-2 p-3">
      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted">
        {icon}
        {label}
      </p>
      <div className="text-sm font-semibold">{children}</div>
    </div>
  );
}

const unknown = <span className="font-normal text-muted">Sem informação</span>;

export function PlaceDetail({
  place,
  wifiTests,
  onClose,
  standalone = false,
  route,
}: {
  place: PlaceSummary;
  wifiTests?: number;
  onClose?: () => void;
  standalone?: boolean;
  /** "Rota do dia" toggle; only on the map. */
  route?: RouteToggle;
}) {
  const [hours, setHours] = useState<string | null | undefined>(undefined);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  // Updated in place after a Wi-Fi test is saved (F12).
  const [wifi, setWifi] = useState({ mbps: place.wifi_mbps, source: place.wifi_source, seal: place.nomad_seal, tests: wifiTests });

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

  const isWork = place.category === "work" || place.subcategory === "cafe";
  const isHealth = place.category === "health";
  const open = hours?.startsWith("Aberto");

  async function share() {
    const result = await sharePage(`/lugar/${place.id}`, place.name);
    setShareMsg(result === "copied" ? "Link copiado" : null);
  }

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
      </div>

      {wifi.seal && <NomadBadge />}

      <div className="grid grid-cols-2 gap-2">
        {(isWork || wifi.mbps != null || wifi.source) && (
          <div className="col-span-2 space-y-3 rounded-2xl bg-surface-2 p-3">
            <p className="text-xs font-semibold text-muted">Wi-Fi</p>
            <WifiMeter mbps={wifi.mbps} source={wifi.source} tests={wifi.tests} />
            {wifi.tests != null && wifi.tests < 2 && wifi.source !== "user_test" && (
              <p className="text-xs text-muted">
                {wifi.tests === 0 ? "Nenhuma medição de nômades ainda." : "1 medição de nômades."} A velocidade passa a valer com 2.
              </p>
            )}
            <WifiTest
              placeId={place.id}
              placeName={place.name}
              onSaved={(s) => setWifi({ mbps: s.wifi_mbps, source: s.wifi_source, seal: s.nomad_seal, tests: s.tests })}
            />
          </div>
        )}
        {isWork && (
          <>
            <Stat icon={<Plug size={13} aria-hidden />} label="Tomadas">
              {place.has_power_outlets == null ? unknown : place.has_power_outlets ? "Disponíveis" : "Poucas"}
            </Stat>
            <Stat icon={<Volume2 size={13} aria-hidden />} label="Ambiente">
              {place.quiet_level ? QUIET[place.quiet_level] : unknown}
            </Stat>
          </>
        )}
        {isHealth && (
          <>
            <Stat icon={<Ticket size={13} aria-hidden />} label="Sem plano">
              {place.accepts_without_plan == null ? unknown : place.accepts_without_plan ? "Atende" : "Só convênio"}
            </Stat>
            <Stat icon={<span aria-hidden>Aa</span>} label="Idiomas">
              {place.languages?.length ? place.languages.join(", ") : unknown}
            </Stat>
          </>
        )}
        {place.price_hint && (
          <Stat icon={<span aria-hidden>R$</span>} label="Preço">
            {place.price_hint}
          </Stat>
        )}
        {place.wheelchair && (
          <Stat icon={<Accessibility size={13} aria-hidden />} label="Acessibilidade">
            {WHEELCHAIR[place.wheelchair]}
          </Stat>
        )}
      </div>

      <PlaceOffers placeId={place.id} count={place.offers} />

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
    </article>
  );
}
