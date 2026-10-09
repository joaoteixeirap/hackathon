"use client";

import { useRouter } from "next/navigation";
import { useActionState, useMemo, useState } from "react";
import { saveStay, type StayFormState } from "@/app/estadia/actions";
import { buttonPrimary, field, label } from "@/components/ui/styles";
import { defaultLeave } from "@/lib/stay";
import { track } from "@/lib/track";
import { RoutineForm, type RoutineValues } from "./RoutineForm";

type City = { id: string; name: string; neighborhoods: string[] };

function todayBR(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

/**
 * E1 + S1: stay form (city, arrival, departure [+30 days], br/foreign), then the 3-screen
 * mini-onboarding (routine, interests, privacy with both switches off).
 */
export function StaySetup({ cities, defaultCityId, routine, editing = false }: { cities: City[]; defaultCityId: string | null; routine: RoutineValues; editing?: boolean }) {
  const router = useRouter();
  const today = useMemo(todayBR, []);
  const [arrive, setArrive] = useState(today);
  const [leave, setLeave] = useState(defaultLeave(today));
  const [cityId, setCityId] = useState(defaultCityId ?? cities[0]?.id ?? "");
  const [step, setStep] = useState<"stay" | "routine">("stay");
  const [audience, setAudience] = useState<"br" | "foreign">("br");
  const [state, action, pending] = useActionState<StayFormState, FormData>(async (prev, fd) => {
    const res = await saveStay(prev, fd);
    if (res.status === "saved") {
      track("stay_create", { audience: String(fd.get("audience")) });
      if (editing) router.refresh();
      else setStep("routine");
    }
    return res;
  }, { status: "idle" });

  if (step === "routine") {
    return (
      <div className="space-y-4">
        <p className="text-xs font-semibold text-muted">Passo 2 de 3 · rotina e interesses, depois privacidade</p>
        <p className="text-sm text-muted">Ajuda a sugerir gente e atividades com a sua rotina. Tudo opcional e editável no perfil.</p>
        <RoutineForm
          initial={routine}
          neighborhoods={cities.find((c) => c.id === cityId)?.neighborhoods ?? []}
          stepped
          submitLabel="Concluir"
          onSaved={() => router.refresh()}
        />
        <button type="button" onClick={() => router.refresh()} className="min-h-11 w-full text-sm font-semibold text-muted">
          Pular por agora
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {!editing && <p className="text-xs font-semibold text-muted">Passo 1 de 3 · sua estadia</p>}
      <div className="space-y-1.5">
        <label htmlFor="city_id" className={label}>
          Cidade
        </label>
        <select id="city_id" name="city_id" value={cityId} onChange={(e) => setCityId(e.target.value)} className={field}>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="arrive_on" className={label}>
            Chegada
          </label>
          <input
            id="arrive_on"
            name="arrive_on"
            type="date"
            value={arrive}
            onChange={(e) => {
              setArrive(e.target.value);
              if (e.target.value && leave <= e.target.value) setLeave(defaultLeave(e.target.value));
            }}
            className={field}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="leave_on" className={label}>
            Saída
          </label>
          <input id="leave_on" name="leave_on" type="date" value={leave} min={arrive} onChange={(e) => setLeave(e.target.value)} className={field} />
        </div>
      </div>
      <fieldset className="space-y-1.5">
        <legend className={label}>Você é</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["br", "Nômade brasileiro"],
              ["foreign", "Nômade estrangeiro"],
            ] as const
          ).map(([k, t]) => (
            <label key={k} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-2xl border px-3 text-center text-sm font-semibold ${audience === k ? "border-transparent bg-primary text-on-fill" : "border-line bg-surface"}`}>
              <input type="radio" name="audience" value={k} checked={audience === k} onChange={() => setAudience(k)} className="sr-only" />
              {t}
            </label>
          ))}
        </div>
      </fieldset>
      <button type="submit" disabled={pending} className={`${buttonPrimary} w-full`}>
        {pending ? "Salvando…" : editing ? "Salvar datas" : "Começar minha estadia"}
      </button>
      <p role="status" className="text-sm text-danger empty:hidden">
        {state.status === "error" ? state.message : null}
      </p>
    </form>
  );
}
