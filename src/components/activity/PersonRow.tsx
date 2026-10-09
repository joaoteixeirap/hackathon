import Link from "next/link";
import { Rating } from "@/components/ui/Rating";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import type { Person } from "@/lib/membership";

/** Short profile used in the join queue and the group list: name, verified, rating. */
export function PersonRow({ person, you, verificationRequired, children }: { person: Person; you?: boolean; verificationRequired: boolean; children?: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
      <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft font-display font-bold text-primary">
        {person.display_name.slice(0, 1).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 font-semibold">
          {you ? (
            <span>{person.display_name} <span className="font-normal text-muted">(você)</span></span>
          ) : (
            <Link href={`/perfil/${person.user_id}`} className="underline-offset-4 hover:underline">
              {person.display_name}
            </Link>
          )}
          {person.status === "creator" && <span className="text-xs font-semibold text-accent-strong">organiza</span>}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <VerifiedBadge verified={person.verified} required={verificationRequired} />
          <Rating avg={person.avg_rating} count={person.review_count} />
        </div>
      </div>
      {children}
    </li>
  );
}
