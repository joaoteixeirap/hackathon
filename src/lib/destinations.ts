import { parseBRL } from "./activityForm";
import { MONEY_MAX_CENTS } from "@/config/nomad";
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type DateMode = "exact" | "flexible" | "resident";
export type PlanStatus = "considering" | "planned" | "arrived";
export type PlanValues = {
 city_id:string; status:PlanStatus; date_mode:DateMode; arrive_on:string|null; leave_on:string|null; duration_days:number|null;
 monthly_budget_cents:number|null; needs_calls:boolean; with_children:boolean; with_pets:boolean; note:string|null;
};
export type DestinationPlan = PlanValues & {id:string;stay_id:string|null;city:{slug:string;name:string};created_at:string};
export const PLAN_LABELS = {considering:"Estou considerando",planned:"Estadia planejada",arrived:"Chegada confirmada"} as const;
export function validDate(s:string):boolean {
 return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T12:00:00Z`)) && new Date(`${s}T12:00:00Z`).toISOString().slice(0,10)===s;
}
export function parsePlan(form:FormData):{ok:true;data:PlanValues}|{ok:false;message:string} {
 const city_id=String(form.get("city_id")??""),status=String(form.get("status")??"considering"),mode=String(form.get("date_mode")??"");
 const arrive=String(form.get("arrive_on")??""),leave=mode==="resident" ? "" : String(form.get("leave_on")??"");
 const duration=String(form.get("duration_days")??"").trim(),money=String(form.get("monthly_budget")??"").trim(),note=String(form.get("note")??"").trim();
 if(!UUID.test(city_id))return {ok:false,message:"Escolha uma cidade."};
 if(!["considering","planned"].includes(status)||!["exact","flexible","resident"].includes(mode))return {ok:false,message:"Confira o status e o tipo de datas."};
 if((arrive&&!validDate(arrive))||(leave&&!validDate(leave)))return {ok:false,message:"Informe datas válidas."};
 if(mode==="exact"&&(!arrive||!leave))return {ok:false,message:"Informe chegada e saída."};
 if(leave&&(!arrive||leave<arrive||(Date.parse(leave)-Date.parse(arrive))/86400000>366))return {ok:false,message:"O período deve ter chegada e saída em ordem, com até um ano."};
 if(duration&&(!/^\d{1,3}$/.test(duration)||Number(duration)<1||Number(duration)>366))return {ok:false,message:"Escolha uma duração entre 1 e 366 dias."};
 const budget=money ? parseBRL(money) : null;
 if(budget!==null&&(!Number.isSafeInteger(budget)||budget<0||budget>MONEY_MAX_CENTS))return {ok:false,message:"Informe um orçamento mensal válido."};
 if(note.length>500)return {ok:false,message:"A nota pode ter até 500 caracteres."};
 return {ok:true,data:{city_id,status:status as PlanStatus,date_mode:mode as DateMode,arrive_on:arrive||null,leave_on:leave||null,duration_days:duration ? Number(duration):null,monthly_budget_cents:budget,needs_calls:form.get("needs_calls")==="on",with_children:form.get("with_children")==="on",with_pets:form.get("with_pets")==="on",note:note||null}};
}
const date=(s:string)=>new Date(`${s}T12:00:00Z`).toLocaleDateString("pt-BR",{timeZone:"America/Sao_Paulo"});
export function planDates(p:Pick<PlanValues,"date_mode"|"arrive_on"|"leave_on"|"duration_days">):string {
 if(p.date_mode==="resident")return "Moro aqui · sem data de saída";
 if(p.date_mode==="exact")return `${date(p.arrive_on!)} até ${date(p.leave_on!)}`;
 return `Datas flexíveis${p.arrive_on ? ` · a partir de ${date(p.arrive_on)}`:""}${p.leave_on ? ` até ${date(p.leave_on)}`:""}${p.duration_days ? ` · cerca de ${p.duration_days} dias`:""}`;
}
