# APP09 — Matriz de validação do Sagrado Terço

**Status:** Planejamento e auditoria inicial  
**Branch:** `codex/feature/app09-sacred-rosary`  
**Escopo:** modalidades, sequência de contas, navegação manual, auxílio de voz,
conclusão e integração com o altar.

## Escopo identificado

O aplicativo possui duas experiências que precisam ser tratadas separadamente:

| Rota | Implementação | Cobertura |
| --- | --- | --- |
| `/rosary-selection` | `RosarySelection.tsx` | Seleção das quatro modalidades |
| `/rosary/:type` | `RosaryPrayer.tsx` | Fluxo novo de oração por contas |
| `/terco` | `Terco.tsx` | Fluxo guiado legado com desenho e voz |

As modalidades atuais da experiência nova são `misterios` (mariana),
`misericordia`, `libertacao` e `miguel` (São Miguel). O legado `/terco` usa uma
sequência mariana própria e não deve ser confundido com `/rosary/:type`.

## Auditoria inicial

- A experiência nova já possui seleção, conta anterior, próxima conta,
  conclusão e botão de voz.
- A experiência legada possui controles manuais, transcrição e botão de
  microfone, além do caminho de conclusão.
- A conclusão da experiência nova registra evento no altar com um identificador
  de sessão e conclui a tarefa diária `pray_rosary`.
- A conclusão do legado registra `rosary_marian`, soma pontos e encerra o
  reconhecimento de voz.
- O reconhecimento de voz depende da API do navegador e não pode ser validado
  apenas por captura sem microfone.
- Tipos inválidos em `/rosary/:type` precisam de comportamento explícito; a
  implementação atual pode montar uma sequência vazia.
- O botão de voz da experiência nova mostra estado visual, mas o estado textual
  de suporte, erro, silêncio e reconhecimento incorreto precisa ser testado e,
  se necessário, explicitado.
- Os elementos visuais de contas são `div`s clicáveis; a navegação por teclado
  e a alternativa acessível ao desenho precisam ser verificadas.

## Casos funcionais

- **APP09-F01:** abrir as quatro modalidades e percorrer cada sequência até o
  fim, usando conta anterior e próxima conta.
- **APP09-F02:** testar tipo inválido, microfone negado, navegador sem suporte,
  silêncio e reconhecimento incorreto; o fluxo manual deve continuar disponível.
- **APP09-F03:** concluir a mesma sessão duas vezes e confirmar que o altar e a
  pontuação não recebem duplicidade.
- **APP09-F04:** abrir `/terco` diretamente, iniciar, avançar, voltar, concluir
  e confirmar os eventos do altar sem confundir a rota nova.
- **APP09-F05:** sair da rota com voz ativa e confirmar que o reconhecimento é
  encerrado e não continua capturando áudio.

## Casos de interface e acessibilidade

- **APP09-U01:** cada conta possui indicação de posição e existe uma alternativa
  acessível ao desenho/elemento clicável.
- **APP09-U02:** oração, anterior/próxima e microfone cabem em baixa altura útil,
  em 320 px, paisagem e teclado virtual.
- **APP09-U03:** estado de voz aparece em texto, incluindo ouvindo, desligado,
  sem suporte, permissão negada e erro de reconhecimento.
- **APP09-U04:** navegação por teclado alcança voltar, contas, microfone,
  anterior, próxima e concluir em ordem compreensível.
- **APP09-U05:** textos longos não escondem os controles e a conta ativa
  permanece visível após a rolagem automática.
- **APP09-U06:** redução de movimento não impede a sequência nem o acesso aos
  controles.

## Matriz de execução

| Caso | Preparação e passos | Resultado esperado | Estado |
| --- | --- | --- | --- |
| APP09-T01 | Percorrer as quatro modalidades até concluir | Sequências e conclusão corretas | Não executado |
| APP09-T02 | Negar microfone e usar navegador sem suporte | Fluxo manual continua disponível | Não executado |
| APP09-T03 | Ligar/desligar voz, trocar conta e sair da rota | Sem captura após sair ou avanço duplicado | Não executado |
| APP09-T04 | Usar teclado, texto ampliado, paisagem e tipo inválido | Controles acessíveis e erro recuperável | Não executado |
| APP09-T05 | Abrir `/terco`, concluir e repetir a conclusão | Tela funciona e altar não duplica evento | Não executado |
| APP09-T06 | Produzir silêncio e reconhecimento incorreto | Mensagem útil sem avanço indevido | Não executado |
| APP09-T07 | Ativar redução de movimento e concluir | Sequência preservada sem depender de animação | Não executado |

Também devem ser executados os protocolos visuais comuns G01–G08 e U01–U06 nos
estados aplicáveis, com captura e viewport registrados.

## Evidências exigidas

- Captura da seleção com as quatro modalidades.
- Captura de uma sessão nova em 320 px e em paisagem.
- Captura da rota `/terco` ativa.
- Captura do estado de voz ligado, desligado e sem suporte.
- Evidência de conclusão e do evento único no altar.
- Resultado de build e checks aplicáveis.
- Registro de qualquer bloqueio de microfone/dispositivo, sem convertê-lo em
  aprovação.

## Critério de conclusão

O APP09 só poderá ser encerrado após validar as duas experiências, as quatro
modalidades, os controles manuais, o auxílio de voz, os estados de erro, as
dimensões móveis e a integração do altar. Build aprovado ou inspeção de código
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
- Na experiência nova, clicar no controle de voz altera o título para `Voz
  Ativada`, mas não apresenta texto explícito quando o reconhecimento não está
  disponível ou não iniciou. APP09-U03 permanece pendente.
- A validação real de microfone, permissão negada, silêncio e reconhecimento
  incorreto ainda depende de navegador/dispositivo com captura de áudio.

### Capturas desta rodada

- `artifacts/app09-rosary-selection-390.png`
- `artifacts/app09-rosary-prayer-390.png`
- `artifacts/app09-terco-390.png`
