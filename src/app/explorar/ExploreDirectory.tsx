"use client";

import Link from "next/link";
import { useState } from "react";
import { card, field } from "@/components/ui/styles";

const fold = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function ExploreDirectory({ cities }: { cities: { slug: string; name: string }[] }) {
  const [query, setQuery] = useState("");
  const [limit,setLimit]=useState(24);
  const visible = cities.filter(c => fold(c.name).includes(fold(query.trim())));
  const link = "inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-primary hover:bg-surface-2";
  return <>
    <section aria-label="Cidades cadastradas">
      <h2 className="mb-3 font-display text-xl font-bold">Escolha uma cidade</h2>
      <p className="mb-3 text-sm text-muted">A cobertura varia por cidade. Abra os dados locais para consultar fontes, datas e amostras; onde faltam dados, você pode ajudar a mapear.</p>
      <label className="block text-sm font-semibold" htmlFor="city-search">Buscar cidade</label>
      <input id="city-search" type="search" value={query} onChange={e => {setQuery(e.target.value);setLimit(24);}} className={`${field} mt-1 mb-3`} />
      <p role="status" className="mb-3 text-xs text-muted">{visible.length} {visible.length === 1 ? "cidade encontrada" : "cidades encontradas"}</p>
      <div className="mb-3 flex flex-wrap gap-x-3"><Link href="/mapa/sp" className={link}>Explorar todo SP pelo mapa</Link><Link href="/estadias" className={link}>Minhas estadias</Link><Link href="/comunidades" className={link}>Comunidades</Link></div>
      {visible.length ? <ul className="space-y-3">{visible.slice(0,limit).map(c => <li key={c.slug} className={`${card} p-4`}>
        <h3 className="font-display text-lg font-bold">{c.name}</h3>
        <div className="mt-2 flex flex-wrap gap-1">
          <Link href={`/mapa/${c.slug}`} className={link}>Abrir mapa de {c.name}</Link>
          <Link href={`/radar/${c.slug}`} className={link}>Onde trabalhar</Link>
          <Link href={`/cidade/${c.slug}`} className={link}>Dados da cidade</Link>
        </div>
      </li>)}</ul> : <p className={`${card} p-4 text-sm`}>Nenhuma cidade encontrada. Tente outro nome.</p>}
      {visible.length>limit&&<button type="button" onClick={()=>setLimit(n=>n+24)} className={link}>Mostrar mais cidades</button>}
    </section>
    <section aria-label="Organize sua semana" className="mt-7">
      <h2 className="mb-3 font-display text-xl font-bold">Organize sua semana</h2>
      <div className="flex flex-wrap gap-1">
        <Link href="/estadia?aba=agenda" className={link}>Agenda e exportação para calendário</Link>
        <Link href="/estadia?aba=gastos" className={link}>Orçamento e gastos</Link>
        <Link href="/estadia?aba=tarefas" className={link}>Checklist da estadia</Link>
        <Link href="/estadia?aba=pessoas" className={link}>Pessoas nas mesmas datas</Link>
      </div>
    </section>
  </>;
}
