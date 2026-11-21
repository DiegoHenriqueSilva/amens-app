# Evidências — ADM04 (18/11/2026)

**Ambiente:**
- app local com ADM00 + ADM01 + ADM03 + ADM04, ligado ao Supabase de produção;
- conta moderadora de teste;
- Chrome headless.

**Dados:** só dados de teste, porque a busca "Teste ADM" filtra a fila e esconde a única denúncia real. Os dados foram criados pela API com as contas `adm-teste-*` e apagados ao final.

| Arquivo | O que mostra |
|---|---|
| `f4_01_fila_desktop` | Fila por alvo (1440 px): pedido escalado por 3 pessoas, pessoa, remetente e participação |
| `f4_02_pedido_denuncias` | Denúncias do pedido: "Pessoa 1, 2, 3", categoria, motivo "Outro" e descrição |
| `f4_03` a `f4_06` | 390 px (atual e legado), 320 px e 844 × 390 px (legado) |
| `f4_07_corrida_nova_denuncia` | Denúncia nova chega com o diálogo aberto: o erro aparece e o diálogo já mostra "As 2 denúncias" |
| `f4_08_suspender_nova_tentativa` | A nova tentativa no mesmo diálogo funciona |
| `f4_09_sem_fundamento` | Consequência: "…O pedido volta a aparecer para a comunidade, como estava antes da revisão automática." |
| `f4_10_aba_sem_fundamento`, `f4_13_aba_resolvidas` | Abas de encerradas, com "Reabrir e reverter" |
| `f4_11_violacao`, `f4_12_retirar_participacao` | Confirmações das ações restritivas, com motivo obrigatório |
| `f4_14_aviso_denunciante` | O que o denunciante recebe: aviso neutro, sem revelar a providência |
