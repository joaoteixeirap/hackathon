import { BadgeCheck } from "lucide-react";

/** Wax-seal style badge (DESIGN.md §1); refined in M3. */
export function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-mare px-2.5 py-1 text-xs font-bold text-papel-claro">
      <BadgeCheck size={14} strokeWidth={1.75} aria-hidden /> Verificado
    </span>
  ) : null; // Verification is off in hackathon mode; "Verificação pendente" returns with M5.
}
