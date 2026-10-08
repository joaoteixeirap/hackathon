# EVIDENCE.md — Evidências de demanda com dados da web (sem entrevistas)

Atualizado em 08/10/2026. Sem tempo para entrevistas, a demanda é sustentada por (1) dados públicos já publicados e (2) testes comportamentais que o próprio produto coleta (`/espera`, analytics, Wi-Fi colaborativo). Tudo marcado como "hipótese" ainda não foi validado.

## 1. Dados públicos para o pitch

| Dado | Valor | Fonte |
| --- | --- | --- |
| Nômades nos EUA | 18,5 milhões em 2025, +153% desde 2019 | MBO Partners, Digital Nomads Trends Report 2025: https://www.mbopartners.com/state-of-independence/digital-nomads |
| Tempo médio por parada (EUA) | 6,4 semanas em 2025 (5,4 em 2023) | MBO Partners (mesma fonte) |
| Saída do estilo de vida | 19% a 22% voltam à vida tradicional por ano | MBO Partners (mesma fonte) |
| Países com visto de nômade | 64 | MBO Partners (mesma fonte) |
| Nômades brasileiros, perfil (n = 200, recrutados em comunidade) | 30–35 anos (33,2%); 63% solteiros; 86% com graduação ou pós; renda de R$ 5.648 a R$ 14.120 (43,5%); 71% em aluguel por temporada; 80% priorizam preço; 58% passam a maior parte do tempo sozinhos; 68% citam saúde como motivo para parar; Instagram 97%, WhatsApp 92,5% | Martins, Lima e Kanarski, Intercom 2025: https://sistemas.intercom.org.br/pdf/submissao/nacional/23/061720251712246851cc28bdfea.pdf |
| Nômades em Florianópolis | 5.666 em 2025 (+224% sobre 2018), permanência média de um mês, projeção de 15 mil e R$ 1,5 bilhão por ano até 2030 | DashCity via Baguete: https://www.baguete.com.br/noticias/floripa-estima-ganhar-r-15-bi-com-fluxo-de-nomades-digitais |
| Vistos de nômade no Brasil | Ao menos 400 no primeiro ano (2022). Dado mais recente não localizado | Diário do Turismo: https://diariodoturismo.com.br/nomades-digitais-em-um-ano-brasil-recebe-pelo-menos-400/ |
| Requisitos do visto | Renda de US$ 1,5 mil por mês ou US$ 18 mil em fundos, seguro-saúde válido no Brasil | Mobile Time: https://www.mobiletime.com.br/noticias/24/01/2022/governo-federal-regulamenta-visto-para-nomade-digital/ |
| Política pública | Campanha da Embratur em outubro de 2025 e previsão de alta de 30% ao ano nos vistos | Diário do Turismo: https://diariodoturismo.com.br/embratur-aposta-no-tiktok-para-promover-o-brasil-entre-nomades-digitais/ |
| Coworkings | 3.120 espaços e 78% de ocupação média (Censo Woba 2025) | Diário do Comércio: https://diariodocomercio.com.br/negocios/belo-horizonte-segundo-maior-polo-coworkings-brasil/ |
| Tamanho do nicho brasileiro | Comunidades de nômades brasileiros raramente passam de 3 mil pessoas, segundo um dos autores do estudo da UFPR | Forbes Brasil: https://forbes.com.br/carreira/2025/04/tudo-o-que-voce-precisa-saber-para-se-tornar-um-nomade-digital/ |

Limites a declarar no pitch: amostra brasileira pequena e autosselecionada; números do MBO são dos EUA; dado de vistos antigo.

## 2. Testes de demanda que o produto coleta sozinho

Implementados em F13 (`/espera`, tabela `events`, `/admin/metricas`). Metas abaixo são **sugestões da equipe**, não referências de mercado.

| Teste | Como fazer | Métrica | Meta sugerida |
| --- | --- | --- | --- |
| Porta falsa por proposta de valor | `/espera` com 3 blocos clicáveis (comunidade; onde trabalhar e comer; saúde e moradia) que levam ao cadastro | Cliques por bloco e conversão em cadastro | Algum bloco com conversão ≥ 10% dos visitantes |
| Anúncio pequeno | Anúncios no Instagram segmentados em "nômade digital" e "trabalho remoto" com `utm_campaign` por bloco, orçamento baixo (algumas dezenas de reais por bloco) | Custo por cadastro e CTR por bloco | Comparar blocos entre si, não com benchmark externo |
| Cadastro real | Lista de espera com e-mail, cidade e perfil | Cadastros por origem | 100 em 14 dias |
| Contato frio com parceiros | Mensagem curta por WhatsApp ou Instagram para 30 cafés, coworkings, anfitriões e clínicas da cidade, oferecendo "Selo Amigo do Nômade" e destaque gratuito por 30 dias | Taxa de resposta e de cadastro no painel | 5 parceiros cadastrando uma oferta |
| Wi-Fi colaborativo | Testes enviados por quem usa o app | Número de testes por lugar | Evidência de uso após o lançamento |

## 3. Pesquisa de mesa para dimensionar e embasar (fazer em poucas horas)

1. **Google Trends** (Brasil, 5 anos): "nômade digital", "coworking Florianópolis", "seguro viagem nômade digital", "visto nômade digital Brasil". Registrar prints e a tendência.
2. **Comunidades públicas de nômades** no Facebook, Telegram e Instagram: anotar nome do grupo, número de membros e, em 7 dias, quantas postagens pedem companhia ("alguém para…") ou indicação de lugar com Wi-Fi, saúde ou moradia. Contar sem registrar nomes ou conteúdo pessoal.
3. **Avaliações públicas no Google Maps** de 30 cafés e coworkings da cidade-piloto: contar quantas citam Wi-Fi ruim ou tomadas. Amostragem manual, sem raspagem automática (os termos do Google proíbem).
4. **Preços de mercado** para calibrar ofertas: diária e plano mensal de 10 coworkings, preço mensal de aluguel por temporada em 10 anúncios públicos, preço de teleconsulta particular em 5 serviços, preço de seguro-viagem nacional. Registrar em planilha com link e data.
5. **Mapa de oferta real:** rodar `pnpm import:osm` e contar quantos cafés, coworkings, clínicas e hospedagens existem na cidade e quantos têm `internet_access` no OpenStreetMap. A lacuna de informação de Wi-Fi é um argumento para o teste colaborativo.
6. **Concorrência:** conferir loja de apps, Google e TikTok por apps brasileiros de comunidade de nômades; abrir NomadX e The Nomadic Club e registrar o que oferecem.
7. **Vistos:** pedir ao Ministério da Justiça (Lei de Acesso à Informação) os vistos de nômade digital emitidos por ano, por país e por estado.

## 4. Como apresentar

- Mostrar primeiro os dados públicos (seção 1), depois o que o produto já mediu (seção 2), e nomear o que ainda é hipótese.
- Não afirmar que "existe demanda comprovada" com base só em dados de terceiros; dizer "sinal de demanda no mercado e na política pública; teste de aderência em andamento, com N cadastros e N parceiros".
- Preços e comissões do modelo de negócio são hipóteses: assinatura de R$ 19,90 por mês ou R$ 99 por ano, comissão de 10% a 15% por vaga, destaque mensal a definir.
