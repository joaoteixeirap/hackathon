import Link from "next/link";
import { Plus,MapPin } from "lucide-react";
import { PageShell } from "@/components/ui/PageShell";
import { AppNav } from "@/components/ui/AppNav";
import { card,buttonAccent,buttonSecondary } from "@/components/ui/styles";
import { TrackView } from "@/components/ui/TrackView";
import { getUser } from "@/lib/auth";
import { getActiveStay } from "@/lib/stayData";
import { getDestinationPlans } from "@/lib/destinationData";
import { PLAN_LABELS,planDates } from "@/lib/destinations";
import { defaultCitySlug } from "@/lib/cities";
export const dynamic="force-dynamic";
export const metadata={title:"Minhas estadias · SoloRota"};
export default async function DestinationsPage(){
 const user=await getUser();if(!user)return <PageShell title="Minhas estadias"><p>Recarregue a página para abrir sua sessão.</p></PageShell>;
 const [stay,{plans,unavailable}]=await Promise.all([getActiveStay(user.id),getDestinationPlans(user.id)]);
 return <PageShell title="Minhas estadias"><TrackView name="plan_view" props={{}}/><p className="-mt-2 mb-5 text-sm text-muted">Sua cidade atual e os lugares onde você quer passar os próximos meses. Planejamentos e preferências são privados.</p>{user.is_anonymous&&<p className={`${card} mb-4 p-4 text-sm text-muted`}>Seus planos ficam nesta sessão de visitante. Para usar uma conta em outros aparelhos, <Link href="/entrar?next=/estadias" className="font-semibold text-primary">entre antes de planejar</Link>.</p>}
 <div className="mb-5 flex flex-wrap gap-3"><Link href="/estadias/nova" className={`${buttonAccent} gap-2`}><Plus size={18} aria-hidden/>Planejar estadia</Link><Link href="/mapa/sp" className={buttonSecondary}>Explorar SP</Link><Link href="/comunidades" className={buttonSecondary}>Meus grupos</Link></div>
 <section className="mb-6"><h2 className="mb-3 font-display text-xl font-bold">Minha rotina atual</h2>{stay?<Link href="/estadia" className={`${card} block p-5`}><span className="flex items-center gap-2 font-display text-xl font-bold"><MapPin size={19} aria-hidden/>{stay.city.name}</span><span className="mt-2 block text-sm text-muted">{stay.arrive_on.split("-").reverse().join("/")} até {stay.leave_on.split("-").reverse().join("/")}</span><span className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-primary">Agenda, orçamento, favoritos e checklist →</span></Link>:<div className={`${card} p-5`}><p className="text-sm text-muted">Você ainda não confirmou uma estadia atual.</p><Link href="/estadia" className="inline-flex min-h-11 items-center font-semibold text-primary">Configurar minha rotina atual</Link></div>}</section>
 <section><h2 className="mb-3 font-display text-xl font-bold">Próximos destinos</h2>{unavailable?<p role="status" className={`${card} p-4 text-sm`}>Não foi possível carregar os planos agora. Recarregue e tente de novo.</p>:!plans.length?<p className={`${card} p-5 text-sm text-muted`}>Nenhum destino salvo. Explore uma cidade e registre o que você está considerando.</p>:<ul className="space-y-3">{plans.map(p=><li key={p.id}><Link href={`/estadias/${p.id}`} className={`${card} block p-5`}><span className="text-xs font-semibold text-primary">{PLAN_LABELS[p.status]}</span><h3 className="mt-1 font-display text-xl font-bold">{p.city.name}</h3><p className="mt-2 text-sm text-muted">{planDates(p)}</p>{p.monthly_budget_cents!=null&&<p className="mt-1 text-sm text-muted">Orçamento mensal: {(p.monthly_budget_cents/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</p>}</Link></li>)}</ul>}</section><AppNav active="stay" citySlug={stay?.city.slug??defaultCitySlug}/></PageShell>;
}
