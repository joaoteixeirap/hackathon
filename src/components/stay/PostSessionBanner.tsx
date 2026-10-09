"use client";

import { Gauge } from "lucide-react";
import { useEffect, useState } from "react";
import { CheckinSheet } from "@/components/checkin/CheckinSheet";
import { track } from "@/lib/track";

type Prompt = { activity_id: string; place: { id: string; name: string; lat: number; lng: number } };

/** J4: after a session at a place, invite a 30-second check-in tied to the activity. */
export function PostSessionBanner({ prompt }: { prompt: Prompt }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => track("post_checkin_prompt_shown", { activity_id: prompt.activity_id }), [prompt.activity_id]);
  if (sent) return <p className="rounded-2xl bg-primary-soft p-4 text-sm font-semibold text-primary">Obrigado! O Radar ficou mais certo com o seu registro.</p>;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-primary-soft p-4">
      <p className="text-sm">
        <span className="font-semibold text-primary">Como foi trabalhar no {prompt.place.name}?</span> Registrar em 30 s.
      </p>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-on-fill">
        <Gauge size={15} aria-hidden /> Registrar
      </button>
      {open && (
        <CheckinSheet
          place={prompt.place}
          activityId={prompt.activity_id}
          onClose={() => setOpen(false)}
          onSaved={() => setSent(true)}
        />
      )}
    </div>
  );
}
