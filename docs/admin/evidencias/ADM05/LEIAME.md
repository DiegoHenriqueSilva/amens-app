# Evidências — ADM05 · Igrejas, cadastro e importação

Capturas de 22/11/2026 feitas por `docs/admin/testes/tela/fase5_igrejas.cjs`, contra o banco de produção com a migration `20261122000000` aplicada. Os dados de teste ("[Teste ADM05] …", "Cidade Teste ADM05") foram apagados ao final por `limpa_adm05.sql`. As outras igrejas da lista são o cadastro público importado.

Contas usadas:
- **Moderador:** `adm-teste-moderador@amens.test`.
- **Admin:** `adm-teste-admin@amens.test`, só para esta rodada. O papel de admin foi retirado ao final.

| Arquivo | O que mostra |
|---|---|
| `f5_01_moderador_sem_importar.png` | O moderador gerencia Igrejas (decisão S3 da ADM00), mas não vê "Importar CSV". No servidor, a importação devolve 403 |
| `f5_02_lista_desktop.png` | Abas com contagem, ajuda em texto, filtros, tabela com endereço e perfis ligados |
| `f5_03_nova_igreja.png` | Formulário com cidade digitada e endereço |
| `f5_04_duplicada_bloqueada.png` | Mesmo nome com outra caixa e acento na mesma cidade: bloqueado, apontando a existente |
| `f5_05_inativar.png` · `f5_06_aba_inativas.png` | Confirmação com a consequência e motivo obrigatório; a igreja aparece em Inativas |
| `f5_07_remover.png` · `f5_08_aba_arquivadas.png` | Remover e a aba Arquivadas (depois, restaurar) |
| `f5_09_conflito.png` | Outra sessão inativou antes: o erro aparece no diálogo e a lista é atualizada |
| `f5_10_duplicadas.png` · `f5_11_mesclar.png` · `f5_12_mesclada.png` | Cartão por grupo com a sugerida (a que tem perfil ligado), a confirmação e a igreja mesclada em Inativas (depois, desfazer) |
| `f5_13_resolver_todas_previa.png` | Prévia: 3.276 grupos, 3.531 igrejas inativadas, 0 perfis movidos (não executado) |
| `f5_14` a `f5_17` | Importação: arquivo, prévia com erros (fórmula, UF inválida, sem nome), ignoradas (repetida no arquivo, já existe) e resultado |
| `f5_18_importar_sem_colunas.png` | Arquivo sem a coluna "estado": erro claro, nada é gravado |
| `f5_19` a `f5_22` | 390 px no tema atual; 390, 320 e 844 × 390 px no tema legado |
| `f5_23_duplicadas_celular.png` | Duplicadas no celular |
