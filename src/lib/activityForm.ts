import { isInsideBBox, type BBox } from "./geo";
import type { ActivityCategory } from "./places";

export const ACTIVITY_CATEGORIES: ActivityCategory[] = ["meetup", "work_together", "food", "outdoor", "culture", "tour"];

/** Pilot cities are all in Brasília time (no DST since 2019). */
export const CITY_UTC_OFFSET = "-03:00";

export type ActivityInput = {
  title: string;
  description: string | null;
  category: ActivityCategory;
  starts_at: string; // ISO
  ends_at: string; // ISO
  meeting_lat: number;
  meeting_lng: number;
  meeting_label: string | null;
  place_id: string | null;
  capacity: number;
  cost_total_cents: number | null;
  split_cost: boolean;
};

export type ActivityErrors = Partial<Record<"title" | "description" | "category" | "date" | "time" | "duration" | "location" | "meeting_label" | "capacity" | "cost", string>>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text = (v: FormDataEntryValue | null) => String(v ?? "").trim();

/** "120", "120,50", "1.200,50" → cents. Returns NaN when invalid. */
export function parseBRL(raw: string): number {
  const cleaned = raw.replace(/R\$\s?/i, "").replace(/\s/g, "");
  if (!cleaned) return NaN;
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(cleaned)) return NaN;
  const [int, dec = ""] = cleaned.replace(/\./g, "").split(",");
  return Number(int) * 100 + Number(dec.padEnd(2, "0"));
}

export function parseActivityForm(
  form: FormData,
  ctx: { bbox: BBox; now?: Date },
): { ok: true; data: ActivityInput } | { ok: false; errors: ActivityErrors } {
  const errors: ActivityErrors = {};
  const now = ctx.now ?? new Date();

  const title = text(form.get("title"));
  if (title.length < 3 || title.length > 80) errors.title = "Use de 3 a 80 caracteres.";

  const description = text(form.get("description")) || null;
  if (description && description.length > 1000) errors.description = "Até 1000 caracteres.";

  const category = text(form.get("category")) as ActivityCategory;
  if (!ACTIVITY_CATEGORIES.includes(category)) errors.category = "Escolha um tipo.";

  const date = text(form.get("date"));
  const time = text(form.get("time"));
  let starts: Date | null = null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.date = "Escolha o dia.";
  if (!/^\d{2}:\d{2}$/.test(time)) errors.time = "Escolha o horário.";
  if (!errors.date && !errors.time) {
    starts = new Date(`${date}T${time}:00${CITY_UTC_OFFSET}`);
    if (Number.isNaN(starts.getTime())) errors.date = "Data inválida.";
    else if (starts.getTime() < now.getTime() + 15 * 60_000) errors.time = "Marque para daqui a pelo menos 15 minutos.";
    else if (starts.getTime() > now.getTime() + 90 * 86_400_000) errors.date = "Marque para os próximos 90 dias.";
  }

  const duration = Number(text(form.get("duration")).replace(",", "."));
  if (!(duration >= 0.5 && duration <= 12)) errors.duration = "Entre 30 min e 12 h.";

  const lat = Number(text(form.get("lat")));
  const lng = Number(text(form.get("lng")));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || text(form.get("lat")) === "") {
    errors.location = "Toque no mapa para marcar o ponto de encontro.";
  } else if (!isInsideBBox({ lat, lng }, ctx.bbox)) {
    errors.location = "O ponto de encontro precisa ficar dentro da cidade.";
  }

  const meeting_label = text(form.get("meeting_label")) || null;
  if (meeting_label && meeting_label.length > 120) errors.meeting_label = "Até 120 caracteres.";

  const placeRaw = text(form.get("place_id"));
  const place_id = UUID_RE.test(placeRaw) ? placeRaw : null;

  const capacity = Number(text(form.get("capacity")));
  if (!Number.isInteger(capacity) || capacity < 2 || capacity > 30) errors.capacity = "De 2 a 30 pessoas (contando você).";

  const costRaw = text(form.get("cost"));
  let cost_total_cents: number | null = null;
  if (costRaw) {
    const cents = parseBRL(costRaw);
    if (Number.isNaN(cents) || cents < 0 || cents > 10_000_000) errors.cost = "Valor inválido. Ex.: 120,00";
    else cost_total_cents = cents;
  }
  const split_cost = cost_total_cents != null && cost_total_cents > 0 && form.get("split_cost") === "on";

  if (Object.keys(errors).length > 0 || !starts) return { ok: false, errors };
  return {
    ok: true,
    data: {
      title,
      description,
      category,
      starts_at: starts.toISOString(),
      ends_at: new Date(starts.getTime() + duration * 3_600_000).toISOString(),
      meeting_lat: lat,
      meeting_lng: lng,
      meeting_label,
      place_id,
      capacity,
      cost_total_cents,
      split_cost,
    },
  };
}

/** "R$ X por pessoa" (F6): total split among approved members plus the creator. */
export function costPerPerson(totalCents: number, approvedMembers: number): number {
  return Math.ceil(totalCents / (approvedMembers + 1));
}

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
