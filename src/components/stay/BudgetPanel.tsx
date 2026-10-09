"use client";
import { useActionState, useEffect, useState, useTransition } from "react";
import { addExpense, removeExpense, saveBudget, type StayFormState } from "@/app/estadia/actions";
import { budgetSummary, EXPENSE_CATEGORIES, type Expense } from "@/lib/budget";
import { formatBRL } from "@/lib/activityForm";
import type { Stay } from "@/lib/stay";
import { todayInBrasilia } from "@/lib/offers";
import { buttonPrimary, buttonSecondary, field, label } from "@/components/ui/styles";
import { track } from "@/lib/track";
export function BudgetBar({ stay, expenses, monthly, today }: { stay: Pick<Stay,"arrive_on"|"leave_on">; expenses: Expense[]; monthly: number|null; today: string }) {
  const s=budgetSummary(stay,expenses,monthly,today);
  return <div className="space-y-2"><p className="font-semibold tabular-nums">Gasto registrado: {formatBRL(s.total)}</p><p className="text-sm text-muted">{s.daily == null ? "Sua estadia ainda não começou." : `Média registrada por dia: ${formatBRL(s.daily)}`}</p>{s.proportional != null ? <><p className="text-sm">Orçamento proporcional a {s.lived} dias: {formatBRL(s.proportional)}</p><div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label="Uso do orçamento" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round((s.fraction ?? 0)*100))}><div className={`h-full ${s.total > s.proportional ? "bg-danger" : "bg-primary"}`} style={{width:`${Math.min(100,(s.fraction ?? 0)*100)}%`}} /></div>{s.total > s.proportional && <p className="text-sm text-danger">Gastos acima do orçamento proporcional.</p>}</> : <p className="text-sm text-muted">Defina seu orçamento mensal na aba Gastos.</p>}</div>;
}
export function BudgetPanel({ stay, expenses, monthly }: { stay: Stay; expenses: Expense[]; monthly: number|null }) {
  const [budget, budgetAction, budgetPending]=useActionState<StayFormState,FormData>(saveBudget.bind(null,stay.id),{status:"idle"});
  const [state, expenseAction, pending]=useActionState<StayFormState,FormData>(addExpense.bind(null,stay.id),{status:"idle"});
  useEffect(() => { if(state.status === "saved") track("budget_add",{}); },[state]);
  const [removing,run]=useTransition(); const [error,setError]=useState("");
  const today=todayInBrasilia(); const s=budgetSummary(stay,expenses,monthly,today);
  return <div className="space-y-5"><BudgetBar stay={stay} expenses={expenses} monthly={monthly} today={today}/><p className="text-xs text-muted">Só os valores que você informa. Privado; mês de referência de 30 dias, sem preços estimados.</p>
    <form action={budgetAction} className="space-y-2"><label className={label}>Orçamento mensal (R$)<input name="monthly" inputMode="decimal" defaultValue={monthly == null ? "" : (monthly/100).toFixed(2).replace(".",",")} className={field} /></label><button disabled={budgetPending} className={buttonSecondary}>Salvar orçamento</button><p role="status" className="text-sm">{budget.status === "saved" ? "Orçamento salvo." : budget.message}</p></form>
    <h2 className="font-display text-xl font-bold">Registrar gasto</h2>
    <form action={expenseAction} className="space-y-3">
      <label className={label}>Categoria<select name="category" className={field}>{Object.entries(EXPENSE_CATEGORIES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
      <label className={label}>Valor (R$)<input name="amount" inputMode="decimal" required className={field}/></label>
      <label className={label}>Data do gasto<input name="spent_on" type="date" min={stay.arrive_on} max={stay.leave_on} defaultValue={today < stay.arrive_on ? stay.arrive_on : today > stay.leave_on ? stay.leave_on : today} required className={field}/></label>
      <label className={label}>Nota (opcional)<input name="note" maxLength={80} className={field}/></label><button disabled={pending} className={buttonPrimary}>Registrar gasto</button><p role="status" className="text-sm">{state.status === "saved" ? "Gasto registrado." : state.message}</p>
    </form>
    <h2 className="font-display text-xl font-bold">Por categoria</h2><ul className="text-sm">{s.categories.map(c=><li key={c.category} className="flex justify-between py-1"><span>{EXPENSE_CATEGORIES[c.category]}</span><span>{formatBRL(c.total)}</span></li>)}</ul>
    <h2 className="font-display text-xl font-bold">Registros</h2>{expenses.length ? <ul>{expenses.map(e=><li key={e.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-line py-2 text-sm"><span>{EXPENSE_CATEGORIES[e.category]} · {formatBRL(e.amount_cents)} · {e.spent_on}{e.note ? ` · ${e.note}` : ""}</span><button disabled={removing} className={buttonSecondary} onClick={()=>run(async()=>{const r=await removeExpense(e.id);if(!r.ok)setError(r.message);})}>Excluir gasto</button></li>)}</ul> : <p className="text-sm text-muted">Nenhum gasto registrado.</p>}<p role="status" className="text-danger">{error}</p>
  </div>;
}
