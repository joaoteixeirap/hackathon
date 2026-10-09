"use client";

import { Ticket } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { redeemOffer } from "@/app/lugar/[id]/actions";
import { buttonPrimary, buttonSecondary } from "@/components/ui/styles";
import { OFFER_LABELS, type PublicOffer } from "@/lib/offers";
import { createClient } from "@/lib/supabase/client";
import { OfferTicket } from "./OfferTicket";

const formatDate = (d: string) => new Date(`${d}T12:00:00-03:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });

/** Active offers of a place with "Usar oferta" (F10/F11). Loaded on demand; the map only knows the count. */
export function PlaceOffers({ placeId, count }: { placeId: string; count: number }) {
  const supabase = useMemo(() => createClient(), []);
  const [offers, setOffers] = useState<PublicOffer[] | null>(null);

  useEffect(() => {
    if (count === 0) return;
    let alive = true;
    supabase
      .from("offers")
      .select("id, kind, title, description, valid_to, capacity")
      .eq("place_id", placeId)
      .eq("active", true)
      .order("created_at")
      .then(({ data }) => alive && setOffers((data ?? []) as PublicOffer[]));
    return () => {
      alive = false;
    };
  }, [supabase, placeId, count]);

  if (count === 0) return null;

  return (
    <section aria-labelledby={`offers-${placeId}`} className="space-y-2">
      <h3 id={`offers-${placeId}`} className="flex items-center gap-2 text-sm font-bold text-accent-strong">
        <Ticket size={16} aria-hidden /> {count === 1 ? "Oferta" : "Ofertas"} para nômades
      </h3>
      {offers == null ? (
        <p className="text-sm text-muted">Carregando ofertas…</p>
      ) : (
        <ul className="space-y-2">
          {offers.map((o) => (
            <OfferItem key={o.id} offer={o} />
          ))}
        </ul>
      )}
    </section>
  );
}

function OfferItem({ offer }: { offer: PublicOffer }) {
  const [step, setStep] = useState<"idle" | "confirm">("idle");
  const [ticket, setTicket] = useState<{ code: string; expiresAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const use = () =>
    startTransition(async () => {
      setError(null);
      const res = await redeemOffer(offer.id);
      if (res.ok) setTicket({ code: res.code, expiresAt: res.expiresAt });
      else setError(res.message);
      setStep("idle");
    });

  return (
    <li className="space-y-2 rounded-2xl bg-accent-soft p-3.5">
      <p className="text-xs font-semibold text-accent-strong">
        {OFFER_LABELS[offer.kind]}
        {offer.valid_to && <span className="font-normal"> · até {formatDate(offer.valid_to)}</span>}
      </p>
      <p className="font-semibold">{offer.title}</p>
      {offer.description && <p className="text-sm text-muted">{offer.description}</p>}

      {ticket ? (
        <OfferTicket code={ticket.code} expiresAt={ticket.expiresAt} title={offer.title} />
      ) : step === "confirm" ? (
        <div className="space-y-2">
          <p className="text-sm">Use quando estiver no balcão: o código vale 10 minutos e a oferta, uma vez por dia.</p>
          <div className="flex gap-2">
            <button type="button" disabled={pending} onClick={use} className={`${buttonPrimary} min-h-11 flex-1 px-4`}>
              {pending ? "Gerando…" : "Mostrar código"}
            </button>
            <button type="button" onClick={() => setStep("idle")} className={`${buttonSecondary} min-h-11 px-4`}>
              Agora não
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setStep("confirm")} className={`${buttonPrimary} min-h-11 px-5`}>
          Usar oferta
        </button>
      )}
      <p role="status" className="text-sm text-danger empty:hidden">
        {error}
      </p>
    </li>
  );
}
