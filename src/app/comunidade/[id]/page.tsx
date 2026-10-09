import { notFound } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
import { CommunityChat } from "@/components/activity/CommunityChat";
import { card } from "@/components/ui/styles";
import { getMyProfile,getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCommunityMessages } from "@/lib/communityData";
import { COMMUNITY_TOPICS,type CommunityTopic } from "@/lib/communities";
import { UUID } from "@/lib/destinations";
export const dynamic="force-dynamic";
export default async function CommunityPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!UUID.test(id))notFound();const u=await getUser(),db=await createClient();
 const [group,member,profile]=await Promise.all([db.from("city_communities").select("id,topic,cities(slug,name)").eq("id",id).maybeSingle(),u?db.from("community_members").select("muted").eq("community_id",id).eq("user_id",u.id).maybeSingle():Promise.resolve({data:null}),getMyProfile()]);
 if(!group.data)notFound();const g=group.data as unknown as {id:string;topic:CommunityTopic;cities:{slug:string;name:string}};
 const joined=Boolean(u&&member.data&&profile?.verified),messages=joined?await getCommunityMessages(id):{messages:[],unavailable:false};
 return <PageShell title={`${COMMUNITY_TOPICS[g.topic].title} em ${g.cities.name}`}><p className="mb-4 text-sm text-muted">{COMMUNITY_TOPICS[g.topic].description}</p><Link href={`/comunidades?city=${g.cities.slug}`} className="mb-4 inline-flex min-h-11 items-center text-sm font-semibold text-primary">← Voltar aos grupos</Link>{joined&&u?<section className={`${card} p-4`}>{messages.unavailable&&<p role="status" className="mb-3 text-sm text-danger">Mensagens indisponíveis agora. Tente recarregar.</p>}<CommunityChat id={id} userId={u.id} muted={member.data!.muted} initial={messages.messages}/></section>:<p className={`${card} p-5 text-sm`}>O chat é para membros com perfil verificado. <Link href={`/comunidades?city=${g.cities.slug}`} className="font-semibold text-primary">Veja como participar</Link>.</p>}</PageShell>;
}
