import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/ui/PageShell";
import { card,buttonPrimary } from "@/components/ui/styles";
import { getCity } from "@/lib/cities";
import { createPublicClient } from "@/lib/supabase/public";
import { cityStatistics } from "@/lib/cityStats";
import { FRESHNESS_LABEL,type Freshness,type FactsMeta } from "@/lib/trust";
import { TrackView } from "@/components/ui/TrackView";
import { isSupabaseConfigured } from "@/lib/supabase/env";
export const dynamic="force-dynamic";
const COLORS={fresh:"bg-success",aging:"bg-accent",stale:"bg-muted",unknown:"bg-line"};
export default async function CityPage({params}:{params:Promise<{slug:string}>}) {
 const {slug}=await params;const city=await getCity(slug);if(!city)notFound();
 if(!isSupabaseConfigured()) return <PageShell title={`A cidade · ${city.name}`}><p>Poucos dados ainda. Ajude a mapear.</p><Link href={`/mapa/${slug}`} className={buttonPrimary}>Abrir mapa</Link></PageShell>;
 const db=createPublicClient();
 const rows:Parameters<typeof cityStatistics>[0]=[];let failed=false;
 if(city.id) for(let offset=0;offset<10000;offset+=1000) {
   const {data,error}=await db.from("places").select("category,subcategory,wifi_mbps,wifi_source,last_verified_at,distinct_users_90d,seal_valid_until,facts_meta,opening_hours,is_demo").eq("city_id",city.id).order("id").range(offset,offset+999);
   if(error){failed=true;break;}rows.push(...(data??[]).map(p=>({...p,facts_meta:p.facts_meta as FactsMeta})));if(!data||data.length<1000)break;
 }
 const now=new Date();
 const [acts,presence]=city.id ? await Promise.all([db.from("activities").select("id",{count:"exact",head:true}).eq("city_id",city.id).neq("status","cancelled").gte("starts_at",now.toISOString()).lt("starts_at",new Date(+now+7*86_400_000).toISOString()),db.rpc("city_presence_count",{p_city_id:city.id})]) : [{count:0,error:null},{data:null}];
 const s=cityStatistics(rows,acts.count??0);
 const tile=(label:string,value:string,hint:string)=><div className={`${card} p-4`}><p className="text-sm font-semibold">{label}</p><p className="mt-1 font-display text-xl font-bold tabular-nums">{value}</p><p className="text-xs text-muted">{hint}</p></div>;
 return <PageShell title={`A cidade · ${city.name}`}><TrackView name="city_panel_view" props={{city:slug}}/><p className="mb-5 text-sm text-muted">Dados calculados agora · {now.toLocaleDateString("pt-BR",{timeZone:"America/Sao_Paulo"})}. Lugares: OpenStreetMap, parceiros e medições anônimas. {s.demo>0 ? `Inclui ${s.demo} lugares Demo; farmácias e atendimento 24h usam só dados reais do OSM.` : ""}</p>{failed && <p role="status">Não foi possível carregar todos os dados da cidade.</p>}
 <div className="grid grid-cols-2 gap-3">{tile("Trabalho verificado",s.work ? `${s.verified} de ${s.work}`:"Poucos dados ainda","Verificados nos últimos 60 dias")}{tile("Wi-Fi medido",s.median==null?"Poucos dados ainda":`${s.median.toLocaleString("pt-BR")} Mbps`,`Mediana por lugar · n = ${s.measured} · últimos 90 dias`)}{tile("Selos ativos",String(s.seals),"Calculados por medições; validade de 60 dias")}{tile("Atividades da semana",acts.error?"Indisponível":String(s.activities),"Próximos 7 dias; inclui ocorrências de séries")}{tile("Nômades presentes",presence.data==null?"Poucos dados ainda":String(presence.data),"Só opt-in; contagem exibida a partir de 3")}{tile("Farmácias / atendimento 24h",`${s.pharmacies} / ${s.emergency}`,"Importados do OSM; 24h quando informado 24/7")}</div>
 <section className={`${card} mt-5 p-5`} aria-label="Frescor dos dados"><h2 className="mb-3 font-display text-lg font-bold">Frescor dos dados de trabalho</h2>{s.work ? <><div className="flex h-4 overflow-hidden rounded-full" aria-hidden>{Object.entries(s.fresh).map(([key,n])=><span key={key} className={COLORS[key as Freshness]} style={{width:`${n/s.work*100}%`}}/>)}</div><ul className="mt-3 text-sm">{Object.entries(s.fresh).map(([key,n])=><li key={key}>{FRESHNESS_LABEL[key as Freshness]}: {n} de {s.work}</li>)}</ul></> : <p>Poucos dados ainda. Ajude a mapear.</p>}</section><Link href={`/radar/${slug}`} className={`${buttonPrimary} mt-5`}>Abrir Radar e contribuir</Link></PageShell>;
}
