import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
import { AppNav } from "@/components/ui/AppNav";
import { TrackView } from "@/components/ui/TrackView";
import { CommunityPicker } from "@/components/stay/CommunityPicker";
import { card,field,buttonSecondary } from "@/components/ui/styles";
import { getMyProfile,getUser } from "@/lib/auth";
import { listMapCities,defaultCitySlug } from "@/lib/cities";
import { getCommunityCounts,getMyCommunities } from "@/lib/communityData";
import { COMMUNITY_TOPICS } from "@/lib/communities";
export const dynamic="force-dynamic";
export const metadata={title:"Comunidades · SoloRota"};
export default async function CommunitiesPage({searchParams}:{searchParams:Promise<{city?:string;filter?:string}>}){
 const u=await getUser();if(!u)return <PageShell title="Comunidades"><p>Recarregue para abrir sua sessão.</p></PageShell>;
 const [{city,filter},cities,profile,mine]=await Promise.all([searchParams,listMapCities(),getMyProfile(),getMyCommunities(u.id)]);
 const selected=cities.find(c=>c.slug===city)??cities.find(c=>c.id===profile?.current_city_id)??cities.find(c=>c.slug===defaultCitySlug)??cities[0];
 const counts=selected?.id?await getCommunityCounts(selected.id):{communities:[],unavailable:true};
 const groups=filter==="unread"?mine.groups.filter(g=>g.unread>0):mine.groups;
 return <PageShell title="Comunidades"><TrackView name="community_view" props={{}}/><p className="mb-5 text-sm text-muted">Conversas entre nômades por cidade e interesse. Você pode participar antes de chegar; seus planos e sua localização permanecem privados.</p><section className="space-y-3"><h2 className="font-display text-xl font-bold">Meus grupos</h2><nav className="flex gap-2" aria-label="Filtro dos grupos"><Link href={`/comunidades?city=${selected?.slug??defaultCitySlug}`} className={buttonSecondary}>Todos</Link><Link href={`/comunidades?city=${selected?.slug??defaultCitySlug}&filter=unread`} className={buttonSecondary}>Não lidas</Link></nav>{mine.unavailable?<p>Não foi possível carregar seus grupos agora.</p>:groups.length?<ul className="space-y-2">{groups.map(g=><li key={g.id}><Link href={`/comunidade/${g.id}`} className={`${card} block p-4`}><h3 className="font-semibold">{COMMUNITY_TOPICS[g.topic].title} em {g.city.name}</h3><p className="mt-1 truncate text-sm text-muted">{g.latest?`${g.latest.author}: ${g.latest.body}`:"Ainda sem mensagens"}</p><p className="mt-1 text-xs text-primary">{g.muted?"Notificações silenciadas":g.unread?`${g.unread} mensagens novas`:"Em dia"}</p></Link></li>)}</ul>:<p className={`${card} p-4 text-sm text-muted`}>{filter==="unread"?"Nenhum grupo com mensagens novas.":"Você ainda não participa de comunidades. Escolha uma cidade abaixo."}</p>}</section>
 <form className="my-6 space-y-2" action="/comunidades"><label htmlFor="community-city" className="text-sm font-semibold">Comunidades de qual cidade?</label><select name="city" id="community-city" defaultValue={selected?.slug} className={field}>{cities.map(c=><option key={c.slug} value={c.slug}>{c.name} · {c.state}</option>)}</select><button type="submit" className={buttonSecondary}>Ver comunidades</button></form>{selected&&selected.id&&!counts.unavailable?<section className={`${card} p-5`}><CommunityPicker cityId={selected.id} cityName={selected.name} communities={counts.communities} joined={mine.groups.map(g=>g.id)} verified={Boolean(profile?.verified)}/></section>:<p>Comunidades indisponíveis agora. Tente de novo.</p>}<AppNav active="stay" citySlug={selected?.slug??defaultCitySlug}/></PageShell>;
}
