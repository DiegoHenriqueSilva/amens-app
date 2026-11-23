# Backlog fora de escopo — encontrados na ADM06

Continuação de `docs/backlog/ADM05.md` (B19–B21). Fica para tratar **no final**, conforme combinado.

| ID | Problema | Evidência (22/11/2026) | Afeta |
|---|---|---|---|
| B22 | **O usuário não tem por onde enviar feedback.** `FeedbackDialog` existe, mas não está montado em nenhuma tela. Os 3 feedbacks de produção são anteriores | `grep FeedbackDialog src` só acha o próprio arquivo | APP18 |
| B23 | O usuário não vê os próprios feedbacks nem o histórico de respostas. Só recebe cada resposta como aviso em Mensagens (lista das últimas 20) | Sem policy de SELECT para o autor em `user_feedback` | APP18, APP10 |
