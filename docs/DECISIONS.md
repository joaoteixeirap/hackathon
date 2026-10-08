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
