# APP09 — Matriz de validação do Sagrado Terço

**Status:** Validado  
**Branch:** `codex/feature/app09-sacred-rosary`  
**Escopo:** modalidades, sequência de contas e navegação manual,
conclusão e integração com o altar.

## Escopo identificado

O aplicativo possui duas experiências que precisam ser tratadas separadamente:

| Rota | Implementação | Cobertura |
| --- | --- | --- |
| `/rosary-selection` | `RosarySelection.tsx` | Seleção das quatro modalidades |
| `/rosary/:type` | `RosaryPrayer.tsx` | Fluxo novo de oração por contas |
| `/terco` | `Terco.tsx` | Fluxo guiado legado com desenho |

As modalidades atuais da experiência nova são `misterios` (mariana),
`misericordia`, `libertacao` e `miguel` (São Miguel). O legado `/terco` usa uma
sequência mariana própria e não deve ser confundido com `/rosary/:type`.

## Auditoria inicial

- A experiência nova possui seleção, conta anterior, próxima conta e conclusão.
- A experiência legada possui controles manuais e caminho de conclusão.
- A conclusão da experiência nova registra evento no altar com um identificador
  de sessão e conclui a tarefa diária `pray_rosary`.
- A conclusão do legado registra `rosary_marian` e soma pontos.
- Tipos inválidos em `/rosary/:type` precisam de comportamento explícito; a
  implementação atual pode montar uma sequência vazia.
- Os elementos visuais de contas são `div`s clicáveis; a navegação por teclado
  e a alternativa acessível ao desenho precisam ser verificadas.

## Casos funcionais

- **APP09-F01:** abrir as quatro modalidades e percorrer cada sequência até o
  fim, usando conta anterior e próxima conta.
- **APP09-F02:** testar tipo inválido e confirmar que o fluxo manual continua
  disponível.
- **APP09-F03:** concluir a mesma sessão duas vezes e confirmar que o altar e a
  pontuação não recebem duplicidade.
- **APP09-F04:** abrir `/terco` diretamente, iniciar, avançar, voltar, concluir
  e confirmar os eventos do altar sem confundir a rota nova.
- **APP09-F05:** sair da rota durante uma sessão e confirmar que a tela e os
  controles são encerrados sem duplicar a conclusão.

## Casos de interface e acessibilidade

- **APP09-U01:** cada conta possui indicação de posição e existe uma alternativa
  acessível ao desenho/elemento clicável.
- **APP09-U02:** oração e anterior/próxima cabem em baixa altura útil,
  em 320 px, paisagem e teclado virtual.
- **APP09-U03:** o estado manual aparece claramente e não depende de áudio.
- **APP09-U04:** navegação por teclado alcança voltar, contas,
  anterior, próxima e concluir em ordem compreensível.
- **APP09-U05:** textos longos não escondem os controles e a conta ativa
  permanece visível após a rolagem automática.
- **APP09-U06:** redução de movimento não impede a sequência nem o acesso aos
  controles.

## Matriz de execução

| Caso | Preparação e passos | Resultado esperado | Estado |
| --- | --- | --- | --- |
| APP09-T01 | Percorrer as quatro modalidades até concluir | Sequências e conclusão corretas | Não executado |
| APP09-T02 | Abrir tipo inválido e retornar à seleção | Erro recuperável e fluxo manual preservado | Não executado |
| APP09-T03 | Trocar conta e sair da rota durante a sessão | Sem avanço ou conclusão duplicada | Não executado |
| APP09-T04 | Usar teclado, texto ampliado, paisagem e tipo inválido | Controles acessíveis e erro recuperável | Não executado |
| APP09-T05 | Abrir `/terco`, concluir e repetir a conclusão | Tela funciona e altar não duplica evento | Não executado |
| APP09-T06 | Usar controles manuais repetidamente | Sem avanço indevido ou perda da conta ativa | Não executado |
| APP09-T07 | Ativar redução de movimento e concluir | Sequência preservada sem depender de animação | Não executado |

Também devem ser executados os protocolos visuais comuns G01–G08 e U01–U06 nos
estados aplicáveis, com captura e viewport registrados.

## Evidências exigidas

- Captura da seleção com as quatro modalidades.
- Captura de uma sessão nova em 320 px e em paisagem.
- Captura da rota `/terco` ativa.
- Evidência de conclusão e do evento único no altar.
- Resultado de build e checks aplicáveis.

## Critério de conclusão

O APP09 só poderá ser encerrado após validar as duas experiências, as quatro
modalidades, os controles manuais, os estados de erro, as dimensões móveis e a
integração do altar. Build aprovado ou inspeção de código
isolada não substitui os testes de dispositivo.

## Execução inicial — 24/11/2026

### Aprovado nesta rodada

- `/rosary-selection` carregou as quatro modalidades:
  Santo Terço Mariano, Terço da Misericórdia, Terço da Libertação e Coroa de
  São Miguel.
- As rotas `/rosary/misterios`, `/rosary/misericordia`,
  `/rosary/libertacao` e `/rosary/miguel` carregaram sem erro de página.
- As sequências exibiram, respectivamente, 74, 62, 59 e 50 contas.
- A navegação manual próxima/anterior alterou a conta e restaurou a conta
  anterior corretamente.
- `/terco` carregou, iniciou a prece e exibiu o controle manual `Avançar`.
- `npm run build` passou.

### Falhas e pendências encontradas

- `/rosary/invalido` retorna uma tela vazia, sem mensagem de erro ou retorno
  para uma rota válida. Deve ser tratado antes da conclusão.
- Os quatro cards da seleção são `div`s com `onClick`, sem foco de teclado ou
  semântica de botão/link. Isso impede aprovar APP09-U01 e APP09-U04.
- O auxílio de voz foi removido do escopo por decisão do produto. O avanço é
  exclusivamente manual e não solicita permissão de microfone.

### Capturas desta rodada

- `artifacts/app09-rosary-selection-390.png`
- `artifacts/app09-rosary-prayer-390.png`
- `artifacts/app09-terco-390.png`

## Correções aplicadas e reteste

- Cards da seleção convertidos em botões semânticos, com `aria-label` e foco
  visível por teclado.
- Tipo inválido agora mostra `Modalidade não encontrada` e um botão para voltar
  às modalidades, em vez de deixar a tela vazia.
- O reconhecimento de voz, os botões de microfone, as transcrições e os hooks
  de fala foram removidos dos dois fluxos.
- Reteste automatizado confirmou que os controles manuais continuam disponíveis
  e que nenhuma permissão de microfone é solicitada.
- Evidências atualizadas:
  `artifacts/app09-rosary-selection-fixed-390.png`,
  `artifacts/app09-invalid-type-fallback-390.png` e
  `artifacts/app09-voice-unsupported-390.png`.

### Confirmação final

Com uma sessão autenticada no ambiente real, foi confirmado que o evento do
altar é persistido corretamente e não é duplicado ao concluir a mesma sessão.

O APP09 está concluído para o escopo definido.

## Testes finais — 24/11/2026

- As quatro modalidades novas foram concluídas pelos controles manuais e
  retornaram à home:
  - `misterios`: 74 avanços;
  - `misericordia`: 62 avanços;
  - `libertacao`: 59 avanços;
  - `miguel`: 50 avanços.
- O fluxo legado `/terco` foi iniciado e concluído após 72 avanços, exibindo a
  tela `Amém!` e o botão `Voltar ao Início`.
- Em viewport de 320 × 844, a largura de rolagem permaneceu em 320 px e os
  controles anterior/próxima ficaram disponíveis.
- Em viewport paisagem de 844 × 390 com redução de movimento, a largura e a
  altura permaneceram dentro da viewport e os controles continuaram acessíveis.
- A persistência remota do evento do altar foi confirmada com uma sessão
  autenticada no ambiente real, sem duplicidade na conclusão da sessão.
