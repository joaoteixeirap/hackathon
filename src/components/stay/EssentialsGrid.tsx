import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { haversine } from "@/lib/geo";
import { emergencyFact, offersEmergencyOr24h } from "@/lib/essentialServices";
const ITEMS=[{title:"Farmácia",cat:"health",sub:"pharmacy"},{title:"Pronto atendimento / 24h",cat:"health",sub:"hospital",always:true},{title:"Coworking com diária",cat:"work",sub:"coworking"},{title:"Lavanderia",cat:"service",sub:"laundry"},{title:"Mercado",cat:"service",sub:"supermarket"}] as const;
export async function EssentialsGrid({ cityId,citySlug,neighborhood }: {cityId:string;citySlug:string;neighborhood:string|null}) {
  const db=await createClient();
  const {data:rows}=await db.from("places").select("id,name,category,subcategory,neighborhood,lat,lng,opening_hours,is_demo,created_at,stay_policy,emergency_fact:facts_meta->emergency").eq("city_id",cityId).in("subcategory",["pharmacy","hospital","clinic","doctors","coworking","laundry","supermarket"]).limit(1000);
  const {data:center}=neighborhood ? await db.rpc("city_neighborhoods",{p_city_id:cityId}) : {data:null};
  const hood=(center as {neighborhood:string;lat:number;lng:number}[]|null)?.find(h=>h.neighborhood===neighborhood);
  return <section className="mt-6" aria-label="Serviços essenciais"><h2 className="mb-3 font-display text-lg font-bold">Essenciais</h2><div className="grid grid-cols-2 gap-3">{ITEMS.map(item=>{
    const eligible=(rows??[]).filter(p=>p.category===item.cat && ("always" in item ? offersEmergencyOr24h(p) : p.subcategory===item.sub) && (item.sub!=="coworking" || p.stay_policy==="pass_required"));
    const sorted=hood ? eligible.sort((a,b)=>haversine(hood,{lat:a.lat,lng:a.lng})-haversine(hood,{lat:b.lat,lng:b.lng})) : eligible.filter(p=>p.neighborhood===neighborhood);
    const nearest=sorted[0];
    const emergency=emergencyFact(nearest?.emergency_fact);
    return <div key={item.title} className="rounded-2xl bg-surface-2 p-3"><Link href={`/mapa/${citySlug}?cat=${item.cat}&sub=${item.sub}${"always" in item ? "&hours=24" : ""}${item.sub==="coworking" ? "&pass=1" : ""}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">{item.title}</Link>{nearest ? <><Link href={`/lugar/${nearest.id}`} className="block text-sm">{nearest.name}{nearest.is_demo ? " · Demo" : ""}</Link><p className="text-xs text-muted">{hood ? "Mais próximo do centro do bairro" : "No bairro informado"} · {nearest.neighborhood}</p><p className="text-xs text-muted">{nearest.is_demo?"Demo": "OpenStreetMap / cadastro local"} · cadastrado em {new Date(nearest.created_at).toLocaleDateString("pt-BR")} · sem confirmação</p>{"always" in item && <p className="mt-1 text-xs text-muted">{nearest.opening_hours === "24/7" ? "24h informado no cadastro; confira com o local." : "Atendimento de emergência informado no OSM; horário 24h não confirmado."}{emergency?.observed_at && ` Importado em ${new Date(emergency.observed_at).toLocaleDateString("pt-BR")}; 0 confirmações.`}</p>}</> : <p className="text-xs text-muted">Poucos dados ainda{neighborhood ? " neste bairro" : ": informe seu bairro no perfil"}.</p>}</div>;
  })}</div></section>;
}
