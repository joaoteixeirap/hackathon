"use client";
import Link from "next/link";
import { useState } from "react";
import { CalendarPlus,ChevronRight,MapPin,Search,Star,Users } from "lucide-react";
import type { City } from "@/lib/cities";
import { normalize } from "@/lib/places";
import { field } from "@/components/ui/styles";
import type { EventPeriod } from "@/lib/stateMap";
import { UseLocation } from "./UseLocation";
const heading="block text-xs font-semibold tracking-wide text-muted uppercase";
const PERIODS=[["upcoming","Próximos meses"],["now","Agora"],["today","Hoje"],["week","Esta semana"],["custom","Escolher datas"]] as const;
export function StateControls({cities,current,onCity,onLocated,period,onPeriod,from,to,onDates,search}:{cities:City[];current:City|null;onCity:(slug:string)=>void;onLocated:(point:{lat:number;lng:number})=>void|Promise<void>;period:EventPeriod;onPeriod:(p:EventPeriod)=>void;from:string;to:string;onDates:(from:string,to:string)=>void;search?:{run:()=>void;pending:boolean;status:string}}){
 const [q,setQ]=useState("");
 const matches=q.trim()?cities.filter(c=>normalize(c.name).includes(normalize(q))).slice(0,8):[];
 const cityLinks=current?[["Avaliar esta cidade",`/cidade/${current.slug}`,Star],["Planejar estadia",`/estadias/nova?city=${current.slug}`,CalendarPlus],["Comunidades",`/comunidades?city=${current.slug}`,Users]] as const:[];
 return <section className="space-y-5 py-4" aria-label="Exploração de São Paulo">
  <div className="space-y-2">
   <label htmlFor="map-city-search" className={heading}>Buscar cidade em SP</label>
   <div className="relative"><Search size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" aria-hidden/><input id="map-city-search" type="search" value={q} onChange={e=>setQ(e.target.value)} className="h-11 w-full rounded-full border border-line bg-surface pr-4 pl-10 text-sm text-ink placeholder:text-muted focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none" placeholder="Para onde você vai?"/></div>
   {q&&<ul className="overflow-hidden rounded-2xl border border-line bg-surface">{matches.map(c=><li key={c.slug} className="border-b border-line last:border-0"><button type="button" onClick={()=>{onCity(c.slug);setQ("");}} className="flex min-h-11 w-full items-center gap-2 px-4 text-left text-sm font-semibold hover:bg-surface-2"><MapPin size={15} className="shrink-0 text-muted" aria-hidden/>{c.name}</button></li>)}{!matches.length&&<li className="px-4 py-3 text-sm text-muted">Nenhuma cidade encontrada.</li>}</ul>}
   <UseLocation compact onLocated={onLocated}/>
  </div>
  {current&&<div className="overflow-hidden rounded-2xl border border-line">
   <div className="flex items-center gap-3 bg-primary-soft px-4 py-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface text-primary"><MapPin size={17} aria-hidden/></span><div className="min-w-0"><p className="text-xs text-muted">Cidade no mapa</p><p className="truncate font-display text-base font-bold">{current.name}</p></div></div>
   <ul className="divide-y divide-line">{cityLinks.map(([t,href,Icon])=><li key={t}><Link href={href} className="flex min-h-11 items-center gap-3 px-4 text-sm font-semibold transition hover:bg-surface-2"><Icon size={16} className="shrink-0 text-primary" aria-hidden/>{t}<ChevronRight size={15} className="ml-auto shrink-0 text-muted" aria-hidden/></Link></li>)}</ul>
  </div>}
  <fieldset className="space-y-2"><legend className={`${heading} mb-2`}>Quando ver atividades?</legend><div className="flex flex-wrap gap-1.5">{PERIODS.map(([k,t])=><button key={k} type="button" onClick={()=>onPeriod(k)} aria-pressed={period===k} className={`min-h-11 rounded-full border px-3 text-xs font-semibold transition lg:min-h-9 ${period===k?"border-primary bg-primary text-on-fill":"border-line bg-surface hover:bg-surface-2"}`}>{t}</button>)}</div></fieldset>
  {period==="custom"&&<div className="grid grid-cols-2 gap-2"><label className="text-xs font-semibold">De<input type="date" value={from} onChange={e=>onDates(e.target.value,to)} className={`${field} mt-1 min-h-11 px-2 text-sm`}/></label><label className="text-xs font-semibold">Até<input type="date" value={to} min={from} onChange={e=>onDates(from,e.target.value)} className={`${field} mt-1 min-h-11 px-2 text-sm`}/></label></div>}
  {search&&<div><button type="button" onClick={search.run} disabled={search.pending} className="min-h-11 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-primary">{search.pending?"Buscando…":"Buscar nesta área"}</button><p role="status" className="mt-2 text-xs text-muted empty:hidden">{search.status}</p></div>}
  <div className="space-y-1 border-t border-line pt-4"><p className="text-xs text-muted">Lugares e rodas cadastrados no SoloRota. A cobertura varia; ausência de registros não significa ausência de serviços.</p><div className="flex flex-wrap gap-x-4"><Link href="/estadias" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">Minhas estadias</Link><Link href="/comunidades" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">Meus grupos</Link></div></div>
 </section>;
}
