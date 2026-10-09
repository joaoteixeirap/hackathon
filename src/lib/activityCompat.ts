import { COMPAT_MIN_COUNT } from "@/config/nomad";
export type ActivityCompat={same_rhythm:number;overlap:number};
export function activityCompatLines(compat:ActivityCompat|null|undefined) {
  if(!compat)return [];
  return [compat.same_rhythm>=COMPAT_MIN_COUNT ? `${compat.same_rhythm} pessoas com a mesma rotina que você` : null,
    compat.overlap>=COMPAT_MIN_COUNT ? `${compat.overlap} estarão na cidade nas suas datas` : null].filter((s):s is string=>s!==null);
}
