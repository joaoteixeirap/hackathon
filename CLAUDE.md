# CLAUDE.md — SoloRota (nome provisório)

Leia este arquivo inteiro, depois `SPEC.md` (produto, dados, telas, critérios de aceite), `DESIGN.md` (identidade visual do mapa), `EVIDENCE.md` (dados de demanda e como usá-los) e `SPEC_V2_NOMADE.md` (diferenciais; vale onde houver conflito). Trabalhe por marco (M0 a M8 em `SPEC.md`, depois V0 a V7 em `SPEC_V2_NOMADE.md`), na ordem, e faça commit ao fim de cada marco.

## O que é

Plataforma web (PWA, mobile-first) cuja tela principal é um **mapa**, no estilo de navegar pelo Google Maps, onde o nômade digital brasileiro (e o estrangeiro com visto VITEM XIV) encontra:

- **Comunidade:** atividades em grupo por cidade e data, pedido de entrada com aprovação, chat do grupo, divisão de custos, reputação.
- **Lugares e serviços locais:** onde trabalhar (Wi-Fi), comer, ser atendido (saúde), morar por temporada, passeios.
- **Painel do parceiro:** negócios locais cadastram lugar e ofertas e veem quem resgatou. Parceiros são a fonte de receita (mensalidade de destaque e comissão).

Cidade-piloto padrão: Santos (SP) (decisão da equipe em 08/10/2026; Florianópolis continua cadastrada). Tudo deve ser configurável por cidade (tabela `cities`), sem código específico de cidade.

## Stack (não troque sem motivo forte)

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase: Auth (magic link por e-mail), Postgres com RLS, Realtime (chat), Storage
- MapLibre GL JS para o mapa (estilo vetorial livre, recolorido conforme `DESIGN.md`)
- PWA: `manifest.webmanifest`, ícones, `display: standalone`; service worker simples só para cache de shell
- Testes: Playwright (smoke do fluxo principal) e Vitest para funções puras
- Deploy: Vercel

## Comandos esperados (crie-os no M0)

```
pnpm dev            # desenvolvimento
pnpm build          # build de produção
pnpm lint
pnpm test           # vitest
pnpm test:e2e       # playwright
pnpm db:reset       # aplica supabase/migrations e supabase/seed.sql
pnpm import:osm     # importa cafés, coworkings, clínicas etc. do OpenStreetMap para a cidade
```

Variáveis de ambiente em `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (só servidor e scripts), `NEXT_PUBLIC_DEFAULT_CITY=florianopolis`, `NEXT_PUBLIC_MAP_STYLE_URL`.

## Regras do projeto

1. **Idioma:** textos de interface em português do Brasil; código, nomes de tabelas, variáveis e commits em inglês.
2. **Dados falsos nunca passam por reais.** Todo registro de demonstração tem `is_demo = true` e aparece com o rótulo "Demo" na interface. Nunca invente nome, endereço, telefone, preço ou nota de negócio real. Lugares reais vêm do OpenStreetMap (`pnpm import:osm`) ou do cadastro de parceiros.
3. **Privacidade (LGPD):** coletar o mínimo. Posição de pessoas nunca é exata nem individual: só contagem agregada por bairro, e só quando há 3 ou mais pessoas. Documento e selfie de verificação ficam em bucket privado, só o admin lê, e são apagados após a decisão. O app lista prestadores de saúde, mas **não guarda dado de saúde** de usuários.
4. **Segurança:** RLS ativo em todas as tabelas, com políticas escritas e testadas. A service role key nunca vai ao navegador. Validar entrada no servidor.
5. **Mobile primeiro:** projete em 390 px de largura, depois ≥ 1024 px (painel lateral no lugar da bottom sheet). O mapa ocupa a tela inteira.
6. **Acessibilidade:** contraste AA, alvos de toque ≥ 44 px, pins diferenciados por ícone e não só por cor, `prefers-reduced-motion` respeitado.
7. **Simplicidade:** nada de pagamento real (a cobrança é simulada), IA, push, app nativo ou mapa em tempo real de pessoas. Estão fora do escopo (ver "Fora do escopo" em `SPEC.md`).
8. **Não peça confirmação para decisões de rotina.** Escolha o padrão razoável, registre em `docs/DECISIONS.md` (uma linha por decisão) e siga. Pergunte só se estiver bloqueado.

Invariantes do `SPEC_V2_NOMADE.md` (valem sobre as regras acima em caso de conflito):

- **I1. Gratuito para o nômade.** Nenhuma função é bloqueada por pagamento: sem plano, premium, assinatura, "Plus" ou cobrança ao nômade. Se existir qualquer vestígio **voltado ao nômade** no código ou na interface (`premium`, `assinatura`, `plus`, plano pago de usuário), remova. O plano/mensalidade de destaque **do parceiro** (simulado) permanece. Receita vem só de **parceiros** (destaque, benefícios de grupo e comissão, tudo simulado no MVP).
- **I2. Todo dado local mostra origem e data.** Nenhuma informação de lugar aparece sem: **fonte**, **data da última verificação** e **quantas pessoas confirmaram**. Sem dado, mostra "Sem verificação ainda" e convida a medir.
- **I3. Integridade do Radar.** Pagamento de parceiro (destaque, plano) **nunca** altera a pontuação, a ordem ou os filtros do Radar. O destaque pago só aparece no mapa com o rótulo visível "Patrocinado". Há teste automático para isso.
- **I4. Sem alegação de exclusividade.** Na interface, em `/sobre`, `/espera`, README e textos de pitch, é proibido: "único", "exclusivo", "primeiro app", "inédito", "nenhum concorrente", "revolucionário". Permitido: "reunimos X, Y e Z", "com data de verificação", "100% gratuito para nômades". Nunca citar concorrentes na interface.
- **I5. Privacidade reforçada.** (a) Descoberta de pessoas é **opt-in** (`discoverable`, separado de `share_presence`), só entre usuários verificados, **sem mensagem direta** (o contato acontece em atividades e grupos). (b) Check-ins de lugar são **anônimos para os outros** (ninguém vê quem mediu; isso evitaria expor histórico de onde a pessoa esteve): só o próprio usuário lê as suas linhas; os demais veem agregados. (c) Geolocalização só serve para um booleano `near_place`; **nunca grave coordenadas** do usuário. (d) Nada de microfone. (e) Gastos, tarefas, favoritos e estadias são privados do dono.
- **I6. Demo honesto.** Dados de demonstração continuam marcados com `is_demo`/"Demo". Painéis com poucos dados mostram **estado vazio honesto** ("Poucos dados ainda"), nunca números inventados.
- **I7. Tudo que é novo emite evento** (seção 12 do `SPEC_V2_NOMADE.md`), sem dado pessoal.

## Definição de pronto de cada marco

- Critérios de aceite do marco em `SPEC.md` cumpridos e verificados rodando o app.
- `pnpm lint`, `pnpm test` e `pnpm build` passam.
- Fluxo novo coberto por ao menos um teste Playwright quando o marco indicar.
- Commit com mensagem curta no imperativo.

## Ordem de prioridade se o tempo apertar

M0 a M5 (mapa, lugares, atividades, entrada e chat) formam o mínimo para a demonstração do hackathon. M6 e M7 (painel do parceiro e ofertas) vêm em seguida. M8 (acabamento do pitch e página de lista de espera) por último, mas a página `/espera` é barata e deve existir cedo, porque gera a evidência de demanda.
