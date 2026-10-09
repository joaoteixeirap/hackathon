# DESIGN.md — Identidade visual do mapa: "Carta Tropical"

O mapa é a interface. A experiência lembra navegar pelo Google Maps (busca flutuante, chips de categoria, pins, bottom sheet arrastável, botão de localização), mas com personalidade própria: uma **carta náutica tropical impressa em papel**, quente, com tinta e carimbos, em vez do mapa corporativo cinza e azul.

## 1. Conceito

- **Papel e tinta:** terra em creme, água em verde-azulado profundo, linhas finas de tinta, textura de papel sutil.
- **Instrumentos de bordo:** números de Wi-Fi, distância e contagem de pessoas em fonte monoespaçada, como leituras de instrumento.
- **Carimbos:** o Selo Amigo do Nômade é um carimbo circular; a verificação é um selo de lacre.
- **Calor humano:** atividades aparecem como anéis pulsantes ("rodas de conversa") sobre o mapa, o que dá sensação de gente, não só de lugares.

Nome provisório "SoloRota" pode ser trocado; mantenha o logotipo em um único componente `Logo`.

## 2. Paleta (tokens CSS e Tailwind)

| Token | Hex | Uso |
| --- | --- | --- |
| `papel` | `#F3EAD7` | terra do mapa, fundo de superfícies |
| `papel-claro` | `#FBF6EA` | cartões, bottom sheet |
| `tinta` | `#1F2A30` | texto, linhas |
| `tinta-suave` | `#5A6770` | texto secundário |
| `mare` | `#1E5B66` | água profunda, categoria Trabalhar, ações primárias |
| `mare-claro` | `#9CC9C3` | água rasa do mapa |
| `coral` | `#E8603C` | categoria Comer, destaques de oferta |
| `sol` | `#F2B632` | atividades (anéis), alertas gentis |
| `mata` | `#B9CDA0` | parques e áreas verdes no mapa |
| `farmacia` | `#2E8B6A` | categoria Saúde |
| `anil` | `#4B5BA6` | categoria Morar |
| `ameixa` | `#8A4F7D` | categoria Passeios |
| `grafite` | `#5B6770` | categoria Serviços |
| `erro` | `#B3321F` | erros e denúncias |

Modo noturno ("carta noturna"), ativado por `prefers-color-scheme: dark` e por botão: terra `#0F1E26`, água `#0B3A42`, parques `#1D3A33`, texto `#EDE5D2`, e as cores de categoria levemente mais claras (+10% de luminosidade) para manter contraste.

## 3. Tipografia

- **Títulos e nomes de lugares:** Fraunces (serifa suave, variável), pesos 600 e 700; itálico para bairros.
- **Interface:** Plus Jakarta Sans, pesos 500 e 700.
- **Números de instrumento (Mbps, metros, contagens, horários):** DM Mono, peso 500.
- Carregar via `next/font` (Google Fonts) com `display: swap`. Tamanho base 16 px; títulos de sheet 20 px; chips 14 px.

## 4. O mapa em si

- Biblioteca: MapLibre GL JS. Estilo base vetorial livre, configurado em `NEXT_PUBLIC_MAP_STYLE_URL` (sugestão: o estilo "liberty" da OpenFreeMap; confirme que está no ar e, se não estiver, use outro estilo vetorial livre com atribuição OSM).
- **Recolorir o estilo em tempo de carga:** baixe o JSON do estilo, percorra `layers` e ajuste `paint` por tipo e por trecho do `id`:
  - `background` e uso do solo → `papel`;
  - `water`/`waterway` → `mare-claro`, com contorno `mare` de 0,5 px;
  - `park`, `landcover` (grama, mata) → `mata` com opacidade 0,7;
  - ruas (`road_*`) → branco-papel `#FFFDF6` com contorno `tinta` a 15% de opacidade; avenidas principais com contorno um pouco mais forte, sem laranja nem amarelo;
  - edifícios → `#E7DCC3` sem contorno;
  - rótulos → `tinta` com halo `papel`;
  - ícones de POI do estilo base → ocultar (os pins são nossos).
  Faça isso em `src/components/map/applyTheme.ts`, com uma função por tema (`day`, `night`), inspecionando os `id` reais do estilo escolhido.
- **Grão de papel:** sobreposição CSS (`pointer-events: none`) com ruído SVG a 4% de opacidade sobre o mapa e as superfícies.
- **Bússola no lugar de "minha localização":** botão circular com rosa dos ventos; toque recentra na cidade (sem pedir GPS no MVP; pedir geolocalização só se o usuário tocar em "Perto de mim").
- **Escala:** régua com marcações de tinta no canto inferior esquerdo, acima da bottom sheet recolhida.
- **Atribuição:** "© OpenStreetMap contributors" discreta, sempre visível.
- Limites do mapa travados no `bbox` da cidade; `maxZoom` 18.

## 5. Elementos sobre o mapa

### Pins de lugar ("gota-bússola")
- Forma de gota arredondada com pequena ponta, contorno `tinta` de 1,5 px, preenchimento na cor da categoria, ícone branco (Lucide) no centro: Trabalhar `laptop`, Comer `coffee`/`utensils`, Saúde `heart-pulse`, Morar `bed`, Passeios `compass`, Serviços `wrench`.
- Tamanho 32 px; lugar com `featured_until` futuro: 40 px com halo `sol` suave.
- **Selo Amigo do Nômade:** carimbo circular de 18 px preso ao canto superior direito do pin (anel tracejado `tinta`, centro `papel`, ícone `wifi`).
- Entrada: queda curta com leve quique (150 ms); respeitar `prefers-reduced-motion`.

### Clusters
- Círculo `papel-claro` com contorno `tinta`, número em DM Mono; cor do anel indica a categoria dominante.

### Atividades ("rodas")
- Anel `sol` de 2 px que pulsa devagar (escala 1 → 1,6, opacidade 0,6 → 0, ciclo de 2,4 s) em volta de um pino pequeno com ícone da categoria. Começa a pulsar 24 h antes de `starts_at`; no horário, o anel fica contínuo.
- Rótulo ao lado em Fraunces 12 px: hora em DM Mono ("19:30") e título truncado.

### Presença ("quem está aqui")
- Manchas orgânicas e translúcidas (`mare` a 25%) sobre o bairro, com a contagem em DM Mono. Só bairros com ≥ 3 pessoas. Nunca pontos individuais.

### Rota do dia
- Linha tracejada `coral` de 3 px ligando as paradas na ordem, com numeração 1 a 5 em círculos `papel-claro`. Bandeja inferior mostra distância total e tempo estimado a pé em DM Mono.

## 6. Layout (mobile primeiro, 390 px)

```
┌──────────────────────────────┐
│ [≡ logo]  Buscar em Floripa… │  ← barra flutuante (pílula papel-claro, sombra suave)
│ (Trabalhar)(Comer)(Saúde)(…) │  ← chips rolando na horizontal
│                              │
│            MAPA              │      ┌──┐ camadas
│                         ⌖    │      │◎ │ bússola
│                              │      │＋│ criar atividade (FAB coral)
│ ┌──────────────────────────┐ │
│ │ ▬  Bottom sheet          │ │  ← 3 alturas: recolhida (80 px), meia (45%), cheia (92%)
│ └──────────────────────────┘ │
│ [Mapa] [Grupos] [＋] [Perfil]│  ← navegação inferior de 4 itens
└──────────────────────────────┘
```

- **Bottom sheet** arrastável com 3 pontos de parada; rola o conteúdo só quando está cheia. Recolhida mostra "N lugares e M atividades nesta área". Conteúdo: lista de resultados da área visível, ou ficha de um lugar ou atividade quando algo é selecionado.
- **Desktop (≥ 1024 px):** painel lateral esquerdo de 380 px no lugar da sheet; mapa ocupa o resto; barra de busca dentro do painel.
- **Chips:** altura 36 px, contorno `tinta`, fundo `papel-claro`; ativo preenche com a cor da categoria e texto branco.
- **FAB (+):** circular `coral`, 56 px, abre "Criar atividade" e "Cadastrar lugar" (este só para parceiros).
- **Camadas:** painel pequeno com interruptores: Lugares, Atividades, Quem está aqui, Rota do dia, Modo noturno.

## 7. Componentes (crie em `src/components/ui` e `.../map`)

`Logo`, `SearchPill`, `CategoryChips`, `BottomSheet` (com `Sheet.Handle`, snap points), `PlaceCard`, `PlaceDetail`, `ActivityCard` (com contagem regressiva em DM Mono), `ActivityDetail`, `JoinQueue`, `ChatPanel`, `WifiMeter` (quatro barras + Mbps + origem do dado em texto pequeno), `SealStamp`, `OfferTicket` (cartão em formato de ingresso com picote, código e QR), `VerifiedBadge` (selo de lacre), `PresenceBlob`, `RouteTray`, `CompassButton`, `ScaleRuler`, `MapPin`, `ClusterMarker`, `ActivityRing`, `EmptyState`.

## 8. Estilo dos cartões e formulários

- Cartões em `papel-claro`, raio 16 px, contorno `tinta` a 12% e sombra `0 2px 0 tinta a 10%` (sensação de papel recortado); sem gradientes.
- Botão primário `mare` com texto `papel-claro`; secundário com contorno `tinta`; perigo `erro`.
- Campos com contorno `tinta` a 30%, foco com anel `sol` de 2 px.
- Ícones: Lucide, traço 1,75 px.
- Ilustrações de estado vazio: linhas de tinta simples (onda, bússola, concha), sem fotografia.

## 9. Movimento

- Sheet: mola curta (stiffness alta, sem sobrelevação exagerada).
- Pins entram com queda e quique; anéis das atividades pulsam; troca de tema com transição de 200 ms.
- Com `prefers-reduced-motion`, remover quique e pulso (anel fica estático com opacidade 0,5).

## 10. Voz e microtextos (pt-BR)

Tom acolhedor, direto, sem gíria forçada. Exemplos: "Quem está por aqui hoje?", "Criar um rolê em grupo", "Combine em local público", "Wi-Fi medido por 3 nômades", "Sem informação ainda. Ajude a mapear", "Cobrança simulada neste protótipo", "Demo" (etiqueta em dados de demonstração).

## 11. Elementos de carta náutica (adicionados em 08/10/2026)

Para reforçar a autenticidade da "Carta Tropical" (cidade-piloto Santos, cidade portuária):

- **Moldura graduada:** bordas da tela com blocos alternados `tinta`/`papel-claro` (escala de latitude e longitude da margem de uma carta), com filete interno fino. 6 px no celular, 9 px no desktop.
- **Água gravada:** hachura horizontal fina sobre a água e contorno de costa em tinta, como gravura em metal.
- **Rosa dos ventos** decorativa, translúcida, sobre o mar.
- **Leitura de instrumento:** coordenadas do centro do mapa em graus, minutos e segundos (DM Mono) acima da régua de escala.
- **Cartucho (desktop):** caixa de título com borda dupla, "Carta do nômade · Santos", coordenadas e "levantamento colaborativo".
- **Logotipo:** estrela-bússola em anel tracejado; "Solo" reto e "Rota" em itálico coral.
- **Etiquetas de filtro** (Wi-Fi forte, Aberto agora…) em DM Mono com contorno tracejado, distintas dos chips de categoria.
- **Picote** pontilhado sob o cabeçalho da bottom sheet; vinheta suave de papel envelhecido nas bordas.

## 12. Acessibilidade

Contraste AA em texto e ícones; pins sempre com ícone (nunca só cor); alvos ≥ 44 px; rótulos ARIA nos controles do mapa; foco visível; lista de resultados na sheet como alternativa textual ao mapa; respeitar tamanho de fonte do sistema.
