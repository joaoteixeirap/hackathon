"use client";

import { Ban, CalendarDays, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { blockPerson } from "@/app/estadia/actions";
import { ReportButton } from "@/components/activity/ReportButton";
import { INTERESTS, type Interest } from "@/lib/interests";
import { track } from "@/lib/track";

export type PersonCard = {
  user_id: string;
  display_name: string;
  common_interests: string[];
  same_rhythm: boolean;
  overlap_days: number;
  upcoming: { id: string; title: string; starts_at: string }[];
};

const TZ = "America/Sao_Paulo";

function PersonItem({ p }: { p: PersonCard }) {
  const [open, setOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [pending, startTransition] = useTransition();
  if (blocked) return <li className="py-3 text-sm text-muted">Pessoa bloqueada. Vocês não aparecem mais um para o outro.</li>;

  return (
    <li className="py-3">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-start gap-3 text-left">
        <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft font-display font-bold text-primary">
          {p.display_name.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{p.display_name}</span>
          <span className="block text-sm text-muted">
            {p.overlap_days} dias na cidade ao mesmo tempo{p.same_rhythm ? " · mesma rotina" : ""}
          </span>
          {p.common_interests.length > 0 && (
            <span className="mt-1 flex flex-wrap gap-1">
              {p.common_interests.map((i) => (
                <span key={i} className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold">
                  {INTERESTS[i as Interest] ?? i}
                </span>
              ))}
            </span>
          )}
        </span>
        <ChevronDown size={18} className={`mt-1 shrink-0 transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {open && (
        <div className="mt-3 space-y-2 pl-14">
          <p className="text-sm font-semibold">Próximas rodas abertas</p>
          {p.upcoming.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma roda marcada. Sem mensagens diretas: o contato acontece nas rodas.</p>
          ) : (
            <ul className="space-y-1">
              {p.upcoming.map((a) => (
                <li key={a.id}>
                  <Link href={`/atividade/${a.id}`} className="flex min-h-11 items-center gap-2 rounded-xl bg-surface-2 px-3 text-sm hover:brightness-95">
                    <CalendarDays size={14} aria-hidden />
                    <span className="min-w-0 flex-1 truncate font-semibold">{a.title}</span>
                    <span className="text-xs text-muted">
                      {new Date(a.starts_at).toLocaleString("pt-BR", { weekday: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TZ })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(async () => void ((await blockPerson(p.user_id)).ok && setBlocked(true)))}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-muted hover:text-danger"
            >
              <Ban size={13} aria-hidden /> Bloquear
            </button>
            <ReportButton targetType="profile" targetId={p.user_id} />
          </div>
        </div>
      )}
    </li>
  );
}

/** S2: people who stay in the city at the same time (opt-in on both sides; no direct messages). */
export function PeopleList({ people, discoverable, citySlug }: { people: PersonCard[]; discoverable: boolean; citySlug: string }) {
  useEffect(() => track("people_view", { city: citySlug, count: String(people.length) }), [citySlug, people.length]);

  if (!discoverable) {
    return (
      <p className="text-sm">
        Para ver pessoas compatíveis, ative <span className="font-semibold">&quot;Aparecer para pessoas compatíveis&quot;</span> no{" "}
        <Link href="/perfil" className="font-semibold text-primary underline-offset-4 hover:underline">
          perfil
        </Link>
        . Só quem também ativou aparece, e não há mensagens diretas.
      </p>
    );
  }
  if (people.length === 0) {
    return <p className="text-sm text-muted">Ninguém compatível ainda nas suas datas. Poucos dados ainda: volte em alguns dias ou entre numa roda.</p>;
  }
  return (
    <ul className="divide-y divide-line">
      {people.map((p) => (
        <PersonItem key={p.user_id} p={p} />
      ))}
    </ul>
  );
}
