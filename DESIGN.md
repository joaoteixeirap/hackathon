# DESIGN.md — Identidade visual SoloRota (v2)

Revisado em 08/10/2026 a pedido da equipe: a v1 ("Carta Tropical", carta náutica com moldura, gravura e carimbos) parecia um jogo. A v2 é um **app moderno, limpo e com marca forte**. Referências de qualidade: Airbnb, Google Maps, Citymapper.

O mapa continua sendo a interface (busca flutuante, chips, pins, bottom sheet arrastável), mas a cor fica com a marca e com os pins; o mapa-base é neutro.

## 1. Marca

- **Nome:** "solorota", sempre em minúsculas no logotipo. Componente único `Logo` / `LogoMark` em `src/components/ui/Logo.tsx`.
- **Símbolo:** quadrado arredondado (squircle) coral com um pino branco no fim de uma rota pontilhada. Funciona sozinho como ícone do app (PWA e favicon com o mesmo desenho).
- **Logotipo:** Bricolage Grotesque 800, tracking −3%, "solo" em `ink` e "rota" em `accent-strong`.
- **Assinatura de cor:** o coral aparece onde há marca ou ação de criar (logo, botão "+", "Criar roda", atividades ao vivo). Não usar coral em texto pequeno sobre branco: para texto, `accent-strong`.
- **Voz:** acolhedora, direta, pt-BR ("Criar um rolê em grupo", "Combine em local público", "Explorar Santos").

## 2. Cores (tokens em `src/app/globals.css`)

| Token | Claro | Escuro | Uso |
| --- | --- | --- | --- |
| `canvas` | `#F6F4F1` | `#0D1418` | fundo do app |
| `surface` | `#FFFFFF` | `#162027` | cartões, sheet, barras |
| `surface-2` | `#F1EEE9` | `#1D2A32` | preenchimentos sutis, hover, estatísticas |
| `ink` | `#0F1F2A` | `#EDF1F3` | texto |
| `muted` | `#5D6A73` | `#9FADB6` | texto secundário |
| `line` | `#E6E1DA` | `#26333C` | bordas finas |
| `primary` ("Atlântico") | `#0B3B4A` | `#6CC3D1` | botões primários, chips ativos, clusters |
| `primary-soft` | `#E3EEF0` | `#183A44` | fundo do Selo e filtros ativos |
| `accent` ("Coral Santos") | `#FF5B3A` | `#FF5B3A` | marca, criar, atividades |
| `accent-strong` | `#D63D1E` | `#FF8A6E` | coral para texto |
| `success` / `danger` | `#10805E` / `#C2341B` | `#4CC79B` / `#FF7A62` | estados |

Categorias (pins, ícones, avatares de lista; ícone sempre branco sobre a cor):

| Categoria | Cor (claro) | Ícone Lucide |
| --- | --- | --- |
| Trabalhar `work` | `#0F7A83` | `laptop` |
| Comer `eat` | `#D9661A` | `utensils` (café: `coffee`) |
| Saúde `health` | `#D6335C` | `heart-pulse` |
| Morar `stay` | `#6A3FD1` | `bed` |
| Passeios `tour` | `#1677C7` | `compass` |
| Serviços `service` | `#56636D` | `wrench` |
| Atividades | `#FF5B3A` | por tipo (users, laptop, utensils, mountain, landmark, ship) |

Modo escuro: segue o sistema por padrão; "Claro/Escuro/Auto" no painel Camadas (grava a escolha no aparelho).

## 3. Tipografia

- **Display (títulos, nomes de lugares, números de destaque):** Bricolage Grotesque 600–800, tracking levemente negativo.
- **Interface:** Plus Jakarta Sans 400–700.
- Números com `tabular-nums` (horários, Mbps, distâncias). Sem fonte monoespaçada, sem serifa, sem itálico decorativo.
- Base 16 px; títulos de sheet 22 px; títulos de página 32 px; chips 14 px.

## 4. Mapa

- MapLibre GL JS com o estilo vetorial livre OpenFreeMap "liberty", recolorido em `src/components/map/applyTheme.ts` (temas `day` e `night`): terra areia clara, água azul suave, parques verde-claro, ruas brancas com contorno a 10%, rótulos cinza-azulados com halo branco. POIs do estilo base ocultos (os pins são nossos). Sem texturas, molduras ou ornamentos.
- Limites travados no `bbox` da cidade; `maxZoom` 18; rotação desligada.
- Botão "recentralizar" (`LocateFixed`) recentra na cidade sem pedir GPS.
- Régua de escala discreta no canto inferior esquerdo; atribuição "© OpenStreetMap" compacta e sempre visível.

## 5. Elementos sobre o mapa

- **Pins de lugar:** círculo na cor da categoria, aro branco, pequena ponta inferior e sombra suave; ícone branco. Destaque pago (`featured_until`): 20% maior com halo coral suave. **Selo Amigo do Nômade:** distintivo circular `primary` com ícone de Wi-Fi no canto superior direito.
- **Clusters:** disco `primary` com aro branco e número em branco; halo translúcido na cor da categoria dominante.
- **Atividades:** ponto coral com aro branco e pulso suave (24 h antes do início; contínuo durante). Rótulo em "pílula" branca com sombra (dia e hora em coral, título em `ink`), visível a partir do zoom 14,5.
- **Presença (M7):** manchas translúcidas `primary` a 20% com contagem; só bairros com ≥ 3 pessoas.
- **Rota do dia (M7):** linha coral de 3 px com paradas numeradas em círculos brancos.

## 6. Layout

```
┌──────────────────────────────┐
│ [■] (🔍 Buscar em Santos   ) │  ← logo-símbolo + busca flutuante (pílula branca, sombra)
│ (Trabalhar)(Comer)(Saúde)(…) │  ← chips brancos rolando; ativo = primary
│                         [≋]  │  ← Camadas
│            MAPA         [◎]  │  ← Recentralizar
│ ┌──────────────────────────┐ │
│ │ ▬  Explorar Santos       │ │  ← sheet: 96 px, 45%, 92%
│ │    156 lugares · 2 rodas │ │
│ └──────────────────────────┘ │
│ Explorar  Grupos  [+]  Perfil│  ← barra inferior; [+] squircle coral
└──────────────────────────────┘
```

- **Desktop (≥ 1024 px):** painel flutuante à esquerda (400 px, raio 28, sombra grande) com logo, "Criar roda", busca, chips em várias linhas e lista; mapa ocupa a tela.
- Bottom sheet: lista rola só quando cheia; ficha de lugar/atividade rola a partir da meia altura.

## 7. Componentes

`Logo`, `LogoMark`, `SearchPill`, `CategoryChips`, `BottomSheet`, `ResultList`, `PlaceDetail`, `ActivityDetail`, `WifiMeter` (barras + Mbps + origem do dado), `NomadBadge` (cartão e versão compacta), `DemoTag`, `VerifiedBadge`, `Rating`, `LayersMenu`, `RecenterButton`, `BottomNav`, `LocationPicker` (arrastar o mapa até a mira). A criar: `JoinQueue`, `ChatPanel`, `OfferTicket`, `PresenceBlob`, `RouteTray`, `EmptyState`.

## 8. Superfícies e formulários

- Cartões brancos, raio 24 px (`rounded-3xl`), borda `line` de 1 px, sombra suave (`shadow-soft-sm/md/lg`). Nada de contornos pretos ou sombras duras.
- Botões em pílula, altura 48 px: primário `primary`; destaque `accent` (criar); secundário branco com borda `line`. Ícone + texto.
- Campos: 48 px, raio 16, borda `line`, foco com borda `primary` e anel `primary` a 15%.
- Estatísticas da ficha em blocos `surface-2` arredondados.
- Ícones: Lucide, traço 2.

## 9. Movimento

- Sheet com curva rápida e sem quique exagerado; botões encolhem 2% ao toque; pulso das atividades em 2,4 s.
- Com `prefers-reduced-motion`: sem pulso (anel estático) e sem transições de posição.

## 10. Acessibilidade

Contraste AA em texto (coral só em fundos grandes ou como `accent-strong` para texto); pins sempre com ícone, nunca só cor; alvos ≥ 44 px; rótulos ARIA nos controles do mapa; foco visível com anel; lista de resultados como alternativa textual ao mapa; respeitar tamanho de fonte do sistema.
