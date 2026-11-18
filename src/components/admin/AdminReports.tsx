import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, ChevronDown, RefreshCw, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserRole } from "@/hooks/use-user-role";
import { adminRpc } from "@/lib/admin-rpc";
import { AdminActionDialog } from "./AdminActionDialog";
import { EditPrayerDialog } from "./AdminPrayers";

type Tab = "open" | "resolved" | "dismissed" | "all";
type TargetType = "prayer_request" | "user" | "message" | "contribution";
type Decision = "dismiss" | "resolve" | "violation" | "edit" | "remove" | "suspend";

interface ReportItem {
  id: string;
  category: string;
  custom_reason: string | null;
  description: string | null;
  status: "open" | "resolved" | "dismissed";
  created_at: string;
  resolved_at: string | null;
  resolution_notes: string | null;
  decision: Decision | null;
  person: number;
}
interface TargetInfo {
  // pedido
  title?: string | null; content?: string | null; status?: string; deleted_at?: string | null;
  is_anonymous?: boolean; author_name?: string | null; author_removed?: boolean;
  author_suspended_until?: string | null; auto_escalated?: boolean;
  // pessoa / remetente
  name?: string | null; full_name?: string | null; city?: string | null; suspended_until?: string | null;
  // participação
  author_city?: string | null;
}
interface TargetRow {
  target_type: TargetType;
  target_id: string;
  target: TargetInfo | null;
  open_count: number;
  resolved_count: number;
  dismissed_count: number;
  open_people: number;
  first_open_at: string | null;
  last_at: string;
  reports: ReportItem[];
}
interface ListResult { total: number; rows: TargetRow[]; counts: Record<Tab, number> }

const PAGE_SIZE = 50;

const TABS: { value: Tab; label: string; help: string }[] = [
  { value: "open", label: "Abertas", help: "Denúncias aguardando decisão, agrupadas por alvo, da mais antiga para a mais nova." },
  { value: "resolved", label: "Resolvidas", help: "Denúncias encerradas com alguma providência sobre o alvo." },
  { value: "dismissed", label: "Sem fundamento", help: "Denúncias encerradas porque o conteúdo está dentro das diretrizes." },
  { value: "all", label: "Todas", help: "Todos os alvos denunciados, em qualquer situação." },
];

const TARGET_LABELS: Record<TargetType, string> = {
  prayer_request: "Pedido de oração",
  user: "Pessoa",
  message: "Remetente de mensagem",
  contribution: "Participação na corrente",
};

const CATEGORY_LABELS: Record<string, string> = {
  inappropriate: "Ofensivo ou inapropriado",
  fake: "Falso ou enganoso",
  spam: "Spam",
  off_topic: "Fora do contexto",
  hate: "Ódio ou discriminação",
  harassment: "Assédio ou ameaça",
  misinformation: "Desinformação",
  other: "Outro motivo",
};

const DECISION_LABELS: Record<Decision, string> = {
  dismiss: "Sem fundamento",
  resolve: "Resolvida sem mudar o conteúdo",
  violation: "Pedido marcado como violação",
  edit: "Pedido editado",
  remove: "Participação retirada",
  suspend: "Pessoa suspensa",
};

const PRAYER_STATUS: Record<string, string> = {
  active: "Ativo", pending_review: "Em revisão", policy_violation: "Violação", banned: "Banido", completed: "Concluído",
};

/** Ações possíveis em denúncias abertas, por tipo de alvo (o servidor valida de novo). */
const ACTIONS_BY_TYPE: Record<TargetType, Decision[]> = {
  prayer_request: ["dismiss", "edit", "violation", "resolve"],
  user: ["dismiss", "suspend", "resolve"],
  message: ["dismiss", "suspend", "resolve"],
  contribution: ["dismiss", "remove", "resolve"],
};

const ACTION_UI: Record<Exclude<Decision, "edit">, {
  label: string; title: string; confirm: string; destructive?: boolean; reasonOptional?: boolean;
}> = {
  dismiss: { label: "Sem fundamento", title: "Encerrar como sem fundamento", confirm: "Encerrar", reasonOptional: true },
  resolve: { label: "Resolver", title: "Resolver sem mudar o conteúdo", confirm: "Resolver" },
  violation: { label: "Marcar violação", title: "Marcar o pedido como violação", confirm: "Marcar violação", destructive: true },
  remove: { label: "Retirar participação", title: "Retirar a participação da corrente", confirm: "Retirar", destructive: true },
  suspend: { label: "Suspender…", title: "Suspender a pessoa denunciada", confirm: "Suspender", destructive: true },
};

function plural(n: number, um: string, varios: string) { return n === 1 ? `1 ${um}` : `${n} ${varios}`; }
function ago(iso: string) { return formatDistanceToNow(new Date(iso), { locale: ptBR, addSuffix: true }); }

function targetName(row: TargetRow): string {
  const t = row.target ?? {};
  if (row.target_type === "prayer_request") return t.title ? `Pedido "${t.title}"` : "Pedido sem título";
  if (row.target_type === "contribution") return `Participação de ${t.author_name ?? "pessoa sem nome"}`;
  return t.name || t.full_name || "Pessoa sem nome";
}

function openReports(row: TargetRow) { return row.reports.filter((r) => r.status === "open"); }

/** Último grupo de decisão (as denúncias encerradas juntas), para reabrir. */
function lastDecisionGroup(row: TargetRow): ReportItem[] {
  const closed = row.reports.filter((r) => r.status !== "open" && r.resolved_at);
  if (closed.length === 0) return [];
  const last = closed.reduce((a, b) => (a.resolved_at! > b.resolved_at! ? a : b));
  return closed.filter((r) => r.resolved_at === last.resolved_at && r.decision === last.decision);
}

/** "A denúncia aberta é encerrada como resolvida" / "As 3 denúncias abertas são encerradas como resolvidas". */
function closes(n: number, como: "resolvida" | "sem fundamento"): string {
  const fim = como === "resolvida" ? (n === 1 ? "resolvida" : "resolvidas") : "sem fundamento";
  return n === 1 ? `A denúncia aberta é encerrada como ${fim}.` : `As ${n} denúncias abertas são encerradas como ${fim}.`;
}

function consequence(action: Decision, row: TargetRow, days?: number): string {
  const n = openReports(row).length;
  switch (action) {
    case "dismiss":
      return `${closes(n, "sem fundamento")} ${n === 1 ? "Quem denunciou recebe" : "Cada pessoa que denunciou recebe"} um aviso de que o conteúdo está dentro das diretrizes.`
        + (row.target?.auto_escalated ? " O pedido volta a aparecer para a comunidade, como estava antes da revisão automática." : "");
    case "resolve":
      return `${closes(n, "resolvida")} O conteúdo não muda, e quem denunciou recebe um aviso de que houve providências. Use quando a decisão já foi tomada em outra tela.`;
    case "violation":
      return `O pedido deixa de aparecer para a comunidade e é marcado como violação. O autor recebe um aviso. ${closes(n, "resolvida")}`;
    case "remove":
      return `A participação deixa de aparecer na corrente e o autor recebe um aviso. ${closes(n, "resolvida")}`;
    case "suspend": {
      const ate = days && days >= 1 && days <= 365 ? format(new Date(Date.now() + days * 86400000), "dd/MM/yyyy 'às' HH:mm") : "a data escolhida";
      return `A pessoa continua lendo, mas não interage até ${ate}. ${closes(n, "resolvida")}`;
    }
    default:
      return "";
  }
}

function reopenConsequence(decision: Decision | null): string {
  switch (decision) {
    case "violation": return "As denúncias voltam para Abertas e o pedido volta à situação anterior, se ainda estiver como violação.";
    case "edit": return "As denúncias voltam para Abertas e o texto anterior do pedido é restaurado, se ninguém mexeu nele depois.";
    case "remove": return "As denúncias voltam para Abertas e a participação volta a aparecer na corrente.";
    case "suspend": return "As denúncias voltam para Abertas e a suspensão é retirada, se ainda estiver valendo.";
    default: return "As denúncias voltam para Abertas. O conteúdo não muda.";
  }
}

export default function AdminReports() {
  const { isAdmin } = useUserRole();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("open");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pending, setPending] = useState<{ action: Decision; row: TargetRow } | null>(null);
  const [reopen, setReopen] = useState<{ row: TargetRow; reports: ReportItem[] } | null>(null);
  const [remove, setRemove] = useState<{ row: TargetRow; report: ReportItem } | null>(null);
  const [edit, setEdit] = useState<TargetRow | null>(null);
  const [days, setDays] = useState("7");

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);
  useEffect(() => { setPage(0); }, [tab, search]);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["admin-reports", tab, search, page],
    queryFn: () => adminRpc<ListResult>("admin_list_reports", {
      p_tab: tab, p_search: search || null, p_offset: page * PAGE_SIZE, p_limit: PAGE_SIZE,
    }),
    placeholderData: keepPreviousData,
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeTab = TABS.find((t) => t.value === tab)!;
  const daysNum = Number(days);
  const daysValid = Number.isInteger(daysNum) && daysNum >= 1 && daysNum <= 365;

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin-reports"] });
    qc.invalidateQueries({ queryKey: ["admin-prayers"] });
  }

  // Lista atualizada: o diálogo aberto passa a usar os dados atuais do alvo
  // (ex.: chegou denúncia nova), para que a nova tentativa envie o conjunto certo.
  useEffect(() => {
    if (!data) return;
    const fresh = (r: TargetRow) => data.rows.find((x) => x.target_type === r.target_type && x.target_id === r.target_id);
    setPending((p) => (p && fresh(p.row) && fresh(p.row) !== p.row ? { ...p, row: fresh(p.row)! } : p));
    setEdit((e) => (e && fresh(e) && fresh(e) !== e ? fresh(e)! : e));
  }, [data]);

  async function decide(action: Decision, row: TargetRow, reason: string, extra: Record<string, unknown> = {}) {
    let res: { reports: number; people_notified: number; auto_restored: boolean };
    try {
      res = await adminRpc("admin_decide_reports", {
        p_target_type: row.target_type,
        p_target_id: row.target_id,
        p_action: action,
        p_reason: reason || null,
        p_report_ids: openReports(row).map((r) => r.id),
        ...extra,
      });
    } catch (e) {
      // Conflito (denúncia nova ou já tratada): atualiza a lista; o diálogo segue aberto com o erro
      refresh();
      throw e;
    }
    refresh();
    toast.success(
      `${plural(res.reports, "denúncia encerrada", "denúncias encerradas")}; ${plural(res.people_notified, "pessoa avisada", "pessoas avisadas")}.`
      + (res.auto_restored ? " O pedido voltou a aparecer para a comunidade." : ""),
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground text-sm">Denúncias agrupadas por alvo. Cada decisão vale para todas as denúncias abertas do alvo, fica no log e avisa quem denunciou, sem revelar a providência.</p>
      </div>

      <div className="space-y-2">
        <div className="overflow-x-auto -mx-1 px-1">
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <TabsList aria-label="Filtrar denúncias por situação">
              {TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value} className="whitespace-nowrap">
                  {t.label}
                  {data?.counts && <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">{data.counts[t.value]}</span>}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <p className="text-xs text-muted-foreground">{activeTab.help}</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <Input
            className="pl-9"
            aria-label="Buscar no conteúdo denunciado, no nome ou no motivo"
            placeholder="Buscar conteúdo, nome ou motivo..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {isFetching && !isLoading ? "Atualizando…" : total > 0 ? `Mostrando ${page * PAGE_SIZE + 1}–${Math.min(total, (page + 1) * PAGE_SIZE)} de ${total} alvos` : ""}
        </p>
      </div>

      {isError ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <AlertTriangle className="w-4 h-4 text-destructive" aria-hidden="true" />
          <span className="flex-1">Não foi possível carregar as denúncias. {error instanceof Error ? error.message : ""}</span>
          <Button size="sm" variant="outline" onClick={() => void refetch()}><RefreshCw className="w-4 h-4 mr-1" aria-hidden="true" /> Tentar novamente</Button>
        </div>
      ) : isLoading ? (
        <p role="status" className="py-8 text-center text-muted-foreground">Carregando denúncias…</p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">{search ? "Nenhuma denúncia encontrada para essa busca." : tab === "open" ? "Nenhuma denúncia aguardando decisão." : "Nenhuma denúncia nesta aba."}</p>
      ) : (
        <ul className="space-y-3" aria-label="Alvos denunciados">
          {rows.map((row) => (
            <TargetCard
              key={`${row.target_type}:${row.target_id}`}
              row={row}
              isAdmin={isAdmin}
              onAction={(action) => {
                if (action === "edit") setEdit(row);
                else { if (action === "suspend") setDays("7"); setPending({ action, row }); }
              }}
              onReopen={(reports) => setReopen({ row, reports })}
              onDelete={(report) => setRemove({ row, report })}
            />
          ))}
        </ul>
      )}

      {pageCount > 1 && (
        <nav aria-label="Paginação" className="flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((n) => n - 1)}>Anterior</Button>
          <span className="text-xs text-muted-foreground">Página {page + 1} de {pageCount}</span>
          <Button variant="outline" size="sm" disabled={page + 1 >= pageCount} onClick={() => setPage((n) => n + 1)}>Próxima</Button>
        </nav>
      )}

      {/* Decisão sobre o alvo */}
      <AdminActionDialog
        open={!!pending}
        onOpenChange={(o) => { if (!o) setPending(null); }}
        title={pending ? ACTION_UI[pending.action as Exclude<Decision, "edit">].title : ""}
        target={pending ? { id: pending.row.target_id, name: `${TARGET_LABELS[pending.row.target_type]}: ${targetName(pending.row)}` } : null}
        description={pending ? consequence(pending.action, pending.row, daysNum) : undefined}
        confirmLabel={pending ? ACTION_UI[pending.action as Exclude<Decision, "edit">].confirm : ""}
        destructive={pending ? ACTION_UI[pending.action as Exclude<Decision, "edit">].destructive : false}
        reasonOptional={pending ? ACTION_UI[pending.action as Exclude<Decision, "edit">].reasonOptional : false}
        canConfirm={pending?.action === "suspend" ? daysValid : true}
        onConfirm={(reason) => decide(pending!.action, pending!.row, reason, pending!.action === "suspend" ? { p_days: daysNum } : {})}
      >
        {pending?.action === "suspend" && (
          <div className="space-y-1.5">
            <Label htmlFor="report-suspend-days">Duração em dias (1 a 365)</Label>
            <Input id="report-suspend-days" type="number" inputMode="numeric" min={1} max={365} step={1}
              value={days} onChange={(e) => setDays(e.target.value)} aria-invalid={!daysValid} aria-describedby="report-suspend-days-help" />
            <p id="report-suspend-days-help" className={`text-xs ${daysValid ? "text-muted-foreground" : "text-destructive"}`}>
              {daysValid ? `Fim da suspensão: ${format(new Date(Date.now() + daysNum * 86400000), "dd/MM/yyyy 'às' HH:mm")}.` : "Informe um número inteiro de 1 a 365."}
            </p>
          </div>
        )}
      </AdminActionDialog>

      {/* Reabrir e reverter */}
      <AdminActionDialog
        open={!!reopen}
        onOpenChange={(o) => { if (!o) setReopen(null); }}
        title="Reabrir e reverter"
        target={reopen ? { id: reopen.row.target_id, name: `${TARGET_LABELS[reopen.row.target_type]}: ${targetName(reopen.row)}` } : null}
        description={reopen ? `${plural(reopen.reports.length, "denúncia", "denúncias")} (${DECISION_LABELS[reopen.reports[0].decision ?? "resolve"] ?? "decisão anterior"}). ${reopenConsequence(reopen.reports[0].decision)}` : undefined}
        confirmLabel="Reabrir"
        onConfirm={async (reason) => {
          const res = await adminRpc<{ reopened: number; reverted: boolean; note: string | null }>("admin_reopen_reports", {
            p_target_type: reopen!.row.target_type, p_target_id: reopen!.row.target_id,
            p_report_ids: reopen!.reports.map((r) => r.id), p_reason: reason,
          });
          refresh();
          toast.success(`${plural(res.reopened, "denúncia reaberta", "denúncias reabertas")}.` + (res.note ? ` ${res.note}` : res.reverted ? " A decisão foi desfeita." : ""));
        }}
      />

      {/* Excluir denúncia (só admin) */}
      <AdminActionDialog
        open={!!remove}
        onOpenChange={(o) => { if (!o) setRemove(null); }}
        title="Excluir denúncia"
        target={remove ? { id: remove.report.id, name: `Denúncia da pessoa ${remove.report.person} sobre ${targetName(remove.row)}` } : null}
        description="A denúncia sai do painel e da contagem, mas continua guardada para auditoria. Use para duplicadas ou enviadas por engano."
        confirmLabel="Excluir"
        destructive
        onConfirm={async (reason) => {
          await adminRpc("admin_delete_report", { p_id: remove!.report.id, p_reason: reason });
          refresh();
          toast.success("Denúncia excluída.");
        }}
      />

      {/* Editar o pedido denunciado */}
      <EditPrayerDialog
        prayer={edit ? { id: edit.target_id, title: edit.target?.title ?? null, content: edit.target?.content ?? null } : null}
        onClose={() => setEdit(null)}
        onSaved={refresh}
        description={edit ? `Depois de salvar, o pedido volta para revisão e o autor recebe um aviso. ${plural(openReports(edit).length, "denúncia aberta é encerrada", "denúncias abertas são encerradas")} como resolvidas.` : undefined}
        successMessage="Pedido editado e denúncias encerradas. O pedido voltou para revisão."
        onSubmit={(v) => decide("edit", edit!, v.reason, { p_title: v.title, p_content: v.content, p_expected_content: v.expectedContent })}
      />
    </div>
  );
}

function TargetCard({ row, isAdmin, onAction, onReopen, onDelete }: {
  row: TargetRow;
  isAdmin: boolean;
  onAction: (a: Decision) => void;
  onReopen: (reports: ReportItem[]) => void;
  onDelete: (r: ReportItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [moreText, setMoreText] = useState(false);
  const t = row.target ?? {};
  const openList = openReports(row);
  const group = lastDecisionGroup(row);
  const listId = `denuncias-${row.target_type}-${row.target_id}`;
  const textId = `texto-${row.target_id}`;

  const categories = useMemo(() => {
    const m = new Map<string, number>();
    (openList.length ? openList : row.reports).forEach((r) => m.set(r.category, (m.get(r.category) ?? 0) + 1));
    return Array.from(m.entries()).map(([c, n]) => `${CATEGORY_LABELS[c] ?? c}${n > 1 ? ` (${n})` : ""}`).join(" · ");
  }, [row.reports, openList]);

  const now = new Date();
  const suspendedUntil = t.suspended_until && new Date(t.suspended_until) > now ? t.suspended_until : null;

  return (
    <li className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline">{TARGET_LABELS[row.target_type]}</Badge>
        {row.open_count > 0 && (
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            <Users className="w-3.5 h-3.5" aria-hidden="true" />
            {plural(row.open_people, "pessoa denunciou", "pessoas denunciaram")}
          </span>
        )}
        {row.first_open_at && <span className="text-muted-foreground">Na fila {ago(row.first_open_at)}</span>}
        {row.open_count === 0 && <span className="text-muted-foreground">Última atualização {ago(row.last_at)}</span>}
      </div>

      {/* O que foi denunciado */}
      <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm space-y-1 break-words">
        {row.target_type === "prayer_request" && (
          <>
            {t.title && <p className="font-medium text-foreground">{t.title}</p>}
            <p id={textId} className={moreText ? "text-muted-foreground whitespace-pre-line" : "text-muted-foreground line-clamp-3"}>{t.content ?? "Pedido sem texto."}</p>
            {(t.content?.length ?? 0) > 180 && (
              <button type="button" className="text-xs text-primary underline-offset-2 hover:underline" aria-expanded={moreText} aria-controls={textId} onClick={() => setMoreText((v) => !v)}>
                {moreText ? "Ver menos" : "Ver mais"}
              </button>
            )}
            <p className="text-xs text-muted-foreground">
              Autor: {t.author_name ?? "sem nome"}{t.is_anonymous ? " (anônimo para a comunidade)" : ""}
              {" · "}Situação: <span className="font-medium text-foreground">{t.deleted_at ? "Removido" : PRAYER_STATUS[t.status ?? ""] ?? t.status}</span>
              {t.auto_escalated && " (revisão automática por denúncias)"}
            </p>
          </>
        )}
        {(row.target_type === "user" || row.target_type === "message") && (
          <>
            <p className="font-medium text-foreground">{t.name || t.full_name || "Pessoa sem nome"}</p>
            {t.full_name && t.name && t.full_name !== t.name && <p className="text-xs text-muted-foreground">Nome completo: {t.full_name}</p>}
            <p className="text-xs text-muted-foreground">
              {t.city ? `${t.city} · ` : ""}Conta: <span className="font-medium text-foreground">{t.deleted_at ? "Desativada" : suspendedUntil ? `Suspensa até ${format(new Date(suspendedUntil), "dd/MM/yyyy HH:mm")}` : "Ativa"}</span>
            </p>
            {row.target_type === "message" && <p className="text-xs text-muted-foreground">A denúncia é sobre quem enviou a mensagem; a mensagem em si não fica registrada.</p>}
          </>
        )}
        {row.target_type === "contribution" && (
          <>
            <p className="font-medium text-foreground">{t.author_name ?? "Sem nome"}{t.author_city ? ` — ${t.author_city}` : ""}</p>
            <p className="text-xs text-muted-foreground">Nome e cidade exibidos na corrente de oração · Situação: <span className="font-medium text-foreground">{t.deleted_at ? "Retirada" : "Visível"}</span></p>
          </>
        )}
        {!row.target && <p className="text-muted-foreground">O conteúdo denunciado não existe mais.</p>}
      </div>

      <p className="text-sm"><span className="text-muted-foreground">Motivos: </span>{categories}</p>

      <div>
        <button type="button" className="inline-flex items-center gap-1 text-xs font-medium text-primary" aria-expanded={open} aria-controls={listId} onClick={() => setOpen((v) => !v)}>
          <ChevronDown className={`w-4 h-4 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} aria-hidden="true" />
          {open ? "Ocultar denúncias" : `Ver ${plural(row.reports.length, "denúncia", "denúncias")}`}
        </button>
        {open && (
          <ol id={listId} className="mt-2 space-y-2">
            {row.reports.map((r) => (
              <li key={r.id} className="rounded-md border border-border/60 p-2.5 text-xs space-y-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-medium text-foreground">Pessoa {r.person}</span>
                  <span>{CATEGORY_LABELS[r.category] ?? r.category}</span>
                  <span className="text-muted-foreground">{ago(r.created_at)}</span>
                  <span className="text-muted-foreground">· {r.status === "open" ? "Aberta" : r.status === "resolved" ? "Resolvida" : "Sem fundamento"}</span>
                </p>
                {r.custom_reason && <p><span className="text-muted-foreground">Motivo informado: </span>{r.custom_reason}</p>}
                {r.description && <p className="whitespace-pre-line"><span className="text-muted-foreground">Descrição: </span>{r.description}</p>}
                {r.status !== "open" && (
                  <p className="text-muted-foreground">
                    {r.decision ? DECISION_LABELS[r.decision] : "Decisão anterior à ADM04"}
                    {r.resolution_notes ? ` · Motivo da moderação: ${r.resolution_notes}` : ""}
                    {r.resolved_at ? ` · ${ago(r.resolved_at)}` : ""}
                  </p>
                )}
                {isAdmin && (
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive" onClick={() => onDelete(r)} aria-label={`Excluir a denúncia da pessoa ${r.person}`}>
                    Excluir denúncia
                  </Button>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Ações diretas, sem depender de hover */}
      <div className="flex flex-wrap gap-2" role="group" aria-label={`Ações para ${TARGET_LABELS[row.target_type].toLowerCase()}: ${targetName(row)}`}>
        {openList.length > 0 && ACTIONS_BY_TYPE[row.target_type].map((a) => (
          <Button
            key={a}
            size="sm"
            variant={a === "violation" || a === "remove" || a === "suspend" ? "destructive" : "outline"}
            onClick={() => onAction(a)}
            disabled={(a === "edit" || a === "violation") && (!row.target || !!t.deleted_at)}
          >
            {a === "edit" ? "Editar pedido…" : ACTION_UI[a].label}
          </Button>
        ))}
        {openList.length === 0 && group.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => onReopen(group)}>Reabrir e reverter</Button>
        )}
      </div>
    </li>
  );
}
