"use client";

import { ShieldCheck } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { LocationPicker } from "@/components/map/LocationPicker";
import { ActivityIcon } from "@/components/ui/CategoryIcon";
import { buttonPrimary, field, label } from "@/components/ui/styles";
import { ACTIVITY_CATEGORIES, costPerPerson, formatBRL, parseBRL } from "@/lib/activityForm";
import type { BBox } from "@/lib/geo";
import { ACTIVITY_LABELS } from "@/lib/places";
import { createActivity, type CreateActivityState } from "./actions";

type Prefill = { lat: number; lng: number; label: string | null; placeId: string | null; zoom: number; title?: string; category?: string; date?: string; time?: string; offerId?: string };

function tomorrowInBrasilia(): string {
  const d = new Date(Date.now() + 86_400_000);
  return d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }); // YYYY-MM-DD
}

function Err({ id, msg }: { id: string; msg?: string }) {
  return msg ? (
    <p id={id} className="text-sm text-danger">
      {msg}
    </p>
  ) : null;
}

export function CreateActivityForm({ citySlug, bbox, prefill, stayNotice }: { citySlug: string; bbox: BBox; prefill: Prefill; stayNotice?: string | null }) {
  const [state, action, pending] = useActionState<CreateActivityState, FormData>(createActivity, { status: "idle" });
  const e = state.errors ?? {};
  const [point, setPoint] = useState({ lat: prefill.lat, lng: prefill.lng });
  const [category, setCategory] = useState<string>(prefill.category ?? "work_together");
  const [capacity, setCapacity] = useState(6);
  const [cost, setCost] = useState("");
  const [split, setSplit] = useState(true);
  const [repeat, setRepeat] = useState(false);
  const defaultDate = useMemo(tomorrowInBrasilia, []);

  const costCents = parseBRL(cost);
  const perPerson = !Number.isNaN(costCents) && costCents > 0 && split ? costPerPerson(costCents, capacity - 1) : null;

  return (
    <form action={action} className="space-y-6" noValidate>
      <input type="hidden" name="city" value={citySlug} />
      <input type="hidden" name="lat" value={point.lat} />
      <input type="hidden" name="lng" value={point.lng} />
      <input type="hidden" name="place_id" value={prefill.placeId ?? ""} />
      <input type="hidden" name="offer_id" value={prefill.offerId ?? ""} />

      <div className="space-y-1.5">
        <label htmlFor="title" className={label}>
          O que vamos fazer?
        </label>
        <input id="title" name="title" defaultValue={prefill.title} required minLength={3} maxLength={80} placeholder="Ex.: Dia de trabalho conjunto" className={field} aria-invalid={!!e.title} />
        <Err id="title-error" msg={e.title} />
      </div>

      <fieldset className="space-y-2">
        <legend className={label}>Tipo</legend>
        <div className="grid grid-cols-3 gap-2">
          {ACTIVITY_CATEGORIES.map((c) => (
            <label
              key={c}
              className={`flex min-h-[72px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border p-2 text-center text-xs font-semibold transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-primary/20 ${
                category === c ? "border-transparent bg-primary text-on-fill shadow-soft-sm" : "border-line bg-surface text-ink hover:bg-surface-2"
              }`}
            >
              <input type="radio" name="category" value={c} checked={category === c} onChange={() => setCategory(c)} className="sr-only" />
              <ActivityIcon category={c as never} size={20} />
              {ACTIVITY_LABELS[c]}
            </label>
          ))}
        </div>
        <Err id="category-error" msg={e.category} />
      </fieldset>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="col-span-2 space-y-1.5 sm:col-span-1">
          <label htmlFor="date" className={label}>
            Dia
          </label>
          <input id="date" name="date" type="date" defaultValue={prefill.date ?? defaultDate} required className={field} />
          <Err id="date-error" msg={e.date} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="time" className={label}>
            Início
          </label>
          <input id="time" name="time" type="time" defaultValue={prefill.time ?? "09:00"} required className={field} />
          <Err id="time-error" msg={e.time} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="duration" className={label}>
            Duração
          </label>
          <select id="duration" name="duration" defaultValue="3" className={field}>
            {[
              ["1", "1 hora"],
              ["2", "2 horas"],
              ["3", "3 horas"],
              ["4", "4 horas"],
              ["6", "6 horas"],
              ["8", "8 horas"],
            ].map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
          <Err id="duration-error" msg={e.duration} />
        </div>
      </div>

      <div className="space-y-2">
        <p className={label}>Ponto de encontro</p>
        <LocationPicker bbox={bbox} initial={{ lat: prefill.lat, lng: prefill.lng }} zoom={prefill.zoom} onChange={setPoint} />
        <p className="tabular-nums text-xs text-muted" aria-live="polite">
          {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
        </p>
        <label htmlFor="meeting_label" className="sr-only">
          Referência do ponto de encontro
        </label>
        <input
          id="meeting_label"
          name="meeting_label"
          maxLength={120}
          defaultValue={prefill.label ?? ""}
          placeholder="Ex.: em frente ao Aquário"
          className={field}
        />
        <Err id="location-error" msg={e.location ?? e.meeting_label} />
        <p className="flex items-center gap-2 rounded-2xl bg-surface-2 px-3.5 py-2.5 text-sm">
          <ShieldCheck size={18} strokeWidth={1.75} className="shrink-0 text-success" aria-hidden />
          Combine em local público.
        </p>
        {stayNotice && (
          <p className="rounded-2xl bg-accent-soft px-3.5 py-2.5 text-sm" role="note">
            {stayNotice}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="capacity" className={label}>
            Vagas (com você)
          </label>
          <input
            id="capacity"
            name="capacity"
            type="number"
            inputMode="numeric"
            min={2}
            max={repeat ? 12 : 30}
            value={capacity}
            onChange={(ev) => setCapacity(Math.max(2, Math.min(repeat ? 12 : 30, Number(ev.target.value) || 2)))}
            className={`${field} tabular-nums`}
          />
          <Err id="capacity-error" msg={e.capacity} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="cost" className={label}>
            Custo total
          </label>
          <input
            id="cost"
            name="cost"
            inputMode="decimal"
            placeholder="Opcional"
            value={cost}
            onChange={(ev) => setCost(ev.target.value)}
            className={`${field} tabular-nums`}
          />
          <Err id="cost-error" msg={e.cost} />
        </div>
      </div>
      <label className="flex min-h-11 items-start gap-3 rounded-2xl bg-surface-2 p-3">
        <input
          type="checkbox"
          name="repeat"
          checked={repeat}
          onChange={(ev) => {
            setRepeat(ev.target.checked);
            if (ev.target.checked) setCapacity((c) => Math.min(c, 12));
          }}
          className="mt-0.5 size-5 shrink-0 accent-primary"
        />
        <span>
          <span className="block font-semibold">Repetir toda semana</span>
          <span className="block text-sm text-muted">Mesmo dia e horário pelas próximas 6 semanas. Quem você aprovar uma vez entra em todas (até 12 vagas).</span>
        </span>
      </label>

      {cost && (
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" name="split_cost" checked={split} onChange={(ev) => setSplit(ev.target.checked)} className="size-5 accent-primary" />
          <span>
            Dividir entre o grupo
            {perPerson != null && <span className="ml-2 tabular-nums text-sm">≈ {formatBRL(perPerson)} por pessoa se lotar</span>}
          </span>
        </label>
      )}

      <div className="space-y-1.5">
        <label htmlFor="description" className={label}>
          Detalhes (opcional)
        </label>
        <textarea id="description" name="description" rows={3} maxLength={1000} placeholder="O que levar, ritmo, idioma do grupo…" className={field} />
      </div>

      {state.message && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}
      <button type="submit" className={`${buttonPrimary} w-full`} disabled={pending}>
        {pending ? "Criando…" : "Criar roda"}
      </button>
    </form>
  );
}
