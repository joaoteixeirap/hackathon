import { activityCompatLines,type ActivityCompat } from "@/lib/activityCompat";
export function CompatLine({compat,compact=false}:{compat:ActivityCompat|null|undefined;compact?:boolean}) {
  const lines=activityCompatLines(compat);if(!lines.length)return null;
  return <span className={`block rounded-2xl bg-primary-soft text-primary ${compact ? "mt-1 px-2 py-1 text-xs" : "px-3.5 py-2.5 text-sm font-semibold"}`} data-testid="compat">{lines.join(" · ")}</span>;
}
