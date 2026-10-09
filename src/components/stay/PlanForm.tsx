"use client";
import { ArrowLeft } from "lucide-react";
import { useActionState,useState } from "react";
import { useRouter } from "next/navigation";
import { savePlan,type PlanState } from "@/app/estadias/actions";
import { buttonPrimary,buttonSecondary,field,label,card } from "@/components/ui/styles";
import type { DestinationPlan,DateMode } from "@/lib/destinations";
import { normalize } from "@/lib/places";
type CityChoice={id:string;name:string;slug:string;state:string};
export function PlanForm({cities,initial,defaultCityId}:{cities:CityChoice[];initial?:DestinationPlan;defaultCityId?:string|null}){
 const router=useRouter(),[step,setStep]=useState(initial?2:defaultCityId?1:0),[query,setQuery]=useState("");
 // "Moro aqui" (resident) is no longer offered for new plans; plans saved with it keep the option so they stay editable.
 const [city,setCity]=useState(initial?.city_id??defaultCityId??""),[mode,setMode]=useState<DateMode>(initial?.date_mode??"flexible");
 const [arrive,setArrive]=useState(initial?.arrive_on??""),[leave,setLeave]=useState(initial?.leave_on??""),[duration,setDuration]=useState(initial?.duration_days?.toString()??"");
 const [status,setStatus]=useState(initial?.status==="planned"?"planned":"considering");
 const [budget,setBudget]=useState(initial?.monthly_budget_cents!=null?(initial.monthly_budget_cents/100).toLocaleString("pt-BR",{minimumFractionDigits:2,useGrouping:false}):"");
 const [calls,setCalls]=useState(initial?.needs_calls??false),[children,setChildren]=useState(initial?.with_children??false),[pets,setPets]=useState(initial?.with_pets??false),[note,setNote]=useState(initial?.note??"");
 const [state,action,pending]=useActionState<PlanState,FormData>(async(prev,fd)=>{
  const r=await savePlan(initial?.id??null,prev,fd);if(r.status==="saved")router.push(`/estadias/${r.id}?saved=1`);return r;
 },{status:"idle"});
 const selected=cities.find(c=>c.id===city),matches=cities.filter(c=>normalize(c.name).includes(normalize(query))).slice(0,20);
 // Step actions share one row: a compact "Voltar" on the left, the main action filling the rest.
 const actions="flex items-center gap-3 pt-2";
 const back=<button type="button" onClick={()=>setStep(s=>s-1)} className={`${buttonSecondary} shrink-0 gap-1.5 px-5`}><ArrowLeft size={18} aria-hidden/>Voltar</button>;
 return <form action={action} className="space-y-5">
 <p className="text-xs font-semibold text-muted">Passo {step+1} de 3 · {selected?.name??"seu próximo destino"}</p>
 <input type="hidden" name="city_id" value={city}/><input type="hidden" name="date_mode" value={mode}/><input type="hidden" name="arrive_on" value={arrive}/><input type="hidden" name="leave_on" value={mode==="resident"?"":leave}/><input type="hidden" name="duration_days" value={duration}/>
 {step===0&&<section className="space-y-3"><h2 className="font-display text-xl font-bold">Para onde você está pensando em ir?</h2><label htmlFor="plan-city" className={label}>Buscar cidade</label><input id="plan-city" type="search" value={query} onChange={e=>setQuery(e.target.value)} className={field}/><ul className="max-h-80 overflow-y-auto space-y-1">{matches.map(c=><li key={c.id}><button type="button" onClick={()=>setCity(c.id)} aria-pressed={city===c.id} className={`min-h-12 w-full rounded-2xl px-4 text-left ${city===c.id?"bg-primary text-on-fill":"bg-surface-2"}`}>{c.name} · {c.state}</button></li>)}</ul>{!matches.length&&<p className="text-sm text-muted">Cidade não encontrada.</p>}<div className={actions}><button type="button" disabled={!city} onClick={()=>setStep(1)} className={`${buttonPrimary} flex-1`}>Próximo</button></div></section>}
 {step===1&&<section className="space-y-4"><h2 className="font-display text-xl font-bold">Como serão suas datas?</h2>{([["exact","Escolher datas específicas","Já sei quando chego e saio."],["flexible","Datas flexíveis","Ainda estou decidindo o período."],["resident","Moro aqui","Sem data de saída; também serve para ficar a longo prazo."]] as const).filter(([k])=>k!=="resident"||initial?.date_mode==="resident").map(([k,t,h])=><button key={k} type="button" aria-pressed={mode===k} onClick={()=>setMode(k)} className={`${card} w-full p-4 text-left ${mode===k?"ring-2 ring-primary":""}`}><span className="block font-semibold">{t}</span><span className="text-sm text-muted">{h}</span></button>)}
 <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className={label}>{mode==="flexible"?"A partir de (opcional)":"Chegada"}<input type="date" value={arrive} onChange={e=>setArrive(e.target.value)} className={`${field} mt-1`}/></label>{mode!=="resident"&&<label className={label}>{mode==="flexible"?"Até (opcional)":"Saída"}<input type="date" value={leave} min={arrive} onChange={e=>setLeave(e.target.value)} className={`${field} mt-1`}/></label>}</div>{mode==="flexible"&&<label className={`block ${label}`}>Duração aproximada em dias (opcional)<input type="number" min={1} max={366} value={duration} onChange={e=>setDuration(e.target.value)} className={`${field} mt-1`}/></label>}
 <div className={actions}>{back}<button type="button" onClick={()=>setStep(2)} disabled={mode==="exact"&&(!arrive||!leave)} className={`${buttonPrimary} flex-1`}>Próximo</button></div></section>}
 {step===2&&<section className="space-y-4"><h2 className="font-display text-xl font-bold">O que precisa funcionar nessa estadia?</h2><label className={`block ${label}`}>Seu plano<select name="status" value={status} onChange={e=>setStatus(e.target.value)} className={`${field} mt-1`}><option value="considering">Estou considerando</option><option value="planned">Já planejei a estadia</option></select></label><label className={`block ${label}`}>Orçamento mensal em reais (opcional)<input name="monthly_budget" inputMode="decimal" value={budget} onChange={e=>setBudget(e.target.value)} placeholder="Ex.: 4500,00" className={`${field} mt-1`}/></label>
 <div>{([["needs_calls","Preciso de um lugar adequado para chamadas",calls,setCalls],["with_children","Vou com filhos",children,setChildren],["with_pets","Vou com pets",pets,setPets]] as const).map(([name,text,checked,set])=><label key={name} className="flex min-h-12 items-center gap-3 text-sm"><input type="checkbox" name={name} checked={checked} onChange={e=>set(e.target.checked)} className="size-5 accent-primary"/>{text}</label>)}</div><label className={`block ${label}`}>O que quero conferir antes de ir (opcional)<textarea name="note" value={note} onChange={e=>setNote(e.target.value)} maxLength={500} rows={3} className={`${field} mt-1`}/></label><p className="text-xs text-muted">Seu plano, orçamento e preferências são privados. Salvar não confirma chegada nem compartilha presença.</p><div className={actions}>{back}<button type="submit" disabled={pending||!city} className={`${buttonPrimary} flex-1`}>{pending?"Salvando…":"Salvar estadia"}</button></div></section>}
 <p role="status" className="text-sm text-danger empty:hidden">{state.status==="error"?state.message:null}</p>
 </form>;
}
