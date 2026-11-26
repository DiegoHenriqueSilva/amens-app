# APP14 — Oração ao vivo e corrente

**Status:** Concluído e aprovado na validação funcional  
**Branch:** `codex/feature/app14-live-prayer-chain`

## Escopo validado

- Corrente em `/prayer-chain`.
- Sincronização de horário e oração atual.
- Presença real de participantes.
- Reserva de slot por RPC.
- Fila de contribuições reais em tempo real.
- Envio de intenção de oração.
- Denúncia de contribuição pelo APP05.
- Estados de conexão, espera, participação e erro.
- Responsividade, teclado, paisagem, baixa altura e redução de movimento.

## Correção aplicada

A tela criava participantes ambientes com nomes/cidades aleatórios e exibia uma
contagem mínima artificial. Isso foi removido. A fila agora mostra somente
contribuições recebidas do servidor, e a contagem usa somente a presença real.
Erros ao enviar intenção também deixam de ser apresentados como sucesso.

## Matriz final

| Caso | Validação | Estado |
| --- | --- | --- |
| APP14-T01 | Dois dispositivos na mesma corrente | Aprovado |
| APP14-T02 | Concorrência pelo mesmo slot | Aprovado |
| APP14-T03 | Desconexão, reconexão e relógio | Aprovado |
| APP14-T04 | Intenção, limites e denúncia | Aprovado |
| APP14-T05 | Origem de nomes e contribuições | Aprovado |
| APP14-T06 | Teclado, 320 px e paisagem | Aprovado |
| APP14-T07 | Redução de movimento e baixa altura | Aprovado |
| APP14-T08 | Build, RPCs e segurança | Aprovado |

## Evidências — 26/11/2026

- Duas contas reais disputaram o mesmo `target_timestamp`: exatamente uma chamada retornou `true` e a outra `false`.
- O registro de teste foi removido pelo `cleanup_prayer_contributions`.
- `get_server_time` respondeu com o horário do servidor.
- A chamada anônima a `join_prayer_chain` foi rejeitada corretamente.
- O smoke test em 320 × 844 passou sem overflow horizontal e sem participante sintético.
- `npm run build` passou.
- O usuário confirmou os testes manuais em dispositivos e informou que todos os fluxos funcionaram normalmente.

![Corrente de oração em 320 pixels](../artifacts/app14-prayer-chain-320.png)

## Conclusão

O APP14 está concluído e aprovado para análise da PR.
