"use client";

import { useActionState } from "react";
import { buttonAccent, field, label } from "@/components/ui/styles";
import type { PartnerErrors } from "@/lib/placeForm";
import { signUpPartner, type FormState } from "./actions";

export function PartnerSignUpForm() {
  const [state, action, pending] = useActionState<FormState<PartnerErrors>, FormData>(signUpPartner, { status: "idle" });
  const e = state.errors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="business_name" className={label}>
          Nome do negócio
        </label>
        <input id="business_name" name="business_name" required maxLength={120} placeholder="Ex.: Café da Praça" className={field} />
        {e.business_name && <p className="text-sm text-danger">{e.business_name}</p>}
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-3">
        <div className="space-y-1.5">
          <label htmlFor="document_type" className={label}>
            Tipo
          </label>
          <select id="document_type" name="document_type" defaultValue="" className={field}>
            <option value="">—</option>
            <option value="mei">MEI</option>
            <option value="cnpj">CNPJ</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="document_number" className={label}>
            Número (opcional)
          </label>
          <input id="document_number" name="document_number" inputMode="numeric" placeholder="00.000.000/0000-00" className={`${field} tabular-nums`} />
        </div>
      </div>
      {(e.document_type || e.document_number) && <p className="text-sm text-danger">{e.document_type ?? e.document_number}</p>}
      <button type="submit" disabled={pending} className={`${buttonAccent} w-full`}>
        {pending ? "Cadastrando…" : "Cadastrar meu negócio"}
      </button>
      <p role="status" className="text-sm text-danger empty:hidden">
        {state.message}
      </p>
    </form>
  );
}
