# Evidências — ADM07 · Configurações e parâmetros

Capturas de 22/11/2026 feitas por `docs/admin/testes/tela/fase7_configuracoes.cjs`, contra o banco de produção com a migration `20261122040000` aplicada.

Contas:
- **Admin:** `adm-teste-admin@amens.test`, com o papel dado só para esta rodada e retirado ao final.
- **Moderador:** `adm-teste-moderador`.
- **Usuário:** `adm-teste-autor`.

Ao final, o multiplicador voltou a 1,0, o limite voltou a 3 e o XP de teste foi devolvido por `limpa_adm07.sql`.

| Arquivo | O que mostra |
|---|---|
| `f7_01_moderador_sem_acesso.png` | Moderador é levado para fora de Configurações |
| `f7_02_configuracoes_desktop.png` | Cartões por parâmetro, com quem alterou e quando, e a explicação do efeito |
| `f7_03_multiplicador_invalido.png` | "0" barrado antes de salvar, com motivo |
| `f7_04_alteracao_nao_salva.png` | "Alteração não salva (salvo: 1,0)", com Desfazer e exemplo do efeito |
| `f7_05_conflito.png` | Outra sessão salvou antes: erro, valor digitado mantido e valor salvo atualizado |
| `f7_06_niveis.png` | Níveis só leitura, com XP mínimo, orações por dia e pessoas |
| `f7_07` a `f7_10` | 390 px no tema atual; 390, 320 e 844 × 390 px no tema legado |
