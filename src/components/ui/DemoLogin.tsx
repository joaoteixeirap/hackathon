"use client";

import { useState, useTransition } from "react";
import { signInAsDemo } from "@/app/entrar/actions";
import { DemoTag } from "@/components/ui/DemoTag";
import { buttonSecondary } from "@/components/ui/styles";
import { DEMO_PERSONAS, type DemoPersona } from "@/lib/demoAccounts";

/** "Entrar como nômade A / nômade B / parceiro" (demo accounts, never admin). */
export function DemoLogin({ next = "/perfil" }: { next?: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <section aria-labelledby="demo-login" className="space-y-3">
      <h2 id="demo-login" className="flex items-center gap-2 font-semibold">
        Entrar numa conta de demonstração <DemoTag />
      </h2>
      <p className="text-sm text-muted">Contas fictícias para testar o app. Tudo o que você fizer fica visível para outras pessoas usando a mesma conta.</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {(Object.keys(DEMO_PERSONAS) as DemoPersona[]).map((p) => (
          <button
            key={p}
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await signInAsDemo(p, next);
                if (res?.status === "error") setError(res.message ?? "Erro");
              })
            }
            className={`${buttonSecondary} w-full px-4 text-sm whitespace-nowrap`}
          >
            Entrar como {DEMO_PERSONAS[p].label}
          </button>
        ))}
      </div>
      <p role="status" className="text-sm text-danger empty:hidden">
        {error}
      </p>
    </section>
  );
}
