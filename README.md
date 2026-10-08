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
