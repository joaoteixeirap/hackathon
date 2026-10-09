// Stay helpers (SPEC_V2 E1/E2). Pure functions.
import { DEFAULT_STAY_DAYS } from "@/config/nomad";

export type Stay = { id: string; city_id: string; arrive_on: string; leave_on: string; audience: "br" | "foreign"; active: boolean };
export type StayTask = {
  id: string;
  template_id: string | null;
  title: string;
  area: string;
  phase: Phase;
  due_on: string | null;
  done: boolean;
};
export type Phase = "before" | "first_week" | "first_month" | "ongoing" | "before_leaving";

export const PHASE_LABEL: Record<Phase, string> = {
  before: "Antes de chegar",
  first_week: "Primeira semana",
  first_month: "Primeiro mês",
  ongoing: "Durante a estadia",
  before_leaving: "Antes de sair",
};
export const PHASE_ORDER: Phase[] = ["before", "first_week", "first_month", "ongoing", "before_leaving"];

const DAY_MS = 86_400_000;
const utcDay = (d: string) => Date.parse(`${d}T00:00:00Z`);

/** "Dia 12 de 45": day number (1-based, clamped) and total days of the stay. */
export function stayProgress(stay: Pick<Stay, "arrive_on" | "leave_on">, today: string): { day: number; total: number; fraction: number; status: "before" | "during" | "after" } {
  const total = Math.round((utcDay(stay.leave_on) - utcDay(stay.arrive_on)) / DAY_MS) + 1;
  const raw = Math.round((utcDay(today) - utcDay(stay.arrive_on)) / DAY_MS) + 1;
  const status = raw < 1 ? "before" : raw > total ? "after" : "during";
  const day = Math.min(Math.max(raw, 0), total);
  return { day, total, fraction: total > 0 ? Math.min(1, Math.max(0, day / total)) : 0, status };
}

export function defaultLeave(arrive: string): string {
  return new Date(utcDay(arrive) + DEFAULT_STAY_DAYS * DAY_MS).toISOString().slice(0, 10);
}

export function parseStayForm(form: FormData, today: string): { ok: true; data: { city_id: string; arrive_on: string; leave_on: string; audience: "br" | "foreign" } } | { ok: false; message: string } {
  const city = String(form.get("city_id") ?? "");
  const arrive = String(form.get("arrive_on") ?? "");
  const leave = String(form.get("leave_on") ?? "");
  const audience = String(form.get("audience") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(city)) return { ok: false, message: "Escolha a cidade." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(arrive) || !/^\d{4}-\d{2}-\d{2}$/.test(leave)) return { ok: false, message: "Informe chegada e saída." };
  if (leave < arrive) return { ok: false, message: "A saída precisa ser depois da chegada." };
  if ((utcDay(leave) - utcDay(arrive)) / DAY_MS > 366) return { ok: false, message: "Estadias de até um ano." };
  if (leave < today) return { ok: false, message: "Essa estadia já terminou. Ajuste a saída." };
  if (audience !== "br" && audience !== "foreign") return { ok: false, message: "Escolha seu perfil." };
  return { ok: true, data: { city_id: city, arrive_on: arrive, leave_on: leave, audience } };
}

/** Pending tasks first by phase order, then the rest; used by "Hoje" (top 3). */
export function pendingTasks(tasks: StayTask[]): StayTask[] {
  return tasks
    .filter((t) => !t.done)
    .sort((a, b) => PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase) || (a.due_on ?? "9999").localeCompare(b.due_on ?? "9999"));
}
