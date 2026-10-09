# SoloRota

PWA mobile-first em forma de mapa para nômades digitais no Brasil: comunidade (atividades em grupo, chat), lugares para trabalhar, comer, saúde e moradia, e painel de parceiros locais. Cidade-piloto: Santos (SP).

Roteiro do pitch: [docs/PITCH.md](docs/PITCH.md) · Especificação: [SPEC.md](SPEC.md) · Visual: [DESIGN.md](DESIGN.md) · Demanda: [EVIDENCE.md](EVIDENCE.md) · Decisões: [docs/DECISIONS.md](docs/DECISIONS.md)

## Rodar localmente

Requisitos: Node 20+, pnpm 9, Docker (só para o Supabase local).

```bash
pnpm install
cp .env.example .env.local   # preencha as chaves do Supabase
pnpm dev                      # http://localhost:3000
```

Sem chaves do Supabase o mapa abre mesmo assim (cidade padrão), sem dados.

### Supabase

1. Crie um projeto (região São Paulo) e preencha `.env.local`, incluindo `SUPABASE_DB_URL` (Connect → Session pooler).
2. Em Authentication → URL Configuration: Site URL `http://localhost:3000` e Redirect URL `http://localhost:3000/**`.
3. `pnpm db:reset` aplica migrações e seed do zero (apaga os dados das tabelas do app). No banco da nuvem use `pnpm db:push` (só migrações novas, sem apagar nada); o `db:reset` recusa bancos remotos.
   Ligue também "Allow anonymous sign-ins" (Authentication → Sign In / Providers): o app usa sessão de visitante no lugar da tela de login.
4. Para tornar sua conta admin (acesso a `/admin/verificacoes`), entre uma vez em `/entrar` e rode no SQL Editor:
   `update profiles set role = 'admin', verified = true where id = (select id from auth.users where email = 'seu@email');`

## Comandos

| Comando | O que faz |
| --- | --- |
| `pnpm dev` | servidor de desenvolvimento |
| `pnpm build` / `pnpm start` | build e servidor de produção |
| `pnpm lint` | ESLint |
| `pnpm test` | testes unitários (Vitest) |
| `pnpm test:e2e` | smoke (Playwright; na 1ª vez: `pnpm exec playwright install chromium`) |
| `pnpm db:reset` | apaga e recria o banco **local** (recusa banco remoto) |
| `pnpm db:push` | aplica migrações pendentes no Supabase da nuvem, sem apagar dados |
| `pnpm seed:demo` | cria/atualiza as contas demo do login de demonstração |
| `pnpm admin:grant <email>` | torna uma conta admin |
| `pnpm import:osm <cidade>` | importa lugares reais do OpenStreetMap (M2) |
| `pnpm demo:refresh` | antes de uma demo: rodas demo voltam para amanhã, presença e ofertas demo renovadas (não apaga nada) |

Lista de espera: `/espera?utm_source=instagram&utm_campaign=<campanha>&bloco=comunidade|trabalho|saude_moradia`. Resultados em `/admin/metricas` (admin).

## Publicar (V0)

URL pública: _ainda não publicada_.

1. **Banco (Supabase na nuvem):** `pnpm db:push` aplica só as migrações pendentes (usa `SUPABASE_DB_URL`). `pnpm db:reset` recusa bancos remotos, porque apaga os dados.
2. **Contas e dados demo:** `pnpm seed:demo` (contas Ana, Bruno e Parceiro pela Admin API, com `DEMO_LOGIN_PASSWORD`) e, antes de cada demo, `pnpm demo:refresh`.
3. **Auth no Supabase:** Authentication → URL Configuration: Site URL = domínio da Vercel; Redirect URLs = `https://<domínio>/**` e `http://localhost:3000/**`. Login anônimo ligado e limite alto em Rate Limits. Para o magic link aguentar a avaliação, configure SMTP próprio (Authentication → Emails → SMTP); o login de demonstração (`NEXT_PUBLIC_DEMO_LOGIN=true`) cobre a falta dele.
4. **Vercel:** `npx vercel login` (uma vez), depois `npx vercel link` e `npx vercel --prod`. Variáveis: as do `.env.example`, exceto `SUPABASE_DB_URL`. Região `gru1` (São Paulo) em `vercel.json`.
5. **Admin:** entre uma vez em `/entrar` com seu e-mail e rode `pnpm admin:grant voce@email.com`.
6. **Conferir:** `PLAYWRIGHT_BASE_URL=https://<domínio> pnpm test:e2e`.

Dados do mapa © OpenStreetMap contributors · tiles OpenFreeMap.
