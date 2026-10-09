# SoloRota

PWA mobile-first para nômades digitais no Brasil: Radar de trabalho com dados verificáveis, encontros recorrentes durante a estadia e tarefas, favoritos, agenda, gastos e serviços essenciais. 100% gratuito para nômades. Cidade-piloto: Santos (SP).

Roteiro do pitch: [docs/PITCH.md](docs/PITCH.md) · Especificação atual: [SPEC_V2_NOMADE.md](SPEC_V2_NOMADE.md) · MVP: [SPEC.md](SPEC.md) · Visual: [DESIGN.md](DESIGN.md) · Demanda: [EVIDENCE.md](EVIDENCE.md) · Decisões: [docs/DECISIONS.md](docs/DECISIONS.md) · Validação: [docs/VALIDATION.md](docs/VALIDATION.md)

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
| `pnpm test` | funções puras e RLS/RPC no banco configurado (Vitest) |
| `pnpm test:e2e --workers=1` | fluxos em celular e desktop (Playwright; na 1ª vez: `pnpm exec playwright install chromium`) |
| `pnpm db:reset` | apaga e recria o banco **local** (recusa banco remoto) |
| `pnpm db:push` | aplica migrações pendentes no Supabase da nuvem, sem apagar dados |
| `pnpm seed:demo` | cria/atualiza as contas demo do login de demonstração |
| `pnpm admin:grant <email>` | torna uma conta admin |
| `pnpm import:osm <cidade>` | importa lugares reais do OpenStreetMap (M2) |
| `pnpm demo:refresh` | renova somente dados Demo: check-ins, estadias, tarefas, séries, grupo de quatro, horários e ofertas |

Lista de espera: `/espera?utm_source=instagram&utm_campaign=<campanha>&bloco=work|bonds|week`. Resultados e micro-pesquisa em `/admin/metricas` (admin). Registros históricos conservam seus blocos antigos.

## Fluxos disponíveis (V1–V7)

- `/radar/santos`: adequação, fonte, data, confirmações, frescor, medição e selos com validade. Patrocínio não altera nota nem ordem.
- `/estadia`: onboarding, rotina e privacidade separados; Hoje, Tarefas, Agenda (.ics), Favoritos, Gastos e Pessoas. Descoberta exige opt-in e verificação de ambos; contato nas rodas, sem DM.
- `/lugar/<id>`: marcar sessão preenchida, horário do parceiro e benefício de grupo. `/serie/<id>` cria seis datas futuras; aprovar um seguidor entra nas datas com vaga.
- `/parceiro`: mínimo de participantes, horários e totais agregados de sessões, participantes e resgates.
- `/cidade/santos`: indicadores com fonte, data, amostra e marcação Demo. `/admin/metricas`: funis por sessão, retenção de séries e pesquisa.
- `/explorar`: busca de cidades cadastradas, acesso aos dados de cada cidade e diretório inicial de ferramentas de rotina. Comparação de cobertura com os concorrentes em [docs/COMPETITOR_PARITY.md](docs/COMPETITOR_PARITY.md).

Limites e pesos são hipóteses em `src/config/nomad.ts`; regras SQL equivalentes ficam nas migrações. Check-ins individuais, estadias, tarefas, gastos e favoritos são privados. Não há pagamento real no piloto.

## Publicar (V0)

URL pública: _ainda não publicada_. Implementação e validação locais até V7; publicação e push aguardam liberação da equipe, conforme decisão anterior. Migrações 0001–0019 aplicadas no Supabase configurado, sem reset remoto. A migração 0020 dos ajustes posteriores está preparada, mas ainda não aplicada: compatibilidade nos cartões do mapa e importação da etiqueta de emergência dependem dela. Aplicação remota e seus dois testes de integração aguardam autorização. Até lá, a verificação independente é `pnpm exec vitest run --exclude supabase/tests/completion.test.ts`.

1. **Banco (Supabase na nuvem):** `pnpm db:push` aplica só as migrações pendentes (usa `SUPABASE_DB_URL`). `pnpm db:reset` recusa bancos remotos, porque apaga os dados.
2. **Contas e dados demo:** `pnpm seed:demo` (Ana, Bruno, Parceiro e três perfis adicionais pela Admin API, sem privilégios admin, com `DEMO_LOGIN_PASSWORD`) e, antes de cada demo, `pnpm demo:refresh`.
3. **Auth no Supabase:** Authentication → URL Configuration: Site URL = domínio da Vercel; Redirect URLs = `https://<domínio>/**` e `http://localhost:3000/**`. Login anônimo ligado e limite alto em Rate Limits. Para o magic link aguentar a avaliação, configure SMTP próprio (Authentication → Emails → SMTP); o login de demonstração (`NEXT_PUBLIC_DEMO_LOGIN=true`) cobre a falta dele.
4. **Vercel:** `npx vercel login` (uma vez), depois `npx vercel link` e `npx vercel --prod`. Variáveis: as do `.env.example`, exceto `SUPABASE_DB_URL`. Região `gru1` (São Paulo) em `vercel.json`.
5. **Admin:** entre uma vez em `/entrar` com seu e-mail e rode `pnpm admin:grant voce@email.com`.
6. **Conferir:** `PLAYWRIGHT_BASE_URL=https://<domínio> pnpm test:e2e`.

Dados do mapa © OpenStreetMap contributors · tiles OpenFreeMap.
