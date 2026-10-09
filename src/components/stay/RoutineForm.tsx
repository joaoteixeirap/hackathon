"use client";

import { useActionState, useState } from "react";
import { saveRoutine, type StayFormState } from "@/app/estadia/actions";
import { buttonPrimary, field } from "@/components/ui/styles";
import { INTERESTS, MAX_INTERESTS, SOCIAL_GOALS, WORK_RHYTHMS, WORK_STYLES, type Interest, type SocialGoal, type WorkRhythm, type WorkStyle } from "@/lib/interests";

export type RoutineValues = {
  work_rhythm: WorkRhythm;
  work_style: WorkStyle;
  interests: Interest[];
  social_goals: SocialGoal[];
  discoverable: boolean;
  share_presence: boolean;
  neighborhood: string | null;
};

function Pills<K extends string>({ name, options, multi, value, onChange, max, compact }: { name: string; options: Record<K, string>; multi?: boolean; value: K[]; onChange: (v: K[]) => void; max?: number; compact?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {(Object.keys(options) as K[]).map((k) => {
        const on = value.includes(k);
        const disabled = !on && multi && max != null && value.length >= max;
        return (
          <label key={k} className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border px-3.5 text-sm font-semibold ${compact ? "lg:min-h-9 lg:px-3 lg:text-[13px]" : ""} transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-primary/20 ${on ? "border-transparent bg-primary text-on-fill" : "border-line bg-surface hover:bg-surface-2"} ${disabled ? "opacity-50" : ""}`}>
            <input
              type={multi ? "checkbox" : "radio"}
              name={name}
              value={k}
              checked={on}
              disabled={disabled}
              onChange={() => onChange(multi ? (on ? value.filter((x) => x !== k) : [...value, k]) : [k])}
              className="sr-only"
            />
            {options[k]}
          </label>
        );
      })}
    </div>
  );
}

function Switch({ name, checked, onChange, title, children }: { name: string; checked: boolean; onChange: (v: boolean) => void; title: string; children: React.ReactNode }) {
  // h-full: side by side in the wide layout, both cards share the row height.
  return (
    <label className="flex h-full cursor-pointer items-start gap-3 rounded-2xl bg-surface-2 p-3">
      <input type="checkbox" name={name} checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]" />
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-muted">{children}</span>
      </span>
    </label>
  );
}

/**
 * S1 routine and interests, plus the two separate opt-ins (I5a): "Quem está aqui"
 * (share_presence) and discoverable. Both start off and are explained in plain words.
 */
export function RoutineForm({ initial, neighborhoods, submitLabel = "Salvar", onSaved, stepped = false, wide = false }: { initial: RoutineValues; neighborhoods: string[]; submitLabel?: string; onSaved?: () => void; /** onboarding: routine first, then privacy */ stepped?: boolean; /** profile page: two columns and smaller pills on desktop, so it fits with little scrolling */ wide?: boolean }) {
  const [step, setStep] = useState<"routine" | "privacy">("routine");
  const showRoutine = !stepped || step === "routine";
  const showPrivacy = !stepped || step === "privacy";
  const [state, action, pending] = useActionState<StayFormState, FormData>(async (prev, fd) => {
    const res = await saveRoutine(prev, fd);
    if (res.status === "saved") onSaved?.();
    return res;
  }, { status: "idle" });
  const [v, setV] = useState(initial);
  const set = <K extends keyof RoutineValues>(k: K, val: RoutineValues[K]) => setV((s) => ({ ...s, [k]: val }));

  return (
    <form action={action} className="space-y-5">
      {/* Hidden steps still submit their inputs. */}
      <div hidden={!showRoutine} className={wide ? "space-y-5 lg:grid lg:grid-cols-2 lg:gap-x-8 lg:space-y-0" : "space-y-5"}>
      <div className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="font-semibold">Quando você rende mais?</legend>
        <Pills name="work_rhythm" options={WORK_RHYTHMS} value={[v.work_rhythm]} onChange={(x) => set("work_rhythm", x[0])} compact={wide} />
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="font-semibold">Seu jeito de trabalhar</legend>
        <Pills name="work_style" options={WORK_STYLES} value={[v.work_style]} onChange={(x) => set("work_style", x[0])} compact={wide} />
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="font-semibold">O que você procura na cidade</legend>
        <Pills name="social_goals" options={SOCIAL_GOALS} multi value={v.social_goals} onChange={(x) => set("social_goals", x)} compact={wide} />
      </fieldset>
      </div>
      <fieldset className="space-y-2">
        <legend className="font-semibold">
          Interesses <span className="font-normal text-muted tabular-nums">({v.interests.length}/{MAX_INTERESTS})</span>
        </legend>
        <Pills name="interests" options={INTERESTS} multi max={MAX_INTERESTS} value={v.interests} onChange={(x) => set("interests", x)} compact={wide} />
      </fieldset>

      </div>

      {stepped && step === "routine" && (
        <button type="button" onClick={() => setStep("privacy")} className={`${buttonPrimary} w-full`}>
          Continuar
        </button>
      )}

      <div hidden={!showPrivacy} className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="font-semibold">Privacidade</legend>
        <div className={wide ? "grid gap-2 lg:grid-cols-2" : "space-y-2"}>
        <Switch name="share_presence" checked={v.share_presence} onChange={(x) => set("share_presence", x)} title='Contar em "Quem está aqui"'>
          Seu bairro soma 1 na contagem do mapa, que só aparece a partir de 3 pessoas. Ninguém vê seu nome nem sua posição.
        </Switch>
        <Switch name="discoverable" checked={v.discoverable} onChange={(x) => set("discoverable", x)} title="Aparecer para pessoas compatíveis">
          Outras pessoas verificadas que ficam na cidade nas mesmas datas poderão ver seu nome, foto, interesses e ritmo de trabalho. Não há mensagens diretas.
        </Switch>
        </div>
        {v.share_presence && (
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Seu bairro</span>
            <select name="neighborhood" defaultValue={v.neighborhood ?? ""} className={field}>
              <option value="">Escolha</option>
              {neighborhoods.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
      </fieldset>

      <button type="submit" disabled={pending} className={`${buttonPrimary} w-full ${wide ? "lg:ml-auto lg:flex lg:w-auto lg:px-10" : ""}`}>
        {pending ? "Salvando…" : submitLabel}
      </button>
      </div>
      <p role="status" className={`text-sm empty:hidden ${state.status === "saved" ? "text-success" : "text-danger"}`}>
        {state.status === "saved" ? "Salvo." : state.message}
      </p>
    </form>
  );
}
