# Pitch: roteiro de 3 minutos

Piloto em Santos. Reunimos trabalho com dados verificáveis, vínculos durante a estadia e serviços locais numa jornada gratuita para nômades. Critérios, pesos e preços de parceiros são hipóteses; uso medido não prova demanda.

## Preparação

1. `pnpm seed:demo`, depois `pnpm demo:refresh` perto da apresentação. Só os dados de demonstração são renovados. As séries mantêm o dia da semana; o grupo de quatro começa em 15 minutos e termina em 3 horas, dentro da janela do benefício. O pós-sessão fica disponível por 24 horas.
2. Rode o app local ou use o domínio quando a equipe liberar a publicação. Entre como **Ana (Demo)** no celular A e **Bruno (Demo)** no B. Conta admin separada no notebook. Nenhum login Demo dá acesso de admin.
3. Confira rede e dados em `/radar/santos`, `/estadia`, `/parceiro` (login Parceiro) e `/admin/metricas`. A demonstração precisa de rede; leve capturas ou gravação caso ela falhe.
4. Use dois aparelhos ou contextos separados. Não apresente lugares, medições, perfis ou participação Demo como dados reais.

## Roteiro

| Tempo | Mostrar | Fala |
| --- | --- | --- |
| 0:00–0:35 | Radar → Modo chamada → Cowork Demo Gonzaga, critérios, fonte e data; Medir agora se estiver num local real | “A ficha mostra quando os dados foram medidos. O resultado até nosso servidor varia com a rede e o aparelho.” |
| 0:35–1:20 | Lugar → Marcar sessão aqui → repetição semanal → publicar. B segue a série; A aprova; B abre uma ocorrência e o chat | “Uma aprovação vale para as próximas datas com vaga. A rotina e a sobreposição de estadias aparecem de forma agregada.” |
| 1:20–2:05 | Estadia → dia da estadia → checklist → favoritos → Agenda → baixar .ics. Pessoas compatíveis e Gastos, se houver tempo | “O checklist e os gastos ficam privados. Descoberta de pessoas depende da escolha e da verificação de ambos.” |
| 2:05–2:25 | `/atividade/00000000-0000-4000-8000-0000000000d8`: grupo de quatro → Usar benefício. Hoje: faixa pós-sessão | “Neste exemplo Demo, o grupo atingiu o mínimo. O banco valida participante, quantidade e horário do resgate.” |
| 2:25–2:40 | Parceiro → sessões e totais agregados | “O local vê sessões e movimento trazido, sem a lista pública de participantes.” |
| 2:40–3:00 | Admin → funis por aposta, pesquisa com n e QR da espera | “São resultados do piloto. Poucas respostas são sinalizadas; contagens isoladas e jornadas completas aparecem separadas.” |

## Dados preparados

- Três lugares Demo: Gonzaga com medições de 2 e 25 dias e selo ativo; Ponta da Praia com selo vencido e relatos de 70 dias; Centro com relatos de 120 dias.
- Duas séries comunitárias (trabalho quinta 14h e corrida na orla sábado 7h) e boas-vindas oficial quinta 18h30. Seis próximas datas por série.
- Três perfis Demo adicionais com interesses, rotina e datas sobrepostas; grupo de trabalho com três seguidores aprovados além da organizadora.
- Benefício mínimo de quatro, duas janelas do parceiro, estadias e tarefas, favoritos da Ana, sessão de grupo pronta para resgatar e sessão encerrada para o relato.

As séries usam a orla de Santos em lugar da “Lagoa” do exemplo da especificação. Horários e nomes estão marcados como Demo.

## Links

- `/espera?utm_source=qr&utm_campaign=pitch`: QR da apresentação.
- `/espera?utm_source=instagram&utm_campaign=<campanha>&bloco=work|bonds|week`: campanhas pelas três apostas.
- `/cidade/santos`: cobertura dos dados com fontes e amostras.
- `/sobre`: gratuidade, fontes e privacidade.
- `/admin`: métricas, denúncias, verificações, parceiros e lembretes cuja fonte precisa de revisão.

Números de pesquisas externas, se usados na fala, devem conservar fonte, ano, população e limitações de [EVIDENCE.md](../EVIDENCE.md). Não extrapole amostras pequenas para todos os nômades.
