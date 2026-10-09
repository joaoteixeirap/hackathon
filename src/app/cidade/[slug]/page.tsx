import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarPlus,Gauge,Map as MapIcon,Users } from "lucide-react";
import { PageShell } from "@/components/ui/PageShell";
import { card,buttonPrimary,buttonSecondary } from "@/components/ui/styles";
import { getCity } from "@/lib/cities";
import { createPublicClient } from "@/lib/supabase/public";
import { cityStatistics } from "@/lib/cityStats";
import { FRESHNESS_LABEL,type Freshness,type FactsMeta } from "@/lib/trust";
import { TrackView } from "@/components/ui/TrackView";
import { emergencyFact } from "@/lib/essentialServices";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { CityDecision } from "@/components/stay/CityDecision";
import { getDecisionPlaces } from "@/lib/cityDecisionData";
export const dynamic="force-dynamic";
const COLORS={fresh:"bg-success",aging:"bg-accent",stale:"bg-muted",unknown:"bg-line"};
export default async function CityPage({params}:{params:Promise<{slug:string}>}) {
 const {slug}=await params;const city=await getCity(slug);if(!city)notFound();
 if(!isSupabaseConfigured()) return <PageShell title={`A cidade · ${city.name}`}><p>Poucos dados ainda. Ajude a mapear.</p><Link href={`/mapa/${slug}`} className={buttonPrimary}>Abrir mapa</Link></PageShell>;
 const db=createPublicClient();
 const rows:Parameters<typeof cityStatistics>[0]=[];let failed=false;
 if(city.id) for(let offset=0;offset<10000;offset+=1000) {
   const {data,error}=await db.from("places").select("category,subcategory,wifi_mbps,wifi_source,last_verified_at,distinct_users_90d,seal_valid_until,facts_meta,opening_hours,is_demo,emergency_fact:facts_meta->emergency").eq("city_id",city.id).order("id").range(offset,offset+999);
   if(error){failed=true;break;}rows.push(...(data??[]).map(p=>({...p,facts_meta:p.facts_meta as FactsMeta,emergency_fact:emergencyFact(p.emergency_fact)})));if(!data||data.length<1000)break;
 }
 const now=new Date();
 const [acts,presence]=city.id ? await Promise.all([db.from("activities").select("id",{count:"exact",head:true}).eq("city_id",city.id).neq("status","cancelled").gte("starts_at",now.toISOString()).lt("starts_at",new Date(+now+7*86_400_000).toISOString()),db.rpc("city_presence_count",{p_city_id:city.id})]) : [{count:0,error:null},{data:null}];
 const s=cityStatistics(rows,acts.count??0);
 const evidence=await getDecisionPlaces(city.id);
 const tile=(label:string,value:string,hint:string)=><div className={`${card} p-4`}><p className="text-xs font-semibold text-muted">{label}</p><p className="mt-1 font-display text-lg leading-tight font-bold tabular-nums">{value}</p><p className="mt-1 text-[11px] leading-snug text-muted">{hint}</p></div>;
 const step="min-h-11 w-full gap-2 px-4 text-sm";
 // Key numbers first; on desktop the evidence fills the left column, next steps and data freshness sit on the right.
 // Phones: numbers, next steps, freshness, then the evidence.
 return <PageShell title={`A cidade · ${city.name}`} wide><TrackView name="city_panel_view" props={{city:slug}}/><p className="mb-5 max-w-3xl text-sm text-muted">Dados calculados agora · {now.toLocaleDateString("pt-BR",{timeZone:"America/Sao_Paulo"})}. Lugares: OpenStreetMap, parceiros e medições anônimas. {s.demo>0 ? `Os indicadores incluem ${s.demo} lugares Demo, atividades e perfis de demonstração. Farmácias e pronto atendimento usam só dados reais do OSM.` : ""}</p>{failed && <p role="status">Não foi possível carregar todos os dados da cidade.</p>}
 <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{tile("Trabalho verificado",s.work ? `${s.verified} de ${s.work}`:"Poucos dados ainda","Verificados nos últimos 60 dias")}{tile("Wi-Fi medido",s.median==null?"Poucos dados ainda":`${s.median.toLocaleString("pt-BR")} Mbps`,`Mediana por lugar · n = ${s.measured} · últimos 90 dias`)}{tile("Selos ativos",String(s.seals),"Calculados por medições; validade de 60 dias")}{tile("Atividades da semana",acts.error?"Indisponível":String(s.activities),"Próximos 7 dias; inclui ocorrências de séries")}{tile("Nômades presentes",presence.data==null?"Poucos dados ainda":String(presence.data),"Só opt-in; contagem exibida a partir de 3")}{tile("Farmácias / pronto atendimento",`${s.pharmacies} / ${s.emergency}`,"OSM: 24/7 ou atendimento de emergência; confira o horário")}</div>
 <div className="mt-6 space-y-6 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6 lg:space-y-0">
  <aside className="space-y-5 lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1">
   <section className={`${card} space-y-2 p-5`} aria-labelledby="city-next"><h2 id="city-next" className="mb-1 font-display text-lg font-bold">Próximos passos</h2><Link href={`/estadias/nova?city=${slug}`} className={`${buttonPrimary} ${step}`}><CalendarPlus size={16} aria-hidden/>Estou considerando esta cidade</Link><Link href={`/comunidades?city=${slug}`} className={`${buttonSecondary} ${step}`}><Users size={16} aria-hidden/>Conhecer as comunidades</Link><Link href={`/mapa/${slug}?cat=activities`} className={`${buttonSecondary} ${step}`}><MapIcon size={16} aria-hidden/>Ver rodas e eventos</Link><Link href={`/radar/${slug}`} className={`${buttonSecondary} ${step}`}><Gauge size={16} aria-hidden/>Abrir Radar e contribuir</Link></section>
   <section className={`${card} p-5`} aria-label="Frescor dos dados"><h2 className="mb-3 font-display text-lg font-bold">Frescor dos dados de trabalho</h2>{s.work ? <><div className="flex h-3 overflow-hidden rounded-full" aria-hidden>{Object.entries(s.fresh).map(([key,n])=><span key={key} className={COLORS[key as Freshness]} style={{width:`${n/s.work*100}%`}}/>)}</div><ul className="mt-3 space-y-1.5 text-sm">{Object.entries(s.fresh).map(([key,n])=><li key={key} className="flex items-center gap-2"><span className={`size-2.5 shrink-0 rounded-full ${COLORS[key as Freshness]}`} aria-hidden/>{FRESHNESS_LABEL[key as Freshness]}<span className="ml-auto text-muted tabular-nums">{n} de {s.work}</span></li>)}</ul></> : <p>Poucos dados ainda. Ajude a mapear.</p>}</section>
  </aside>
  <div className="lg:col-start-1 lg:row-start-1"><CityDecision slug={slug} name={city.name} places={evidence.places} incomplete={evidence.incomplete}/></div>
 </div></PageShell>;
}
