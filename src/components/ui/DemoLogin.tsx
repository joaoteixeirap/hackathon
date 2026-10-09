"use client";

import { ChevronRight } from "lucide-react";
import { useState, useTransition } from "react";
import { signInAsDemo } from "@/app/entrar/actions";
import { DemoTag } from "@/components/ui/DemoTag";
import { buttonSecondary } from "@/components/ui/styles";
import { DEMO_PERSONAS, type DemoPersona } from "@/lib/demoAccounts";

/** Short role line for each persona card (the `tiles` variant). */
const ROLE: Record<DemoPersona, string> = {
  nomad_a: "Nômade · conta A",
  nomad_b: "Nômade · conta B",
  partner: "Parceiro · tem um lugar no mapa",
};

/**
 * "Entrar como nômade A / nômade B / parceiro" (demo accounts, never admin).
 * `tiles`: one card per persona with avatar and role, for the profile page; the accessible name stays "Entrar como …".
 */
export function DemoLogin({ next = "/perfil", variant = "buttons" }: { next?: string; variant?: "buttons" | "tiles" }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const signIn = (p: DemoPersona) =>
    startTransition(async () => {
      const res = await signInAsDemo(p, next);
      if (res?.status === "error") setError(res.message ?? "Erro");
    });
  const personas = Object.keys(DEMO_PERSONAS) as DemoPersona[];

  return (
    <section aria-labelledby="demo-login" className="space-y-3">
      <h2 id="demo-login" className="flex items-center gap-2 font-semibold">
        Entrar numa conta de demonstração <DemoTag />
      </h2>
      <p className="text-sm text-muted">Contas fictícias para testar o app. Tudo o que você fizer fica visível para outras pessoas usando a mesma conta.</p>
      {variant === "tiles" ? (
        <ul className="space-y-2">
          {personas.map((p) => {
            const name = DEMO_PERSONAS[p].name.replace(/\s*\(Demo\)$/, "");
            return (
              <li key={p}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => signIn(p)}
                  aria-label={`Entrar como ${DEMO_PERSONAS[p].label}`}
                  className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-left transition hover:border-primary/50 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-60"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft font-display text-base font-bold text-primary" aria-hidden>
                    {name[0]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{name}</span>
                    <span className="block text-xs text-muted">{ROLE[p]}</span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-muted" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="grid gap-2 sm:grid-cols-3">
          {personas.map((p) => (
            <button key={p} type="button" disabled={pending} onClick={() => signIn(p)} className={`${buttonSecondary} w-full px-4 text-sm whitespace-nowrap`}>
              Entrar como {DEMO_PERSONAS[p].label}
            </button>
          ))}
        </div>
      )}
      <p role="status" className="text-sm text-danger empty:hidden">
        {error}
      </p>
    </section>
  );
}
