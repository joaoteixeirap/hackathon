import { HeartPulse, Laptop, Lock, Map as MapIcon, Store, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
import { buttonPrimary, buttonSecondary, card } from "@/components/ui/styles";
import { defaultCitySlug, getCity } from "@/lib/cities";

const title = "Sobre o SoloRota";
const description = "O mapa dos nômades digitais no Brasil: comunidade, lugares para trabalhar, saúde e moradia. Privacidade e fontes de dados.";
export const metadata: Metadata = { title: `${title} · SoloRota`, description, openGraph: { title, description, type: "website", locale: "pt_BR" } };

const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

function Item({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">{icon}</span>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-[15px] text-muted">{children}</p>
      </div>
    </li>
  );
}

export default async function AboutPage() {
  const city = await getCity(defaultCitySlug);
  const cityName = city?.name ?? "na cidade-piloto";

  return (
    <PageShell title={title}>
      <p className="-mt-2 mb-6 text-lg">
        Um mapa para quem trabalha remoto e muda de cidade: encontrar gente, um lugar com Wi-Fi bom e ajuda local sem depender de dez grupos de WhatsApp. Piloto em {cityName}.
      </p>

      <section className={`${card} p-5`} aria-labelledby="como">
        <h2 id="como" className="mb-4 font-display text-xl font-bold">
          Como funciona
        </h2>
        <ul className="space-y-4">
          <Item icon={<Users size={20} aria-hidden />} title="Rodas em grupo">
            Alguém marca uma atividade no mapa; quem quer ir pede para entrar, quem organiza aprova, e o grupo conversa no chat. Custos podem ser divididos.
          </Item>
          <Item icon={<Laptop size={20} aria-hidden />} title="Onde trabalhar e comer">
            Cafés e coworkings com Wi-Fi medido por quem usa, tomadas e o Selo Amigo do Nômade (Wi-Fi forte confirmado por 2 medições e tomadas).
          </Item>
          <Item icon={<HeartPulse size={20} aria-hidden />} title="Saúde e moradia">
            Clínicas, farmácias e hospedagens da cidade, com quem atende sem plano e em quais idiomas, quando informado.
          </Item>
          <Item icon={<Store size={20} aria-hidden />} title="Parceiros locais">
            Negócios publicam ofertas para nômades e veem quantos resgates tiveram. No piloto, valores de planos e destaque são hipóteses e a cobrança é simulada.
          </Item>
        </ul>
      </section>

      <section className={`${card} mt-6 space-y-3 p-5`} aria-labelledby="privacidade">
        <h2 id="privacidade" className="flex items-center gap-2 font-display text-xl font-bold">
          <Lock size={20} aria-hidden /> Privacidade
        </h2>
        <p className="text-[15px]">Coletamos o mínimo para o app funcionar, seguindo a LGPD.</p>
        <ul className="list-disc space-y-2 pl-5 text-[15px]">
          <li>
            <span className="font-semibold">Sem cadastro obrigatório:</span> ao agir pela primeira vez, você recebe uma sessão de visitante neste aparelho. Nome, bio, país, idiomas, cidade e datas de estadia são opcionais e você edita no perfil.
          </li>
          <li>
            <span className="font-semibold">Sua posição nunca aparece.</span> &quot;Quem está aqui&quot; mostra só quantas pessoas estão em cada bairro, e só quando são 3 ou mais. Você escolhe se entra na contagem.
          </li>
          <li>
            <span className="font-semibold">Chat só do grupo:</span> mensagens de uma roda são lidas apenas por quem organiza e por quem foi aprovado.
          </li>
          <li>
            <span className="font-semibold">Verificação:</span> a selfie com documento fica em área privada, só a equipe vê, e é apagada logo após a decisão.
          </li>
          <li>
            <span className="font-semibold">Saúde:</span> listamos lugares de saúde, mas não guardamos nenhum dado de saúde seu.
          </li>
          <li>
            <span className="font-semibold">Parceiros veem só o primeiro nome</span> de quem usou uma oferta, e a data.
          </li>
          <li>
            <span className="font-semibold">Medição de uso sem cookies de terceiros:</span> contamos visitas com um identificador aleatório guardado só neste aparelho. A rota do dia também fica só no aparelho.
          </li>
        </ul>
        <p className="text-[15px]">
          Para ver, corrigir ou apagar seus dados,{" "}
          {contact ? (
            <>
              escreva para{" "}
              <a href={`mailto:${contact}`} className="font-semibold text-primary underline-offset-4 hover:underline">
                {contact}
              </a>
              .
            </>
          ) : (
            "fale com a equipe do SoloRota."
          )}
        </p>
      </section>

      <section className={`${card} mt-6 space-y-3 p-5`} aria-labelledby="dados">
        <h2 id="dados" className="flex items-center gap-2 font-display text-xl font-bold">
          <MapIcon size={20} aria-hidden /> Fontes dos dados
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-[15px]">
          <li>
            Lugares e mapa: ©{" "}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline-offset-4 hover:underline">
              OpenStreetMap contributors
            </a>
            , sob a licença ODbL. Não copiamos telefone nem e-mail dos lugares.
          </li>
          <li>
            Mapa-base:{" "}
            <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline-offset-4 hover:underline">
              OpenFreeMap
            </a>
            .
          </li>
          <li>Wi-Fi: cada ficha mostra a origem do número, seja indicação do OpenStreetMap, declaração do local ou medição de nômades.</li>
          <li>Itens marcados &quot;Demo&quot; são fictícios, só para demonstração.</li>
        </ul>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/espera" className={buttonPrimary}>
          Entrar na lista de espera
        </Link>
        <Link href="/" className={buttonSecondary}>
          Abrir o mapa
        </Link>
      </div>
    </PageShell>
  );
}
