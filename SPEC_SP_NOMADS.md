# SoloRota — próximas estadias e exploração em São Paulo

Escopo autorizado em 09/10/2026. Complementa SPEC.md/SPEC_V2_NOMADE.md. Mantém DESIGN.md: marca, fontes, tokens, pins, cartões, navegação e temas existentes. Substitui apenas a restrição de navegação ao bbox da cidade no mapa de exploração de SP e amplia I5c: GPS pode centralizar a exploração mediante ação explícita, só em memória no aparelho, nunca persistido ou enviado em analytics.

## Marcos e aceite

### SP1 — catálogo e mapa

- Catálogo de todos os municípios de SP a partir de Localidades e Malhas simplificadas do IBGE; fonte/data registradas, centros calculados da malha identificados como aproximados. Não inventar dados de negócios.
- `/mapa/sp`: navegação contínua no estado, marcadores de cidades e busca de municípios sem acentos; seleção abre panorama ou mapa local.
- Busca de lugares/atividades por área visível, com ação “Buscar nesta área”, limites de resposta e aviso de truncamento, erro recuperável e cancelamento de respostas antigas.
- Eventos em andamento, hoje, sete dias ou datas escolhidas; intervalos usam America/Sao_Paulo e sobreposição de início/fim. Séries futuras não somem ao escolher período.
- “Usar minha localização” pede GPS somente ao toque; rejeição/indisponibilidade tem alternativa manual. GPS não muda perfil, estadia ou presença. Escolha automática de cidade é aproximada e ajustável.
- `/` abre cidade da estadia ativa se houver; visitantes começam na escolha de localização/cidade, com exploração estadual disponível sem GPS. Links existentes de cidades continuam funcionando.
- Importador OSM ampliado para escola/creche; escola é serviço, preservando as seis categorias visuais. Importações são preparadas com limites e cache, sem consulta estadual ilimitada em toda navegação.

### SP2 — avaliar e planejar

- Panorama responde “O que preciso conferir antes de ir?” com lugares reais de trabalho/Wi-Fi medido, hospedagens, hospitais, farmácias, escolas, bairros e eventos. Mostrar desconhecidos, fonte, data e confirmações. Não equiparar hotel a aluguel mensal nem mediana amostral a internet da cidade toda.
- `/estadias` lista atual + destinos privados considerando/planejados; criar, editar e excluir. Datas exatas, flexíveis (período/duração opcionais) e “Moro aqui”.
- Preferências privadas opcionais: orçamento mensal, chamadas, filhos, pets, duração; guiam checklist da decisão e não criam ranking pago ou conclusões sem dados.
- Confirmar chegada explicitamente, rever datas quando flexíveis, iniciar nova estadia ativa sem reaproveitar gastos/tarefas da anterior. Residência permanece sem prazo no plano, com horizonte de rotina renovável no sistema existente de estadias.
- Comunidades sugeridas após salvar, adesão opcional; recusar não perde planejamento. Nenhuma intenção aparece como presença pública.

### SP3 — comunidades

- Comunidades por cidade e interesses relevantes: trabalho remoto, chegada, moradia, famílias, ao ar livre e cultura. Categorias são espaços vazios, não pessoas/atividade inventadas.
- Ler catálogo e contagens reais; entrar só com perfil verificado, com aviso de nome visível no grupo. Pode sair e silenciar indicadores locais (sem prometer push).
- Chat independente das atividades, acessível só a membros; RLS em membros/mensagens; autor próprio; bloqueios respeitados. Realtime com refetch de recuperação.
- `/comunidades` lista grupos próprios e procura por cidade; denúncia de mensagens/comunidades chega à moderação existente. Sem DM.

### SP4 — validação e documentação

- Testes de validação de datas/preferências, período/limites do mapa, isolamento RLS de planos, chegada e chat; Playwright do fluxo principal em mobile e desktop; lint/types/build.
- Migrações aditivas, sem reset. Atualizar docs/CONTINUITY_SP.md continuamente com arquivo/marco, estado do banco e verificações. Registrar limites de cobertura honestamente.
- Não publicar site nem executar git push automaticamente. Ambiente Vercel será atualizado pelo usuário com os comandos já documentados.
