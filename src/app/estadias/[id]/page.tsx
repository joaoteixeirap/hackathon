import { notFound } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
import { PlanActions } from "@/components/stay/PlanActions";
import { CommunityPicker } from "@/components/stay/CommunityPicker";
import { CityDecision } from "@/components/stay/CityDecision";
import { card,buttonSecondary } from "@/components/ui/styles";
import { getMyProfile,getUser } from "@/lib/auth";
import { UUID,planDates,PLAN_LABELS } from "@/lib/destinations";
import { getDestinationPlan } from "@/lib/destinationData";
import { getCommunityCounts,getMyCommunities } from "@/lib/communityData";
import { getDecisionPlaces } from "@/lib/cityDecisionData";
export const dynamic="force-dynamic";
export default async function PlanPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{saved?:string}>}){
 const {id}=await params,u=await getUser();if(!u||!UUID.test(id))notFound();const p=await getDestinationPlan(id,u.id);if(!p)notFound();
 const [profile,counts,mine,evidence]=await Promise.all([getMyProfile(),getCommunityCounts(p.city_id),getMyCommunities(u.id),getDecisionPlaces(p.city_id)]);
 const saved=(await searchParams).saved==="1";
 return <PageShell title={`Minha estadia em ${p.city.name}`}><section className={`${card} space-y-2 p-5`}>{saved&&<p role="status" className="font-semibold text-success">Estadia salva. Você pode entrar nas comunidades agora ou decidir depois.</p>}<p className="text-xs font-semibold text-primary">{PLAN_LABELS[p.status]}</p><p className="text-sm text-muted">{planDates(p)}</p>{p.note&&<p className="text-sm whitespace-pre-line">{p.note}</p>}<div className="flex flex-wrap gap-3">{p.status!=="arrived"&&<Link href={`/estadias/${id}/editar`} className={buttonSecondary}>Editar meu plano</Link>}<Link href="/estadias" className={buttonSecondary}>Minhas estadias</Link><Link href={`/mapa/sp?city=${p.city.slug}`} className={buttonSecondary}>Explorar no mapa</Link></div></section>
 <section className={`${card} mt-5 p-5`}>{counts.unavailable?<p>Comunidades indisponíveis no momento. Seu plano está salvo.</p>:<CommunityPicker cityId={p.city_id} cityName={p.city.name} communities={counts.communities} joined={mine.groups.map(g=>g.id)} suggested={p.with_children?["remote_work","arrival","families"]:["remote_work","arrival"]} verified={Boolean(profile?.verified)}/>}</section>
 <CityDecision slug={p.city.slug} name={p.city.name} places={evidence.places} incomplete={evidence.incomplete} preferences={p}/><section className={`${card} p-5`}><PlanActions plan={p}/></section></PageShell>;
}
