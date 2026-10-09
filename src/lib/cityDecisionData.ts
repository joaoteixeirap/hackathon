import "server-only";
import { createPublicClient } from "./supabase/public";
import { isSupabaseConfigured } from "./supabase/env";
import type { DecisionPlace } from "./cityDecision";
export async function getDecisionPlaces(cityId:string|null):Promise<{places:DecisionPlace[];incomplete:boolean}>{
 if(!cityId||!isSupabaseConfigured())return {places:[],incomplete:true};
 const db=createPublicClient(),places:DecisionPlace[]=[];
 for(let offset=0;offset<20000;offset+=1000){
  const r=await db.from("places").select("id,name,category,subcategory,neighborhood,wifi_mbps,wifi_source,last_verified_at,call_ready_valid_until,distinct_users_90d,facts_meta,osm_id,created_at,is_demo").eq("city_id",cityId).eq("is_demo",false).order("id").range(offset,offset+999);
  if(r.error)return {places,incomplete:true};places.push(...(r.data??[]) as DecisionPlace[]);if((r.data?.length??0)<1000)return {places,incomplete:false};
 }
 return {places,incomplete:true};
}
