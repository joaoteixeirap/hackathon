import type { FactMeta } from "./trust";
export type EmergencyFact = FactMeta & {value:boolean};
export function emergencyFact(raw:unknown):EmergencyFact|null {
  if(!raw||typeof raw!=="object"||!("value" in raw)||!("source" in raw)||raw.source!=="osm"||typeof raw.value!=="boolean")return null;
  const r=raw as Partial<EmergencyFact>;
  return {value:raw.value,source:"osm",observed_at:typeof r.observed_at==="string"?r.observed_at:null,confirmations_90d:typeof r.confirmations_90d==="number"?r.confirmations_90d:0,outdated_30d:typeof r.outdated_30d==="number"?r.outdated_30d:0};
}
export function offersEmergencyOr24h(p:{subcategory:string|null;opening_hours:string|null;emergency_fact?:unknown}) {
  return ["hospital","clinic","doctors"].includes(p.subcategory??"") && (p.opening_hours==="24/7" || emergencyFact(p.emergency_fact)?.value===true);
}
