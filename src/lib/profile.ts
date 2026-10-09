// Identity part of the profile. City, stay dates and neighborhood belong to the stay
// (set_stay, SPEC_V2 E1); presence and discovery switches to the routine form (S1).
export type ProfileInput = {
  display_name: string;
  bio: string | null;
  home_country: string;
  languages: string[];
};

export type ProfileErrors = Partial<Record<keyof ProfileInput, string>>;

const text = (v: FormDataEntryValue | null) => String(v ?? "").trim();

/** Validates the profile form on the server. Never trust the client. */
export function parseProfileForm(form: FormData): { ok: true; data: ProfileInput } | { ok: false; errors: ProfileErrors } {
  const errors: ProfileErrors = {};

  const display_name = text(form.get("display_name"));
  if (display_name.length < 1 || display_name.length > 60) errors.display_name = "Use de 1 a 60 caracteres.";

  const bioRaw = text(form.get("bio"));
  const bio = bioRaw === "" ? null : bioRaw;
  if (bio && bio.length > 280) errors.bio = "A bio tem no máximo 280 caracteres.";

  const home_country = text(form.get("home_country")).toUpperCase() || "BR";
  if (!/^[A-Z]{2}$/.test(home_country)) errors.home_country = "Use o código de 2 letras (ex.: BR).";

  const languages = Array.from(new Set(text(form.get("languages")).toLowerCase().split(/[,\s]+/).filter(Boolean)));
  if (languages.length > 8 || languages.some((l) => !/^[a-z]{2,3}$/.test(l))) {
    errors.languages = "Use códigos como pt, en, es, separados por vírgula.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { display_name, bio, home_country, languages: languages.length ? languages : ["pt"] } };
}
