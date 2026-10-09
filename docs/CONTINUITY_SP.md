# Continuidade — expansão para nômades digitais em SP

Atualizado em 09/10/2026. Leia este documento antes de continuar esta entrega no Claude Code. A solicitação autoriza implementar o fluxo discutido, mantendo a identidade visual existente e documentando o trabalho. Não trocar marca, fontes, cores, componentes ou stack.

## Objetivo autorizado

Responder: “Estou pensando em passar os próximos meses nessa cidade; ela atende minha rotina?” O público continua sendo nômades digitais, inclusive quem viaja com filhos ou pets. Santos permanece disponível; a exploração passa a abranger municípios do estado de São Paulo.

Fluxo: localização atual opcional ou escolha manual → mapa navegável de SP com lugares e eventos por período → panorama da cidade com evidências de trabalho, internet, moradia, saúde e escolas → salvar destino considerando ou planejado, com datas exatas/flexíveis ou residência → comunidades opcionais por cidade → confirmar chegada e acessar agenda, orçamento, favoritos e tarefas existentes.

## Invariantes

- Identidade em DESIGN.md preservada; reutilizar PageShell, cartões, tokens, botões, Lucide e mapa existentes.
- GPS somente mediante ação do usuário, em memória no navegador. Não salvar coordenadas, enviar GPS ao analytics nem ativar presença automaticamente.
- Planejamento privado, intenção não representa presença. Chegada é explícita. Sem mensagens diretas.
- Informação desconhecida continua desconhecida. Municípios cadastrados não significam cobertura completa de lugares, disponibilidade de aluguel ou velocidade de internet. Mostrar fonte, data e limitações; Demo identificado.
- Sem pagamento, push, IA ou reserva real. Receita de parceiros e Radar preservados.
- Documentar migrações, aplicação remota, testes, falhas e pendências. Nunca incluir credenciais.

## Plano e estado

1. **Implementado:** especificação complementar, catálogo oficial dos 645 municípios e documentação de procedência.
2. **Implementado, browser pendente:** mapa estadual com busca na área, GPS opcional, cidades e períodos; escolas e moradia. GPS identifica município por polígono IBGE no navegador, sem transmitir ponto ao servidor; busca usa grade de área de aproximadamente 1 km.
3. **Implementado, browser pendente:** panorama e preferências privadas de orçamento, chamadas, filhos e pets.
4. **Implementado, integração aprovada, browser pendente:** destinos considerando/planejados, datas específicas/flexíveis/residência, editar/remover e chegada explícita.
5. **Implementado, RLS aprovada, browser pendente:** comunidades, adesão, silenciar indicadores, chat, bloqueios, denúncia e moderação.
6. **Concluído (09/10, Claude Code):** validação final, documentação e commit. Detalhes no registro abaixo.
   Antes: Suite Vitest completa: 48 arquivos / 182 testes aprovados após retomar; lint aprovado. Novo build após ajustes de GPS/API pendente.

## Estado ao iniciar

- Git limpo; último commit f7ab1ed (exclusão de arquivos gerados do upload Vercel).
- Migrações até 0020 aplicadas no Supabase. Não resetar banco nem apagar dados existentes.
- Banco atual tem Santos e Florianópolis; mapa carrega por cidade e está limitado ao bbox municipal.
- Uma estadia ativa por usuário em `stays`, com tarefas, agenda, orçamento e favoritos. Aproveitar esse fluxo para chegada; criar planejamento privado separado sem ativação automática.
- Chat existente é por atividade; comunidades independentes exigem novas políticas e tabelas.
- Importador OSM existente preserva dados de parceiros e medições; ampliar sem sobrescrevê-los.
- Testes anteriores: 43 arquivos / 169 testes Vitest, build/lint/types aprovados; testes adicionais de completion aprovados conforme docs/VALIDATION.md.
- Não houve deploy nem git push feito pelo agente. Usuário está usando Vercel CLI manualmente.
- Redirecionamento de magic link para localhost: orientação de configurar Site URL/Redirect URLs no Supabase já fornecida; URL pública não informada e correção remota não verificada.

## Registro de trabalho

- 09/10: lidos CLAUDE.md, DESIGN.md e código de cities/mapData/MapExperience/stayData/panorama. Decisão: preservar sistemas existentes e acrescentar planejamento privado e comunidades sem alterar presença.
- 09/10: criada SPEC_SP_NOMADS.md. Preparado snapshot oficial IBGE com 645 municípios e malhas simplificadas, src/data/sp-cities.json e public/data/sp-municipalities.geojson; script catalog-sp.mjs gera 0021. Centros são meio do bbox, aproximados. Santos conserva seu centro e ID atuais.
- 09/10: escritas 0022_destination_plans.sql (planos privados + chegada transacional) e 0023_city_communities.sql (6 tópicos vazios por cidade, RLS, mensagens, Realtime e moderação). **Ainda não aplicadas neste checkpoint.** Tentativa db:push --dry-run encontrou sandbox de escrita de telemetria em ~/.supabase; não houve mudança no banco.
- 09/10: criadas rotas /estadias, /estadias/nova, /estadias/[id]/editar, /estadias/[id], /comunidades, /comunidade/[id] e /api/mapa-area. MapView/MapExperience reutilizados para /mapa/sp com cidades e períodos; diretório paginado. Home agora propõe localização/cidade (GPS somente ao toque). Panorama novo CityDecision exclui Demo. Formulários, chat e integração estão em implementação; tipos/lint/testes ainda pendentes.
- Próximo: corrigir eventuais tipos, aplicar migrações aditivas depois de revisar o dry-run, testar RLS/chegada/chat, ampliar importador com limites municipais e executar importação inicial de São Paulo/Santos; validar browser. Não considerar esta entrega pronta ainda.
- 09/10: dry-run aprovado listou somente 0021/0022/0023. As três migrações foram **aplicadas no Supabase com sucesso** após a revisão, sem reset/seed. Tipos passaram. Lint encontrou somente um script temporário .cache/fix-sp.cjs, já removido. Scripts import:sp e filtro por polígonos IBGE adicionados; importador agora pagina dados existentes para não perder proteção de Wi-Fi em cidades grandes. Testes de isolamento/chegada/chat adicionados, execução pendente.
- 09/10: aplicada **0024_community_read_guard.sql**. O teste revelou que a política do chat chamava um helper de bloqueios sem permissão de execução do cliente; wrapper restrito ao usuário atual corrigiu o acesso. Os 2 testes de integração SP passaram, incluindo isolamento, chegada, idempotência, bloqueio bilateral, verificação e saída.
- 09/10: importação inicial concluída (progressos em .cache/sp-import-progress.json): Santos 405 registros processados, São Paulo 9.935 e Campinas 1.554, com escolas. São contagens importadas, não totais do banco. Polígonos IBGE impedem atribuir novos registros da cidade vizinha; dados legados não foram apagados.
- 09/10: build de produção isolado em .next-sp passou. Últimas alterações depois desse build: paginação do mapa municipal (PostgREST limita resposta a 1.000), links de criar roda respeitam cidade selecionada, teste smoke atualizado para a nova entrada e e2e/sp.spec.ts criado. Esses ajustes ainda exigem novo build e testes de browser.
- 09/10: PC do usuário desligou; ao retomar, todos os arquivos e o progresso das importações foram encontrados no disco. Sem reset nem reimportação. Última chamada de execução dos testes foi interrompida; não assumir aprovação do teste completo ou do Playwright sem nova saída. Verificar preview 3114 e retomá-lo se parado. Ainda falta finalizar validação e documentação.

- 09/10 (Claude Code, retomada): migrações 0001–0024 confirmadas no Supabase (`migration list`). Tipos e lint aprovados. Vitest de banco aprovado inteiro, rodado em lotes porque o limite de login do Supabase (429 "Request rate limit reached") derruba suítes rodadas em sequência rápida; isso não é falha de código. Build de produção aprovado. Playwright com `--workers=1`: 65 aprovados, 14 pulados (por desenho: fluxos de dois celulares só no projeto mobile etc.) e 3 falhas corrigidas:
  - o link "Mapa" do cabeçalho (PageShell) ia para `/`, que agora é a escolha de cidade; passou a voltar ao último mapa aberto (`MapLink`, só caminho e query no `localStorage`, nunca posição);
  - `database-completion` dependia de uma roda demo sensível ao horário: rodar `pnpm demo:refresh` antes e recarregar o mapa uma vez (o cache de dados do Next.js é stale-while-revalidate).
  Após as correções, os testes afetados passaram. Nada publicado nem enviado ao GitHub.

## Como retomar

Leia CLAUDE.md, este arquivo, SPEC_SP_NOMADS.md (quando criado), docs/DECISIONS.md e docs/VALIDATION.md. Confira `git status` e migrações pendentes antes de executar. No Windows use `pnpm.cmd` e `npx.cmd`. Supabase usa `.env.local`; não imprimir secrets. Para build isolado use NEXT_DIST_DIR e restaure alterações automáticas de tsconfig se necessário. Não confundir testes locais com validação do site Vercel.
