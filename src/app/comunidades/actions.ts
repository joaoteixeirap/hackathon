"use server";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/events";
import { UUID } from "@/lib/destinations";
type Result={ok:boolean;message?:string};
export async function joinCommunities(cityId:string,ids:string[],muted:boolean):Promise<Result>{
 if(!UUID.test(cityId)||!Array.isArray(ids)||ids.length<1||ids.length>6||!ids.every(id=>UUID.test(id))||typeof muted!=="boolean")return {ok:false,message:"Escolha as comunidades da cidade."};
 if(!(await getUser()))return {ok:false,message:"Entre para participar."};
 const r=await (await createClient()).rpc("join_city_communities",{p_city_id:cityId,p_ids:ids,p_muted:muted});
 if(r.error)return {ok:false,message:r.error.code==="42501"?"Verifique seu perfil para participar dos grupos.":"Não foi possível entrar nos grupos. Tente de novo."};
 await logEvent("community_join",{count:String(ids.length),muted:String(muted)});revalidatePath("/comunidades");return {ok:true};
}
export async function changeCommunity(id:string,action:"leave"|"mute"|"unmute"):Promise<Result>{
 if(!UUID.test(id)||!["leave","mute","unmute"].includes(action))return {ok:false,message:"Pedido inválido."};
 const u=await getUser();if(!u)return {ok:false,message:"Entre para continuar."};const db=await createClient();
 const r=action==="leave"?await db.from("community_members").delete().eq("community_id",id).eq("user_id",u.id).select("community_id"):await db.from("community_members").update({muted:action==="mute"}).eq("community_id",id).eq("user_id",u.id).select("community_id");
 if(r.error||!r.data?.length)return {ok:false,message:"Não foi possível atualizar sua participação."};
 await logEvent(action==="leave"?"community_leave":"community_mute");revalidatePath("/comunidades");revalidatePath(`/comunidade/${id}`);return {ok:true};
}
