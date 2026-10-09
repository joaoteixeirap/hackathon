import { createClient } from "@/lib/supabase/server";
import { usageCounts,surveyResults,engagementFunnels,type UsageEvent,type SurveyAnswer } from "@/lib/engagement";
import { card } from "@/components/ui/styles";
async function read<T>(table:string,select:string,since:string|null):Promise<T[]> {
  const db=await createClient();const rows:T[]=[];
  for(let offset=0;offset<50_000;offset+=1000) {
    let query=db.from(table).select(select).order("created_at").range(offset,offset+999);
    if(since) query=query.gte("created_at",since);
    const {data,error}=await query;if(error) throw error;
    rows.push(...(data as unknown as T[]));if(data.length<1000)break;
  }
  return rows;
}
export async function EngagementPanel({since}:{since:string|null}) {
  try {
    const [events,answers,totals]=await Promise.all([read<UsageEvent>("events","name,props,session_id,created_at",since),read<SurveyAnswer>("micro_answers","question_key,answer_key,session_id",since),(await createClient()).rpc("engagement_totals",{p_since:since})]);
    const counts=usageCounts(events);const survey=surveyResults(answers);const funnels=engagementFunnels(events);
    return <><section className={`${card} mt-6 space-y-5 p-5`} aria-label="Qual aposta engaja"><h2 className="font-display text-xl font-bold">Qual aposta engaja</h2><p className="text-sm text-muted">Aparelhos distintos por etapa; etapas independentes, sem afirmar conversão ou causalidade. Eventos sem identificador do aparelho: {counts.untracked}.</p>{[["A1 · Trabalhar com confiança",counts.work],["A2 · Vínculos durante a estadia",counts.bonds],["A3 · Sua semana numa jornada",counts.week],["Jornada · Local, grupo, benefício, registro",counts.journey]].map(([title,raw])=><div key={String(title)}><h3 className="mb-2 font-semibold">{String(title)}</h3><ul className="space-y-2">{(raw as {label:string;n:number}[]).map(s=><li key={s.label} className="flex justify-between gap-3 text-sm"><span>{s.label}</span><span className="font-semibold tabular-nums">{s.n}</span></li>)}</ul></div>)}<p className="text-sm">Participações aprovadas no período: {totals.data?.approved ?? "indisponível"} · pessoas com pelo menos duas atividades concluídas: {totals.data?.returning ?? "indisponível"}.</p><p className="text-xs text-muted">Retenção agregada do banco; nenhuma identificação de participantes aparece.</p></section>
    <section className={`${card} mt-6 space-y-4 p-5`} aria-label="Funis por aposta"><h2 className="font-display text-xl font-bold">Funis por aposta</h2><p className="text-sm text-muted">A1, A3 e jornada: mesmo aparelho, etapas em ordem. A2: pessoas agregadas do banco. Quem entra por outro caminho aparece nas contagens independentes acima.</p>{[["A1 · Trabalho",funnels.work],["A2 · Vínculos",[{label:"Seguiram série",n:totals.data?.series_requested??0},{label:"Aprovados na série",n:totals.data?.series_approved??0},{label:"Duas atividades concluídas",n:totals.data?.series_returning??0}]],["A3 · Semana",funnels.week],["Jornada",funnels.journey]].map(([name,rows])=><div key={String(name)}><h3 className="font-semibold">{String(name)}</h3><ol className="mt-2 space-y-1 text-sm">{(rows as {label:string;n:number}[]).map(s=><li className="flex justify-between gap-3" key={s.label}><span>{s.label}</span><span>{s.n}</span></li>)}</ol></div>)}</section>
    <section className={`${card} mt-6 space-y-5 p-5`} aria-label="Resultados da micro-pesquisa"><h2 className="font-display text-xl font-bold">Micro-pesquisa</h2>{survey.map(q=><div key={q.key}><h3 className="font-semibold">{q.title}</h3><p className="mb-2 text-sm text-muted">n = {q.n}{q.small ? " · amostra pequena" : ""}</p>{q.n ? <ul className="space-y-2">{q.options.map(o=><li key={o.key} className="text-sm"><div className="flex justify-between gap-3"><span>{o.label}</span><span className="shrink-0 tabular-nums">{o.n} · {Math.round(o.fraction*100)}%</span></div><div className="mt-1 h-1.5 rounded-full bg-surface-2"><div className="h-full rounded-full bg-primary" style={{width:`${o.fraction*100}%`}}/></div></li>)}</ul> : <p className="text-sm text-muted">Poucos dados ainda. Nenhuma resposta no período.</p>}</div>)}</section></>;
  } catch {return <p role="status" className={`${card} mt-6 p-5 text-sm`}>Não foi possível carregar a medição de uso agora.</p>;}
}
