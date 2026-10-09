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
