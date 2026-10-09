import "server-only";
import { createClient } from "./supabase/server";
import type { CommunityCount,CommunityGroup,CommunityMessage } from "./communities";
export async function getCommunityCounts(cityId:string):Promise<{communities:CommunityCount[];unavailable:boolean}>{
 const r=await (await createClient()).rpc("city_community_counts",{p_city_id:cityId});
 return {communities:(r.data??[]).map((c:CommunityCount)=>({...c,members:Number(c.members)})),unavailable:Boolean(r.error)};
}
export async function getCommunityMessages(id:string):Promise<{messages:CommunityMessage[];unavailable:boolean}>{
 const {data,error}=await (await createClient()).from("community_messages").select("id,community_id,user_id,body,created_at,profiles(display_name)").eq("community_id",id).order("created_at",{ascending:false}).order("id",{ascending:false}).limit(100);
 return {messages:(data??[]).map(({profiles,...r})=>({...r,author:(profiles as unknown as {display_name:string}|null)?.display_name??"Participante"})).reverse() as CommunityMessage[],unavailable:Boolean(error)};
}
export async function getMyCommunities(userId:string):Promise<{groups:CommunityGroup[];unavailable:boolean}>{
 const db=await createClient();
 const r=await db.from("community_members").select("community_id,muted,last_read_at,city_communities!inner(id,topic,cities(slug,name))").eq("user_id",userId).eq("city_communities.active",true).order("joined_at",{ascending:false}).limit(100);
 type Row={community_id:string;muted:boolean;last_read_at:string;city_communities:{id:string;topic:CommunityGroup["topic"];cities:CommunityGroup["city"]}};
 const groups=await Promise.all(((r.data??[]) as unknown as Row[]).map(async m=>{
  const [last,unread]=await Promise.all([db.from("community_messages").select("id,community_id,user_id,body,created_at,profiles(display_name)").eq("community_id",m.community_id).order("created_at",{ascending:false}).order("id",{ascending:false}).limit(1).maybeSingle(),db.from("community_messages").select("id",{count:"exact",head:true}).eq("community_id",m.community_id).gt("created_at",m.last_read_at).neq("user_id",userId)]);
  const latest=last.data?{...last.data,author:(last.data.profiles as unknown as {display_name:string}|null)?.display_name??"Participante"}:null;
  return {id:m.community_id,topic:m.city_communities.topic,city:m.city_communities.cities,muted:m.muted,last_read_at:m.last_read_at,latest,unread:m.muted?0:(unread.count??0)} as CommunityGroup;
 }));
 return {groups,unavailable:Boolean(r.error)};
}
