import "server-only";
import { createClient } from "./supabase/server";
import type { DestinationPlan } from "./destinations";
export async function getDestinationPlans(userId:string):Promise<{plans:DestinationPlan[];unavailable:boolean}>{
 const {data,error}=await (await createClient()).from("destination_plans").select("*,cities(slug,name)").eq("user_id",userId).order("created_at",{ascending:false}).limit(100);
 return {plans:(data??[]).map(({cities,...p})=>({...p,city:cities})) as DestinationPlan[],unavailable:Boolean(error)};
}
export async function getDestinationPlan(id:string,userId:string):Promise<DestinationPlan|null>{
 const {data}=await (await createClient()).from("destination_plans").select("*,cities(slug,name)").eq("id",id).eq("user_id",userId).maybeSingle();
 if(!data)return null;const {cities,...plan}=data;return {...plan,city:cities} as DestinationPlan;
}
