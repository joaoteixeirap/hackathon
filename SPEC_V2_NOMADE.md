# SPEC_V2_NOMADE.md — Diferenciais para nômades digitais (adendo)

Versão de 09/10/2026. Leia depois de `CLAUDE.md`, `SPEC.md`, `DESIGN.md` e `EVIDENCE.md`. Este arquivo **acrescenta e substitui trechos** deles; a seção 3 lista exatamente o que muda. Onde houver conflito, **este arquivo vale**.

Origem: dois estudos da equipe (comparação com NomadX, Nomadtable, The Nomadic Club e Nomads.com/Nomad List; e diferenciais propostos). Tudo aqui é **hipótese de produto**, sem entrevistas. Por isso cada feature novo emite eventos de uso (seção 12), para a equipe mostrar o que engaja em vez de afirmar.

---

## 0. Como trabalhar (para o Claude Code)

1. O MVP M0–M8 já existe. **Não reescreva** o que funciona. Antes de qualquer coisa, leia o repositório, compare com `SPEC.md` e registre em `docs/DECISIONS.md` onde o código diverge (uma linha por divergência).
2. **Banco:** não edite `0001_init.sql`. Crie `0002_nomad_v2.sql` (e `0003…` se precisar). Ajuste o que for necessário no código existente para acompanhar.
3. Siga os marcos **V0 a V7** (seção 10), na ordem. **Cada marco termina publicado** (deploy) e com os testes verdes. O deploy nunca espera os extras.
4. Faça a **fatia mais fina** que cumpra o critério de aceite de cada feature. Sem generalizações, sem painéis de configuração, sem bibliotecas novas se o navegador já resolve.
5. Todos os limites, pesos e prazos ficam em **`src/config/nomad.ts`** (constantes nomeadas, comentadas como "hipótese"). Nenhum número mágico espalhado.
6. Decisões de rotina: escolha, registre em `docs/DECISIONS.md` e siga. Pergunte só se estiver bloqueado (ex.: faltam credenciais).
7. Prioridades: **P0** = obrigatório para a demo; **P1** = entra se couber; **P2** = só se sobrar tempo. Ordem de corte, se o tempo apertar: P2 → E5 → E6 → T3 → S2 → J5 → J3 → J2 → E4.

---

## 1. Tese de produto e mapa de diferenciais

**Pergunta central:** por que um nômade usaria o SoloRota em vez de NomadX, Nomadtable, The Nomadic Club ou Nomad List?

**Tese:** unir **rotina de trabalho verificável** + **comunidade compatível com o período de estadia** + **soluções locais acionáveis**, tudo **gratuito para o nômade**, em **uma cidade com profundidade** (a cidade-piloto), e não um ranking mundial.

**O que os concorrentes já fazem (não é diferencial nosso):** chat, mapa, grupos, criação de eventos, indicação de coworkings, recomendações de cidades, descontos, verificação de perfil e anúncios de estabelecimentos com métricas. Podem existir no nosso produto, mas **nunca são apresentados como exclusivos** (regra I4).

| Aposta | O que entregamos | Features |
| --- | --- | --- |
| **A1. Trabalhar com confiança** | Em segundos, o nômade acha um lugar adequado à sua rotina e vê **quando** os dados foram verificados e por quem (de forma anônima) | R1–R5, T1–T3 |
| **A2. Vínculos durante a estadia** | Encontros pequenos e **recorrentes** com pessoas que estarão na cidade **nas mesmas semanas** e têm rotina parecida | S1–S5 |
| **A3. A semana numa única jornada** | Trabalho, convivência e necessidades locais (tarefas, favoritos, agenda, gastos, serviços essenciais) num só lugar | E1–E6, J1–J5 |

Transversal: **100% das funções gratuitas** (I1) e **medição de uso em vez de entrevistas** (M1–M3).

---

## 2. Invariantes novos (copie para o `CLAUDE.md`, seção "Regras do projeto")

- **I1. Gratuito para o nômade.** Nenhuma função é bloqueada por pagamento: sem plano, premium, assinatura, "Plus" ou cobrança ao nômade. Se existir qualquer vestígio **voltado ao nômade** no código ou na interface (`premium`, `assinatura`, `plus`, plano pago de usuário), remova. O plano/mensalidade de destaque **do parceiro** (simulado) permanece. Receita vem só de **parceiros** (destaque, benefícios de grupo e comissão, tudo simulado no MVP).
- **I2. Todo dado local mostra origem e data.** Nenhuma informação de lugar aparece sem: **fonte**, **data da última verificação** e **quantas pessoas confirmaram**. Sem dado, mostra "Sem verificação ainda" e convida a medir.
- **I3. Integridade do Radar.** Pagamento de parceiro (destaque, plano) **nunca** altera a pontuação, a ordem ou os filtros do Radar. O destaque pago só aparece no mapa com o rótulo visível "Patrocinado". Há teste automático para isso.
- **I4. Sem alegação de exclusividade.** Na interface, em `/sobre`, `/espera`, README e textos de pitch, é proibido: "único", "exclusivo", "primeiro app", "inédito", "nenhum concorrente", "revolucionário". Permitido: "reunimos X, Y e Z", "com data de verificação", "100% gratuito para nômades". Nunca citar concorrentes na interface.
- **I5. Privacidade reforçada.** (a) Descoberta de pessoas é **opt-in** (`discoverable`, separado de `share_presence`), só entre usuários verificados, **sem mensagem direta** (o contato acontece em atividades e grupos). (b) Check-ins de lugar são **anônimos para os outros** (ninguém vê quem mediu; isso evitaria expor histórico de onde a pessoa esteve): só o próprio usuário lê as suas linhas; os demais veem agregados. (c) Geolocalização só serve para um booleano `near_place`; **nunca grave coordenadas** do usuário. (d) Nada de microfone. (e) Gastos, tarefas, favoritos e estadias são privados do dono.
- **I6. Demo honesto.** Dados de demonstração continuam marcados com `is_demo`/"Demo". Painéis com poucos dados mostram **estado vazio honesto** ("Poucos dados ainda"), nunca números inventados.
- **I7. Tudo que é novo emite evento** (seção 12), sem dado pessoal.

---

## 3. O que muda nos arquivos anteriores (overrides)

| Onde | Mudança |
| --- | --- |
| `SPEC.md` F2 — Selo Amigo do Nômade | Novos critérios e **validade** (R3). O selo expira; use `seal_valid_until` e a função `isSealActive`, nunca o booleano cru. |
| `SPEC.md` F12 — Teste de Wi-Fi | Vira **check-in de local de trabalho** (R1/R2): mede download, upload, ping, estabilidade e coleta tomadas, ruído, chamada e política de permanência. A tabela `wifi_tests` é migrada para `place_checkins`. |
| `SPEC.md` F13 — `/espera` | Os 3 blocos passam a ser as 3 apostas (M3). `origin_block` ∈ `work`, `bonds`, `week`. Saúde e moradia saem do título e viram **Serviços essenciais** dentro da aposta 3. |
| `SPEC.md` F1 — filtros do mapa | Acrescentar "Dados recentes" (T2) e "Modo chamada" (R4). |
| `SPEC.md` F3 — atividades | Acrescentar repetição semanal (S3) e atalho "marcar sessão aqui" (J1). |
| `SPEC.md` F10 — painel do parceiro | Acrescentar benefício de grupo (J2), horários ociosos (J3) e sessões marcadas (J5). |
| `EVIDENCE.md` §4 | **Ignore** "assinatura de R$ 19,90/mês ou R$ 99/ano": não existe mais (I1). O modelo é 100% B2B. |
| `DESIGN.md` | Acrescentar os componentes da seção 9 deste arquivo. A navegação inferior passa a ser **Mapa · Radar · ＋ · Estadia · Perfil**; "Grupos" fica como aba "Atividades" do Mapa (mantenha a rota `/grupos` redirecionando, se existir). |
| `places.quiet_level` | Padronize **1 = barulhento … 5 = silencioso** e documente em `DECISIONS.md` (confira como está hoje no código). |

---

## 4. Features — A1: Trabalhar com confiança

### R1. Check-in de local de trabalho — P0
Fluxo `Medir agora` na ficha de qualquer lugar `work` ou `eat` (cafés), em 3 passos numa bottom sheet:
1. **Confirmações obrigatórias:** caixa "Estou no Wi-Fi deste local" (marca `on_venue_wifi`). Se `navigator.connection?.type === 'cellular'`, avisar e exigir a marcação mesmo assim. Pedir geolocalização de forma opcional ("Confirma que você está no local?"): se concedida e a distância a `places.lat/lng` for ≤ `NEAR_PLACE_METERS` (150), grava `near_place = true`. **Descarte as coordenadas.**
2. **Medição automática (R2).**
3. **Relato rápido (≤ 20 s), tudo opcional:** tomadas (nenhuma/poucas/muitas), ruído (1–5, com rótulos "barulhento"…"silencioso"), "Testei chamada de vídeo aqui" (ok / picotou / falhou / não testei), política de permanência (livre / consumo mínimo / limite de tempo / precisa de passe / não sei), lotação (1–5), comentário de até 200 caracteres.
- Limite: 1 check-in por usuário e lugar a cada `CHECKIN_COOLDOWN_HOURS` (6). Qualquer usuário autenticado pode registrar (verificado ou não); **o selo exige pessoas distintas** (R3).
- Aceite: fluxo completo em ≤ 60 s; o dado aparece na ficha com data "hoje" depois de salvar; usuário vê "Obrigado, você ajudou N pessoas" (N = quantas vezes aquela ficha foi aberta nos últimos 30 dias; se não tiver como medir, omita a frase).

### R2. Medição de conexão no navegador — P0
Em `src/lib/speedtest.ts` (funções puras testáveis para estatística) e três rotas de servidor:
- `GET /api/speed/ping` → `204`, `Cache-Control: no-store`.
- `GET /api/speed/down?bytes=N` → corpo de bytes pseudoaleatórios (não comprimíveis), `Cache-Control: no-store`, `N` limitado a `SPEED_MAX_DOWN_BYTES` (4 MB).
- `POST /api/speed/up` → lê até `SPEED_MAX_UP_BYTES` (1 MB), descarta, `204`.
- Procedimento: 10 pings em série (timeout 2 s; falha conta como perda) → `ping_ms` = mediana, `jitter_ms` = média das diferenças absolutas entre pings consecutivos, `loss_pct` = falhas/10; download de 1 a 2 amostras (usa leitor de stream, mede do 1º ao último byte), `download_mbps` = mediana; upload de 1 amostra. **Tempo total ≤ 15 s**, com botão Cancelar e barra de progresso em DM Mono.
- Mostrar sempre o aviso pequeno: "Medido até o servidor do SoloRota; o resultado varia com o horário e o dispositivo". É uma medida **indicativa**.
- Rotas com validação de parâmetros e limite simples por IP (ex.: 20 requisições/min) para não virar canal de abuso de banda.
- Aceite: testes unitários cobrem mediana, jitter e perda com séries conhecidas; em rede lenta simulada o teste termina com aviso, sem travar a tela.

### R3. Selos com validade — P0
Dois selos, calculados em `recompute_place(place_id)` e **expostos por `seal_valid_until` / `call_ready_valid_until`**:
- **Selo Amigo do Nômade** (existente, critérios revistos): em até `SEAL_WINDOW_DAYS` (60), ≥ `SEAL_MIN_DISTINCT_USERS` (2) pessoas distintas com medição; mediana de download ≥ `SEAL_MIN_DOWN_MBPS` (25); tomadas "poucas" ou "muitas" na maioria dos relatos; e, se `SEAL_REQUIRES_NEAR_PLACE=true` (variável de servidor, padrão `true`), ao menos um dos check-ins com `near_place = true`. Validade = data do check-in qualificante mais recente + 60 dias.
- **Pronto para chamadas** (novo): mesma janela e mínimo de pessoas; mediana de download ≥ 15, upload ≥ 5, ping ≤ 80 ms, jitter ≤ 30 ms, perda ≤ 2%; ruído mediano ≥ 3; e as chamadas testadas não são majoritariamente "picotou/falhou". **Todos esses números são hipóteses** em `nomad.ts`.
- `isSealActive(place, now)` e `isCallReady(place, now)` são funções puras; **a interface nunca lê o booleano `nomad_seal` direto**.
- Pino: o carimbo do selo existente continua (DESIGN §5); "Pronto para chamadas" aparece só na ficha e no Radar, como etiqueta com ícone `video`.
- Aceite: um lugar com selo vira "Selo vencido" (cinza, com data) 61 dias após o último check-in qualificante, sem nenhum job; teste unitário com datas simuladas.

### R4. Radar "Onde trabalhar agora" — P0
Rota `/radar/[city]` (também chip "Radar" no Mapa; a aba da navegação inferior leva aqui).
- Lista de lugares `work` e cafés da cidade (≤ 300), ordenada pela **adequação** (fórmula abaixo) e filtrada por chips: **Agora** (aberto agora), **Modo chamada** (Pronto para chamadas ou, na falta, download ≥ 15 e ruído ≥ 3), **Tomadas**, **Silencioso** (ruído ≥ 4), **Dados recentes** (T2), **Perto de mim** (geolocalização opcional; sem ela, seletor de bairro).
- Cada cartão mostra os **critérios, não só uma nota**: linha por critério com valor + `FactRow` (T1); depois a nota "Adequação 82/100 · provisório" em tamanho pequeno. Botões: Medir agora (R1), Marcar sessão aqui (J1), Salvar (E3), Como chegar.
- Alternância Lista/Mapa: o mapa mostra só os pinos filtrados, numerados pela posição.
- **Fórmula (pura, em `src/lib/radarScore.ts`, com testes):**

| Componente | Máx. | Regra |
| --- | --- | --- |
| Conexão | 40 | `40 × clamp(download/50) × estabilidade`, com `estabilidade = 1 − 0,5·clamp(perda/5) − 0,5·clamp(jitter/50)`; sem medição = 0 |
| Tomadas | 15 | nenhuma 0, poucas 8, muitas 15 |
| Ruído | 15 | `(ruído − 1)/4 × 15`; sem dado = 0 |
| Chamadas | 15 | `15 × parcela de chamadas "ok"` entre as testadas; sem teste = 0 |
| Permanência | 5 | livre 5, passe 3, consumo mínimo 3, limite de tempo 1, desconhecida 0 |
| Frescor | 10 | ≤ 30 dias 10; 31–60 dias 6; 61–90 dias 3; mais que isso ou nunca 0 |

  Assinatura da função: `radarScore(input, now) → { total, parts: Record<componente, {points, max, known}>, confidence }`, com `confidence`: `low` (0–1 pessoas distintas em 90 dias), `medium` (2–4), `high` (5+). "Provisório" aparece quando `low`. Dado ausente conta 0 (e o cartão diz "sem dados"): isso é intencional, pois incentiva a medir.
- **Nada de `featured_until`, plano de parceiro ou oferta entra na nota ou na ordem (I3).** Teste: duas fichas idênticas, uma patrocinada, têm a mesma nota e a mesma posição.
- Aceite: com os dados de demo, filtrar "Modo chamada" muda a lista; abrir o cartão mostra data e origem de cada critério; ordenar não depende de parceiro.

### R5. Política de permanência — P1
- `places.stay_policy` (+ `stay_note` de até 140 caracteres). **Precedência:** valor declarado pelo parceiro vale (a regra é do local); sem declaração, vale a moda dos check-ins dos últimos 90 dias; senão "desconhecida".
- Aparece no Radar, na ficha e no formulário de criação de sessão (aviso: "Este local pede consumo mínimo").
- Aceite: parceiro edita a política no painel; ficha mostra "Declarado pelo local · há N dias".

---

## 5. Features — Confiança dos dados (transversal)

### T1. Metadados de cada informação (`FactRow`) — P0
Para cada campo: `wifi`, `outlets`, `noise`, `calls`, `stay_policy`, `opening_hours`, `languages`, `price`, `health_info`, `offer`.
- Guardado em `places.facts_meta` (jsonb), por campo: `{ source, observed_at, confirmations_90d, outdated_30d }`, mantido por `recompute_place` e pelas RPC de voto.
- Fontes e rótulos em pt-BR: `osm` → "OpenStreetMap (importado em dd/mm)"; `partner` → "Declarado pelo local"; `user` → "Medido por nômades" / "Relatado por nômades"; `admin` → "Equipe SoloRota". A data de OSM é a **data da importação**, e o rótulo diz isso.
- Componente `FactRow`: valor + linha secundária "Verificado há 12 dias por 3 pessoas" + botões **Confirmar** e **Desatualizado** (RPC `vote_fact`). Se o parceiro declarou um número e as medições divergem em mais de `DECLARED_DIVERGENCE_PCT` (30%), mostrar o medido como principal e "(declarado: 100 Mbps)" ao lado.
- Regras de voto: 1 por usuário, lugar e campo a cada 7 dias; **parceiro não vota no próprio lugar**; exige login.
- Aceite: toda ficha e todo cartão do Radar usam `FactRow`; votar muda a contagem na hora; teste de RLS/RPC para auto-voto de parceiro.

### T2. Frescor e filtro "Dados recentes" — P0
- Função pura `classifyFreshness(observedAt, outdatedFlags, now)` → `fresh` (≤ 30 dias), `aging` (31–90), `stale` (> 90 dias **ou** ≥ 2 votos "desatualizado" em 30 dias), `unknown` (sem data). Constantes em `nomad.ts`.
- Visual: ponto + **texto** (nunca só cor): "Recente", "Envelhecendo", "Possivelmente desatualizado", "Sem verificação". Carimbo `VerifiedStamp` com a data em DM Mono (ex.: "VERIFICADO 12/10").
- Filtro "Dados recentes" no Mapa e no Radar esconde `stale` e `unknown`.
- Aceite: seed de demo cobre os quatro estados; testes unitários nos limites (30, 31, 90, 91 dias).

### T3. Painel da cidade (`/cidade/[slug]`) — P1
Página pública com blocos calculados do banco (nenhum número fixo): locais de trabalho verificados nos últimos 60 dias (n de N), mediana de Wi-Fi medido (n, últimos 90 dias), quantos com selo ativo, atividades da semana, nômades presentes (só se ≥ 3), farmácias e pronto atendimento 24h importados do OSM, e uma barra empilhada de **frescor dos dados** (recente/envelhecendo/desatualizado/sem verificação). Com poucos dados: "Poucos dados ainda. Ajude a mapear" (I6). Evento `city_panel_view`.
- Aceite: com banco vazio a página carrega com estados vazios honestos; com o seed, mostra números coerentes com as fichas.

---

## 6. Features — A2: Vínculos durante a estadia

### S1. Perfil de rotina e interesses — P0
Campos novos em `profiles`: `work_rhythm` (`morning`/`afternoon`/`evening`/`flexible`), `work_style` (`focus`/`calls`/`mixed`), `interests` (até 6, de uma lista fixa em `src/lib/interests.ts`), `social_goals` (`friends`/`cowork`/`networking`/`outdoor`), `discoverable` (padrão `false`), `timezone`.
- Lista de interesses (id → rótulo): `deep_work` Trabalho focado, `tech` Tecnologia e startups, `design` Design e criatividade, `marketing` Marketing e conteúdo, `outdoors` Ar livre, `surf` Surf, `running` Corrida e trilha, `wellness` Yoga e bem-estar, `food` Gastronomia, `coffee` Cafés, `music` Música, `art` Arte e cultura, `languages` Idiomas, `photo` Fotografia, `entrepreneur` Empreendedorismo, `finance` Finanças, `pets` Pets, `traveling_family` Família viajando, `nightlife` Vida noturna, `volunteer` Voluntariado.
- Tela de edição no `/perfil` e um mini-onboarding de 3 telas ao criar a estadia (E1). **Switch `discoverable` com texto claro**: "Outras pessoas verificadas que ficam na cidade nas mesmas datas poderão ver seu nome, foto, interesses e ritmo de trabalho. Não há mensagens diretas." Desligado por padrão.
- Aceite: usuário com `discoverable = false` jamais aparece em nenhuma lista de pessoas (teste de RPC).

### S3. Séries recorrentes — P0
Tabelas `activity_series` e `series_members`; coluna `activities.series_id`.
- Na criação de atividade, alternância "Repetir toda semana" cria uma **série** (dia da semana + horário no fuso `cities.timezone`, duração, local, vagas **2 a 12**) e **materializa as próximas `SERIES_WEEKS_AHEAD` (6) ocorrências** como `activities`. Reposição diária das ocorrências por `/api/cron/materialize-series` (Vercel Cron, protegida por `CRON_SECRET`); se cron não for viável no plano, chame a materialização ao abrir a série ou o mapa (RPC `ensure_series_occurrences`).
- **Seguir a série** (`follow_series`): vira `requested` em `series_members`; o criador decide **uma vez** (`decide_series_member`). Aprovado, o usuário entra automaticamente (`approved`) nas ocorrências futuras até a lotação; pode sair de uma ocorrência (`left`) ou da série.
- Página `/serie/[id]`: próximas datas, quem segue (só nomes dos aprovados, para membros), botão Seguir, botão Compartilhar (Open Graph).
- Rótulo "Semanal · toda quinta 14h" nos cartões e na ficha; no mapa, o anel pulsa pela ocorrência mais próxima.
- Aceite: criar série cria 6 ocorrências; seguir → aprovar → todas as ocorrências ganham o membro; lotação respeitada; teste Playwright com duas contas.

### S4. Compatibilidade nos cartões de atividade — P0
RPC `activity_compat(activity_id)` devolve **apenas contagens** para o usuário logado: quantos participantes aprovados têm o mesmo `work_rhythm` e quantos estarão na cidade nas datas dele. Mostrar "3 pessoas com a mesma rotina que você" **somente quando a contagem ≥ 2** (evita identificar alguém). Sem estadia ativa ou sem `work_rhythm`, o bloco não aparece.

### S2. Pessoas compatíveis — P1
Aba "Pessoas" em `/estadia` (e atalho no Mapa). RPC `compatible_people(city_id, limit)`:
- Só para quem é `verified`, `discoverable` e tem estadia ativa; só retorna quem também é `verified`, `discoverable`, na mesma cidade, com sobreposição de datas ≥ `MIN_OVERLAP_DAYS` (7), excluindo bloqueios (`user_blocks`, nos dois sentidos).
- Retorno: nome, foto, interesses em comum, mesmo ritmo (sim/não), dias de sobreposição. Pontuação interna: `50 × min(sobreposição,30)/30 + 30 × min(interesses em comum,3)/3 + 20 × (mesmo ritmo ? 1 : 0)`.
- Interação: ao tocar numa pessoa, vê o mini-perfil e **as próximas atividades públicas dela** com "Pedir para entrar". Sem DM, sem convite livre. Botões Bloquear e Denunciar.
- Aceite: testes de RPC para não-discoverable, não-verificado, sem sobreposição e bloqueado; eventos `people_view`.

### S5. Boas-vindas semanais (turma da semana) — P1
Série **oficial** (`activity_series.is_official = true`, criada por admin/seed) de um encontro semanal de boas-vindas por cidade, em local público, com selo "Oficial". Em `/estadia` → "Hoje", quem acabou de chegar vê "Chegou agora? Encontro de boas-vindas na quinta". Aproxima "grupos por período de estadia" sem um segundo sistema de chat.

---

## 7. Features — A3: Minha estadia e jornada

### E1. Estadia ativa e `/estadia` — P0
Tabela `stays` (um usuário pode ter várias; **uma ativa**). RPC `set_stay(city_id, arrive_on, leave_on, audience)` cria/atualiza a estadia, **sincroniza** `profiles.current_city_id/stay_from/stay_to` (campos já usados por presença) e instancia as tarefas (E2).
- Sem estadia: formulário curto (cidade, chegada, saída [padrão +30 dias], perfil `br`/`foreign`) e, em seguida, o mini-onboarding de rotina (S1) com os dois switches **separados e desligados** (`share_presence`, `discoverable`).
- Com estadia: cabeçalho "Dia 12 de 45 em Florianópolis" com barra de progresso (DM Mono) e abas **Hoje · Tarefas · Agenda · Favoritos · Gastos · Pessoas**.
- **Hoje:** próximo compromisso, até 3 tarefas pendentes, "melhor local para chamadas perto dos seus favoritos" (topo do Radar), faixa de pós-sessão (J4), status do orçamento, atalho para o encontro de boas-vindas (S5).
- Aceite: criar estadia em ≤ 30 s; trocar datas atualiza progresso e sobreposição; evento `stay_create`.

### E2. Checklist da estadia — P0
Tabelas `stay_task_templates` (globais ou por cidade) e `stay_tasks` (da estadia). Ao criar a estadia, instanciam-se os modelos por `audience` (`all`, `br`, `foreign`) e por fase (`before`, `first_week`, `first_month`, `ongoing`, `before_leaving`). O usuário marca, adiciona e remove tarefas próprias e pode definir prazo.
- Itens com `map_category/map_subcategory` mostram o botão "Abrir no mapa" (abre o Mapa já filtrado).
- **Seed obrigatório** (títulos; `hint` curto quando útil; todos terminam com a nota "Lembrete, não é aconselhamento jurídico" quando tocam em documentação):
  - *Todos / antes:* Definir o orçamento mensal da estadia; Escolher o bairro olhando os locais de trabalho no Radar (`work`); Combinar com o anfitrião a velocidade do Wi-Fi e as regras da casa antes de fechar; Conferir a cobertura da sua operadora no bairro.
  - *Todos / primeira semana:* Fazer um teste de velocidade na hospedagem; Escolher 2 locais de trabalho reserva no Radar (`work`); Localizar farmácia e pronto atendimento mais próximos (`health`); Ativar "quem está aqui" se quiser conhecer gente (decisão sua); Ir ao encontro de boas-vindas.
  - *Todos / primeiro mês:* Entrar numa atividade recorrente; Revisar os gastos das primeiras semanas; Achar mercado e lavanderia de referência (`service`).
  - *Todos / durante:* Registrar um local de trabalho que você testou (ajuda o Radar).
  - *Todos / antes de sair:* Avaliar locais e atividades; Fechar pendências da hospedagem (caução, contas); Avisar o grupo da sua saída.
  - *Estrangeiro / antes:* Confirmar o seguro-saúde exigido pelo seu visto e guardar a apólice (fonte: o requisito consta em [Mobile Time](https://www.mobiletime.com.br/noticias/24/01/2022/governo-federal-regulamenta-visto-para-nomade-digital/)); Conferir a validade do visto e as regras de prorrogação em fonte oficial (gov.br); Verificar se vai precisar de CPF para aluguel, chip e conta bancária.
  - *Estrangeiro / primeira semana:* Escolher conta ou cartão para pagar no Brasil.
- **Não escreva prazos legais ou valores** nos modelos. Quando não houver `source_url`, deixe nulo e a tela admin mostra "revisar fonte". Preencha `source_checked_on` com a data do seed.
- Aceite: criar estadia `foreign` gera os itens `foreign` + `all`; marcar/desmarcar persiste; evento `stay_task_toggle`.

### E3. Favoritos — P0
`place_favorites` (privada). Estrela na ficha e nos cartões; camada "Meus favoritos" no Mapa (estrela sobre o pino) e aba **Favoritos** em `/estadia`. Nota curta (140 caracteres) opcional. Base também para "Rota do dia" (F9): permitir montá-la a partir dos favoritos.

### E4. Agenda e calendário — P1
Aba **Agenda** lista atividades em que o usuário está aprovado ou que criou, em ordem. Botão "Adicionar ao calendário" na atividade e "Baixar agenda (.ics)" na aba. Gerador de `.ics` em `src/lib/ics.ts` conforme RFC 5545 (UID estável, `DTSTAMP`, `DTSTART/DTEND` em UTC, escape de vírgula, ponto e vírgula e quebra de linha, dobra de linhas em 75 octetos, `LOCATION`, `URL`). Evento `ics_download`.
- Aceite: arquivo abre no Google Agenda e no Apple Calendário; testes unitários de escape e dobra de linha.

### E5. Gastos — P1
`stay_budgets` (orçamento mensal) e `stay_expenses` (categoria, valor, data, nota). A aba **Gastos** mostra o total, por categoria, média por dia, e a barra "gasto × orçamento proporcional aos dias já vividos". **Não invente preços de referência.** Somente números que o usuário informa. Tudo privado (I5). Evento `budget_add`.

### E6. Serviços essenciais — P1
Grade em `/estadia` → Tarefas ("Essenciais"): Farmácia, Pronto atendimento/24h, Coworking com diária, Lavanderia, Mercado. Cada bloco abre o Mapa filtrado e mostra o mais próximo da hospedagem ou do bairro informado.
- **Acrescentar à importação OSM** (`scripts/import-osm.ts`): `shop=laundry|dry_cleaning` → `service/laundry`; `shop=supermarket` → `service/supermarket`; `amenity=bicycle_rental` → `service/bike_rental`; `shop=mobile_phone` → `service/mobile`. "24h" é derivado de `opening_hours = '24/7'` ou `emergency=yes`, sem coluna nova.

### J1. "Marcar sessão de trabalho aqui" — P0
Botão na ficha de lugares `work` (e "Marcar encontro aqui" nos `eat`). Abre `/atividade/nova?place=ID&kind=work` **pré-preenchido**: título "Dia de trabalho no {local}", categoria `work_together`, local e ponto de encontro do lugar, vagas 6, duração 3 h, início = próxima janela ociosa do parceiro (J3) ou o próximo dia útil às 14h, `offer_id` = benefício de grupo ativo (J2) se existir, aviso da política de permanência (R5) e o "Combine em local público" de F14.
- Aceite: **do pino ao "Publicar" em até 3 toques**; atividade criada aparece na ficha do lugar ("Próxima sessão: qui 14h · 3/6 vagas"); evento `session_from_place`.

### J2. Benefício de grupo — P1
`offers.min_group` (2–30). Na atividade vinculada, o cartão "Benefício do grupo: {título} · para 4 ou mais pessoas · faltam 2" com barra de progresso. Fica disponível para uso quando `aprovados + criador ≥ min_group` e a atividade está na janela (30 min antes do início até o fim). O resgate grava `offer_redemptions.activity_id`, continua único por pessoa, oferta e dia, e usa QR/código como em F11. Evento `offer_group_redeem`.

### J3. Horários ociosos do parceiro — P1
`place_idle_slots` (dia da semana, início, fim, lugares/mesas, nota). Formulário no painel do parceiro. Aparece na ficha e no Radar ("Mesas livres: ter e qui 14h–17h") e alimenta o horário sugerido em J1. É declaração do parceiro (rótulo "Declarado pelo local").

### J4. Pós-sessão: fecha o ciclo — P0
Para atividades com `place_id` que terminaram nas últimas 24 h, o participante vê uma faixa no topo de `/estadia` → Hoje e na ficha da atividade: "Como foi trabalhar no {local}? Registrar em 30 s". Abre o check-in (R1) já ligado a `activity_id` e a avaliação (F7). É o que alimenta o Radar com dados novos sem esforço extra. Eventos `post_checkin_prompt_shown`, `post_checkin_submit`.

### J5. Sessões marcadas no painel do parceiro — P1
Seção em `/parceiro`: próximas sessões no seu local (data, lotação aprovada, benefício de grupo vinculado), e totais dos últimos 30 dias: sessões, pessoas trazidas (soma de aprovados) e resgates ligados a sessões. Sem dados pessoais (primeiro nome no máximo). **Não apresentar como diferencial** (anúncios com métricas já existem no mercado).

---

## 8. Features — Medição no lugar de entrevistas

### M1. Micro-pesquisa — P0
Tabela `micro_answers`. Componente `MicroSurvey` (uma pergunta por vez, 1 toque, pular sempre possível), exibido em `/espera` (anônimo, com `session_id`) e em `/estadia` → Hoje (logado). Perguntas em `src/lib/survey.ts`:
- `q_pain` — "O que mais atrapalha você ao chegar numa cidade nova?": `wifi` Internet instável, barulho ou falta de tomada · `friends` Achar amigos compatíveis com minha rotina · `info` Informação local desatualizada ou espalhada · `cost` Custo e esforço de avaliar moradia, coworking e transporte · `community` Comunidades paradas em certas cidades ou épocas.
- `q_stay` — "Quanto tempo você costuma ficar em cada cidade?": `lt2w` menos de 2 semanas · `2to4w` 2 a 4 semanas · `1to2m` 1 a 2 meses · `3mplus` 3 meses ou mais.
- `q_bet` — "O que ajudaria mais na sua próxima semana?": `work` Saber onde trabalhar com internet boa · `people` Conhecer gente que fica na cidade no mesmo período · `week` Ter tudo da semana num lugar só.
- Uma resposta por `question_key` e `session_id`. Evento `survey_answer`.

### M2. Eventos e painel "Qual aposta engaja" — P0
Seção 12 lista os eventos. Em `/admin/metricas` acrescentar: (a) funil por aposta; (b) resultado da micro-pesquisa com **n** e porcentagem, e o aviso "amostra pequena" quando n < 30; (c) cadastros por origem e bloco (já existente). Sem gráficos elaborados: tabelas e barras simples nos tokens do `DESIGN.md`.

### M3. `/espera` reescrita — P0
Três blocos clicáveis, na ordem das apostas, cada um leva ao cadastro e grava `origin_block`:
- `work` **Trabalhar com confiança** — "Veja onde trabalhar hoje, com Wi-Fi medido e a data da última verificação."
- `bonds` **Vínculos durante a estadia** — "Encontros pequenos e recorrentes com quem fica na cidade nas mesmas semanas."
- `week` **Sua semana numa jornada** — "Trabalho, convivência, tarefas e serviços essenciais num só lugar."
Chamada comum: "100% gratuito para nômades". Abaixo, o `MicroSurvey` (M1). Respeite I4. Atualize também `/sobre`.

---

## 9. Design: acréscimos ao `DESIGN.md`

Tokens de frescor (sempre com texto e ícone): `recente` → `mata` escurecido para contraste AA com ícone `check-circle`; `envelhecendo` → `sol` com `clock`; `desatualizado` → `grafite` com `alert-triangle`; `sem verificação` → contorno `tinta-suave` com `help-circle`.

Componentes novos (em `src/components/ui` ou `…/radar`, `…/stay`): `FactRow`, `VerifiedStamp` (carimbo circular com data em DM Mono, inclinado 4°; mesma linguagem do selo), `FreshnessBadge`, `RadarCard`, `RadarFilters`, `CheckinSheet` (3 passos), `SpeedMeter` (barras + progresso; reutiliza `WifiMeter`), `SealStatus` (ativo / vencido), `CallReadyBadge`, `SponsoredTag` ("Patrocinado"), `StayHeader` (dia X de Y), `TaskList`, `FavoriteStar`, `AgendaList`, `BudgetBar`, `EssentialsGrid`, `PeopleCard`, `SeriesBadge` ("Semanal · toda quinta 14h"), `GroupBenefitTicket` (reaproveita `OfferTicket` com barra de progresso), `JourneyStepper` (Local · Grupo · Benefício · Registro, na página da atividade), `MicroSurvey`, `CityStatTile`, `FreshnessBar` (barra empilhada).

Diretrizes: o Radar é uma **lista de leitura rápida**; critérios em linhas curtas com ícone Lucide (`wifi`, `plug`, `volume-2`, `video`, `armchair`, `clock`), valores em DM Mono; estados vazios com ilustração de tinta simples (bússola, onda). Sem gradientes. Todos os controles ≥ 44 px.

---

## 10. Marcos (siga em ordem; cada um termina publicado)

| Marco | Entrega | Aceite |
| --- | --- | --- |
| **V0 — Publicar o que existe** | Ver a lista abaixo | URL pública passa no smoke test; evaluator entra e cria atividade em < 3 min |
| **V1 — Dados e confiança** | Migração 0002; `place_checkins` (migrando `wifi_tests`); `recompute_place`; `facts_meta`; R1, R2, R3, T1, T2; eventos com `session_id`; `src/config/nomad.ts` | Check-in grava, selo com validade funciona, `FactRow` em toda ficha |
| **V2 — Radar** | R4, R5, filtros "Modo chamada" e "Dados recentes" no Mapa, nav inferior nova | Radar ordena por critérios; teste de I3 passa |
| **V3 — Estadia** | S1, E1, E2, E3, J4, M1 em `/estadia` | Criar estadia, tarefas persistem, favoritos aparecem no Mapa |
| **V4 — Vínculos** | S3, S4, S5, S2 e `user_blocks` | Série materializa e entra automático; RPC de pessoas respeita privacidade |
| **V5 — Jornada** | J1, J2, J3, J5, E4 | Do pino a "Publicar" em 3 toques; benefício de grupo libera com `min_group` |
| **V6 — Medição e cidade** | M2, M3, T3, E5, E6, `/sobre` revisada | `/espera` grava `origin_block`; painel mostra funil por aposta |
| **V7 — Polimento e demo** | Seed de demo (seção 11), Playwright da demo, a11y, desempenho, README, `DECISIONS.md` | Roteiro da seção 13 roda de ponta a ponta no celular |

### V0 — Checklist de publicação (o usuário precisa fornecer as credenciais; liste só o que faltar)
1. Projeto Supabase na nuvem; aplicar as migrações com `supabase link` + `supabase db push`. **Nunca rode `pnpm db:reset` contra produção**: proteja o script com checagem de ambiente que aborta se a URL não for local.
2. Seed de produção: se o `seed.sql` insere em `auth.users`, crie `pnpm seed:demo` usando a Admin API com a service role, que funcione em produção. Dados marcados `is_demo`.
3. Rodar `pnpm import:osm florianopolis` contra produção; bucket privado `verifications` com política só-admin; bucket de avatares.
4. Auth: configurar **Site URL e Redirect URLs** para o domínio da Vercel. **Atenção:** o e-mail padrão do Supabase tem limite baixo de envios; configure SMTP próprio (ex.: Resend) ou o magic link falha na hora da avaliação. Como rede de segurança, implemente o **login de demonstração** (`NEXT_PUBLIC_DEMO_LOGIN=true`): botões "Entrar como nômade A / nômade B / parceiro" com contas de demonstração sem privilégio de admin, rotuladas "Demo" na interface.
5. Variáveis na Vercel (`.env.example` atualizado), `CRON_SECRET`, região próxima ao Brasil se o plano permitir. Criar o admin (SQL ou script).
6. Rodar o Playwright contra a URL pública (`PLAYWRIGHT_BASE_URL`) e registrar a URL no README.

---

## 11. Modelo de dados — `supabase/migrations/0002_nomad_v2.sql`

Use `uuid`, `timestamptz`, RLS ligado em todas as tabelas novas. Ajuste nomes ao que já existe no repositório (confira as tabelas reais antes).

```sql
-- Cidades: fuso horário
alter table cities add column timezone text not null default 'America/Sao_Paulo';

-- Lugares: novos campos (valores derivados por recompute_place)
alter table places
  add column outlets_level text check (outlets_level in ('none','few','many')),
  add column stay_policy text not null default 'unknown'
    check (stay_policy in ('free','min_consumption','time_limit','pass_required','unknown')),
  add column stay_note text check (char_length(stay_note) <= 140),
  add column declared_wifi_mbps numeric,
  add column upload_mbps numeric,
  add column ping_ms numeric,
  add column jitter_ms numeric,
  add column loss_pct numeric,
  add column call_ok_share numeric check (call_ok_share between 0 and 1),
  add column facts_meta jsonb not null default '{}'::jsonb,
  add column last_verified_at timestamptz,
  add column distinct_users_90d int not null default 0,
  add column seal_valid_until timestamptz,
  add column call_ready_valid_until timestamptz;
-- manter nomad_seal (legado), mas a interface usa seal_valid_until via isSealActive()

-- Check-in de local de trabalho (substitui wifi_tests)
create table place_checkins (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places on delete cascade,
  user_id uuid not null references profiles,
  activity_id uuid references activities,
  download_mbps numeric check (download_mbps between 0 and 5000),
  upload_mbps numeric check (upload_mbps between 0 and 5000),
  ping_ms numeric check (ping_ms >= 0),
  jitter_ms numeric check (jitter_ms >= 0),
  loss_pct numeric check (loss_pct between 0 and 100),
  measured boolean not null default false,
  on_venue_wifi boolean not null default false,
  near_place boolean not null default false,   -- só o booleano; nunca coordenadas do usuário
  outlets_level text check (outlets_level in ('none','few','many')),
  noise_level smallint check (noise_level between 1 and 5),   -- 1 barulhento ... 5 silencioso
  call_result text not null default 'not_tested'
    check (call_result in ('ok','choppy','failed','not_tested')),
  stay_policy text check (stay_policy in ('free','min_consumption','time_limit','pass_required','unknown')),
  crowd_level smallint check (crowd_level between 1 and 5),
  comment text check (char_length(comment) <= 200),
  created_at timestamptz not null default now()
);
create index on place_checkins (place_id, created_at desc);
create index on place_checkins (user_id, created_at desc);
-- migrar: insert into place_checkins(place_id,user_id,download_mbps,ping_ms,measured,created_at)
--         select place_id,user_id,download_mbps,ping_ms,true,created_at from wifi_tests;
-- depois atualizar o código e remover wifi_tests (registrar em DECISIONS.md)

-- Votos de confirmação / desatualizado
create table fact_votes (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places on delete cascade,
  user_id uuid not null references profiles,
  field text not null check (field in
    ('wifi','outlets','noise','calls','stay_policy','opening_hours','languages','price','health_info','offer')),
  vote text not null check (vote in ('confirm','outdated')),
  created_at timestamptz not null default now()
);
create index on fact_votes (place_id, field, created_at desc);
-- limite de 1 voto por usuário/lugar/campo a cada 7 dias: validar dentro de vote_fact()

-- Perfil: rotina, interesses, descoberta
alter table profiles
  add column work_rhythm text not null default 'flexible'
    check (work_rhythm in ('morning','afternoon','evening','flexible')),
  add column work_style text not null default 'mixed'
    check (work_style in ('focus','calls','mixed')),
  add column interests text[] not null default '{}' check (cardinality(interests) <= 6),
  add column social_goals text[] not null default '{}',
  add column discoverable boolean not null default false,
  add column timezone text not null default 'America/Sao_Paulo';

create table user_blocks (
  blocker_id uuid references profiles on delete cascade,
  blocked_id uuid references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- Séries recorrentes
create table activity_series (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references cities,
  creator_id uuid not null references profiles,
  place_id uuid references places,
  offer_id uuid references offers,
  title text not null check (char_length(title) between 3 and 80),
  description text,
  category text not null check (category in ('meetup','work_together','food','outdoor','culture','tour')),
  weekday smallint not null check (weekday between 0 and 6),   -- 0 = domingo, no fuso da cidade
  start_time time not null,
  duration_min int not null check (duration_min between 30 and 480),
  meeting_lat double precision not null,
  meeting_lng double precision not null,
  meeting_label text,
  capacity int not null check (capacity between 2 and 12),
  is_official boolean not null default false,
  active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
alter table activities add column series_id uuid references activity_series on delete set null;
create index on activities (series_id, starts_at);

create table series_members (
  series_id uuid references activity_series on delete cascade,
  user_id uuid references profiles,
  status text not null default 'requested'
    check (status in ('requested','approved','declined','left')),
  created_at timestamptz not null default now(),
  primary key (series_id, user_id)
);

-- Estadia, tarefas, favoritos, gastos (tudo privado do dono)
create table stays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles,
  city_id uuid not null references cities,
  arrive_on date not null,
  leave_on date not null,
  audience text not null default 'br' check (audience in ('br','foreign')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (leave_on >= arrive_on)
);
create unique index one_active_stay_per_user on stays (user_id) where active;

create table stay_task_templates (
  id uuid primary key default gen_random_uuid(),
  city_id uuid references cities,                    -- nulo = vale para todas
  audience text not null default 'all' check (audience in ('all','br','foreign')),
  phase text not null check (phase in ('before','first_week','first_month','ongoing','before_leaving')),
  area text not null check (area in
    ('connectivity','health','housing','work','money','paperwork','social','transport')),
  title text not null,
  hint text,
  map_category text check (map_category in ('work','eat','health','stay','tour','service')),
  map_subcategory text,
  source_url text,
  source_checked_on date,
  sort int not null default 0,
  active boolean not null default true
);

create table stay_tasks (
  id uuid primary key default gen_random_uuid(),
  stay_id uuid not null references stays on delete cascade,
  user_id uuid not null references profiles,
  template_id uuid references stay_task_templates,
  title text not null check (char_length(title) between 2 and 120),
  area text not null default 'work',
  phase text not null default 'ongoing',
  due_on date,
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now()
);

create table place_favorites (
  user_id uuid references profiles on delete cascade,
  place_id uuid references places on delete cascade,
  note text check (char_length(note) <= 140),
  created_at timestamptz not null default now(),
  primary key (user_id, place_id)
);

create table stay_budgets (
  stay_id uuid primary key references stays on delete cascade,
  monthly_budget_cents int check (monthly_budget_cents >= 0)
);

create table stay_expenses (
  id uuid primary key default gen_random_uuid(),
  stay_id uuid not null references stays on delete cascade,
  user_id uuid not null references profiles,
  category text not null check (category in ('housing','food','work','transport','health','leisure','other')),
  amount_cents int not null check (amount_cents > 0),
  spent_on date not null default current_date,
  note text check (char_length(note) <= 80),
  created_at timestamptz not null default now()
);

-- Jornada: benefício de grupo e horários ociosos
alter table offers add column min_group int check (min_group between 2 and 30);
alter table offer_redemptions add column activity_id uuid references activities;

create table place_idle_slots (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  seats int check (seats between 1 and 100),
  note text check (char_length(note) <= 120),
  active boolean not null default true,
  check (end_time > start_time)
);

-- Medição
alter table events add column session_id text;       -- id aleatório do navegador, sem dado pessoal

create table micro_answers (
  id uuid primary key default gen_random_uuid(),
  question_key text not null,
  answer_key text not null,
  user_id uuid references profiles,
  session_id text,
  city_slug text,
  origin text check (origin in ('espera','estadia')),
  created_at timestamptz not null default now()
);
create unique index micro_answers_one_per_session
  on micro_answers (question_key, session_id) where session_id is not null;
```

### Regras de RLS novas (escreva políticas **e testes**)

| Tabela | Leitura | Escrita |
| --- | --- | --- |
| `place_checkins` | só o próprio usuário e admin; os demais veem **agregados** via função/view que **não expõe `user_id`** | via RPC `submit_checkin` (autenticado, 1 por usuário e lugar a cada 6 h, valores dentro das faixas) |
| `fact_votes` | agregados apenas | via RPC `vote_fact` (1 a cada 7 dias por campo; parceiro não vota no próprio lugar) |
| `stays`, `stay_tasks`, `place_favorites`, `stay_budgets`, `stay_expenses`, `user_blocks` | só o dono | só o dono |
| `stay_task_templates` | pública | admin |
| `activity_series` | autenticados leem as ativas | criador verificado; `is_official` só admin |
| `series_members` | criador vê todos; membro vê o próprio | como `activity_members` (RPC `follow_series`, `decide_series_member`) |
| `place_idle_slots` | pública | parceiro aprovado dono do lugar |
| `micro_answers` | só admin | inserção por qualquer um (anônima permitida) |
| `profiles` (novos campos) | `interests`, `work_rhythm`, `work_style` só via RPC/view quando `discoverable = true` e ambos verificados, ou entre membros aprovados do mesmo grupo | o próprio usuário |

**Funções SQL (RPC):** `submit_checkin(payload jsonb)`, `recompute_place(place_id)` (calcula medianas dos últimos 90 dias, `facts_meta`, `last_verified_at`, `distinct_users_90d`, `call_ok_share`, `seal_valid_until`, `call_ready_valid_until`; precedência: usuários > parceiro > OSM, exceto `stay_policy`, em que o parceiro vale), `vote_fact`, `activity_compat`, `compatible_people`, `follow_series`, `decide_series_member`, `ensure_series_occurrences`, `set_stay`. As RPC que mudam dados são `SECURITY DEFINER` com `search_path` fixo e validação interna; nenhuma função devolve `user_id` de check-in ou voto.

### Seed de demonstração (acrescentar; tudo `is_demo`)
- 3 lugares de demonstração com **estados de frescor diferentes** (check-ins de 2, 25, 70 e 120 dias atrás) e ao menos 1 com "Pronto para chamadas" ativo e 1 com selo vencido.
- Modelos de tarefa da seção E2.
- 3 perfis de demonstração a mais, com datas sobrepostas, interesses em comum, `discoverable = true` e rótulo "(Demo)".
- 2 séries de demonstração ("Dia de trabalho conjunto" quinta 14h; "Corrida na Lagoa" sábado 7h) e 1 série oficial de boas-vindas.
- 1 benefício de grupo (`min_group = 4`) e 2 janelas ociosas num parceiro de demonstração.

---

## 12. Eventos de analytics (sem dado pessoal; `session_id` aleatório do navegador)

`view_radar`, `radar_filter` (`filter`), `open_place` (`source`: map/radar/search), `checkin_start`, `checkin_submit` (`measured`, `near_place`), `vote_fact` (`field`, `vote`), `series_create`, `series_follow`, `people_view`, `stay_create` (`audience`), `stay_task_toggle` (`area`, `done`), `favorite_add`, `ics_download`, `budget_add`, `session_from_place`, `offer_group_redeem`, `post_checkin_prompt_shown`, `post_checkin_submit`, `city_panel_view`, `survey_answer` (`question_key`, `answer_key`). Os já existentes continuam.

**Funis do painel (M2):**
- A1: `view_radar` → `open_place` (source=radar) → `checkin_start` → `checkin_submit`; mais `vote_fact`.
- A2: `series_follow` → `request_join` aprovado → usuários com ≥ 2 atividades (retenção).
- A3: `stay_create` → ≥ 3 `stay_task_toggle` → `favorite_add` → `ics_download`.
- Jornada (serviço → comunidade → benefício): `open_place` → `session_from_place` → `request_join` → `offer_group_redeem` → `post_checkin_submit`.

---

## 13. Testes obrigatórios e roteiro da demo

**Vitest (funções puras):** `radarScore` (limites, dados ausentes, confiança, e o teste de I3), `classifyFreshness` (30/31/90/91 dias e 2 votos), `isSealActive`/`isCallReady` com datas simuladas, estatística do speedtest (mediana, jitter, perda), `compatScore`, gerador de `.ics`, cálculo de orçamento, geração de ocorrências de série no fuso da cidade (inclusive virada de dia e horário de verão, se aplicável).

**Testes de RLS/RPC:** check-in anônimo para terceiros; limite de 6 h; auto-voto de parceiro; `compatible_people` exclui não-discoverable, não-verificado, sem sobreposição e bloqueado; estadia/tarefas/gastos/favoritos invisíveis a outros usuários; `micro_answers` ilegível para não-admin.

**Playwright:** (1) Radar → "Modo chamada" → abrir cartão → check-in com endpoints de velocidade simulados → dado aparece com data de hoje. (2) Lugar → "Marcar sessão aqui" → publicar → segunda conta segue série → criador aprova → entra nas ocorrências futuras → chat. (3) Benefício de grupo libera ao atingir `min_group`. (4) Criar estadia `foreign` → tarefas corretas → marcar uma → favoritar um lugar → baixar `.ics`. (5) `/espera` grava `origin_block` e a micro-pesquisa uma vez por sessão.

**Roteiro da demo (3 min):**
1. **Aposta 1 — Radar:** "Onde trabalhar agora" → filtro Modo chamada → cartão com carimbo de verificação, fonte e data → (se estiver num café) **Medir agora** ao vivo.
2. **Aposta 2 — Vínculos:** Marcar sessão aqui → série semanal publicada → segunda conta segue e é aprovada → chips de compatibilidade.
3. **Aposta 3 — Semana numa jornada:** `/estadia` com "Dia X de Y", tarefas, favoritos, agenda → benefício de grupo liberado → faixa de pós-sessão.
4. **Parceiro:** sessões marcadas e pessoas trazidas.
5. **Prova:** `/admin/metricas` com funil por aposta e a micro-pesquisa (com n).

---

## 14. Regras de copy (I4) e decisões abertas

- **Frases seguras:** "Reunimos Wi-Fi medido, comunidade por estadia e serviços locais"; "Cada informação mostra fonte e data"; "100% gratuito para nômades"; "Em teste na cidade-piloto".
- **Evitar:** qualquer comparação nominal com concorrentes na interface; "melhor", "único", "exclusivo", "primeiro".
- Adicione um teste Vitest simples que procura as palavras proibidas nos textos de interface (`src/app`, `src/components`, `src/lib/survey.ts`), com lista de exceções documentada.

**Decisões deixadas ao Claude Code (registre em `docs/DECISIONS.md`):** como migrar e aposentar `wifi_tests`; fuso e horário de verão na geração de séries; se cron da Vercel está disponível no plano ou usar `ensure_series_occurrences`; limite de IP nas rotas de velocidade; textos finais em pt-BR dentro do tom do `DESIGN.md` §10; nomes de arquivos e pastas dos componentes novos.
