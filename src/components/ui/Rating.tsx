import { Star } from "lucide-react";

export function Rating({ avg, count }: { avg: number | null; count: number }) {
  if (!count) return <span className="text-sm text-muted">Sem avaliações ainda</span>;
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <Star size={16} strokeWidth={0} className="fill-accent" aria-hidden />
      <span className="font-semibold tabular-nums">{avg?.toFixed(1)}</span>
      <span className="text-muted">
        ({count} {count === 1 ? "avaliação" : "avaliações"})
      </span>
    </span>
  );
}
