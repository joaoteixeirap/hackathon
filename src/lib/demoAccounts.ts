// Demo accounts used by the demo login (SPEC_V2 V0). Fixed ids match supabase/seed.sql.
// None of them is an admin. The password lives only in the server env (DEMO_LOGIN_PASSWORD).

export const DEMO_PERSONAS = {
  nomad_a: { id: "00000000-0000-4000-8000-0000000000a1", email: "ana.demo@example.com", name: "Ana (Demo)", label: "nômade A" },
  nomad_b: { id: "00000000-0000-4000-8000-0000000000a2", email: "bruno.demo@example.com", name: "Bruno (Demo)", label: "nômade B" },
  partner: { id: "00000000-0000-4000-8000-0000000000a5", email: "parceiro.demo@example.com", name: "Parceiro (Demo)", label: "parceiro" },
} as const;

export type DemoPersona = keyof typeof DEMO_PERSONAS;

/** Additional fictional people for opt-in discovery; not exposed as login buttons. */
export const DEMO_PEOPLE = {
  clara: { id: "00000000-0000-4000-8000-0000000000a6", email: "clara.demo@example.com", name: "Clara (Demo)", label: "perfil Clara" },
  diego: { id: "00000000-0000-4000-8000-0000000000a7", email: "diego.demo@example.com", name: "Diego (Demo)", label: "perfil Diego" },
  emilia: { id: "00000000-0000-4000-8000-0000000000a8", email: "emilia.demo@example.com", name: "Emília (Demo)", label: "perfil Emília" },
} as const;

export function isDemoPersona(v: unknown): v is DemoPersona {
  return typeof v === "string" && Object.hasOwn(DEMO_PERSONAS, v);
}

/** Demo login is shown only when explicitly enabled (and a password exists on the server). */
export function demoLoginEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_LOGIN === "true";
}
