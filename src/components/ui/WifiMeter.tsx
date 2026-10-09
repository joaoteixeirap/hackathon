import { WIFI_STRONG_MBPS, type PlaceSummary } from "@/lib/places";

const SOURCE_LABEL: Record<NonNullable<PlaceSummary["wifi_source"]>, string> = {
  user_test: "medido por nômades",
  partner: "declarado pelo local",
  osm: "indicado no OpenStreetMap",
};

/** Four instrument bars + Mbps + data source (DESIGN.md §7). */
export function WifiMeter({
  mbps,
  source,
  tests,
}: {
  mbps: number | null;
  source: PlaceSummary["wifi_source"];
  tests?: number;
}) {
  const level = mbps == null ? 0 : mbps >= 100 ? 4 : mbps >= 50 ? 3 : mbps >= WIFI_STRONG_MBPS ? 2 : 1;
  const sourceText =
    source === "user_test" && tests
      ? `medido por ${tests} ${tests === 1 ? "nômade" : "nômades"}`
      : source
        ? SOURCE_LABEL[source]
        : null;

  return (
    <div className="flex items-end gap-3">
      <div className="flex h-6 items-end gap-[3px]" aria-hidden>
        {[1, 2, 3, 4].map((b) => (
          <span
            key={b}
            className={`w-[5px] rounded-[1px] border border-tinta ${b <= level ? "bg-mare" : "bg-transparent"}`}
            style={{ height: `${b * 25}%` }}
          />
        ))}
      </div>
      <div className="leading-tight">
        {mbps != null ? (
          <p className="font-mono text-lg">
            {mbps.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} <span className="text-xs">Mbps</span>
          </p>
        ) : (
          <p className="font-mono text-sm">{source === "osm" ? "Tem Wi-Fi" : "Sem medição"}</p>
        )}
        <p className="text-xs text-tinta-suave">{sourceText ?? "Sem informação ainda. Ajude a mapear"}</p>
      </div>
    </div>
  );
}
