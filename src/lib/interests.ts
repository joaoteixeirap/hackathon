// Routine profile (SPEC_V2 S1): fixed lists, ids in English, labels in pt-BR.

export const INTERESTS = {
  deep_work: "Trabalho focado",
  tech: "Tecnologia e startups",
  design: "Design e criatividade",
  marketing: "Marketing e conteúdo",
  outdoors: "Ar livre",
  surf: "Surf",
  running: "Corrida e trilha",
  wellness: "Yoga e bem-estar",
  food: "Gastronomia",
  coffee: "Cafés",
  music: "Música",
  art: "Arte e cultura",
  languages: "Idiomas",
  photo: "Fotografia",
  entrepreneur: "Empreendedorismo",
  finance: "Finanças",
  pets: "Pets",
  traveling_family: "Família viajando",
  nightlife: "Vida noturna",
  volunteer: "Voluntariado",
} as const;
export type Interest = keyof typeof INTERESTS;
export const MAX_INTERESTS = 6;

export const WORK_RHYTHMS = { morning: "Manhã", afternoon: "Tarde", evening: "Noite", flexible: "Flexível" } as const;
export type WorkRhythm = keyof typeof WORK_RHYTHMS;

export const WORK_STYLES = { focus: "Foco, pouca conversa", calls: "Muitas chamadas", mixed: "Misto" } as const;
export type WorkStyle = keyof typeof WORK_STYLES;

export const SOCIAL_GOALS = { friends: "Fazer amigos", cowork: "Trabalhar junto", networking: "Networking", outdoor: "Programas ao ar livre" } as const;
export type SocialGoal = keyof typeof SOCIAL_GOALS;

const isKey = <T extends object>(obj: T, v: unknown): v is keyof T => typeof v === "string" && Object.hasOwn(obj, v);

export type RoutineInput = { work_rhythm: WorkRhythm; work_style: WorkStyle; interests: Interest[]; social_goals: SocialGoal[] };

/** Validates the routine form; unknown ids are dropped, interests capped at 6. */
export function parseRoutine(form: FormData): { ok: true; data: RoutineInput } | { ok: false; message: string } {
  const rhythm = form.get("work_rhythm");
  const style = form.get("work_style");
  if (!isKey(WORK_RHYTHMS, rhythm) || !isKey(WORK_STYLES, style)) return { ok: false, message: "Escolha ritmo e estilo de trabalho." };
  const interests = [...new Set(form.getAll("interests"))].filter((v): v is Interest => isKey(INTERESTS, v));
  if (interests.length > MAX_INTERESTS) return { ok: false, message: `Escolha até ${MAX_INTERESTS} interesses.` };
  const goals = [...new Set(form.getAll("social_goals"))].filter((v): v is SocialGoal => isKey(SOCIAL_GOALS, v));
  return { ok: true, data: { work_rhythm: rhythm, work_style: style, interests, social_goals: goals } };
}
