"use client";

import { useState, useTransition } from "react";
import { claimPlace } from "@/app/parceiro/actions";

export function ClaimButton({ placeId, name }: { placeId: string; name: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        aria-label={`Reivindicar ${name}`}
        onClick={() =>
          startTransition(async () => {
            const res = await claimPlace(placeId); // redirects on success
            if (res && !res.ok) setError(res.message);
          })
        }
        className="min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-on-fill shadow-soft-sm transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "…" : "É meu"}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
