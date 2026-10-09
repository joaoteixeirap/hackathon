"use client";

import { Star } from "lucide-react";
import { useState, useTransition } from "react";
import { reviewPerson } from "@/app/atividade/[id]/actions";
import { field } from "@/components/ui/styles";
import type { Person } from "@/lib/membership";

/** Post-activity reviews between participants (F7): 1–5 stars and a short comment, once per person. */
export function ReviewPanel({ activityId, people, reviewed }: { activityId: string; people: Person[]; reviewed: string[] }) {
  if (people.length === 0) return <p className="text-sm text-muted">Ninguém mais participou desta roda.</p>;
  return (
    <ul className="divide-y divide-line">
      {people.map((p) => (
        <ReviewRow key={p.user_id} activityId={activityId} person={p} done={reviewed.includes(p.user_id)} />
      ))}
    </ul>
  );
}

function ReviewRow({ activityId, person, done }: { activityId: string; person: Person; done: boolean }) {
  const [rating, setRating] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(done);
  const [pending, startTransition] = useTransition();

  if (sent) {
    return (
      <li className="flex items-center justify-between py-3">
        <span className="font-semibold">{person.display_name}</span>
        <span className="text-sm text-success">Avaliado</span>
      </li>
    );
  }

  return (
    <li className="py-3">
      <form
        action={(fd) =>
          startTransition(async () => {
            setError(null);
            const res = await reviewPerson(activityId, person.user_id, fd);
            if (res.ok) setSent(true);
            else setError(res.message);
          })
        }
        className="space-y-2"
      >
        <fieldset>
          <legend className="font-semibold">{person.display_name}</legend>
          <div className="mt-1 flex">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="grid size-11 cursor-pointer place-items-center rounded-full hover:bg-surface-2">
                <input type="radio" name="rating" value={n} className="sr-only" checked={rating === n} onChange={() => setRating(n)} />
                <Star size={24} strokeWidth={1.5} className={n <= rating ? "fill-accent text-accent" : "text-muted"} aria-hidden />
                <span className="sr-only">
                  {n} {n === 1 ? "estrela" : "estrelas"}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {rating > 0 && (
          <div className="flex items-end gap-2">
            <label className="sr-only" htmlFor={`c-${person.user_id}`}>
              Comentário (opcional)
            </label>
            <input id={`c-${person.user_id}`} name="comment" maxLength={300} placeholder="Comentário curto (opcional)" className={field} />
            <button type="submit" disabled={pending} className="min-h-12 shrink-0 rounded-full bg-primary px-5 font-semibold text-on-fill disabled:opacity-60">
              Enviar
            </button>
          </div>
        )}
        <p role="status" className="text-sm text-danger empty:hidden">
          {error}
        </p>
      </form>
    </li>
  );
}
