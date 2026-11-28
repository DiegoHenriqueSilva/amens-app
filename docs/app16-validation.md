# APP16 — Jornada da Fé, pontos e níveis

**Status:** Concluído e aprovado após validação funcional  
**Branch:** `codex/feature/app16-faith-journey`

## Correções realizadas

- As missões diárias não usam mais o `localStorage` como autoridade para conclusão ou recompensa.
- As recompensas são permitidas e calculadas pelo servidor.
- Uma chave única por conta, data e missão impede duplicidade entre recargas e dispositivos.
- O bônus da quinta missão é persistido separadamente e concede exatamente os `+100` anunciados.
- As recompensas legadas são limitadas à conta autenticada e aos valores fixos de cada ação.
- O cache de pontos é separado por usuário e atualizado quando a sessão muda.
- Os controles da Jornada são botões acessíveis por teclado, com estados legíveis.

## Validações realizadas

- `npm run build` aprovado.
- `git diff --check` aprovado.
- Migration e contratos do cliente revisados em conjunto.
- Chamadas anônimas às novas RPCs foram rejeitadas.
- Conta de teste carregou corretamente o estado das missões.
- Recompensa arbitrária de `9999` pontos foi rejeitada.
- A Jornada apareceu corretamente na home autenticada.
- O idealizador confirmou o funcionamento das recompensas, da proteção contra repetição e do bônus de cinco missões.

## Banco de dados

A migration foi criada em:

`supabase/migrations/20261128000000_app16_server_authoritative_faith_journey.sql`

Ela foi aplicada pelo idealizador no SQL Editor do Supabase, com retorno:
`Success. No rows returned.`

## Evidências

- Execução das missões individuais aprovada.
- Repetição da mesma missão não duplicou a recompensa.
- Cinco missões concederam o bônus único de `+100`.
- A troca de conta não misturou pontos nem missões.
- Screenshot autenticado incluído em `artifacts/app16-journey-authenticated.png`.

## Conclusão

O APP16 está concluído e aprovado para análise da pull request.
