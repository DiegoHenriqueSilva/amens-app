# APP17 — Links antigos, rotas inválidas e recuperação

**Status:** Concluído e aprovado após validação funcional  
**Branch:** `codex/feature/app17-legacy-routes-recovery`

## Decisões e correções

- `/old` foi preservada como rota ativa.
- `/terco` foi preservada como tela ativa do APP09; não houve redirecionamento.
- `/profile` continua acessível como altar/perfil.
- `/profile/edit` mantém o bloqueio correto e leva usuários sem sessão para `/auth`.
- A página 404 foi traduzida para português.
- A 404 agora explica o problema sem culpar o usuário.
- O botão “Voltar” retorna ao histórico quando possível e usa o início como fallback.
- O botão “Ir para o início” leva diretamente para `/`.
- A página mantém a identidade visual, o contraste e a navegação global.

## Validações realizadas

- `/old` servido corretamente.
- `/terco` servido corretamente.
- `/profile` servido corretamente.
- `/profile/edit` redirecionando corretamente para `/auth` sem sessão.
- `/altar` servido corretamente.
- Rota desconhecida servida pelo fallback da SPA sem tela vazia.
- `/novena/invalida` mostrou recuperação em português.
- `/rosary/invalido` mostrou recuperação para modalidade inexistente.
- Perfil inexistente autenticado mostrou mensagem de indisponibilidade e retorno para amigos.
- Texto da 404 em português.
- Botões “Voltar” e “Ir para o início” visíveis e acessíveis.
- Retorno ao início funcionando.
- `npm run build` aprovado.
- `node tests/app17-routes-smoke.e2e.mjs` aprovado.
- `git diff --check` aprovado.
- Preview do build de produção local aprovado para `/old`, `/terco` e rota desconhecida, todos com HTTP 200.

## Evidência

![Página de recuperação de rota em 390px](../artifacts/app17-notfound-390.png)

## Teste automatizado

O teste cobre as rotas antigas, rotas de perfil, altar, fallback da SPA,
recuperação em português e navegação para o início.

Arquivo: `tests/app17-routes-smoke.e2e.mjs`

## Conclusão

Os fluxos locais e o preview do build foram aprovados. O APP17 está concluído e
aprovado para análise da pull request. A confirmação final em hospedagem real
continua sendo uma verificação operacional do ambiente de deploy, não uma
pendência funcional desta branch.
