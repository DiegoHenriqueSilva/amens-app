# Evidências — ADM08 · Logs e auditoria

Capturas de 23/11/2026 feitas por `docs/admin/testes/tela/fase8_logs.cjs`, contra o banco de produção com a migration `20261123000000` aplicada.

Contas:
- **Admin:** `adm-teste-admin@amens.test`, com papel temporário, retirado ao final.
- **Outras:** `adm-teste-moderador` e `adm-teste-denunciante1`.

Os registros "[TESTE ADM08] …" e o pedido de teste foram apagados por `limpa_adm08.sql`. As demais linhas da lista são registros reais de moderação.

| Arquivo | O que mostra |
|---|---|
| `f8_01_moderador_sem_acesso.png` | Moderador é levado para fora de Logs |
| `f8_02_lista_desktop.png` | Lista paginada com quem fez, ação, alvo pelo nome e motivo |
| `f8_03_busca_teste.png` | Busca: suspensão, retirada e o log que o moderador tentou forjar (registrado como dele e com a hora real) |
| `f8_04_detalhe_suspensao.png` | Detalhe com dias, data final, ID do alvo e botão de copiar |
| `f8_05_texto_escondido.png` · `f8_06_texto_mostrado.png` | Edição de pedido: texto anterior escondido e mostrado sob demanda |
| `f8_07_periodo_invalido.png` | Período invertido: aviso, sem fingir "nenhum registro" |
| `f8_08_sem_resultado.png` | "Nenhum registro com esses filtros." |
| `f8_09` a `f8_12` | 390 px no tema atual; 390, 320 e 844 × 390 px no tema legado |
