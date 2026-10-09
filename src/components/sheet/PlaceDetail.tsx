"use client";

import { Accessibility, Clock, MapPin, Navigation, Plug, Share2, Ticket, Volume2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CATEGORY_BG, CategoryIcon } from "@/components/ui/CategoryIcon";
import { DemoTag } from "@/components/ui/DemoTag";
import { SealStamp } from "@/components/ui/SealStamp";
import { WifiMeter } from "@/components/ui/WifiMeter";
import { buttonPrimary, buttonSecondary } from "@/components/ui/styles";
import { describeHours, loadOpeningHours } from "@/lib/openingHours";
import { subcategoryLabel, type PlaceSummary } from "@/lib/places";
import { directionsUrl, sharePage } from "@/lib/share";

const QUIET = ["", "Barulhento", "Movimentado", "Moderado", "Tranquilo", "Silencioso"];
const WHEELCHAIR = { yes: "Acessível", limited: "Acesso parcial", no: "Sem acesso" } as const;

function Instrument({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-tinta/15 p-3">
      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-tinta-suave uppercase">
        {icon}
        {label}
      </p>
      <div className="font-mono text-sm">{children}</div>
    </div>
  );
}

const unknown = <span className="font-sans text-xs text-tinta-suave">Sem informação</span>;

export function PlaceDetail({
  place,
  wifiTests,
  onClose,
  standalone = false,
}: {
  place: PlaceSummary;
  wifiTests?: number;
  onClose?: () => void;
  standalone?: boolean;
}) {
  const [hours, setHours] = useState<string | null | undefined>(undefined);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

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

  async function share() {
    const result = await sharePage(`/lugar/${place.id}`, place.name);
    setShareMsg(result === "copied" ? "Link copiado" : null);
  }

  return (
    <article className="relative space-y-4" aria-labelledby={`place-${place.id}`}>
      <header className="flex items-start gap-3">
        <span className={`grid size-11 shrink-0 place-items-center rounded-full border-[1.5px] border-tinta text-on-fill ${CATEGORY_BG[place.category]}`}>
          <CategoryIcon category={place.category} subcategory={place.subcategory} size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold tracking-wider text-tinta-suave uppercase">
            {subcategoryLabel(place)}
            {place.neighborhood && (
              <>
                {" · "}
                <span className="font-serif text-sm font-semibold tracking-normal normal-case italic">{place.neighborhood}</span>
              </>
            )}
          </p>
          <h2 id={`place-${place.id}`} className="font-serif text-[22px] leading-tight font-bold text-balance">
            {place.name} {place.is_demo && <DemoTag />}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-tinta-suave">
            <Clock size={14} strokeWidth={1.75} aria-hidden />
            {hours === undefined ? "…" : (hours ?? "Horário: sem informação")}
          </p>
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

      {place.nomad_seal && (
        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-mare/60 p-3">
          <SealStamp size={64} />
          <p className="text-sm">
            <strong className="font-serif text-base">Amigo do Nômade.</strong> Wi-Fi forte confirmado por quem trabalhou aqui, e
            tomadas disponíveis.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {(isWork || place.wifi_mbps != null || place.wifi_source) && (
          <div className="col-span-2 rounded-xl border border-tinta/15 p-3">
            <p className="mb-2 text-[11px] font-bold tracking-wider text-tinta-suave uppercase">Wi-Fi</p>
            <WifiMeter mbps={place.wifi_mbps} source={place.wifi_source} tests={wifiTests} />
          </div>
        )}
        {isWork && (
          <>
            <Instrument icon={<Plug size={12} aria-hidden />} label="Tomadas">
              {place.has_power_outlets == null ? unknown : place.has_power_outlets ? "Sim" : "Poucas/não"}
            </Instrument>
            <Instrument icon={<Volume2 size={12} aria-hidden />} label="Ruído">
              {place.quiet_level ? QUIET[place.quiet_level] : unknown}
            </Instrument>
          </>
        )}
        {isHealth && (
          <>
            <Instrument icon={<Ticket size={12} aria-hidden />} label="Sem plano">
              {place.accepts_without_plan == null ? unknown : place.accepts_without_plan ? "Atende" : "Só convênio"}
            </Instrument>
            <Instrument icon={<span aria-hidden>Aa</span>} label="Idiomas">
              {place.languages?.length ? place.languages.join(", ") : unknown}
            </Instrument>
          </>
        )}
        {place.price_hint && (
          <Instrument icon={<span aria-hidden>R$</span>} label="Preço">
            {place.price_hint}
          </Instrument>
        )}
        {place.wheelchair && (
          <Instrument icon={<Accessibility size={12} aria-hidden />} label="Acesso">
            {WHEELCHAIR[place.wheelchair]}
          </Instrument>
        )}
      </div>

      {place.offers > 0 && (
        <p className="flex items-center gap-2 rounded-xl bg-coral/12 px-3 py-2 text-sm">
          <Ticket size={16} strokeWidth={1.75} className="text-coral" aria-hidden />
          {place.offers} {place.offers === 1 ? "oferta de parceiro" : "ofertas de parceiro"} para nômades
        </p>
      )}

      {place.address && (
        <p className="flex items-start gap-1.5 text-sm text-tinta-suave">
          <MapPin size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden />
          {place.address}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <a href={directionsUrl(place.lat, place.lng)} target="_blank" rel="noopener noreferrer" className={`${buttonPrimary} gap-2`}>
          <Navigation size={16} strokeWidth={1.75} aria-hidden /> Como chegar
        </a>
        <button type="button" onClick={share} className={`${buttonSecondary} gap-2`}>
          <Share2 size={16} strokeWidth={1.75} aria-hidden /> Compartilhar
        </button>
        <Link
          href={`/atividade/nova?lugar=${place.id}`}
          className="inline-flex min-h-11 items-center gap-1 rounded-full border-[1.5px] border-tinta bg-sol px-4 text-sm font-bold text-[#1f2a30]"
        >
          Criar roda aqui
        </Link>
        {!standalone && (
          <Link href={`/lugar/${place.id}`} className="min-h-11 px-2 py-3 text-sm font-bold text-mare underline-offset-4 hover:underline">
            Abrir ficha
          </Link>
        )}
        <span role="status" className="text-sm text-farmacia">
          {shareMsg}
        </span>
      </div>
    </article>
  );
}
