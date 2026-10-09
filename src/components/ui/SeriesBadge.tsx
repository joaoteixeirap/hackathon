import { BadgeCheck, Repeat } from "lucide-react";
import Link from "next/link";
import type { SeriesInfo } from "@/lib/places";
import { seriesLabel } from "@/lib/series";

/** "Semanal · toda quinta 14h" (+ "Oficial"), linking to the series page (SPEC_V2 S3/S5). */
export function SeriesBadge({ series }: { series: SeriesInfo }) {
  return (
    <Link
      href={`/serie/${series.id}`}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary-soft px-3 text-xs font-bold text-primary underline-offset-4 hover:underline"
    >
      <Repeat size={13} aria-hidden /> {seriesLabel(series.weekday, series.start_time)}
      {series.is_official && (
        <span className="inline-flex items-center gap-0.5">
          · <BadgeCheck size={13} aria-hidden /> Oficial
        </span>
      )}
    </Link>
  );
}
