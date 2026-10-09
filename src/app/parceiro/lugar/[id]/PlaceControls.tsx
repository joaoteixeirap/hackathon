"use client";

import { Sparkles } from "lucide-react";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { createOffer, featurePlace, setOfferActive, type FormState } from "@/app/parceiro/actions";
import { buttonAccent, buttonPrimary, field, label } from "@/components/ui/styles";
import { formatBRL } from "@/lib/activityForm";
import { FEATURE_PRICE_CENTS, OFFER_KINDS, OFFER_LABELS, type OfferErrors } from "@/lib/offers";

/** "Destacar no mapa" with the example price and the simulated-charge notice (F10). */
export function FeatureButton({ placeId, featuredUntil }: { placeId: string; featuredUntil: string | null }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const active = featuredUntil != null && new Date(featuredUntil).getTime() > Date.now();

  return (
    <div className="space-y-3">
      {active ? (
        <p className="flex items-center gap-2 font-semibold text-accent-strong">
          <Sparkles size={18} aria-hidden /> Em destaque até{" "}
          {new Date(featuredUntil!).toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: "America/Sao_Paulo" })}
        </p>
      ) : (
        <p className="text-sm">Pin maior no mapa e topo da lista por 30 dias.</p>
      )}
      {!active && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await featurePlace(placeId);
              if (!res.ok) setError(res.message);
            })
          }
          className={`${buttonAccent} gap-2`}
        >
          <Sparkles size={16} aria-hidden /> Destacar no mapa · {formatBRL(FEATURE_PRICE_CENTS)}/mês
        </button>
      )}
      <p className="text-xs text-muted">Cobrança simulada: nenhum valor é cobrado durante o piloto.</p>
      <p role="status" className="text-sm text-danger empty:hidden">
        {error}
      </p>
    </div>
  );
}

export function OfferToggle({ placeId, offerId, active, title }: { placeId: string; offerId: string; active: boolean; title: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`${active ? "Pausar" : "Reativar"} ${title}`}
      onClick={() => startTransition(async () => void (await setOfferActive(placeId, offerId, !active)))}
      className="min-h-11 rounded-full border border-line bg-surface px-4 text-sm font-semibold hover:bg-surface-2 disabled:opacity-50"
    >
      {active ? "Pausar" : "Reativar"}
    </button>
  );
}

export function OfferForm({ placeId }: { placeId: string }) {
  const [state, action, pending] = useActionState<FormState<OfferErrors>, FormData>(createOffer.bind(null, placeId), { status: "idle" });
  const formRef = useRef<HTMLFormElement>(null);
  const e = state.errors ?? {};
  useEffect(() => {
    if (state.status === "saved") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4" noValidate>
      <div className="grid grid-cols-[auto_1fr] gap-3">
        <div className="space-y-1.5">
          <label htmlFor="kind" className={label}>
            Tipo
          </label>
          <select id="kind" name="kind" defaultValue="discount" className={field}>
            {OFFER_KINDS.map((k) => (
              <option key={k} value={k}>
                {OFFER_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="offer-title" className={label}>
            Título
          </label>
          <input id="offer-title" name="title" required maxLength={80} placeholder="Ex.: Diária com 20% off" className={field} />
        </div>
      </div>
      {(e.kind || e.title) && <p className="text-sm text-danger">{e.title ?? e.kind}</p>}
      <div className="space-y-1.5">
        <label htmlFor="offer-description" className={label}>
          Como funciona (opcional)
        </label>
        <textarea id="offer-description" name="description" rows={2} maxLength={300} className={field} />
        {e.description && <p className="text-sm text-danger">{e.description}</p>}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="code" className={label}>
            Código
          </label>
          <input id="code" name="code" maxLength={20} placeholder="Automático" className={`${field} uppercase`} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="valid_to" className={label}>
            Válida até
          </label>
          <input id="valid_to" name="valid_to" type="date" className={field} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="capacity" className={label}>
            Vagas
          </label>
          <input id="capacity" name="capacity" type="number" min={1} inputMode="numeric" placeholder="∞" className={`${field} tabular-nums`} />
        </div>
      </div>
      {(e.code || e.valid_to || e.capacity) && <p className="text-sm text-danger">{e.code ?? e.valid_to ?? e.capacity}</p>}
      <button type="submit" disabled={pending} className={`${buttonPrimary} w-full`}>
        {pending ? "Publicando…" : "Publicar oferta"}
      </button>
      <p role="status" className={`text-sm empty:hidden ${state.status === "saved" ? "text-success" : "text-danger"}`}>
        {state.status === "saved" ? "Oferta publicada. Ela já aparece na ficha do lugar e no filtro \"Tem oferta\"." : state.message}
      </p>
    </form>
  );
}
