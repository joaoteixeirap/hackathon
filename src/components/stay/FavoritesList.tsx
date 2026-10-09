"use client";

import { Route, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveFavoriteNote, toggleFavorite } from "@/app/estadia/actions";
import { buttonSecondary, field } from "@/components/ui/styles";
import { ROUTE_MAX } from "@/lib/route";
import type { FavoriteRow } from "@/lib/stayData";
import { subcategoryLabel, type PlaceCategory } from "@/lib/places";

function FavoriteItem({ fav }: { fav: FavoriteRow }) {
  const [note, setNote] = useState(fav.note ?? "");
  const [saved, setSaved] = useState(false);
  const [gone, setGone] = useState(false);
  const [pending, startTransition] = useTransition();
  if (gone) return null;
  return (
    <li className="space-y-1.5 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/lugar/${fav.place_id}`} className="font-semibold underline-offset-4 hover:underline">
            {fav.name}
          </Link>
          <p className="text-sm text-muted">
            {subcategoryLabel({ category: fav.category as PlaceCategory, subcategory: fav.subcategory })}
            {fav.neighborhood && ` · ${fav.neighborhood}`}
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          aria-label={`Tirar ${fav.name} dos favoritos`}
          onClick={() => startTransition(async () => void ((await toggleFavorite(fav.place_id, false)).ok && setGone(true)))}
          className="grid size-11 shrink-0 place-items-center rounded-full text-accent hover:bg-surface-2"
        >
          <Star size={18} className="fill-accent" aria-hidden />
        </button>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => setSaved((await saveFavoriteNote(fav.place_id, note)).ok));
        }}
        className="flex gap-2"
      >
        <label className="sr-only" htmlFor={`note-${fav.place_id}`}>
          Nota sobre {fav.name}
        </label>
        <input id={`note-${fav.place_id}`} value={note} onChange={(e) => (setNote(e.target.value), setSaved(false))} maxLength={140} placeholder="Nota (ex.: mesa perto da janela)" className={field} />
        <button type="submit" disabled={pending} className={`${buttonSecondary} shrink-0 px-4 text-sm`}>
          {saved ? "Salva" : "Salvar"}
        </button>
      </form>
    </li>
  );
}

/** E3: private favorites; can seed the "Rota do dia" (F9). */
export function FavoritesList({ favorites, citySlug }: { favorites: FavoriteRow[]; citySlug: string }) {
  const router = useRouter();
  if (favorites.length === 0) {
    return (
      <p className="rounded-3xl border border-dashed border-line p-6 text-center text-muted">
        Nenhum favorito ainda. Toque em &quot;Salvar&quot; na ficha de um lugar ou no Radar.
      </p>
    );
  }

  function routeFromFavorites() {
    const stops = favorites.slice(0, ROUTE_MAX).map((f) => ({ kind: "place" as const, id: f.place_id, name: f.name, lat: f.lat, lng: f.lng }));
    try {
      localStorage.setItem(`sr_route_${citySlug}`, JSON.stringify(stops));
    } catch {
      // private mode: the map opens without the route
    }
    router.push(`/mapa/${citySlug}`);
  }

  return (
    <div className="space-y-3">
      <button type="button" onClick={routeFromFavorites} className={`${buttonSecondary} w-full gap-2`}>
        <Route size={16} aria-hidden /> Montar a rota do dia com os favoritos
      </button>
      <ul className="divide-y divide-line">
        {favorites.map((f) => (
          <FavoriteItem key={f.place_id} fav={f} />
        ))}
      </ul>
    </div>
  );
}
