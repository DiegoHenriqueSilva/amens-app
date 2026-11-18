# Evidências — testes de tela com login (18/11/2026)

**Ambiente:**
- app local com ADM00 + ADM01 + ADM03 integrados, ligado ao Supabase de produção;
- Chrome headless a 1440 × 900 (moderador) e 390 × 844 (autor), tema atual.

**Contas:** `adm-teste-moderador@amens.test` (moderador) e `adm-teste-autor@amens.test` (comum).

**Dados:** só pedidos sintéticos "[TESTE ADM03] …", apagados ao final. As telas do portal estão filtradas pela busca "TESTE ADM03" ou "Ciclo pelo app", então **não aparecem dados de pessoas reais**.

Roteiros: `docs/admin/testes/tela/`.

## Registro

**Fase 1: acesso (ADM00-T01/T04/T05)**
- **Visitante:** as 10 rotas vão para `/auth?redirect=<rota>`.
- **Comum:** as 10 rotas vão para `/`.
- **Moderador:** Dashboard, Usuários, Doações, Configurações, Logs e rota inexistente → `/admin/prayers`. Pedidos, Reports, Feedback e Igrejas abrem.
- **Menu do moderador:** Pedidos de Oração, Reports, Igrejas, Feedback e Voltar ao App (`f1_moderador_menu_celular.png`).

**Fase 2: lote e corrida (ADM03-T03/T05)**
- **Seleção:** A seleciona os Lotes 1–4, e a barra mostra "4 selecionados · Aprovar · Marcar violação · Remover" (`f2_02`).
- **Corrida:** B, em outra sessão, marca violação no Lote 2 (`f2_03`).
- **Sem motivo:** A confirma o lote sem motivo, e o diálogo continua aberto (`f2_04`).
- **Lote parcial:** com motivo, aparece "Lote concluído em parte: 3 de 4", e o Lote 2 mostra "Este pedido foi alterado por outra pessoa" (`f2_06`).
- **Depois do lote:** a seleção é esvaziada, porque o Lote 2 saiu da aba "Pendentes" (`f2_07`; correção 1 do doc §5.1).
- **Edição simultânea:** B salva (204); A salva e recebe **409 em 0,36 s**, com o erro no diálogo e o texto preservado (`f2_08`; correção 2).
- **Banco:** 4 decisões de violação, cada uma com 1 aviso ao autor, sem duplicação.

**Fase 3: ciclo pelo app (ADM03-T02), suspensão (ADM02-T03) e troca de conta (ADM00-T02)**

O autor envia o pedido pelo app (`f3_autor_enviou`), e ele fica **visível** para a comunidade. Depois, o moderador decide:

| Decisão do moderador | Captura | Comunidade | Aviso ao autor (Mensagens) |
|---|---|---|---|
| Colocar em revisão | `f3_mod_colocar-em-revisao` | **oculto** | "…está em revisão pela moderação. Enquanto isso, ele não aparece para a comunidade." (`f3_aviso_revisao`) |
| Aprovar, sem motivo | `f3_mod_aprovar` | **visível** | "…foi revisado e está visível para a comunidade, que poderá rezar com você." (`f3_aviso_aprovado`) |
| Remover | `f3_mod_remover` | **oculto** | "Seu pedido de oração foi removido por um moderador." (texto antigo, B15; `f3_aviso_removido`) |

- **Suspensão (moderador, 1 dia):** o app mostra "Sua conta está com as interações pausadas até 19/11/2026 às 01:09…" (`f3_autor_suspenso_aviso`).
- **Envio suspenso:** o banco recusa ("…interações pausadas…"), com o prefixo "Erro técnico:" (B17; `f3_autor_suspenso_envio`).
- **Fim da suspensão:** o aviso some.
- **Troca de conta:** na mesma aba, o moderador sai e a autora entra. `/admin/prayers` → `/`, sem nada do portal (`f3_troca_conta`).
