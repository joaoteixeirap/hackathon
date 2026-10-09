"use client";

import { useActionState } from "react";
import { buttonPrimary, field, label } from "@/components/ui/styles";
import type { MyProfile } from "@/lib/auth";
import { updateProfile, type ProfileFormState } from "./actions";

type CityOption = { id: string; name: string };

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

export function ProfileForm({ profile, cities }: { profile: MyProfile; cities: CityOption[] }) {
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
      <Field id="current_city_id" title="Cidade atual" error={e.current_city_id}>
        <select
          id="current_city_id"
          name="current_city_id"
          defaultValue={profile.current_city_id ?? ""}
          className={field}
        >
          <option value="">Não informar</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field id="stay_from" title="Chegada" error={e.stay_from}>
          <input id="stay_from" name="stay_from" type="date" defaultValue={profile.stay_from ?? ""} className={field} />
        </Field>
        <Field id="stay_to" title="Saída" error={e.stay_to}>
          <input id="stay_to" name="stay_to" type="date" defaultValue={profile.stay_to ?? ""} className={field} />
        </Field>
      </div>
      <Field
        id="neighborhood"
        title="Bairro"
        error={e.neighborhood}
        hint="Usado só na contagem por bairro, nunca como posição."
      >
        <input
          id="neighborhood"
          name="neighborhood"
          maxLength={60}
          defaultValue={profile.neighborhood ?? ""}
          className={field}
        />
      </Field>
      <div className="space-y-1.5">
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            name="share_presence"
            defaultChecked={profile.share_presence}
            className="size-5 accent-primary"
          />
          <span>Mostrar que estou na cidade</span>
        </label>
        <p className="text-xs text-muted">
          Aparece só como número no seu bairro, e só quando há 3 ou mais pessoas.
        </p>
        {e.share_presence && <p className="text-sm text-danger">{e.share_presence}</p>}
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
