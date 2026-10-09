import { isInsideBBox, type BBox } from "./geo";
import type { PlaceCategory } from "./places";

export const PLACE_CATEGORIES: PlaceCategory[] = ["work", "eat", "health", "stay", "tour", "service"];

export type PlaceInput = {
  name: string;
  category: PlaceCategory;
  lat: number;
  lng: number;
  address: string | null;
  neighborhood: string | null;
  description: string | null;
};
export type PlaceErrors = Partial<Record<"name" | "category" | "location" | "address" | "neighborhood" | "description", string>>;

export type PartnerInput = { business_name: string; document_type: "cnpj" | "mei" | null; document_number: string | null };
export type PartnerErrors = Partial<Record<keyof PartnerInput, string>>;

const text = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const opt = (v: FormDataEntryValue | null, max: number) => {
  const s = text(v);
  return s ? s.slice(0, max + 1) : null;
};

export function parsePlaceForm(form: FormData, bbox: BBox): { ok: true; data: PlaceInput } | { ok: false; errors: PlaceErrors } {
  const errors: PlaceErrors = {};
  const name = text(form.get("name"));
  if (name.length < 2 || name.length > 120) errors.name = "Use de 2 a 120 caracteres.";
  const category = text(form.get("category")) as PlaceCategory;
  if (!PLACE_CATEGORIES.includes(category)) errors.category = "Escolha uma categoria.";
  const lat = Number(text(form.get("lat")));
  const lng = Number(text(form.get("lng")));
  if (!text(form.get("lat")) || !Number.isFinite(lat) || !Number.isFinite(lng)) errors.location = "Marque o lugar no mapa.";
  else if (!isInsideBBox({ lat, lng }, bbox)) errors.location = "O lugar precisa ficar dentro da cidade.";
  const address = opt(form.get("address"), 200);
  if (address && address.length > 200) errors.address = "Até 200 caracteres.";
  const neighborhood = opt(form.get("neighborhood"), 80);
  if (neighborhood && neighborhood.length > 80) errors.neighborhood = "Até 80 caracteres.";
  const description = opt(form.get("description"), 500);
  if (description && description.length > 500) errors.description = "Até 500 caracteres.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { name, category, lat, lng, address, neighborhood, description } };
}

/** Business sign-up (F10). The document number is optional in the MVP; only digits are kept. */
export function parsePartnerForm(form: FormData): { ok: true; data: PartnerInput } | { ok: false; errors: PartnerErrors } {
  const errors: PartnerErrors = {};
  const business_name = text(form.get("business_name"));
  if (business_name.length < 2 || business_name.length > 120) errors.business_name = "Use de 2 a 120 caracteres.";
  const typeRaw = text(form.get("document_type"));
  const document_type = typeRaw === "cnpj" || typeRaw === "mei" ? typeRaw : null;
  if (typeRaw && !document_type) errors.document_type = "Escolha CNPJ ou MEI.";
  const digits = text(form.get("document_number")).replace(/\D/g, "");
  const document_number = digits || null;
  if (document_number && document_number.length !== 14) errors.document_number = "O CNPJ (também do MEI) tem 14 dígitos.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { business_name, document_type, document_number } };
}
