import { stayProgress, type Stay } from "./stay";
export const EXPENSE_CATEGORIES = { housing: "Moradia", food: "Alimentação", work: "Trabalho", transport: "Transporte", health: "Saúde", leisure: "Lazer", other: "Outros" } as const;
export type ExpenseCategory = keyof typeof EXPENSE_CATEGORIES;
export type Expense = { id: string; category: ExpenseCategory; amount_cents: number; spent_on: string; note: string | null };
export function budgetSummary(stay: Pick<Stay, "arrive_on" | "leave_on">, expenses: Expense[], monthly: number | null, today: string) {
  const progress = stayProgress(stay, today);
  const lived = progress.day;
  const recorded = expenses.filter(e => e.spent_on >= stay.arrive_on && e.spent_on <= stay.leave_on && e.spent_on <= today);
  const total = recorded.reduce((sum,e) => sum + e.amount_cents, 0);
  const proportional = monthly == null ? null : Math.round(monthly / 30 * lived);
  const categories = Object.keys(EXPENSE_CATEGORIES).map(k => ({ category: k as ExpenseCategory, total: recorded.filter(e => e.category === k).reduce((s,e) => s + e.amount_cents,0) }));
  return { total, lived, daily: lived > 0 ? Math.round(total/lived) : null, proportional, categories, fraction: proportional && proportional > 0 ? total/proportional : null };
}
