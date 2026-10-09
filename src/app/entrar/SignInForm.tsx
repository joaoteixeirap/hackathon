"use client";

import { useActionState } from "react";
import { buttonPrimary, field, label } from "@/components/ui/styles";
import { sendMagicLink, type SignInState } from "./actions";

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(sendMagicLink, {
    status: "idle",
  });

  if (state.status === "sent") {
    return (
      <div role="status" className="space-y-2">
        <p className="font-display text-xl font-bold">Confira seu e-mail</p>
        <p className="text-muted">
          Enviamos um link de acesso para <strong className="text-ink">{state.email}</strong>. Abra
          neste mesmo aparelho para entrar.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <div className="space-y-1.5">
        <label htmlFor="email" className={label}>
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          defaultValue={state.email}
          placeholder="voce@exemplo.com"
          className={field}
          aria-invalid={state.status === "error"}
          aria-describedby={state.status === "error" ? "email-error" : undefined}
        />
        {state.status === "error" && (
          <p id="email-error" className="text-sm text-danger">
            {state.message}
          </p>
        )}
      </div>
      <button type="submit" className={`${buttonPrimary} w-full`} disabled={pending}>
        {pending ? "Enviando…" : "Receber link de acesso"}
      </button>
      <p className="text-sm text-muted">Sem senha: você recebe um link por e-mail.</p>
    </form>
  );
}
