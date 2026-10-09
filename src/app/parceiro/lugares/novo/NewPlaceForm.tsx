"use client";

import { useActionState, useState } from "react";
import { createPlace, type FormState } from "@/app/parceiro/actions";
import { LocationPicker } from "@/components/map/LocationPicker";
import { buttonAccent, field, label } from "@/components/ui/styles";
import type { BBox } from "@/lib/geo";
import { PLACE_CATEGORIES, type PlaceErrors } from "@/lib/placeForm";
import { CATEGORIES } from "@/lib/places";

export function NewPlaceForm({ citySlug, bbox, center }: { citySlug: string; bbox: BBox; center: { lat: number; lng: number } }) {
  const [state, action, pending] = useActionState<FormState<PlaceErrors>, FormData>(createPlace, { status: "idle" });
  const [point, setPoint] = useState(center);
  const e = state.errors ?? {};

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="city" value={citySlug} />
      <input type="hidden" name="lat" value={point.lat} />
      <input type="hidden" name="lng" value={point.lng} />

      <div className="space-y-1.5">
        <label htmlFor="name" className={label}>
          Nome do lugar
        </label>
        <input id="name" name="name" required maxLength={120} className={field} />
        {e.name && <p className="text-sm text-danger">{e.name}</p>}
      </div>
      <div className="space-y-1.5">
        <label htmlFor="category" className={label}>
          Categoria
        </label>
        <select id="category" name="category" defaultValue="work" className={field}>
          {PLACE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORIES[c].label}
            </option>
          ))}
        </select>
        {e.category && <p className="text-sm text-danger">{e.category}</p>}
      </div>
      <div className="space-y-1.5">
        <p className={label}>Onde fica</p>
        <div className="h-64 overflow-hidden rounded-2xl border border-line">
          <LocationPicker bbox={bbox} initial={center} zoom={14} onChange={setPoint} />
        </div>
        <p className="text-xs text-muted">Arraste o mapa até a mira ficar sobre a entrada.</p>
        {e.location && <p className="text-sm text-danger">{e.location}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="address" className={label}>
            Endereço
          </label>
          <input id="address" name="address" maxLength={200} className={field} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="neighborhood" className={label}>
            Bairro
          </label>
          <input id="neighborhood" name="neighborhood" maxLength={80} className={field} />
        </div>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="description" className={label}>
          Descrição (opcional)
        </label>
        <textarea id="description" name="description" rows={3} maxLength={500} className={field} />
      </div>
      <button type="submit" disabled={pending} className={`${buttonAccent} w-full`}>
        {pending ? "Cadastrando…" : "Cadastrar lugar"}
      </button>
      <p role="status" className="text-sm text-danger empty:hidden">
        {state.message}
      </p>
    </form>
  );
}
