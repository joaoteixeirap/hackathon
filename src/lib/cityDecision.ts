import type { FactsMeta } from "./trust";
import { median } from "./speedtest";
export type DecisionPlace={id:string;name:string;category:string;subcategory:string|null;neighborhood:string|null;wifi_mbps:number|null;wifi_source:string|null;last_verified_at:string|null;call_ready_valid_until:string|null;distinct_users_90d:number;facts_meta:FactsMeta;osm_id:string|null;created_at:string;is_demo:boolean};
export function decisionEvidence(rows:DecisionPlace[],now=Date.now()){
 const real=rows.filter(p=>!p.is_demo),work=real.filter(p=>p.category==="work"||p.subcategory==="cafe");
 const measured=work.filter(p=>p.wifi_source==="user_test"&&p.wifi_mbps!=null&&p.distinct_users_90d>=2&&p.last_verified_at&&Date.parse(p.last_verified_at)<=now&&now-Date.parse(p.last_verified_at)<=90*86400000);
 const calls=work.filter(p=>p.call_ready_valid_until&&Date.parse(p.call_ready_valid_until)>now);
 const housing=real.filter(p=>p.category==="stay"),hospitals=real.filter(p=>p.subcategory==="hospital"),schools=real.filter(p=>p.subcategory==="school"||p.subcategory==="kindergarten");
 const hoods=[...new Set(real.map(p=>p.neighborhood).filter((n):n is string=>Boolean(n)))].map(name=>({name,work:work.filter(p=>p.neighborhood===name).length,housing:housing.filter(p=>p.neighborhood===name).length,hospitals:hospitals.filter(p=>p.neighborhood===name).length,schools:schools.filter(p=>p.neighborhood===name).length})).sort((a,b)=>b.work-a.work||a.name.localeCompare(b.name,"pt-BR"));
 return {real,work,measured,calls,housing,hospitals,schools,hoods,median:measured.length>=2?median(measured.map(p=>Number(p.wifi_mbps))):null};
}
