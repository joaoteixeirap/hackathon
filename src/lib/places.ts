// Shared place/activity types, category config and pure filtering (F1, F2).
import { isSealActive, type FactMeta } from "./trust";

export type PlaceCategory = "work" | "eat" | "health" | "stay" | "tour" | "service";
export type ChipKey = PlaceCategory | "activities";

export type PlaceSummary = {
  id: string;
  name: string;
  category: PlaceCategory;
  subcategory: string | null;
  lat: number;
  lng: number;
  neighborhood: string | null;
  address: string | null;
  opening_hours: string | null;
  wifi_mbps: number | null;
  wifi_source: "osm" | "partner" | "user_test" | null;
  has_power_outlets: boolean | null;
  quiet_level: number | null;
  price_hint: string | null;
  accepts_without_plan: boolean | null;
  languages: string[] | null;
  wheelchair: "yes" | "no" | "limited" | null;
  /** Seals with validity (SPEC_V2 R3): read through isSealActive / isCallReady, never a boolean. */
  seal_valid_until: string | null;
  call_ready_valid_until: string | null;
  last_verified_at: string | null;
  /** facts_meta.wifi only, for freshness on the map; the full facts load with the card. */
  wifi_fact: FactMeta | null;
  featured: boolean;
  offers: number;
  is_demo: boolean;
};

export type ActivityCategory = "meetup" | "work_together" | "food" | "outdoor" | "culture" | "tour";

export type ActivitySummary = {
  id: string;
  title: string;
  category: ActivityCategory;
  starts_at: string;
  ends_at: string;
  lat: number;
  lng: number;
  meeting_label: string | null;
  capacity: number;
  status: "open" | "full";
  is_demo: boolean;
};

/** Hypothesis (SPEC F1): "Wi-Fi forte" threshold in Mbps. */
export const WIFI_STRONG_MBPS = 25;

export const CATEGORIES: Record<PlaceCategory, { label: string; color: string; icon: string }> = {
  work: { label: "Trabalhar", color: "mare", icon: "Laptop" },
  eat: { label: "Comer", color: "coral", icon: "Utensils" },
  health: { label: "Saúde", color: "farmacia", icon: "HeartPulse" },
  stay: { label: "Morar", color: "anil", icon: "Bed" },
  tour: { label: "Passeios", color: "ameixa", icon: "Compass" },
  service: { label: "Serviços", color: "grafite", icon: "Wrench" },
};

export const CHIP_ORDER: ChipKey[] = ["work", "eat", "health", "stay", "tour", "service", "activities"];

export const ACTIVITY_LABELS: Record<ActivityCategory, string> = {
  meetup: "Encontro",
  work_together: "Trabalho conjunto",
  food: "Comida",
  outdoor: "Ao ar livre",
  culture: "Cultura",
  tour: "Passeio",
};

export const SUBCATEGORY_LABELS: Record<string, string> = {
  cafe: "Café",
  restaurant: "Restaurante",
  fast_food: "Lanchonete",
  bar: "Bar",
  coworking: "Coworking",
  library: "Biblioteca",
  clinic: "Clínica",
  doctors: "Consultório",
  hospital: "Hospital",
  pharmacy: "Farmácia",
  dentist: "Dentista",
  lab: "Laboratório",
  hostel: "Hostel",
  guest_house: "Pousada",
  apartment: "Apartamento",
  hotel: "Hotel",
  attraction: "Atração",
  viewpoint: "Mirante",
  museum: "Museu",
  beach_resort: "Praia",
  laundry: "Lavanderia",
  bicycle_rental: "Aluguel de bike",
  post_office: "Correios",
};

export function subcategoryLabel(p: Pick<PlaceSummary, "category" | "subcategory">): string {
  return (p.subcategory && SUBCATEGORY_LABELS[p.subcategory]) || CATEGORIES[p.category].label;
}

export type PlaceFilters = {
  category: PlaceCategory | null;
  query: string;
  wifiStrong: boolean;
  openNow: boolean;
  hasOffer: boolean;
  seal: boolean;
};

export const EMPTY_FILTERS: PlaceFilters = {
  category: null,
  query: "",
  wifiStrong: false,
  openNow: false,
  hasOffer: false,
  seal: false,
};

/** Case- and accent-insensitive text normalization for client search. */
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

/**
 * Applies chips, search and toggles. `isOpen` is injected (opening_hours.js is loaded lazily);
 * places whose hours cannot be interpreted are excluded by "Aberto agora".
 */
export function filterPlaces(
  places: PlaceSummary[],
  f: PlaceFilters,
  isOpen?: (p: PlaceSummary) => boolean | null,
): PlaceSummary[] {
  const q = normalize(f.query);
  return places.filter((p) => {
    if (f.category && p.category !== f.category) return false;
    if (q && !normalize(`${p.name} ${p.neighborhood ?? ""}`).includes(q)) return false;
    if (f.wifiStrong && !(p.wifi_mbps != null && p.wifi_mbps >= WIFI_STRONG_MBPS)) return false;
    if (f.hasOffer && p.offers === 0) return false;
    if (f.seal && !isSealActive(p)) return false;
    if (f.openNow && isOpen && isOpen(p) !== true) return false;
    return true;
  });
}

export function filterActivities(activities: ActivitySummary[], query: string): ActivitySummary[] {
  const q = normalize(query);
  if (!q) return activities;
  return activities.filter((a) => normalize(`${a.title} ${a.meeting_label ?? ""}`).includes(q));
}

export function activeFilterCount(f: PlaceFilters): number {
  return [f.wifiStrong, f.openNow, f.hasOffer, f.seal].filter(Boolean).length;
}

/** Demo titles end in "(Demo)"; the UI shows a DemoTag instead. */
export const stripDemo = (title: string) => title.replace(/\s*\(Demo\)\s*$/, "");
