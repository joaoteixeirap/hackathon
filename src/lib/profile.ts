export type ProfileInput = {
  display_name: string;
  bio: string | null;
  home_country: string;
  languages: string[];
  current_city_id: string | null;
  stay_from: string | null;
  stay_to: string | null;
  neighborhood: string | null;
  share_presence: boolean;
};

export type ProfileErrors = Partial<Record<keyof ProfileInput, string>>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const text = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const optional = (v: string) => (v === "" ? null : v);

/** Validates the profile form on the server. Never trust the client. */
export function parseProfileForm(
  form: FormData,
): { ok: true; data: ProfileInput } | { ok: false; errors: ProfileErrors } {
  const errors: ProfileErrors = {};

  const display_name = text(form.get("display_name"));
  if (display_name.length < 1 || display_name.length > 60) {
    errors.display_name = "Use de 1 a 60 caracteres.";
  }

  const bio = optional(text(form.get("bio")));
  if (bio && bio.length > 280) errors.bio = "A bio tem no máximo 280 caracteres.";

  const home_country = text(form.get("home_country")).toUpperCase() || "BR";
  if (!/^[A-Z]{2}$/.test(home_country)) errors.home_country = "Use o código de 2 letras (ex.: BR).";

  const languages = Array.from(
    new Set(
      text(form.get("languages"))
        .toLowerCase()
        .split(/[,\s]+/)
        .filter(Boolean),
    ),
  );
  if (languages.length > 8 || languages.some((l) => !/^[a-z]{2,3}$/.test(l))) {
    errors.languages = "Use códigos como pt, en, es, separados por vírgula.";
  }

  const current_city_id = optional(text(form.get("current_city_id")));
  if (current_city_id && !UUID_RE.test(current_city_id)) errors.current_city_id = "Cidade inválida.";

  const stay_from = optional(text(form.get("stay_from")));
  const stay_to = optional(text(form.get("stay_to")));
  if (stay_from && !DATE_RE.test(stay_from)) errors.stay_from = "Data inválida.";
  if (stay_to && !DATE_RE.test(stay_to)) errors.stay_to = "Data inválida.";
  if (stay_from && stay_to && stay_to < stay_from) errors.stay_to = "A saída deve ser depois da chegada.";

  const neighborhood = optional(text(form.get("neighborhood")).replace(/\s+/g, " "));
  if (neighborhood && neighborhood.length > 60) errors.neighborhood = "Use até 60 caracteres.";

  const share_presence = form.get("share_presence") === "on";
  if (share_presence && (!current_city_id || !neighborhood)) {
    errors.share_presence = "Para aparecer na contagem, informe cidade e bairro.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      display_name,
      bio,
      home_country,
      languages: languages.length ? languages : ["pt"],
      current_city_id,
      stay_from,
      stay_to,
      neighborhood,
      share_presence,
    },
  };
}
