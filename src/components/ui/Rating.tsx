import { Star } from "lucide-react";

export function Rating({ avg, count }: { avg: number | null; count: number }) {
  if (!count) return <span className="text-sm text-tinta-suave">Sem avaliações ainda</span>;
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <Star size={16} strokeWidth={1.75} className="fill-sol text-tinta" aria-hidden />
      <span className="font-mono">{avg?.toFixed(1)}</span>
      <span className="text-tinta-suave">
        ({count} {count === 1 ? "avaliação" : "avaliações"})
      </span>
    </span>
  );
}
