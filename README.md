# SoloRota

PWA mobile-first em forma de mapa para nômades digitais no Brasil: comunidade (atividades em grupo, chat), lugares para trabalhar, comer, saúde e moradia, e painel de parceiros locais. Cidade-piloto: Florianópolis.

Especificação: [SPEC.md](SPEC.md) · Visual: [DESIGN.md](DESIGN.md) · Demanda: [EVIDENCE.md](EVIDENCE.md) · Decisões: [docs/DECISIONS.md](docs/DECISIONS.md)

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
3. `pnpm db:reset` aplica migrações e seed (apaga os dados das tabelas do app).
4. Para tornar sua conta admin, entre uma vez no app e rode no SQL Editor:
   `update profiles set role = 'admin', verified = true where id = (select id from auth.users where email = 'seu@email');`

## Comandos

| Comando | O que faz |
| --- | --- |
| `pnpm dev` | servidor de desenvolvimento |
| `pnpm build` / `pnpm start` | build e servidor de produção |
| `pnpm lint` | ESLint |
| `pnpm test` | testes unitários (Vitest) |
| `pnpm test:e2e` | smoke (Playwright; na 1ª vez: `pnpm exec playwright install chromium`) |
| `pnpm db:reset` | aplica `supabase/migrations` e `supabase/seed.sql` no Supabase local |
| `pnpm import:osm <cidade>` | importa lugares reais do OpenStreetMap (M2) |

## Deploy

Vercel: importe o repositório, defina as variáveis de `.env.example` e publique. `SUPABASE_SERVICE_ROLE_KEY` só no servidor.

Dados do mapa © OpenStreetMap contributors · tiles OpenFreeMap.
