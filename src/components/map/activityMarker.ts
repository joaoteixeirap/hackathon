// DOM markers for activities ("rodas", DESIGN.md §5): a small pin inside a pulsing sol ring.
import { createElement, Landmark, Laptop, Mountain, Ship, Users, Utensils, type IconNode } from "lucide";
import type { ActivityCategory, ActivitySummary } from "@/lib/places";

const ACTIVITY_ICONS: Record<ActivityCategory, IconNode> = {
  meetup: Users,
  work_together: Laptop,
  food: Utensils,
  outdoor: Mountain,
  culture: Landmark,
  tour: Ship,
};

const DAY_MS = 86_400_000;

export type RingState = "pulse" | "live" | "idle";

/** Pulses during the 24 h before start; solid while it is happening. */
export function ringState(a: Pick<ActivitySummary, "starts_at" | "ends_at">, now = Date.now()): RingState {
  const start = new Date(a.starts_at).getTime();
  const end = new Date(a.ends_at).getTime();
  if (now >= start && now < end) return "live";
  if (start > now && start - now <= DAY_MS) return "pulse";
  return "idle";
}

export function formatHour(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}

export function formatDayShort(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const fmt = (x: Date) => x.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  if (fmt(d) === fmt(now)) return "hoje";
  if (fmt(d) === fmt(new Date(now.getTime() + DAY_MS))) return "amanhã";
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", timeZone: "America/Sao_Paulo" }).replace(".", "");
}

export function createActivityMarker(a: ActivitySummary, onSelect: (id: string) => void): HTMLElement {
  const root = document.createElement("button");
  root.type = "button";
  root.className = `roda roda--${ringState(a)}`;
  root.setAttribute("aria-label", `Atividade: ${a.title}, ${formatDayShort(a.starts_at)} às ${formatHour(a.starts_at)}`);

  const ring = document.createElement("span");
  ring.className = "roda__ring";
  const core = document.createElement("span");
  core.className = "roda__core";
  const icon = createElement(ACTIVITY_ICONS[a.category]);
  icon.setAttribute("width", "14");
  icon.setAttribute("height", "14");
  icon.setAttribute("stroke-width", "2.25");
  icon.setAttribute("aria-hidden", "true");
  core.appendChild(icon);

  const label = document.createElement("span");
  label.className = "roda__label";
  const time = document.createElement("span");
  time.className = "roda__time";
  time.textContent = `${formatDayShort(a.starts_at)} ${formatHour(a.starts_at)}`;
  const title = document.createElement("span");
  title.className = "roda__title";
  title.textContent = a.title.replace(/\s*\(Demo\)\s*$/, "");
  label.append(time, title);

  root.append(ring, core, label);
  root.addEventListener("click", (e) => {
    e.stopPropagation();
    onSelect(a.id);
  });
  return root;
}
