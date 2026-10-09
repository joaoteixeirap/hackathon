import { notFound } from "next/navigation";
import Link from "next/link";
import { Baby,CalendarDays,CheckCircle2,Luggage,Map as MapIcon,PawPrint,Pencil,Wallet,Wifi } from "lucide-react";
import { PageShell } from "@/components/ui/PageShell";
import { PlanActions } from "@/components/stay/PlanActions";
import { CommunityPicker } from "@/components/stay/CommunityPicker";
import { CityDecision,CityDecisionIntro } from "@/components/stay/CityDecision";
import { card,buttonPrimary,buttonSecondary } from "@/components/ui/styles";
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
 const facts=[
  p.monthly_budget_cents!=null&&{icon:Wallet,text:`Até ${(p.monthly_budget_cents/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0})}/mês`},
  p.needs_calls&&{icon:Wifi,text:"Internet boa"},
  p.with_children&&{icon:Baby,text:"Com filhos"},
  p.with_pets&&{icon:PawPrint,text:"Com pets"},
 ].filter(Boolean) as {icon:typeof Wifi;text:string}[];
 const small="min-h-11 gap-2 px-5 text-sm";
 // Desktop: summary on top; city evidence on the left, communities and next steps in a right column.
 // The evidence heading has its own row so the sidebar's top lines up with the first evidence cards.
 // Phones stack them in DOM order: summary, communities, evidence heading and cards, next steps.
 return <PageShell title={`Minha estadia em ${p.city.name}`} wide><div className="space-y-5 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-[auto_auto_auto_1fr] lg:gap-6 lg:space-y-0">
 <section className={`${card} overflow-hidden lg:col-span-2`} aria-label="Resumo do plano">
  {saved&&<p role="status" className="flex items-center gap-2 border-b border-line bg-primary-soft px-5 py-3 text-sm font-semibold text-success sm:px-6"><CheckCircle2 size={18} className="shrink-0" aria-hidden/><span>Estadia salva. Você pode entrar nas comunidades agora ou decidir depois.</span></p>}
  <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
   <div className="flex min-w-0 items-start gap-4">
    <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary"><Luggage size={26} aria-hidden/></span>
    <div className="min-w-0">
     <span className="inline-flex rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">{PLAN_LABELS[p.status]}</span>
     <p className="mt-2 flex items-center gap-2 font-display text-lg font-bold sm:text-xl"><CalendarDays size={18} className="shrink-0 text-muted" aria-hidden/>{planDates(p)}</p>
     {!!facts.length&&<ul className="mt-3 flex flex-wrap gap-2" aria-label="Preferências do plano">{facts.map(f=><li key={f.text} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-semibold"><f.icon size={14} className="text-muted" aria-hidden/>{f.text}</li>)}</ul>}
     {p.note&&<p className="mt-3 rounded-2xl bg-surface-2 px-3.5 py-2.5 text-sm whitespace-pre-line">{p.note}</p>}
    </div>
   </div>
   <div className="flex flex-wrap gap-2 lg:shrink-0 lg:justify-end">
    <Link href={`/mapa/sp?city=${p.city.slug}`} className={`${buttonPrimary} ${small}`}><MapIcon size={16} aria-hidden/>Explorar no mapa</Link>
    {p.status!=="arrived"&&<Link href={`/estadias/${id}/editar`} className={`${buttonSecondary} ${small}`}><Pencil size={15} aria-hidden/>Editar meu plano</Link>}
    <Link href="/estadias" className={`${buttonSecondary} ${small}`}>Minhas estadias</Link>
   </div>
  </div>
 </section>
 <section className={`${card} p-5 sm:p-6 lg:col-start-2 lg:row-start-3 lg:self-start`}>{counts.unavailable?<p>Comunidades indisponíveis no momento. Seu plano está salvo.</p>:<CommunityPicker cityId={p.city_id} cityName={p.city.name} communities={counts.communities} joined={mine.groups.map(g=>g.id)} suggested={p.with_children?["remote_work","arrival","families"]:["remote_work","arrival"]} verified={Boolean(profile?.verified)}/>}</section>
 <div className="lg:col-start-1 lg:row-start-2"><CityDecisionIntro name={p.city.name}/></div>
 <div className="lg:col-start-1 lg:row-span-2 lg:row-start-3"><CityDecision intro={false} slug={p.city.slug} name={p.city.name} places={evidence.places} incomplete={evidence.incomplete} preferences={p}/></div>
 <section className={`${card} space-y-3 p-5 sm:p-6 lg:col-start-2 lg:row-start-4 lg:self-start`} aria-labelledby="next-steps"><h2 id="next-steps" className="font-display text-lg font-bold">Próximos passos</h2><PlanActions plan={p}/></section>
 </div></PageShell>;
}
