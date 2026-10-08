# SPEC.md — SoloRota: especificação do MVP

Versão de 08/10/2026. Hackathon UNISANTA 2026 (T2S + DYNApp Hub). Valores de preço e comissão são **hipóteses**, não validados.

## 1. Objetivo do MVP

Demonstrar, em um celular, o fluxo completo abaixo, com dados reais de uma cidade (via OpenStreetMap) e atividades criadas pelos usuários:

1. Abrir o mapa da cidade e ver lugares por categoria e atividades próximas.
2. Criar uma atividade em um ponto do mapa.
3. Outro usuário pede para entrar; o criador aprova; o grupo conversa no chat.
4. Um parceiro cadastra um lugar e uma oferta; o nômade resgata a oferta.
5. Tudo compartilhável por link no WhatsApp.

Critério de sucesso: um avaliador abre a URL no celular, entra com e-mail, e consegue executar os passos 1 a 3 sozinho em menos de 3 minutos.

## 2. Personas

- **Nômade brasileiro (principal):** 30–35 anos, solteiro, trabalha remoto em marketing ou tecnologia, fica 1 a 2 meses por cidade em aluguel por temporada, trabalha em casa, cafeteria ou coworking, usa Instagram e WhatsApp.
- **Nômade estrangeiro (VITEM XIV):** mesmo uso, interface em português no MVP (inglês depois), precisa de seguro-saúde e de ajuda local.
- **Parceiro local:** dono de café, coworking, anfitrião de temporada, clínica ou agência de passeio. Quer preencher mesas, vagas e horários ociosos.
- **Admin (equipe):** aprova verificações e parceiros, modera denúncias.

## 3. Features e critérios de aceite

Cada feature tem um código (F1…) usado nos marcos.

### F1. Mapa da cidade (tela inicial)
- Rota `/mapa/[city]`; `/` redireciona para a cidade padrão.
- Mapa em tela cheia (MapLibre), centralizado em `cities.center_lat/lng`, zoom `cities.zoom`, limitado ao `bbox` da cidade.
- Pins de lugares por categoria (ver `DESIGN.md`), agrupados em clusters quando há muitos.
- Anéis pulsantes para atividades que começam nas próximas 24 h.
- Barra de busca flutuante (filtra lugares e atividades por nome, no cliente) e chips de categoria: Trabalhar, Comer, Saúde, Morar, Passeios, Serviços, Atividades.
- Filtros: "Wi-Fi forte" (≥ `WIFI_STRONG_MBPS`, padrão 25), "Aberto agora" (quando houver `opening_hours` interpretável), "Tem oferta", "Com Selo".
- Aceite: com 500 lugares, o mapa responde sem travar (clusters); tocar em um pin abre a bottom sheet com o resumo; tocar no mapa vazio fecha a sheet.

### F2. Lugares e serviços locais
- Categorias: `work`, `eat`, `health`, `stay`, `tour`, `service`.
- Ficha do lugar (`/lugar/[id]` e bottom sheet): nome, categoria, bairro, horário, Wi-Fi (Mbps, origem do dado), tomadas, ruído, faixa de preço, ofertas ativas, avaliações, botão "Como chegar" (abre o app de mapas do celular) e botão "Compartilhar".
- Origem do dado de Wi-Fi: `osm` (tag), `partner` (declarado), `user_test` (mediana dos testes dos usuários, mínimo 2). Mostrar sempre a origem.
- **Selo Amigo do Nômade** (`nomad_seal`): lugar com Wi-Fi ≥ 25 Mbps confirmado por ao menos 2 testes de usuários, e tomadas disponíveis. Critérios são hipótese e ficam em constantes configuráveis.
- Lugares de saúde mostram: tipo (clínica, pronto atendimento, laboratório, farmácia, telemedicina), atende sem plano (sim/não/não informado), idiomas. Sem dados clínicos de usuários.
- Aceite: ficha abre em < 1 s com dados já carregados; lugar sem dado mostra "Sem informação" e convida a contribuir.

### F3. Atividades em grupo (comunidade)
- Criar atividade (`/atividade/nova`): título, categoria (`meetup`, `work_together`, `food`, `outdoor`, `culture`, `tour`), data e hora, local (escolhido no mapa ou lugar existente), vagas (2 a 30), custo total opcional com divisão automática.
- Lista e mapa mostram só atividades futuras e abertas da cidade.
- Página `/atividade/[id]` com metadados Open Graph (título, cidade, data) para prévia no WhatsApp.
- Aceite: atividade criada aparece no mapa de outro usuário em até 5 s (Realtime ou refetch).

### F4. Pedir para entrar e aprovar
- Usuário verificado pede para entrar; o criador vê a fila (perfil resumido, verificado sim/não, nota média) e aprova ou recusa.
- Estados em `activity_members.status`: `requested`, `approved`, `declined`, `left`. Atividade vira `full` ao atingir as vagas.
- Aceite: usuário não verificado vê "Verificação pendente" e não consegue pedir; criador não consegue aprovar além da capacidade.

### F5. Chat do grupo
- Chat por atividade, só para membros `approved` e o criador, via Supabase Realtime.
- Mensagens de texto, 1000 caracteres, ordem cronológica, rolagem para o fim, botão "Denunciar" em cada mensagem.
- Aceite: duas abas de navegador trocam mensagens em < 2 s; quem não é membro não lê nem escreve (testar a RLS).

### F6. Divisão de custos
- Se `split_cost`, mostrar "R$ X por pessoa" = `cost_total_cents / (membros aprovados + criador)`, atualizado em tempo real. Sem cobrança no MVP, só informação.

### F7. Perfil, verificação e reputação
- Login por magic link. Perfil: nome, foto, bio curta, país de origem, idiomas, cidade atual e datas de estadia, "mostrar que estou na cidade" (opt-in).
- Verificação manual: envia selfie com documento para bucket privado `verifications`; admin aprova em `/admin/verificacoes`; o arquivo é apagado após a decisão. Perfil recebe `verified = true`.
- Avaliação pós-atividade: 1 a 5 e comentário curto, liberada após `ends_at`, uma por membro e por atividade, só entre participantes.
- Aceite: nota média e contagem aparecem no perfil e no pedido de entrada.

### F8. Presença na cidade (agregada)
- Camada opcional "Quem está aqui": manchas por bairro com a contagem de nômades que ativaram a presença. Bairros com menos de 3 pessoas não aparecem. Nunca mostrar posição individual.

### F9. Rota do dia
- Usuário seleciona até 5 itens (lugares e atividades) para a "Rota do dia"; o mapa traça uma linha na ordem escolhida e mostra a distância total em linha reta (haversine) e uma estimativa de tempo a pé. Sem serviço de roteamento externo no MVP.

### F10. Painel do parceiro (`/parceiro`)
- Cadastro de parceiro (nome do negócio, tipo de documento CNPJ ou MEI, número opcional no MVP), aprovado pelo admin.
- Cadastrar ou reivindicar lugar (escolher no mapa ou procurar entre os importados do OSM).
- Cadastrar oferta: tipo (`discount`, `day_pass`, `slot`, `package`, `consult`), título, descrição, código, validade, capacidade opcional.
- Ver resgates: lista com data e contagem por oferta. Sem dados pessoais além do primeiro nome.
- **Destaque pago (simulado):** botão "Destacar no mapa" que marca `featured_until` por 30 dias e mostra o pin maior, com preço de exemplo na tela e aviso "cobrança simulada".
- Aceite: oferta criada pelo parceiro aparece na ficha do lugar e no mapa (filtro "Tem oferta"); resgate gera registro único por usuário e oferta por dia.

### F11. Resgate de oferta
- Na ficha do lugar, "Usar oferta" mostra um código e um QR code do código por 10 minutos e registra o resgate. Limite de uma vez por dia por oferta e usuário.

### F12. Teste de Wi-Fi colaborativo
- Na ficha de um lugar de trabalho, "Medir Wi-Fi": faz um teste de download no navegador (arquivo estático de tamanho conhecido, medindo tempo) e ping simples, e grava em `wifi_tests`. A mediana dos testes alimenta o Wi-Fi do lugar.
- Aceite: teste termina em < 15 s, mostra Mbps e pede confirmação antes de gravar.

### F13. Lista de espera e analytics (evidência de demanda)
- Rota `/espera` pública: proposta em 3 blocos (comunidade, onde trabalhar e comer, saúde e moradia), campo de e-mail, cidade de interesse e perfil (nômade brasileiro, estrangeiro, parceiro).
- Grava em `waitlist` com `utm_source`, `utm_campaign` e o bloco que originou o clique.
- Eventos de analytics sem cookie de terceiros (tabela `events`: `name`, `props`, `created_at`): `view_espera`, `click_block_*`, `submit_waitlist`, `view_map`, `open_place`, `create_activity`, `request_join`.
- Aceite: painel `/admin/metricas` mostra cadastros por origem e taxa de conversão por bloco.

### F14. Segurança e moderação
- Botão "Denunciar" em atividades, mensagens, perfis e lugares (`reports`). Admin vê a fila em `/admin/denuncias`.
- Encontros só em locais públicos: ao criar atividade, aviso fixo "Combine em local público"; ponto de encontro de atividade `outdoor` deve ficar dentro do `bbox`.
- Compartilhar roteiro com contato de confiança: botão que gera um link somente leitura da atividade (título, horário, local) sem dados do usuário.

## 4. Fora do escopo do MVP

Pagamento real, IA, notificações push, app nativo, rastreamento em tempo real de pessoas, roteamento por ruas, tradução automática, reservas pagas, moderação automática.

## 5. Modelo de dados (Postgres)

Crie em `supabase/migrations/0001_init.sql`. Use `uuid` com `gen_random_uuid()` e `timestamptz`. Latitude e longitude como `double precision` com índice composto; sem PostGIS no MVP.

```sql
create table cities (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  state text not null,
  center_lat double precision not null,
  center_lng double precision not null,
  zoom numeric not null default 12,
  bbox double precision[] not null  -- [west, south, east, north]
);

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  avatar_url text,
  bio text,
  home_country text default 'BR',
  languages text[] default '{pt}',
  role text not null default 'nomad' check (role in ('nomad','partner','admin')),
  verified boolean not null default false,
  current_city_id uuid references cities,
  stay_from date,
  stay_to date,
  neighborhood text,              -- só para agregação de presença
  share_presence boolean not null default false,
  created_at timestamptz not null default now()
);

create table partners (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles,
  business_name text not null,
  document_type text check (document_type in ('cnpj','mei')),
  document_number text,
  approved boolean not null default false,
  plan text not null default 'free' check (plan in ('free','destaque')),
  created_at timestamptz not null default now()
);

create table places (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references cities,
  partner_id uuid references partners,
  osm_id text unique,
  name text not null,
  category text not null check (category in ('work','eat','health','stay','tour','service')),
  subcategory text,                -- cafe, coworking, restaurant, clinic, hospital, pharmacy, lab, hostel...
  lat double precision not null,
  lng double precision not null,
  address text,
  neighborhood text,
  description text,
  opening_hours text,              -- formato OSM, interpretar com opening_hours.js
  wifi_mbps numeric,
  wifi_source text check (wifi_source in ('osm','partner','user_test')),
  has_power_outlets boolean,
  quiet_level smallint check (quiet_level between 1 and 5),
  price_hint text,                 -- '$', '$$', '$$$'
  accepts_without_plan boolean,    -- saúde
  languages text[],
  nomad_seal boolean not null default false,
  featured_until timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index on places (city_id, category);
create index on places (lat, lng);

create table offers (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places on delete cascade,
  kind text not null check (kind in ('discount','day_pass','slot','package','consult')),
  title text not null,
  description text,
  code text not null,
  valid_from date,
  valid_to date,
  capacity int,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table offer_redemptions (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references offers on delete cascade,
  user_id uuid not null references profiles,
  redeemed_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (offer_id, user_id, redeemed_on)
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references cities,
  creator_id uuid not null references profiles,
  place_id uuid references places,
  offer_id uuid references offers,
  title text not null check (char_length(title) between 3 and 80),
  description text,
  category text not null check (category in ('meetup','work_together','food','outdoor','culture','tour')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  meeting_lat double precision not null,
  meeting_lng double precision not null,
  meeting_label text,
  capacity int not null check (capacity between 2 and 30),
  cost_total_cents int,
  split_cost boolean not null default false,
  status text not null default 'open' check (status in ('open','full','cancelled','done')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index on activities (city_id, starts_at);

create table activity_members (
  activity_id uuid references activities on delete cascade,
  user_id uuid references profiles,
  status text not null default 'requested' check (status in ('requested','approved','declined','left')),
  created_at timestamptz not null default now(),
  primary key (activity_id, user_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities on delete cascade,
  user_id uuid not null references profiles,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index on messages (activity_id, created_at);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles,
  target_type text not null check (target_type in ('place','activity','profile')),
  target_id uuid not null,
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 300),
  created_at timestamptz not null default now(),
  unique (author_id, target_type, target_id)
);

create table wifi_tests (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places on delete cascade,
  user_id uuid not null references profiles,
  download_mbps numeric not null,
  ping_ms numeric,
  created_at timestamptz not null default now()
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles,
  target_type text not null check (target_type in ('activity','message','profile','place')),
  target_id uuid not null,
  reason text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create table waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  city_slug text,
  audience text check (audience in ('nomad_br','nomad_foreign','partner')),
  utm_source text,
  utm_campaign text,
  origin_block text,
  created_at timestamptz not null default now(),
  unique (email)
);

create table events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  props jsonb default '{}',
  created_at timestamptz not null default now()
);
```

### Regras de RLS (escreva políticas e testes)

| Tabela | Leitura | Escrita |
| --- | --- | --- |
| `cities`, `places`, `offers` (ativas) | pública | parceiro aprovado só nos seus lugares e ofertas; admin em tudo |
| `profiles` | campos públicos para autenticados (nome, foto, bio, verificado, nota); `neighborhood` e `stay_*` só do próprio usuário e agregados via função | o próprio usuário; `verified` e `role` só admin |
| `activities` | autenticados leem as abertas da cidade | criador (e só se `verified`) |
| `activity_members` | o criador vê todos; membro vê o próprio | `requested` pelo próprio usuário verificado; `approved` e `declined` só pelo criador |
| `messages` | criador e membros `approved` | criador e membros `approved`, como o próprio `user_id` |
| `reviews` | autenticados | autor, após `ends_at`, só entre participantes |
| `wifi_tests` | agregados via view | autenticado, 1 por lugar por usuário por hora |
| `reports`, `events`, `waitlist` | só admin | inserção por qualquer um (waitlist e events anônimos) |
| `offer_redemptions` | parceiro vê contagem e primeiro nome; usuário vê o próprio | usuário verificado |

Funções SQL (RPC): `presence_by_neighborhood(city_id)` retorna só bairros com ≥ 3 pessoas; `recompute_wifi(place_id)` atualiza `wifi_mbps` e `nomad_seal`; `request_join(activity_id)` e `decide_join(activity_id, user_id, decision)` validam capacidade e verificação.

## 6. Importação de lugares reais (OpenStreetMap)

`pnpm import:osm <city_slug>` consulta a Overpass API dentro do `bbox` da cidade e faz upsert em `places` pelo `osm_id` (`node/123`, `way/456`). Mapeamento:

| Tag OSM | `category` / `subcategory` |
| --- | --- |
| `amenity=cafe` | `eat` / `cafe` |
| `amenity=restaurant`, `fast_food`, `bar` | `eat` / `restaurant`, `fast_food`, `bar` |
| `amenity=coworking_space` ou `office=coworking` | `work` / `coworking` |
| `amenity=library` | `work` / `library` |
| `amenity=clinic`, `doctors`, `hospital`, `pharmacy`, `dentist` | `health` / respectivo |
| `healthcare=laboratory` | `health` / `lab` |
| `tourism=hostel`, `guest_house`, `apartment` | `stay` / respectivo |
| `tourism=attraction`, `viewpoint`; `leisure=beach_resort` | `tour` / respectivo |

Regras: usar `internet_access=wlan` ou `internet_access=yes` apenas como indício de Wi-Fi (sem Mbps; `wifi_source = 'osm'`, `wifi_mbps` nulo); copiar `opening_hours`, `addr:*`, `wheelchair`; não copiar telefone nem e-mail; respeitar a atribuição "© OpenStreetMap contributors" visível no mapa e na página Sobre; limitar a 1 requisição por execução e guardar o resultado em cache local; tolerar falhas e repetir com espera.

Exemplo de consulta (ajuste o bbox, formato `sul,oeste,norte,leste`):

```
[out:json][timeout:60];
(
  nwr["amenity"~"cafe|restaurant|coworking_space|library|clinic|doctors|hospital|pharmacy|dentist"]({{bbox}});
  nwr["office"="coworking"]({{bbox}});
  nwr["tourism"~"hostel|guest_house|apartment|attraction|viewpoint"]({{bbox}});
  nwr["healthcare"="laboratory"]({{bbox}});
);
out center tags;
```

## 7. Seed de demonstração (`supabase/seed.sql`)

- Cidade `florianopolis`: centro aproximado `-27.5954, -48.5480`, zoom 11.5, bbox aproximado `[-48.62, -27.85, -48.33, -27.38]` (confira no mapa e ajuste).
- 3 perfis de demonstração verificados, 1 admin e 1 parceiro aprovado, todos com e-mails `@example.com`.
- 8 atividades de demonstração nos próximos 7 dias, em pontos públicos de bairros como Lagoa da Conceição, Centro, Campeche e Jurerê (coordenadas aproximadas do bairro; ajuste), todas com `is_demo = true`.
- 3 lugares de demonstração com Selo e 4 ofertas de demonstração, todos com nomes claramente fictícios ("Café Demo", "Cowork Demo"), `is_demo = true`.
- O restante do mapa vem de `pnpm import:osm florianopolis`.

## 8. Rotas e telas

| Rota | Tela | Acesso |
| --- | --- | --- |
| `/` | redireciona para `/mapa/[cidade padrão]` | público |
| `/mapa/[city]` | mapa, chips, busca, bottom sheet | público para ver; login para agir |
| `/lugar/[id]` | ficha do lugar (também como sheet) | público |
| `/atividade/nova` | criar atividade | verificado |
| `/atividade/[id]` | detalhe, fila de entrada, chat | público o resumo; chat para membros |
| `/perfil` e `/perfil/[id]` | perfil próprio e de outros | autenticado |
| `/entrar` | magic link | público |
| `/verificar` | enviar selfie com documento | autenticado |
| `/parceiro` | painel, lugares, ofertas, resgates | parceiro aprovado |
| `/admin/verificacoes`, `/admin/denuncias`, `/admin/parceiros`, `/admin/metricas` | moderação e métricas | admin |
| `/espera` | lista de espera e prova de demanda | público |
| `/sobre` | o que é, privacidade, atribuição OSM | público |

Estrutura sugerida de pastas: `src/app`, `src/components/map` (MapView, Pin, Cluster, PresenceLayer, RouteLayer), `src/components/sheet`, `src/components/ui`, `src/lib/supabase`, `src/lib/geo.ts` (haversine, bbox), `src/lib/wifi.ts`, `scripts/import-osm.ts`, `supabase/migrations`, `supabase/seed.sql`, `e2e`.

## 9. Marcos (siga em ordem)

| Marco | Entrega | Aceite |
| --- | --- | --- |
| M0 | Projeto Next.js + Tailwind + MapLibre + Supabase configurados, PWA instalável, deploy na Vercel, `.env.example`, scripts de `package.json`, README curto | URL pública abre uma página com mapa vazio; manifest válido |
| M1 | Migrações, RLS, seed, Auth por magic link, perfil básico | `pnpm db:reset` funciona; usuário entra e vê o próprio perfil |
| M2 | Importação OSM e mapa com pins, clusters, chips, busca, filtros e bottom sheet (F1, F2 sem ofertas) | Cidade-piloto mostra centenas de lugares reais; filtros funcionam |
| M3 | Identidade visual completa do mapa (`DESIGN.md`): estilo recolorido, pins, sheet, bússola, escala, modo noturno | Captura de tela mobile fiel ao `DESIGN.md` |
| M4 | Atividades: criar, listar no mapa, página compartilhável (F3) | Atividade criada aparece no mapa de outra conta |
| M5 | Verificação manual, pedir para entrar, aprovar, chat, divisão de custos, reputação (F4, F5, F6, F7) | Fluxo ponta a ponta com duas contas passa no Playwright; RLS testada |
| M6 | Painel do parceiro, ofertas, resgate com código e QR, destaque simulado (F10, F11) | Oferta criada aparece no mapa; resgate único por dia |
| M7 | Wi-Fi colaborativo, Selo, presença agregada, rota do dia, denúncia (F8, F9, F12, F14) | Teste de Wi-Fi atualiza a ficha; presença respeita o mínimo de 3 |
| M8 | `/espera`, eventos de analytics, `/admin/metricas`, página `/sobre`, polimento do pitch | Cadastro grava origem; painel mostra conversão por bloco |

Faça `/espera` (F13) logo depois do M0 se possível, mesmo antes dos outros marcos, para começar a coletar evidência.

## 10. Roteiro de demonstração (3 min)

1. Mapa de Florianópolis aberto no celular, chips "Trabalhar" e "Wi-Fi forte" mostrando cafés e coworkings com Selo.
2. Abrir um lugar, mostrar Wi-Fi medido por usuários e a oferta do parceiro.
3. Criar uma atividade "Dia de trabalho conjunto" no pin escolhido.
4. Em outra conta, pedir para entrar; na primeira, aprovar; trocar mensagens no chat; mostrar "R$ X por pessoa".
5. Painel do parceiro cadastrando uma oferta e vendo o resgate.
6. Mostrar `/espera` com o QR code e o painel de métricas.
