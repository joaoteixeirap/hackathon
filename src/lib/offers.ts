export const OFFER_KINDS = ["discount", "day_pass", "slot", "package", "consult"] as const;
export type OfferKind = (typeof OFFER_KINDS)[number];

export const OFFER_LABELS: Record<OfferKind, string> = {
  discount: "Desconto",
  day_pass: "Diária",
  slot: "Horário ocioso",
  package: "Pacote",
  consult: "Consulta",
};

/** Public part of an offer (the code is only revealed on redemption). */
export type PublicOffer = {
  id: string;
  kind: OfferKind;
  title: string;
  description: string | null;
  valid_to: string | null;
  capacity: number | null;
};

export type OfferInput = {
  kind: OfferKind;
  title: string;
  description: string | null;
  code: string;
  valid_from: string;
  valid_to: string | null;
  capacity: number | null;
};

export type OfferErrors = Partial<Record<"kind" | "title" | "description" | "code" | "valid_to" | "capacity", string>>;

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I

/** Short code that is easy to read aloud at the counter. */
export function generateOfferCode(random: () => number = Math.random): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  return s;
}

const text = (v: FormDataEntryValue | null) => String(v ?? "").trim();

export function parseOfferForm(form: FormData, today: string): { ok: true; data: OfferInput } | { ok: false; errors: OfferErrors } {
  const errors: OfferErrors = {};

  const kind = text(form.get("kind")) as OfferKind;
  if (!OFFER_KINDS.includes(kind)) errors.kind = "Escolha um tipo.";

  const title = text(form.get("title"));
  if (title.length < 3 || title.length > 80) errors.title = "Use de 3 a 80 caracteres.";

  const description = text(form.get("description")) || null;
  if (description && description.length > 300) errors.description = "Até 300 caracteres.";

  const code = (text(form.get("code")) || generateOfferCode()).toUpperCase();
  if (!/^[A-Z0-9-]{3,20}$/.test(code)) errors.code = "De 3 a 20 letras, números ou hífen.";

  const validTo = text(form.get("valid_to")) || null;
  if (validTo && (!/^\d{4}-\d{2}-\d{2}$/.test(validTo) || validTo < today)) errors.valid_to = "Escolha hoje ou uma data futura.";

  const capRaw = text(form.get("capacity"));
  const capacity = capRaw ? Number(capRaw) : null;
  if (capacity != null && !(Number.isInteger(capacity) && capacity >= 1 && capacity <= 10_000)) errors.capacity = "Um número de 1 a 10000.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { kind, title, description, code, valid_from: today, valid_to: validTo, capacity } };
}

/** Postgres exceptions from redeem_offer → interface text. */
export function redeemErrorMessage(raw: string | undefined): string {
  const m = raw ?? "";
  if (/already redeemed today/.test(m)) return "Você já usou esta oferta hoje. Volte amanhã.";
  if (/sold out/.test(m)) return "As vagas desta oferta acabaram.";
  if (/not available/.test(m)) return "Esta oferta não está mais disponível.";
  if (/verification pending/.test(m)) return "Sua verificação ainda está pendente.";
  return "Não foi possível usar a oferta agora. Tente de novo.";
}

/** "YYYY-MM-DD" in Brasília time. */
export function todayInBrasilia(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

/** Example price shown next to the simulated "Destacar no mapa" button (hypothesis, SPEC). */
export const FEATURE_PRICE_CENTS = 4900;
