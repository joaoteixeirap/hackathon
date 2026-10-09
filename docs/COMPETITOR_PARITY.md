# Base comum dos concorrentes e diferenciais do SoloRota

Revisão de 09/10/2026, a pedido da equipe: reunir os diferenciais previstos e a base útil encontrada nos concorrentes. As páginas públicas indicam oferta de funcionalidades; esta revisão não é um teste dos aplicativos nem comprova qualidade ou equivalência completa.

## Fontes oficiais consultadas

- [Nomadtable](https://nomadtable.app/): criação e descoberta de atividades próximas, encontros e chat de grupo. [Portal de anúncios](https://ads.nomadtable.app/): mapa, feed, métricas e anúncio de parceiro.
- [NomadX](https://nomadx.com/): comunidades presenciais, destinos, guias, eventos e ofertas para membros.
- [The Nomadic Club](https://www.thenomadic.club/): comunidade, encontros, ferramentas, lugares recomendados, benefícios e timeline dos próximos destinos.
- [Nomads.com](https://nomads.com/): pesquisa de destinos, viagens, encontros e chat; [filtros de custo e internet](https://nomads.com/cheap-places-with-fast-internet).

Não reutilizamos números de usuários, preços, rankings ou textos comerciais dos concorrentes como dados do SoloRota. Nenhum concorrente aparece na interface do produto.

## Cobertura do produto

| Recurso comum | Cobertura no SoloRota | Limite relevante |
| --- | --- | --- |
| Mapa e busca de lugares/atividades | `/mapa/[city]`, categorias, busca, filtros, lista e ficha | Cobertura depende dos dados cadastrados/importados |
| Eventos e encontros | Criar roda, capacidade, pedido de entrada, aprovação, séries semanais, boas-vindas | Rodas são grupos ligados a atividades; sem fórum global |
| Chat de grupo | Chat da roda para criador e membros aprovados | Sem mensagens diretas, conforme I5 |
| Perfis e pessoas na cidade | Perfil, verificação, interesses, rotina, descoberta opt-in e datas sobrepostas | Contato pelas rodas; novo atalho para pedir entrada no cartão da pessoa |
| Lugares recomendados e avaliações | Fichas, reputação, favoritos, medições anônimas, Radar | Radar usa critérios e dados com fonte; não vende posição |
| Benefícios e descontos | Oferta, resgate, mínimo de grupo e validação por parceiro | Cobrança/comissão simuladas no MVP |
| Negócios e métricas | Cadastro/reivindicação de lugar, destaque identificado, horários ociosos e painel agregado | Sem campanhas com pagamento real |
| Descoberta de destinos | Novo `/explorar`: busca das cidades cadastradas, mapa, Radar e painel por cidade | Não equivale a catálogo/ranking mundial de custo, clima, segurança e vistos |
| Ferramentas para nômades | Novo diretório: fusos, hora local e mapas; atalhos de agenda, gastos e checklist | Catálogo inicial de três serviços externos; sem biblioteca de cursos |
| Planejamento de viagem | Estadia privada, chegada/saída, tarefas, agenda e ICS | Não há timeline pública de viagens nem itinerário com vários destinos futuros |

## Diferenciais preservados

Rotina de trabalho verificável (medição, validade dos selos, fontes e frescor), afinidade pela estadia e rotina (opt-in, séries e boas-vindas), jornada local (tarefas, favoritos, agenda, orçamento e essenciais). Funções do SoloRota continuam gratuitas para o nômade. Links externos seguem as condições dos respectivos serviços.

## Próximas expansões distintas do escopo entregue

Uma timeline com vários destinos, comparador mundial com dados licenciados e atualizados, biblioteca editorial e chat de comunidade independente são expansões reais de produto. Não se apresentam como implementadas. IA, push e aplicativo nativo continuam fora do MVP descrito em `CLAUDE.md`. A pesquisa dos concorrentes não autoriza divulgar itinerários privados ou criar comunicação direta contrariando I5.

## Dependência de banco ativada

A migração `0020_completion.sql` habilita compatibilidade agregada nos cartões do mapa e preservação da etiqueta `emergency=yes` do OSM. Aplicada em 09/10/2026 após autorização explícita da equipe; contratos validados no banco e navegador com respostas reais. A classificação de atendimento de emergência nunca transforma horário desconhecido em funcionamento 24h.
