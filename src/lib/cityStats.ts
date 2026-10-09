import { SEAL_WINDOW_DAYS, CITY_STATS_MIN_SAMPLE } from "@/config/nomad";
import { median } from "./speedtest";
import { isSealActive, placeFreshness, type FactsMeta, type Freshness } from "./trust";
type CityPlace={category:string;subcategory:string|null;wifi_mbps:number|null;wifi_source:string|null;last_verified_at:string|null;distinct_users_90d:number;seal_valid_until:string|null;facts_meta:FactsMeta;opening_hours:string|null;is_demo:boolean};
export function cityStatistics(places:CityPlace[],activities:number,now=Date.now()) {
 const work=places.filter(p=>p.category==="work"||p.subcategory==="cafe");
 const verified=work.filter(p=>p.last_verified_at && now-Date.parse(p.last_verified_at)<=SEAL_WINDOW_DAYS*86_400_000);
 const measured=work.filter(p=>p.wifi_source==="user_test" && p.wifi_mbps!==null && p.last_verified_at && now-Date.parse(p.last_verified_at)<=90*86_400_000);
 const fresh:Record<Freshness,number>={fresh:0,aging:0,stale:0,unknown:0};
 for(const p of work) fresh[placeFreshness(p.facts_meta,now)]++;
 return {work:work.length,verified:verified.length,median:measured.length>=CITY_STATS_MIN_SAMPLE ? median(measured.map(p=>p.wifi_mbps!)) : null,measured:measured.length,seals:work.filter(p=>isSealActive(p,now)).length,activities,fresh,demo:places.filter(p=>p.is_demo).length,pharmacies:places.filter(p=>p.subcategory==="pharmacy" && !p.is_demo).length,emergency:places.filter(p=>["hospital","clinic"].includes(p.subcategory??"") && p.opening_hours==="24/7" && !p.is_demo).length};
}
