// Micro-survey (SPEC_V2 M1): one question at a time, one tap, always skippable.

export type SurveyQuestion = { key: string; title: string; options: { key: string; label: string }[] };

export const SURVEY: SurveyQuestion[] = [
  {
    key: "q_pain",
    title: "O que mais atrapalha você ao chegar numa cidade nova?",
    options: [
      { key: "wifi", label: "Internet instável, barulho ou falta de tomada" },
      { key: "friends", label: "Achar amigos compatíveis com minha rotina" },
      { key: "info", label: "Informação local desatualizada ou espalhada" },
      { key: "cost", label: "Custo e esforço de avaliar moradia, coworking e transporte" },
      { key: "community", label: "Comunidades paradas em certas cidades ou épocas" },
    ],
  },
  {
    key: "q_stay",
    title: "Quanto tempo você costuma ficar em cada cidade?",
    options: [
      { key: "lt2w", label: "Menos de 2 semanas" },
      { key: "2to4w", label: "2 a 4 semanas" },
      { key: "1to2m", label: "1 a 2 meses" },
      { key: "3mplus", label: "3 meses ou mais" },
    ],
  },
  {
    key: "q_bet",
    title: "O que ajudaria mais na sua próxima semana?",
    options: [
      { key: "work", label: "Saber onde trabalhar com internet boa" },
      { key: "people", label: "Conhecer gente que fica na cidade no mesmo período" },
      { key: "week", label: "Ter tudo da semana num lugar só" },
    ],
  },
];

export function isValidAnswer(questionKey: unknown, answerKey: unknown): boolean {
  const q = SURVEY.find((s) => s.key === questionKey);
  return Boolean(q?.options.some((o) => o.key === answerKey));
}

/** Next unanswered question, or null when done. */
export function nextQuestion(answered: string[]): SurveyQuestion | null {
  return SURVEY.find((q) => !answered.includes(q.key)) ?? null;
}
