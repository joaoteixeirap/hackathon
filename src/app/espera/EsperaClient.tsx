"use client";

import { Check, HeartPulse, Laptop, MessageCircle, Users } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { buttonPrimary, buttonSecondary, field, label } from "@/components/ui/styles";
import { AUDIENCE_LABELS, AUDIENCES, BLOCKS, type Block } from "@/lib/analytics";
import { track, visitorId } from "@/lib/track";
import { joinWaitlist, type WaitlistState } from "./actions";

const COPY: Record<Block, { icon: React.ReactNode; tone: string; title: string; lead: string; points: string[] }> = {
  comunidade: {
    icon: <Users size={22} aria-hidden />,
    tone: "bg-accent",
    title: "Nunca mais trabalhar sozinho",
    lead: "Rodas em grupo marcadas no mapa da cidade.",
    points: ["Dia de trabalho conjunto, praia, comida, cultura", "Peça para entrar e converse no chat do grupo", "Custos divididos automaticamente"],
  },
  trabalho: {
    icon: <Laptop size={22} aria-hidden />,
    tone: "bg-cat-work",
    title: "Onde trabalhar e comer bem",
    lead: "Cafés e coworkings com Wi-Fi medido por quem usa.",
    points: ["Velocidade real do Wi-Fi e tomadas", "Selo Amigo do Nômade", "Ofertas de parceiros locais"],
  },
  saude_moradia: {
    icon: <HeartPulse size={22} aria-hidden />,
    tone: "bg-cat-health",
    title: "Saúde e moradia sem susto",
    lead: "O que resolver quando você chega numa cidade nova.",
    points: ["Clínicas que atendem sem plano e em outros idiomas", "Aluguel por temporada perto do que importa", "Tudo num mapa só"],
  },
};

type Props = {
  cityName: string;
  cities: { slug: string; name: string }[];
  defaultCity: string;
  utmSource: string | null;
  utmCampaign: string | null;
  initialBlock: Block | null;
};

export function EsperaClient({ cityName, cities, defaultCity, utmSource, utmCampaign, initialBlock }: Props) {
  const [state, action, pending] = useActionState<WaitlistState, FormData>(joinWaitlist, { status: "idle" });
  const [block, setBlock] = useState<Block | null>(initialBlock);
  const [sid, setSid] = useState("");
  const formRef = useRef<HTMLDivElement>(null);
  const utm = { ...(utmSource ? { utm_source: utmSource } : {}), ...(utmCampaign ? { utm_campaign: utmCampaign } : {}) };

  useEffect(() => {
    setSid(visitorId());
    track("view_espera", { ...utm, ...(initialBlock ? { block: initialBlock } : {}) });
    // Once per page view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choose(b: Block) {
    setBlock(b);
    track(`click_block_${b}`, { block: b, ...utm });
    formRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    formRef.current?.querySelector<HTMLInputElement>("input[name=email]")?.focus({ preventScroll: true });
  }

  const e = state.errors ?? {};
  const done = state.status === "done" || state.status === "already";
  const shareText = `Achei um app que junta nômades digitais em ${cityName}: rodas em grupo, cafés com Wi-Fi bom e ajuda local. Entra na lista: `;

  return (
    <>
      <section aria-labelledby="blocks-title" className="space-y-3">
        <h2 id="blocks-title" className="sr-only">
          O que o SoloRota resolve
        </h2>
        {BLOCKS.map((b) => {
          const c = COPY[b];
          const selected = block === b;
          return (
            <article key={b} className={`rounded-3xl border bg-surface p-5 shadow-soft-sm transition ${selected ? "border-accent ring-4 ring-accent/20" : "border-line"}`}>
              <div className="flex items-start gap-3">
                <span className={`grid size-11 shrink-0 place-items-center rounded-2xl text-white ${c.tone}`}>{c.icon}</span>
                <div className="min-w-0">
                  <h3 className="font-display text-xl leading-tight font-bold">{c.title}</h3>
                  <p className="text-sm text-muted">{c.lead}</p>
                </div>
              </div>
              <ul className="mt-3 space-y-1.5 text-[15px]">
                {c.points.map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <Check size={16} className="mt-1 shrink-0 text-success" aria-hidden /> {p}
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => choose(b)} aria-pressed={selected} className={`${selected ? buttonPrimary : buttonSecondary} mt-4 w-full`}>
                {selected ? "É isso que eu quero" : "Quero isso"}
              </button>
            </article>
          );
        })}
      </section>

      <div ref={formRef} className="scroll-mt-20">
        <section aria-labelledby="form-title" className="mt-8 rounded-3xl bg-primary p-5 text-on-fill shadow-soft-md">
          {done ? (
            <div role="status" className="space-y-3">
              <p className="font-display text-2xl font-bold">{state.status === "already" ? "Você já estava na lista!" : "Você está na lista!"}</p>
              <p>Avisamos por e-mail quando abrirmos na sua cidade. Chame quem também vive na estrada:</p>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareText + (typeof window !== "undefined" ? `${window.location.origin}/espera?utm_source=whatsapp&utm_campaign=indicacao` : ""))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#1A8D47] px-6 font-semibold text-white"
              >
                <MessageCircle size={18} aria-hidden /> Enviar no WhatsApp
              </a>
            </div>
          ) : (
            <form action={action} className="space-y-4" noValidate>
              <h2 id="form-title" className="font-display text-2xl font-bold">
                Entre na lista de espera
              </h2>
              <input type="hidden" name="origin_block" value={block ?? ""} />
              <input type="hidden" name="utm_source" value={utmSource ?? ""} />
              <input type="hidden" name="utm_campaign" value={utmCampaign ?? ""} />
              <input type="hidden" name="sid" value={sid} />

              <div className="space-y-1.5">
                <label htmlFor="email" className={`${label} text-on-fill`}>
                  Seu e-mail
                </label>
                <input id="email" name="email" type="email" autoComplete="email" required placeholder="voce@email.com" className={field} aria-invalid={!!e.email} />
                {e.email && <p className="text-sm font-semibold">{e.email}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="city" className={`${label} text-on-fill`}>
                  Cidade de interesse
                </label>
                <select id="city" name="city" defaultValue={defaultCity} className={field}>
                  {cities.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                  <option value="outra">Outra cidade</option>
                </select>
              </div>

              <fieldset className="space-y-2">
                <legend className={`${label} text-on-fill`}>Você é</legend>
                {AUDIENCES.map((a) => (
                  <label key={a} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl bg-white/10 px-3.5 has-[:checked]:bg-white/25">
                    <input type="radio" name="audience" value={a} defaultChecked={a === "nomad_br"} className="size-5 accent-[var(--accent)]" />
                    {AUDIENCE_LABELS[a]}
                  </label>
                ))}
                {e.audience && <p className="text-sm font-semibold">{e.audience}</p>}
              </fieldset>

              <button
                type="submit"
                disabled={pending}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-surface px-6 font-bold text-ink shadow-soft-sm transition hover:brightness-95 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-surface/40 disabled:opacity-60"
              >
                {pending ? "Enviando…" : "Quero entrar"}
              </button>
              <p role="status" className="text-sm font-semibold empty:hidden">
                {state.message}
              </p>
              <p className="text-xs opacity-80">Só usamos seu e-mail para avisar da abertura. Sem spam, e você sai quando quiser.</p>
            </form>
          )}
        </section>
      </div>
    </>
  );
}
