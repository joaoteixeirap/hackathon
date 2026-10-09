"use server";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { parsePlan,UUID,validDate } from "@/lib/destinations";
import { createClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/events";
import { todayInBrasilia } from "@/lib/offers";
export type PlanState={status:"idle"|"error"|"saved";message?:string;id?:string};
export async function savePlan(id:string|null,_prev:PlanState,form:FormData):Promise<PlanState>{
 const p=parsePlan(form);if(!p.ok)return {status:"error",message:p.message};
 if(id&&!UUID.test(id))return {status:"error",message:"Estadia inválida."};
 const user=await getUser();if(!user)return {status:"error",message:"Recarregue a página para abrir sua sessão."};
 const db=await createClient(),row={...p.data,user_id:user.id};
 const r=id?await db.from("destination_plans").update(p.data).eq("id",id).eq("user_id",user.id).select("id").maybeSingle():await db.from("destination_plans").insert(row).select("id").single();
 if(r.error||!r.data)return {status:"error",message:"Não foi possível salvar. Confira a conexão e tente de novo."};
 await logEvent("plan_save",{status:p.data.status,mode:p.data.date_mode});
 revalidatePath("/estadias");return {status:"saved",id:r.data.id};
}
export async function removePlan(id:string):Promise<{ok:boolean;message?:string}>{
 const u=await getUser();if(!u||!UUID.test(id))return {ok:false,message:"Sessão ou destino inválido."};
 const r=await (await createClient()).from("destination_plans").delete().eq("id",id).eq("user_id",u.id).select("id");
 if(r.error||!r.data?.length)return {ok:false,message:"Não foi possível remover."};
 await logEvent("plan_remove");revalidatePath("/estadias");return {ok:true};
}
export async function arrivePlan(id:string,_prev:PlanState,form:FormData):Promise<PlanState>{
 const a=String(form.get("arrive_on")??""),l=String(form.get("leave_on")??""),audience=String(form.get("audience")??"br"),today=todayInBrasilia();
 if(!UUID.test(id)||!validDate(a)||!validDate(l)||a>today||l<today||l<a||Date.parse(l)-Date.parse(a)>366*86400000||!["br","foreign"].includes(audience))return {status:"error",message:"A chegada e a saída devem incluir hoje, com período de até um ano."};
 if(form.get("confirm_arrival")!=="on")return {status:"error",message:"Confirme que você já chegou à cidade."};
 if(!(await getUser()))return {status:"error",message:"Recarregue a página para abrir sua sessão."};
 const r=await (await createClient()).rpc("arrive_destination",{p_plan_id:id,p_arrive:a,p_leave:l,p_audience:audience});
 if(r.error)return {status:"error",message:"Não foi possível confirmar a chegada. Tente de novo."};
 await logEvent("plan_arrive");revalidatePath("/estadias");revalidatePath("/estadia");revalidatePath("/perfil");return {status:"saved",id:r.data};
}
