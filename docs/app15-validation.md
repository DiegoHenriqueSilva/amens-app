# APP15 — Fluxo de orações e visualização da rede

**Status:** Concluído e aprovado após validação manual  
**Branch:** `codex/feature/app15-prayer-network`

## Decisões do produto

- `/tree` é público.
- A rede mostra o nome escolhido pelo usuário somente quando o perfil permite sua exibição pública.
- Pedidos anônimos e perfis sem autorização para exibir o nome aparecem como `Intercessor`.
- A métrica oficial continua sendo `Pontos de Fé Coletivos`.
- A visualização animada foi preservada com resumo textual equivalente e modo de movimento reduzido.

## Alterações realizadas

- Estados explícitos de carregamento, rede vazia e erro do Supabase.
- Botão para tentar novamente quando os dados não carregam.
- Explicação clara sobre o significado da rede e dos nomes.
- Lista textual de orações recentes como alternativa à animação.
- Filtros para pedidos ativos e não excluídos.
- Respeito à configuração de privacidade do perfil.
- CTA “Orar por uma causa” independente da animação.
- Suporte a movimento reduzido.
- Teste automatizado e captura atual da tela.
- Aplicativo Android bloqueado no modo retrato; paisagem removida do escopo.

## Validações realizadas

- Acesso direto à rota, retorno e CTA para `/pray` aprovados.
- Estados preenchido, vazio e erro 503 aprovados.
- Privacidade validada com contas de teste.
- Movimento reduzido, teclado e texto ampliado aprovados.
- 320 px, desktop e baixa altura em retrato aprovados.
- Temas disponíveis aprovados.
- `npm run build` e smoke test aprovados.
- O idealizador confirmou todos os testes manuais.

## Evidências

- Acesso público à rede.
- Ausência de atividade sintética.
- Sem overflow horizontal em 320 px.
- Navegação correta para `/pray`.
- Captura incluída em `artifacts/app15-tree-320.png`.

## Conclusão

O APP15 está concluído e aprovado para análise da pull request.
