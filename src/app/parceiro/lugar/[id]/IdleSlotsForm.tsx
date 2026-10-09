"use client";
import { useActionState, useState, useTransition } from "react";
import { createIdleSlot, removeIdleSlot, type FormState } from "../../actions";
import { buttonPrimary, buttonSecondary, field, label } from "@/components/ui/styles";
import { hourLabel, WEEKDAY_LABEL } from "@/lib/series";
import type { IdleSlot } from "@/lib/journey";
export function IdleSlotsForm({ placeId, slots }: { placeId: string; slots: IdleSlot[] }) {
  const [state, action, saving] = useActionState<FormState<never>, FormData>(createIdleSlot.bind(null, placeId), { status: "idle" });
  const [pending, run] = useTransition();
  const [error, setError] = useState("");
  return <div className="space-y-4"><ul>{slots.map(s => <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"><span>{WEEKDAY_LABEL[s.weekday]} {hourLabel(s.start_time)}–{hourLabel(s.end_time)} · {s.seats ?? "sem limite informado"}</span><button type="button" className={buttonSecondary} disabled={pending} onClick={() => run(async () => { const r = await removeIdleSlot(placeId, s.id); if (!r.ok) setError(r.message); })}>Remover horário</button></li>)}</ul>
    <form action={action} className="grid grid-cols-2 gap-3">
      <label className={label}>Dia da semana<select name="weekday" className={field}>{WEEKDAY_LABEL.map((d,i) => <option key={d} value={i}>{d}</option>)}</select></label>
      <label className={label}>Lugares disponíveis<input name="seats" type="number" min={1} max={100} className={field} /></label>
      <label className={label}>Início<input name="start_time" type="time" defaultValue="14:00" required className={field} /></label>
      <label className={label}>Fim<input name="end_time" type="time" defaultValue="17:00" required className={field} /></label>
      <label className={`${label} col-span-2`}>Observação<input name="note" maxLength={120} className={field} /></label>
      <button className={`${buttonPrimary} col-span-2`} disabled={saving}>Adicionar horário</button>
      <p role="status" className="col-span-2 text-sm">{error || state.message || (state.status === "saved" ? "Horário salvo." : "")}</p>
    </form>
  </div>;
}
