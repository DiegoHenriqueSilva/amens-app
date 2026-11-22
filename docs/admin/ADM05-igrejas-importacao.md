# ADM05 — Igrejas, cadastro e importação

Rota: `/admin/churches` (moderador e admin, decisão S3 da ADM00; importação só admin). Pacote: `revisao/admin/ADM05-igrejas-cadastro-e-importacao.md` (revisão de 15/11/2026 sobre `0063610`).

Esta entrega corrige o painel de igrejas, cria a importação de CSV pelo painel e publica no servidor a busca de igrejas que o app vai usar.

## 1. Decisões aprovadas (21/11/2026)

| Tema | Decisão | Alternativa descartada |
|---|---|---|
| Integração com o app (F03) | **Contrato + backlog.** O painel é corrigido e o servidor ganha `search_churches`/`get_church_cities`, só com igrejas ativas. Ligar o cadastro e o perfil a essa busca fica para APP12/APP13 | Ligar o app agora (invade APP12/APP13); só o painel (sem contrato) |
| Importação (F02/U02) | **CSV no painel**, só admin: prévia validada no servidor, gravação em lotes, sem apagar nada. Saem o script que apagava tudo e a biblioteca `xlsx` vulnerável | Só script endurecido; os dois |
| Situação (F01) | **Um campo só:** em revisão, ativa, inativa ou rejeitada; remoção à parte e reversível. `is_active` continua, calculado a partir da situação | Dois campos com trava |
| Duplicadas | **Mesclar no servidor:** os perfis passam para a igreja que fica, as outras ficam inativas e marcadas como mescladas, e dá para desfazer | Só inativar, com trava para igrejas com vínculo |
| Layout | Importação em diálogo de 3 passos; duplicadas em cartão por grupo | Página própria; tabela agrupada |
| Papéis | Segue a **S3 da ADM00** (já aprovada): moderador gerencia Igrejas. Só a importação é de admin | — |

## 2. Problemas encontrados (`0063610` e produção em 21/11)

**Contrato e dados**
1. **O app não usa a tabela `churches`.** No cadastro e no perfil, a paróquia é texto livre (`profiles.parish`), com sugestões tiradas de outros perfis. Nada do que o painel faz (aprovar, inativar, remover) chega ao usuário. Há 34.229 igrejas, 25 perfis, 21 com paróquia em texto e só 10 com `church_id`.
2. **Dois campos de situação soltos.** 530 igrejas tinham `status = active` e `is_active = false`. A leitura pública só olhava `status`, então **qualquer visitante continuava vendo as "inativas"**.
3. **"Resolver todas" de 24/05.** Inativou 530 igrejas no navegador, sem prévia. Os **10 perfis com vínculo** apontam para 3 igrejas criadas pelo app que foram inativadas nesse dia, sem nenhuma gêmea ativa.
4. **3.247 grupos duplicados** (5.743 igrejas ativas com o mesmo nome, cidade e UF), contados com acento e espaço fazendo diferença. Com a chave normalizada, são **3.276 grupos**, e "Resolver todas" inativaria 3.531 igrejas sem mover nenhum perfil.

**Segurança e permissões**
5. **Papel diferente na tela e no banco.** Em `0063610`, a rota exigia admin e a RLS deixava moderador gravar. A ADM00 (S3) decidiu "moderador gerencia" e liberou a tela; esta entrega leva a mesma regra para as funções do servidor.
6. **Função aberta a qualquer um.** `get_duplicate_churches` era `SECURITY DEFINER` e executável por qualquer pessoa, inclusive sem login, e listava até as removidas.
7. **Importação destrutiva.** Ela só existia por script local com a chave de serviço. O `reimport-churches.cjs` **apagava todas as igrejas** antes de inserir (com `ON DELETE SET NULL`, desfaria o vínculo dos perfis). Os dois scripts usavam a `xlsx` 0.18.5, com falhas públicas de *prototype pollution* e ReDoS.
8. **Busca sem escape.** Ela montava `.or(name.ilike.%busca%…)`, então caracteres como `,` `%` `_` `(` mudavam o filtro.

**Painel**
9. **Ações sem log garantido.** Cada uma fazia um `update` direto e o log ia numa chamada separada, cuja falha era ignorada. Não havia proteção contra dois admins agindo ao mesmo tempo.
10. **Listas cortadas.** "Arquivadas" buscava 500 rejeitadas + 500 removidas e contava o resultado como total; as cidades paravam em 500. Duplicadas e Arquivadas eram filtradas e paginadas no navegador.
11. **Formulário enganoso.** Ele dizia "Ou digite manualmente se a cidade não aparecer", mas apagava a cidade digitada ao sair do campo. Não havia como informar o endereço, e uma igreja criada pelo painel aparecia como "Usuário".
12. **Ajuda inacessível.** A ajuda das abas ficava em *tooltip* (só com mouse) e mostrava nomes de coluna (`is_active = true…`). O botão de ações não tinha nome acessível.

## 3. Solução

**Banco** (`20261122000000_adm05_igrejas.sql`, **aplicada em produção em 22/11**):
- **Situação única:** `status ∈ {pending_review, active, inactive, rejected}`. As 530 foram para `inactive`.
  - O trigger `churches_before_write` mantém `is_active = (status = 'active')`.
  - Ele também traduz o `is_active` gravado pelo painel antigo, então nada quebra antes do deploy.
- **Escrita:** moderador e admin. A sugestão do app (INSERT) entra sempre `pending_review`/`app`, validada e sem campos de moderação.
- **Chave de duplicidade** `dedupe_key`: nome, cidade e UF sem acento, minúsculas e espaços. Tem índice parcial.
- **Busca:** `search_text` com índice de trigramas, sem corte de 500.
- **Funções do painel** (`admin_*`, moderador e admin, exceto a importação, que é só de admin; log na mesma transação, `PT409` quando outra pessoa mudou antes):

| Função | O que faz |
|---|---|
| `admin_list_churches` | Lista paginada no servidor com contagem por aba |
| `admin_church_cities` | Cidades sem limite |
| `admin_save_church` | Cria e edita, bloqueia duplicada, protege contra edição simultânea, guarda antes/depois no log |
| `admin_set_church_status` | Aprovar, rejeitar, ativar, inativar, remover, restaurar. Motivo obrigatório em rejeitar, inativar e remover. Restaurar não deixa voltar uma duplicata |
| `admin_list_duplicate_groups` | Grupos paginados, com a igreja sugerida e os perfis ligados a cada uma |
| `admin_merge_churches` / `admin_unmerge_church` | Move os perfis, marca `merged_into` e guarda no log quem foi movido, para desfazer |
| `admin_resolve_duplicates` | Prévia e gravação em lotes de até 300 grupos, por causa do limite de 8 s |
| `admin_import_churches` | Prévia e gravação no mesmo contrato, até 500 linhas por chamada; resultado por linha |

- **Contrato público:** `search_churches(estado, cidade, busca, limite)` e `get_church_cities(estado)`, só com igrejas ativas.
- **Validação comum** (`_church_invalid`), usada no formulário, na importação e na sugestão do app:
  - nome com 3 a 150 caracteres;
  - cidade obrigatória;
  - estado pela sigla ou pelo nome;
  - endereço com até 300 caracteres;
  - recusa célula que começa com `= + - @`, porque seria fórmula ao abrir no Excel.

**Depois do deploy** (`20261122010000_adm05_escrita_so_por_funcoes.sql`, **NÃO aplicada**): tira a escrita direta na tabela e apaga `get_duplicate_churches`. O painel publicado ainda usa as duas coisas.

**Front:**
- **`AdminChurches.tsx`:**
  - abas com contagem;
  - ajuda em texto;
  - filtros de estado com sigla, cidade com sugestões e origem;
  - tabela em tela larga e cartões no celular;
  - botão "Ações" com nome acessível;
  - confirmação que mostra a consequência real e os perfis ligados;
  - formulário com endereço e cidade livre.
- **`churches/ChurchImportDialog.tsx`:**
  - arquivo, prévia e resultado;
  - CSV em UTF-8 ou do Excel (Windows-1252), separador `,` `;` ou tab;
  - até 10 MB e 50.000 linhas;
  - duplicadas no arquivo e entre lotes;
  - "Parar depois deste lote";
  - relatório CSV com fórmulas neutralizadas.
- **`churches/DuplicateGroups.tsx`:** cartão por grupo com escolha de qual fica e "Resolver todas…" com prévia e progresso.
- **`src/lib/csv.ts`:** leitor próprio, sem dependências e sem avaliar fórmulas.
- **Removidos:** `scripts/reimport-churches.cjs`, `scripts/fix_church_source.mjs` e a dependência `xlsx`.
- **`AdminLogs.tsx`:** rótulos `merge`, `unmerge` e `import`.

## 4. Revisão de conteúdo (regra content-review-enforcement)

Os textos foram revisados antes da tela. Os critérios:
- dizer o **efeito real**;
- não citar nomes de coluna;
- não prometer o que o app ainda não faz. "Visível para todos" foi usado no lugar de "aparece no app", porque o app ainda não consome a lista (decisão de integração).

| Texto | Onde | Veredito |
|---|---|---|
| "Visíveis para todos. São as únicas que a busca de paróquias pode mostrar." | Ajuda da aba Ativas | **Ajustado.** O antigo dizia "(is_active = true, status = active)" |
| "Não ficam visíveis. Inclui as mescladas em outra igreja, que podem ser separadas de novo." | Ajuda de Inativas | Novo |
| "Sugeridas por usuários. Só ficam visíveis depois de aprovadas." | Ajuda de Em revisão | Aprovado |
| "Rejeitadas ou removidas. Não ficam visíveis; as removidas podem ser restauradas." | Ajuda de Arquivadas | **Ajustado:** o antigo citava `deleted_at IS NOT NULL` |
| "Mesmo nome na mesma cidade e estado, sem diferenciar acentos e maiúsculas. Ao mesclar, os perfis ligados passam para a igreja que fica." | Ajuda de Duplicadas | Novo |
| "A igreja deixa de ficar visível e vai para Inativas. N perfis continuam ligados a ela." | Inativar | Novo: mostra o impacto nos perfis |
| "A igreja vai para Arquivadas e deixa de ficar visível. Dá para restaurar depois." | Remover | Aprovado |
| "N igrejas ficam inativas e marcadas como mescladas nesta. N perfis passam para ela. Dá para desfazer depois, na aba Inativas." | Mesclar | Novo |
| "Em cada grupo fica a igreja sugerida: a que tem mais perfis ligados; depois a ativa; depois a que tem endereço; depois a mais antiga." | Resolver todas | **Ajustado.** O antigo prometia "o mais antigo com status ativo", mas o código escolhia por outra regra |
| "Já existe "X" em Cidade/UF (situação: ativa). Edite a existente em vez de criar outra." | Erro ao salvar | Novo |
| "Outra pessoa já alterou esta igreja. A lista foi atualizada: confira antes de decidir." | Conflito | Mesmo padrão da ADM04 |
| "Nada é gravado antes da sua confirmação. Igrejas que já existem na mesma cidade são ignoradas, nunca substituídas." | Importar, passo 1 | Novo |
| "Fórmula ou comando não é aceito. Tire o sinal do começo da célula." | Linha com `=`… | Novo |
| "Você parou a importação. N linhas prontas não foram gravadas. Envie o mesmo arquivo de novo: as já gravadas aparecem como "Já existe"." | Importação interrompida | Novo: nunca mostra sucesso total quando parou |
| Antigo "Gerencie as paróquias e igrejas cadastradas" | Subtítulo | **Trocado** por "Cadastro de paróquias e igrejas. Toda alteração fica no log de moderação." |
| Antigo "Ou digite manualmente se a cidade não aparecer." | Formulário | **Trocado.** Era falso, porque o campo apagava o texto. Agora: "Escolha da lista ou digite, se a cidade ainda não tiver igrejas." |

## 5. Artefatos

| Artefato | Destino |
|---|---|
| `supabase/migrations/20261122000000_adm05_igrejas.sql` | **Aplicada** em produção (`AmensAntigravity`, 22/11). É idempotente |
| `supabase/migrations/20261122010000_adm05_escrita_so_por_funcoes.sql` | **Pendente:** aplicar logo depois do deploy deste front |
| `docs/admin/testes/bateria_adm05_igrejas.sql` | Bateria; roda numa transação desfeita |
| `docs/admin/testes/tela/fase5_igrejas.cjs`, `semeia_adm05.sql`, `limpa_adm05.sql` | Testes de tela (moderador e admin) |

## 6. Testes

### 6.1 Bateria em produção — 65/65 (22/11/2026)

Rodada duas vezes: junto com a migration, numa transação desfeita, e depois da migration aplicada. As baterias da ADM03 (34/34) e da ADM04 (51/51) foram repetidas sem regressão.

| Grupo | Casos | Cobre |
|---|---|---|
| Migração | M1–M3 | Nenhuma linha com `is_active` diferente da situação; as 530 viraram `inactive`; só situações válidas |
| Permissões | P1–P5, C8, C8b, D7, I5 | Moderador lista, edita (com log) e mescla (S3); só a importação devolve `42501` para ele. Visitante e usuário comum sem acesso. Busca pública funciona sem login. `get_duplicate_churches` fechada para quem não modera |
| Criar/editar | C1–C7 | Sigla `sp` vira "São Paulo"; espaços normalizados; duplicada com outra caixa e acento bloqueada; mesmo nome em outra cidade permitido (T02); UF inválida e fórmula recusadas; edição com versão velha dá `PT409`; log com antes/depois |
| Escrita direta | W1–W6 | Usuário comum não altera a tabela (moderador sim, até a migration pós-deploy); sugestão do app entra em revisão mesmo enviando `status = active`/`source = import`; fórmula recusada; painel antigo (`is_active`) continua funcionando |
| Situação | S1–S10 | Motivo obrigatório; ação repetida dá `PT409`; transição inválida recusada; aprovar, rejeitar, remover e restaurar, cada um com log |
| Visibilidade | V1–V4 | Inativa não aparece para usuário nem na lista pública de cidades; o admin vê a cidade; `search_churches` só devolve ativas |
| Listagem | L1–L5 | Contagem por aba; busca com `%` não vira curinga; aba inválida recusada; São Paulo com mais de 500 ativas e página na posição 900 (T02); total igual à contagem direta |
| Duplicadas | D1–D9b | Grupo por chave normalizada, com sugestão pela regra; mesclar move 2 perfis; mesclar de novo dá `PT409`; mesclada não "ativa", só desfaz; desfazer devolve situação e perfis; prévia conta mais de 1.000 grupos; gravação em lote respeita o limite e grava um log por igreja |
| Importação | I1–I6 | Linhas válidas, repetidas no arquivo, já existentes, fórmula, UF inválida, nome vazio e estado sem acento (`parana`); a prévia não grava; a gravação insere só as válidas, com lote e log; repetir o arquivo não duplica (T03); mais de 500 linhas recusado; 500 linhas gravadas numa chamada |

### 6.2 Testes de tela com login (22/11/2026)

Feitos com `fase5_igrejas.cjs` contra produção, com o app local na porta 8080 (ADM00–ADM05 integradas).
- **Moderador:** `adm-teste-moderador`.
- **Admin:** `adm-teste-admin`, criada para esta rodada com autorização do responsável. O papel de admin foi retirado ao final.
- **Dados:** apagados por `limpa_adm05.sql`. As capturas estão em `docs/admin/evidencias/ADM05/`.

| Caso | Observado | Estado |
|---|---|---|
| T04 · Papéis | Moderador abre Igrejas sem "Importar CSV". No servidor, a importação devolve 403 "Só administradores podem importar igrejas."; para o usuário comum, `admin_list_churches` devolve 403 | **Aprovado** |
| T01 · Cadastro e situação | Criar com cidade digitada e endereço; duplicada com outra caixa e acento bloqueada com o nome da existente; editar com motivo; inativar sem motivo é barrado; inativar, ativar, remover e restaurar, cada um com aviso e consequência | **Aprovado** |
| T04 · Conflito | Outra sessão inativa com o diálogo aberto: "Outra pessoa já alterou esta igreja…", e a lista é atualizada | **Aprovado** |
| T02 · Duplicadas | Grupo com a sugerida (a que tem perfil ligado); mesclar ("Nenhum perfil muda de igreja"); a igreja aparece como "Mesclada" em Inativas; desfazer. Prévia do "Resolver todas": 3.276 grupos, **não executado** | **Aprovado** |
| T03 · Importar | Arquivo com `;`, aspas, coluna extra "status" e 7 linhas: 2 prontas, 2 ignoradas (repetida no arquivo; já existe) e 3 com erro (fórmula, UF "XX", sem nome). Gravou 2; o relatório tem todas as linhas, com a fórmula neutralizada (`'=HYPERLINK…`). Sem a coluna "estado": erro claro e nada gravado | **Aprovado** |
| T05 · Integração | `search_churches` sem login devolve só as ativas de teste. Cadastro e perfil do app ainda não usam essa busca (B19) | **Parcial**, por decisão |
| U01–U03 · Tamanhos | 1440, 390, 320 e 844 × 390 px nos temas atual e legado; tabela vira cartões no celular | **Aprovado** visualmente |
| Volume | 34.231 igrejas paginadas no servidor; contagem por aba correta | **Aprovado** |

**Defeitos encontrados nos testes e corrigidos:**
1. **Papel errado.** A primeira versão restringia tudo a admin, contra a S3 da ADM00. Funções, RLS e trigger foram alinhados; a importação continua só de admin.
2. **Filtro sem destaque.** Na prévia da importação, no tema atual, não dava para ver qual filtro estava selecionado. Agora aparece com ✓ e contorno.

O leitor de CSV foi testado à parte no Node:
- aspas, `;` e quebra de linha dentro de aspas;
- arquivo do Excel (Windows-1252);
- fórmula neutralizada no relatório;
- o CSV nacional de 31.363 linhas, sem nenhuma linha fora do formato.

## 7. Pendente

- [ ] Aplicar `20261122010000` logo depois do deploy.
- [ ] **Resolver as duplicadas existentes em produção** (3.276 grupos pela chave normalizada). É decisão de dados: rodar "Resolver todas…" depois do deploy, olhando a prévia.
- [ ] **Os 3 cadastros criados pelo app, inativados em 24/05**, com os 10 perfis ligados: avaliar se devem ser ativados de novo ou mesclados.
- [ ] Atualizar `context-app-features` (PR #24) com o contrato de igrejas.
- [ ] Revisão do colega.

**Fora do escopo** (registrado em `docs/backlog/ADM05.md`):
- **B19 · APP12/APP13:** o cadastro, o perfil e o diretório devem escolher a paróquia por `search_churches`, gravar `church_id` e mandar a sugestão para revisão. Hoje é texto livre.
- **B20:** `parish_stats` agrupa a paróquia digitada, não a cadastrada.
- **B21:** não há limite de sugestões por usuário (o app ainda não sugere).
