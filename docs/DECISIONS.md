# Decisões

Uma linha por decisão: data, decisão, motivo.

- 2026-10-08 — Next.js 15 (App Router) + React 19 + Tailwind v4; tokens do `DESIGN.md` como variáveis CSS em `globals.css` (`@theme`). Versão estável do create-next-app.
- 2026-10-08 — pnpm 9 instalado globalmente (`npm i -g pnpm@9`) e fixado em `packageManager`.
- 2026-10-08 — Estilo base do mapa: OpenFreeMap "liberty" (`https://tiles.openfreemap.org/styles/liberty`), verificado no ar; recolorido em `applyTheme.ts` por `source-layer`/`id`.
- 2026-10-08 — Enquanto o Supabase não está configurado, `getCity` usa valores de partida de Florianópolis espelhando o seed; a tabela `cities` é a fonte de verdade assim que existir.
- 2026-10-08 — Ícones PWA gerados por rota (`/pwa-icon/[variant]`, `next/og`) em vez de PNGs versionados; inclui variante `maskable`.
- 2026-10-08 — Service worker escrito à mão (`public/sw.js`): cache-first para `/_next/static`, network-first para navegação; sem dados nem tiles em cache. Registrado só em produção.
- 2026-10-08 — Rotação do mapa desativada (carta sempre com norte para cima; a bússola recentra, não orienta).
- 2026-10-08 — Supabase CLI como dependência de desenvolvimento; `pnpm db:reset` = `supabase db reset` (local, requer Docker). Para o projeto remoto: `pnpm db:reset --linked`.
- 2026-10-08 — Playwright roda contra build de produção na porta 3100 (perfis mobile Pixel 7 e desktop); `E2E_BASE_URL` testa a URL publicada.
- 2026-10-08 — Supabase em projeto gratuito na nuvem durante o desenvolvimento (sem Docker nesta máquina); app roda local. `pnpm db:reset` usa `SUPABASE_DB_URL` quando definida, senão a pilha local.
- 2026-10-08 — `activities.capacity` conta o criador: aprovados ≤ capacity − 1; a atividade vira `full` por trigger.
- 2026-10-08 — Resumo de atividades legível também por anônimos (mapa público e prévia do WhatsApp); só canceladas ficam restritas ao criador e admin. Chat e fila continuam restritos.
- 2026-10-08 — Colunas privadas de `profiles` (bairro, estadia, presença) escondidas por privilégio de coluna; o próprio usuário lê via RPC `get_my_profile()`.
- 2026-10-08 — Colunas privilegiadas (`verified`, `role`, `approved`, `plan`, `nomad_seal`, `featured_until`…) protegidas por triggers que só bloqueiam chamadas de usuários finais (`anon`/`authenticated`); RPCs `security definer`, seed e service role passam.
- 2026-10-08 — Entrada em atividade só por RPC (`request_join`, `decide_join`, `leave_activity`); quem foi recusado não pode pedir de novo.
- 2026-10-08 — Critérios do Selo e da presença em funções SQL (`nomad_seal_min_mbps`, `nomad_seal_min_tests`, `presence_min_people`) para ajuste num só lugar.
- 2026-10-08 — Testes de RLS como testes de integração Vitest (`supabase/tests`), pulados sem chaves; criam usuários `@example.com` descartáveis.
- 2026-10-08 — Bairro do perfil em texto livre no M1; padronizar com lista de bairros no M7 (presença).
- 2026-10-08 — Cidade-piloto trocada para Santos (SP), pedido da equipe. Bbox só da área insular urbana `[-46.40, -24.00, -46.29, -23.91]`, zoom 13,2. Florianópolis segue cadastrada sem dados demo.
- 2026-10-08 — Sem tela de login no hackathon: sessão anônima do Supabase criada no middleware em `/perfil`, `/atividade/nova`, `/parceiro` e nas server actions (`ensureUser`). RLS continua valendo por usuário. `/entrar` fica no código para depois. Requer "Allow anonymous sign-ins" ligado no projeto.
- 2026-10-08 — Verificação manual desligada por `require_verification() = false` (migração 0002); voltar a `true` reativa F4/F7 sem mudar código.
- 2026-10-08 — Importação OSM: além da SPEC, `tourism=hotel`, `tourism=museum` e serviços (`shop=laundry|dry_cleaning`, `amenity=bicycle_rental|post_office`). Bairro = `addr:suburb` ou o rótulo `place=suburb|neighbourhood` mais próximo (até 2,5 km). Nova coluna `places.wheelchair`.
- 2026-10-08 — Lugares reivindicados por parceiro e Wi-Fi medido (`user_test`/`partner`) não são sobrescritos pela reimportação.
- 2026-10-08 — Dados do mapa carregados no servidor numa ida (lugares compactos + contagem de ofertas + atividades futuras) e filtrados no cliente; ficha abre sem nova requisição.
- 2026-10-08 — Pinos como imagens MapLibre geradas de SVG (ícones Lucide), clusters nativos com anel na cor da categoria dominante; atividades como marcadores DOM (poucas, animadas).
- 2026-10-08 — Rótulos das rodas só a partir do zoom 14,5, para não poluir a visão da cidade.
- 2026-10-08 — Bottom sheet: lista rola só quando cheia (DESIGN); ficha rola já na meia altura para alcançar os botões.
- 2026-10-08 — Horas das atividades demo ancoradas no fuso America/Sao_Paulo (amanhã 09:00 etc.), não em `now()` UTC.
- 2026-10-08 — Ponto de encontro escolhido arrastando o mapa até uma mira fixa (centro do mapa), mais fácil com um polegar que tocar num ponto exato. Qualquer atividade (não só `outdoor`) precisa ficar dentro do bbox da cidade.
- 2026-10-08 — Horários do formulário interpretados em -03:00 (todas as cidades-piloto em horário de Brasília); início mínimo 15 min à frente, máximo 90 dias.
- 2026-10-08 — Novas atividades chegam ao mapa por Supabase Realtime (`postgres_changes` em `activities`, filtrado pela cidade).
- 2026-10-08 — "R$ X por pessoa": antes de alguém ser aprovado, mostra a divisão "se lotar"; depois, com o grupo atual (aprovados + criador), arredondando para cima.
- 2026-10-08 — Compartilhar atividade: botão "Enviar no WhatsApp" (`wa.me/?text=`) além do compartilhamento nativo; prévia via Open Graph (título · cidade, data e ponto).
- 2026-10-08 — Identidade visual v2 (pedido da equipe: a "carta náutica" parecia jogo). App moderno: coral "Coral Santos" `#FF5B3A` como assinatura, "Atlântico" `#0B3B4A` para ações, mapa-base neutro, cartões brancos com sombras suaves, Bricolage Grotesque + Plus Jakarta Sans. DESIGN.md reescrito; tokens CSS renomeados para nomes semânticos (`canvas`, `surface`, `ink`, `muted`, `line`, `primary`, `accent`, `cat-*`).
- 2026-10-08 — Removidos da v1: moldura graduada, hachura da água, rosa dos ventos, cartucho, leitura de coordenadas, grão de papel, fonte serifada e monoespaçada, carimbo do Selo (agora `NomadBadge`).
- 2026-10-08 — Botões primários em `primary` (texto branco com contraste AA); coral reservado para marca e "criar", porque branco sobre coral não atinge AA em texto pequeno.
