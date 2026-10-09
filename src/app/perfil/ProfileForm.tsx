"use client";

import { useActionState } from "react";
import { buttonPrimary, field, label } from "@/components/ui/styles";
import type { MyProfile } from "@/lib/auth";
import { updateProfile, type ProfileFormState } from "./actions";


function Field({
  id,
  title,
  error,
  hint,
  children,
}: {
  id: string;
  title: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={label}>
        {title}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function ProfileForm({ profile }: { profile: MyProfile }) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(updateProfile, {
    status: "idle",
  });
  const e = state.errors ?? {};

  return (
    <form action={action} className="space-y-4" noValidate>
      <Field id="display_name" title="Nome" error={e.display_name}>
        <input
          id="display_name"
          name="display_name"
          required
          maxLength={60}
          defaultValue={profile.display_name}
          className={field}
        />
      </Field>
      <Field id="bio" title="Bio curta" error={e.bio}>
        <textarea id="bio" name="bio" rows={3} maxLength={280} defaultValue={profile.bio ?? ""} className={field} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field id="home_country" title="País de origem" error={e.home_country} hint="Ex.: BR, PT, US">
          <input
            id="home_country"
            name="home_country"
            maxLength={2}
            defaultValue={profile.home_country ?? "BR"}
            className={`${field} uppercase`}
          />
        </Field>
        <Field id="languages" title="Idiomas" error={e.languages} hint="Ex.: pt, en">
          <input
            id="languages"
            name="languages"
            defaultValue={(profile.languages ?? ["pt"]).join(", ")}
            className={field}
          />
        </Field>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" className={buttonPrimary} disabled={pending}>
          {pending ? "Salvando…" : "Salvar perfil"}
        </button>
        <p role="status" className="text-sm">
          {state.status === "saved" && <span className="text-success">Perfil salvo.</span>}
          {state.message && <span className="text-danger">{state.message}</span>}
        </p>
      </div>
    </form>
  );
}
