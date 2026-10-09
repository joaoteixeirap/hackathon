"use client";

import { Star } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toggleFavorite } from "@/app/estadia/actions";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/track";

/**
 * E3 "Salvar": private favorite. When `initial` is unknown (map card), the state is read
 * once from the user's own favorites (RLS shows only theirs).
 */
export function FavoriteStar({ placeId, initial, compact = false }: { placeId: string; initial?: boolean; compact?: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const [on, setOn] = useState(initial ?? false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Lists pass the state once they know it; keep in sync with it.
  useEffect(() => {
    if (initial !== undefined) setOn(initial);
  }, [initial]);

  useEffect(() => {
    if (initial !== undefined) return;
    let alive = true;
    supabase
      .from("place_favorites")
      .select("place_id")
      .eq("place_id", placeId)
      .maybeSingle()
      .then(({ data }) => alive && setOn(Boolean(data)));
    return () => {
      alive = false;
    };
  }, [supabase, placeId, initial]);

  const toggle = () =>
    startTransition(async () => {
      setError(null);
      const res = await toggleFavorite(placeId, !on);
      if (!res.ok) return setError(res.message);
      setOn(res.on);
      if (res.on) track("favorite_add", { place_id: placeId });
    });

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={on}
        aria-label={on ? "Tirar dos favoritos" : "Salvar nos favoritos"}
        className={`inline-flex min-h-11 items-center gap-1.5 rounded-full ${compact ? "px-3" : "px-4"} text-sm font-semibold transition disabled:opacity-60 ${on ? "text-accent-strong" : "text-primary"} hover:bg-surface-2`}
      >
        <Star size={16} strokeWidth={2} className={on ? "fill-accent text-accent" : ""} aria-hidden />
        {on ? "Salvo" : "Salvar"}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}
