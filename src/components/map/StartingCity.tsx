"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { card,field,buttonPrimary,buttonSecondary } from "@/components/ui/styles";
import type { CityPoint } from "@/lib/stateMap";
import { locateCity } from "@/lib/locateCity";
import { normalize } from "@/lib/places";
import { UseLocation } from "./UseLocation";
import { rememberLocation } from "@/lib/locationMemory";
export function StartingCity({cities}:{cities:CityPoint[]}){
 const [query,setQuery]=useState(""),[error,setError]=useState("");const router=useRouter();
 const matches=cities.filter(c=>c.state==="SP"&&normalize(c.name).includes(normalize(query))).slice(0,12);
 return <div className="space-y-5"><section className={`${card} space-y-3 p-5`}><h2 className="font-display text-xl font-bold">Onde você está agora?</h2><p className="text-sm text-muted">Encontre lugares para trabalhar, rodas e serviços por perto. Depois, explore seu próximo destino em SP.</p><UseLocation onLocated={point=>{
  return locateCity(point,cities).then(c=>{if(c){rememberLocation(point);router.push(`/mapa/sp?city=${c.slug}`);}else setError("A exploração está focada em São Paulo. Escolha uma cidade de SP para começar.");});
 }}/><p role="status" className="text-sm text-muted empty:hidden">{error}</p><label htmlFor="starting-city" className="block text-sm font-semibold">Ou escolha sua cidade</label><input id="starting-city" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ex.: Santos, São Paulo, Campinas" className={field}/><ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">{matches.map(c=><li key={c.slug}><Link href={`/mapa/sp?city=${c.slug}`} className="flex min-h-11 items-center rounded-2xl px-3 text-sm font-semibold text-primary hover:bg-surface-2">{c.name}</Link></li>)}</ul>{!matches.length&&<p className="text-sm text-muted">Nenhuma cidade encontrada. Tente outro nome.</p>}<p className="text-xs text-muted">A cidade sugerida pela localização é aproximada. Você pode escolher outra.</p></section><Link href="/mapa/sp" className={`${buttonPrimary} w-full`}>Explorar o estado pelo mapa</Link><Link href="/estadias" className={`${buttonSecondary} w-full`}>Minhas estadias e próximos destinos</Link></div>;
}
