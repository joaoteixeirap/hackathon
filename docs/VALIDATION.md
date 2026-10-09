# Validação da entrega V4–V7

09/10/2026. App local, Supabase configurado na nuvem. Continuação da sessão interrompida no V4. Migrações incrementais 0014–0019 aplicadas; sem reset remoto. Publicação e push aguardam liberação conforme decisão anterior da equipe.

## Cobertura

| Marco | Comportamento entregue | Evidência |
| --- | --- | --- |
| V4 · Vínculos | Séries com seis datas futuras, aprovação única, entrada com vaga, chat, boas-vindas oficiais, compatibilidade e bloqueios | `series.test.ts`, `supabase/tests/v4.test.ts`, `e2e/v4.spec.ts`; dois contextos móveis |
| V5 · Jornada | Lugar → sessão pré-preenchida, mínimo de grupo validado no banco, horário do parceiro, painel agregado e agenda ICS | `journey.test.ts`, `ics.test.ts`, `supabase/tests/v5.test.ts`, `e2e/v5.spec.ts` |
| V6 · Medição e cidade | Orçamento e gastos privados, serviços essenciais, cidade com dados e amostras, três apostas na espera, pesquisa e funis | `budget`, `cityStats`, `engagement`, testes RLS V6, `e2e/v6.spec.ts` e `e2e/espera.spec.ts` |
| V7 · Polimento e demo | Perfis, estadias, séries, grupos e horários Demo; revisão de fontes; copy; navegação móvel; Radar com mapa sob demanda; documentação | `copy.test.ts`, `compatScore.test.ts`, `e2e/v7.spec.ts`; seed e refresh executados |

Os cinco fluxos obrigatórios da seção 13 da especificação estão cobertos: medição e data na ficha (V1), série/aprovação/chat (V4), mínimo de grupo (V5), estadia estrangeira/tarefa/favorito/agenda ICS (V3 atualizado) e espera/pesquisa deduplicada (espera).

## Verificações

- TypeScript, ESLint e build de produção aprovados.
- Vitest: **40 arquivos, 164 testes aprovados**, incluindo integrações RLS/RPC no Supabase configurado. Execução sequencial para evitar limites de autenticação.
- Playwright: **52 aprovados, 10 pulados, nenhum erro**, em 2,3 minutos, celular e desktop contra build de produção, um worker. Os casos pulados são duplicações intencionais do perfil complementar: fluxos móveis executam uma vez; moderação admin executa no desktop.
- Larguras 360, 375 e 390 px: Gastos, Tarefas, Pessoas, cidade, série e benefício sem rolagem horizontal da página; links das abas com altura mínima de 44 px.
- Capturas locais em `.cache/review/` de Radar, Hoje, Gastos, Pessoas, série, cidade e benefício; revisão da versão final sem erro JavaScript. Amostra local sem limitação de rede, a 375 px: DOMContentLoaded entre 123 e 360 ms. Não equivale a benchmark em aparelho ou rede reais.
- Build: Radar passou de 469 kB para 196 kB de JavaScript inicial; MapLibre é carregado ao escolher o mapa. Mapa principal: 499 kB; dados e tiles ainda dependem da rede.
- `seed:demo` e `demo:refresh` concluídos. OSM atualizado: **435 lugares reais** em Santos, preservando registros reivindicados e medições existentes.

## Limites da validação

Não foi executado reset local com Docker, nem deploy, teste em domínio publicado ou avaliação em celular físico. Os testes de navegador usam emulação e duas sessões distintas. Dados Demo permanecem identificados; indicadores desse ambiente podem incluir testes e demonstrações. Não há pagamento real, mensagem direta, geolocalização persistida, microfone ou aconselhamento sobre vistos.

Modelo de checklist sem fonte permanece como lembrete e aparece para revisão no admin. Atendimento 24h exige horário informado como 24/7; etiqueta de emergência sem horário não é tratada como funcionamento contínuo.
