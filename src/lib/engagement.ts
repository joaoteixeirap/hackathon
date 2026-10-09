import { SURVEY } from "./survey";
import { SURVEY_SMALL_SAMPLE } from "@/config/nomad";
export type UsageEvent = { name:string; props:Record<string,unknown>|null; session_id?:string|null; created_at?:string };
export type SurveyAnswer = {question_key:string;answer_key:string;session_id:string|null};
const session=(e:UsageEvent)=> e.session_id || (typeof e.props?.sid === "string" ? e.props.sid : null);
type Step={label:string;match:(e:UsageEvent)=>boolean;tasks?:boolean};
/** Ordered device cohort: a later stage counts only after this device completed prior stages. */
export function orderedFunnel(events:UsageEvent[],steps:Step[]) {
 const counts=steps.map(s=>({label:s.label,n:0}));const progress=new Map<string,{at:number;tasks:Set<string>}>();
 const sorted=[...events].sort((a,b)=>(a.created_at??"").localeCompare(b.created_at??""));
 for(const e of sorted){const sid=session(e);if(!sid||sid==="no-storage")continue;const p=progress.get(sid)??{at:0,tasks:new Set<string>()};const step=steps[p.at];if(!step||!step.match(e))continue;
   if(step.tasks){if(typeof e.props?.task_id!=="string")continue;p.tasks.add(e.props.task_id);if(p.tasks.size<3){progress.set(sid,p);continue;}}
   counts[p.at].n++;p.at++;progress.set(sid,p);
 }
 return counts;
}
export function engagementFunnels(events:UsageEvent[]) {
 const step=(name:string,label:string):Step=>({label,match:e=>e.name===name});
 return {
  work:orderedFunnel(events,[step("view_radar","Radar"),{label:"Ficha pelo Radar",match:e=>e.name==="open_place"&&e.props?.source==="radar"},step("checkin_start","Iniciaram check-in"),step("checkin_submit","Enviaram check-in")]),
  week:orderedFunnel(events,[step("stay_create","Criaram estadia"),{label:"3 tarefas distintas",match:e=>e.name==="stay_task_toggle"&&e.props?.done==="true",tasks:true},step("favorite_add","Salvaram favorito"),step("ics_download","Baixaram agenda")]),
  journey:orderedFunnel(events,[step("open_place","Ficha"),step("session_from_place","Sessão no lugar"),step("request_join","Pedido de entrada"),step("offer_group_redeem","Benefício usado"),step("post_checkin_submit","Registro pós-sessão")]),
 };
}
export function usageCounts(events:UsageEvent[]) {
  const count=(name:string,filter:(e:UsageEvent)=>boolean=()=>true)=>new Set(events.filter(e=>e.name===name && filter(e)).map(session).filter(s=>s && s!=="no-storage")).size;
  const tasks=new Map<string,Set<string>>();
  for(const e of events.filter(e=>e.name==="stay_task_toggle" && e.props?.done==="true")) {const sid=session(e);const id=e.props?.task_id;if(sid && typeof id==="string") {if(!tasks.has(sid))tasks.set(sid,new Set());tasks.get(sid)!.add(id);}}
  return {
    work:[{label:"Abriram o Radar",n:count("view_radar")},{label:"Abriram ficha pelo Radar",n:count("open_place",e=>e.props?.source==="radar")},{label:"Começaram check-in",n:count("checkin_start")},{label:"Enviaram check-in",n:count("checkin_submit")},{label:"Votaram em um dado",n:count("vote_fact")}],
    bonds:[{label:"Pediram para seguir série",n:count("series_follow")},{label:"Pediram entrada numa roda",n:count("request_join")}],
    week:[{label:"Criaram estadia",n:count("stay_create")},{label:"Concluíram pelo menos 3 tarefas distintas",n:[...tasks.values()].filter(s=>s.size>=3).length},{label:"Salvaram favorito",n:count("favorite_add")},{label:"Baixaram agenda",n:count("ics_download")}],
    journey:[{label:"Abriram ficha",n:count("open_place")},{label:"Marcaram sessão no lugar",n:count("session_from_place")},{label:"Pediram entrada",n:count("request_join")},{label:"Usaram benefício de grupo",n:count("offer_group_redeem")},{label:"Registraram pós-sessão",n:count("post_checkin_submit")}],
    untracked:events.filter(e=>!session(e)||session(e)==="no-storage").length,
  };
}
export function surveyResults(answers:SurveyAnswer[]) {
  return SURVEY.map(q=>{
    const rows=[...new Map(answers.filter(a=>a.question_key===q.key && a.session_id && q.options.some(o=>o.key===a.answer_key)).map(a=>[a.session_id,a])).values()];
    return {key:q.key,title:q.title,n:rows.length,small:rows.length<SURVEY_SMALL_SAMPLE,options:q.options.map(o=>{const n=rows.filter(a=>a.answer_key===o.key).length;return {...o,n,fraction:rows.length ? n/rows.length : 0};})};
  });
}
