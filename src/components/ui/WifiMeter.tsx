import { WIFI_STRONG_MBPS, type PlaceSummary } from "@/lib/places";

const SOURCE_LABEL: Record<NonNullable<PlaceSummary["wifi_source"]>, string> = {
  user_test: "medido por nômades",
  partner: "declarado pelo local",
  osm: "indicado no OpenStreetMap",
};

/** Signal bars + Mbps + where the number comes from (always shown). */
export function WifiMeter({
  mbps,
  source,
  tests,
  hideSource = false,
}: {
  mbps: number | null;
  source: PlaceSummary["wifi_source"];
  tests?: number;
  /** The source line is shown by FactRow instead. */
  hideSource?: boolean;
}) {
  const level = mbps == null ? 0 : mbps >= 100 ? 4 : mbps >= 50 ? 3 : mbps >= WIFI_STRONG_MBPS ? 2 : 1;
  const sourceText =
    source === "user_test" && tests
      ? `medido por ${tests} ${tests === 1 ? "nômade" : "nômades"}`
      : source
        ? SOURCE_LABEL[source]
        : null;

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-6 items-end gap-[3px]" aria-hidden>
        {[1, 2, 3, 4].map((b) => (
          <span
            key={b}
            className={`w-1.5 rounded-full ${b <= level ? "bg-cat-work" : "bg-line"}`}
            style={{ height: `${b * 25}%` }}
          />
        ))}
      </div>
      <div className="leading-tight">
        {mbps != null ? (
          <p className="font-display text-xl font-bold tabular-nums">
            {mbps.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}{" "}
            <span className="font-sans text-xs font-semibold text-muted">Mbps</span>
          </p>
        ) : (
          <p className="text-sm font-semibold">{source === "osm" ? "Tem Wi-Fi" : "Sem medição"}</p>
        )}
        {!hideSource && <p className="text-xs text-muted">{sourceText ?? "Sem informação ainda. Ajude a mapear"}</p>}
      </div>
    </div>
  );
}
