"use client";

import { useState, useTransition } from "react";
import { buttonPrimary, buttonSecondary } from "@/components/ui/styles";
import { decideVerification } from "./actions";

export function DecisionButtons({ userId, name }: { userId: string; name: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const decide = (approve: boolean) =>
    startTransition(async () => {
      const res = await decideVerification(userId, approve);
      if (!res.ok) setError(res.message);
    });

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button type="button" disabled={pending} onClick={() => decide(true)} className={`${buttonPrimary} flex-1`} aria-label={`Aprovar ${name}`}>
          Aprovar
        </button>
        <button type="button" disabled={pending} onClick={() => decide(false)} className={`${buttonSecondary} flex-1`} aria-label={`Recusar ${name}`}>
          Recusar
        </button>
      </div>
      <p role="status" className="text-sm text-danger empty:hidden">
        {error}
      </p>
    </div>
  );
}
