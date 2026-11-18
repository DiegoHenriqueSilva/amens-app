# Testes de tela do portal admin

Roteiros Playwright usados em 18/11/2026 (ADM00, ADM02 e ADM03) com contas de teste e login por e-mail. Resultados e evidências estão em `docs/admin/ADM03-pedidos-moderacao.md` §5.1 e `docs/admin/evidencias/ADM03/testes-de-tela/`.

| Roteiro | Cobre |
|---|---|
| `fase1_acesso.cjs` | ADM00-T01/T04/T05: matriz de acesso por papel (visitante, comum, moderador) e link direto |
| `fase2_lote.cjs` | ADM03-T03/T05: lote parcial, corrida entre dois operadores, edição simultânea |
| `fase3_ciclo.cjs` | ADM03-T02 (ciclo pelo app), ADM02-T03 (conta suspensa no app), ADM00-T02 (troca de conta sem recarregar) |

## Como rodar

1. Instale `playwright-core` numa pasta de trabalho (fora do projeto) e use um Chrome instalado.
2. Rode o app em `http://localhost:8080`, porta que está na lista de redirect do Supabase.
3. Crie um JSON **fora do repositório** com `{ "mod": {"email","senha"}, "autor": {"email","senha"} }`.
4. Rode, a partir da raiz do projeto:
   ```
   CONTAS_TESTE=/caminho/contas.json AUTOR_ID=<uuid da conta comum> node docs/admin/testes/tela/fase2_lote.cjs
   ```
   Variáveis opcionais: `APP_URL`, `CHROME`, `SAIDA` e `ENV_FILE` (padrão `.env`).

## Cuidados

- **Ambiente:** os roteiros agem sobre o banco ligado ao app (hoje, produção).
- **Dados da fase 2:** exige 6 pedidos "[TESTE ADM03] Lote 1..6" em `pending_review`, de autoria da conta comum.
- **Limpeza:** depois, apague os pedidos de teste e os avisos e logs ligados a eles.
- **Fase 3:** envia um pedido real pelo app, que fica visível à comunidade por alguns segundos, e suspende a conta comum por 1 dia, retirando a suspensão em seguida.
