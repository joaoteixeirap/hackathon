# Pitch: roteiro e checklist

Para a equipe. Demonstração de 3 minutos em Santos (substitui o roteiro de Florianópolis da SPEC §10). Números e limites vêm do [EVIDENCE.md](../EVIDENCE.md).

## Na véspera

1. `pnpm demo:refresh`: põe as rodas demo para amanhã, renova a presença em Gonzaga e as ofertas demo. Não apaga nada. Rode de novo se a demo mudar de dia.
2. Abra a URL pública em **dois celulares**, de preferência em redes diferentes (4G e Wi-Fi). Em cada um, abra o mapa uma vez para criar a sessão de visitante.
3. Num notebook, entre em `/entrar` com o e-mail da conta admin e abra `/admin/metricas`. O QR da lista de espera fica no fim da página.
4. Confira no Supabase: login anônimo ligado e limite de logins anônimos alto (Authentication → Rate Limits). Avaliadores no mesmo Wi-Fi saem pelo mesmo IP.
5. Deixe `/admin/metricas?dias=todos` aberto para mostrar os números reais do dia.

## Roteiro (3 min)

| Tempo | Celular | O que mostrar | Fala-chave |
| --- | --- | --- | --- |
| 0:00 | A | Mapa de Santos, chips **Trabalhar** e **Wi-Fi forte**, filtro **Com Selo** | "Centenas de lugares reais do OpenStreetMap. O Selo só existe quando 2 nômades mediram o Wi-Fi." |
| 0:30 | A | Abrir **Cowork Demo Gonzaga**: Wi-Fi "medido por nômades", oferta, **Medir Wi-Fi** | "Qualquer pessoa mede em menos de 15 s e a ficha se atualiza." |
| 0:55 | A | **+** → criar "Dia de trabalho conjunto" no ponto do mapa, custo R$ 120 | "R$ 20 por pessoa se lotar." |
| 1:25 | B | Abrir o link da roda (WhatsApp) → **Pedir para entrar** | Sem cadastro: a sessão de visitante nasce no clique. |
| 1:40 | A | Pedido aparece sozinho com nome, selo e nota → **Aprovar** | "R$ 60 por pessoa agora, com 2." |
| 1:55 | A e B | Mensagens no chat nos dois celulares | Tempo real, só para o grupo (RLS). |
| 2:15 | A | Ficha do lugar → **Usar oferta** → código + QR por 10 min | "O parceiro vê só o primeiro nome. Um resgate por dia." |
| 2:35 | Notebook | `/admin/metricas`: conversão por bloco e QR do `/espera` | "Teste de demanda rodando: N cadastros, bloco X converte Y%." |

Plano B: se a rede cair, as rodas demo (com rótulo "Demo") e o painel de métricas já mostram o fluxo. Não apresente dados demo como reais.

## Números para a fala

- Nômades brasileiros: 30–35 anos (33,2%), 58% passam a maior parte do tempo sozinhos, 68% citam saúde como motivo para parar (Intercom 2025, n = 200, amostra autosselecionada).
- 3.120 coworkings no Brasil, 78% de ocupação média (Censo Woba 2025).
- Nômades nos EUA: 18,5 milhões em 2025 (MBO Partners; dado dos EUA).

Diga "sinal de demanda" e "teste em andamento", nunca "demanda comprovada". O app é 100% gratuito para nômades; a receita vem de parceiros (destaque R$ 49/mês, comissão de 10 a 15%), valores que ainda são hipóteses.

## Links úteis

- `/espera?utm_source=qr&utm_campaign=pitch`: o QR do pitch, contado à parte nas métricas.
- `/espera?utm_source=instagram&utm_campaign=<bloco>&bloco=comunidade|trabalho|saude_moradia`: anúncios por bloco.
- `/admin`: atalhos da equipe (métricas, denúncias, verificações, parceiros).
- `/sobre`: privacidade e atribuição do OpenStreetMap.
