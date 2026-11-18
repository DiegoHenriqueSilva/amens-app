import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, EyeOff, Flag,
  MoreHorizontal, Pencil, RefreshCw, Search, ShieldAlert, Trash2, Undo2, UserX, X,
} from "lucide-react";
import { toast } from "sonner";
import { adminRpc } from "@/lib/admin-rpc";
import { AdminActionDialog } from "@/components/admin/AdminActionDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// ─── Tipos e contrato com o servidor (admin_list_prayers / admin_moderate_prayers) ───

type Tab = "all" | "pending" | "active" | "completed" | "banned_users";
type Action = "approve" | "review" | "violation" | "remove" | "restore";

interface PrayerRow {
  id: string;
  title: string | null;
  content: string | null;
  author_name: string | null;
  is_anonymous: boolean | null;
  status: string;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  user_id: string | null;
  prayer_count: number | null;
  author_removed: boolean;
  open_reports: number;
}

interface ListResult {
  total: number;
  rows: PrayerRow[];
  counts: Record<Tab, number>;
}

interface ItemResult {
  id: string;
  ok: boolean;
  code?: string;
  hint?: string | null;
  message?: string;
}

const PAGE_SIZE = 50;

const TABS: { value: Tab; label: string; help: string }[] = [
  { value: "all", label: "Todos", help: "Todos os pedidos, inclusive os removidos." },
  { value: "pending", label: "Pendentes", help: "Aguardam decisão da moderação, do mais antigo para o mais novo. Inclui os enviados para revisão por denúncias." },
  { value: "active", label: "Ativos", help: "Aprovados e visíveis para a comunidade." },
  { value: "completed", label: "Concluídos", help: "Marcados como concluídos pelo autor." },
  { value: "banned_users", label: "Banidos", help: "Pedidos marcados como violação ou banidos, e todos os pedidos de contas desativadas." },
];

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  completed: "Concluído",
  pending_review: "Em revisão",
  policy_violation: "Violação",
  banned: "Banido",
};

function statusStyle(status: string, deleted: boolean): string {
  if (deleted) return "line-through text-muted-foreground";
  if (status === "active") return "text-green-600 font-medium";
  if (status === "pending_review") return "text-yellow-600 font-medium";
  if (status === "policy_violation") return "text-orange-600 font-medium";
  if (status === "banned") return "text-red-600 font-medium";
  if (status === "completed") return "text-blue-600";
  return "text-muted-foreground";
}

const ACTIONS: Record<Action, {
  label: string; title: string; confirm: string; destructive?: boolean; reasonOptional?: boolean; consequence: string;
}> = {
  approve: {
    label: "Aprovar", title: "Aprovar pedido", confirm: "Aprovar", reasonOptional: true,
    consequence: "O pedido fica visível para a comunidade e o autor recebe um aviso.",
  },
  review: {
    label: "Colocar em revisão", title: "Colocar em revisão", confirm: "Colocar em revisão",
    consequence: "O pedido sai da fila pública até uma nova decisão e o autor recebe um aviso.",
  },
  violation: {
    label: "Marcar violação", title: "Marcar violação das políticas", confirm: "Marcar violação", destructive: true,
    consequence: "O pedido deixa de ser público e o autor é avisado de que ele não está de acordo com as políticas do Améns.",
  },
  remove: {
    label: "Remover", title: "Remover pedido", confirm: "Remover", destructive: true,
    consequence: "O pedido sai do app (pode ser restaurado depois), os avisos ligados a ele são apagados e o autor recebe um aviso de remoção.",
  },
  restore: {
    label: "Restaurar", title: "Restaurar pedido", confirm: "Restaurar",
    consequence: "O pedido volta com o status que tinha antes da remoção e o autor recebe um aviso.",
  },
};

/** Ações possíveis para um pedido no estado atual (as mesmas regras do servidor). */
function allowedActions(p: PrayerRow): Action[] {
  if (p.deleted_at) return ["restore"];
  const a: Action[] = [];
  if (p.status !== "active") a.push("approve");
  if (p.status !== "pending_review") a.push("review");
  if (p.status !== "policy_violation") a.push("violation");
  a.push("remove");
  return a;
}

function prayerLabel(p: PrayerRow) {
  return p.title?.trim() || (p.content ? `${p.content.slice(0, 60)}${p.content.length > 60 ? "…" : ""}` : "Pedido sem título");
}

// ─── Conteúdo expansível (teclado: botão nativo com aria-expanded) ───

function ExpandableContent({ id, title, content }: { id: string; title?: string | null; content?: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = (content?.length ?? 0) > 120;
  const contentId = `prayer-content-${id}`;
  return (
    <div className="min-w-0 max-w-[22rem] break-words">
      {title && <p className="font-medium text-sm mb-0.5">{title}</p>}
      <p id={contentId} className={`text-muted-foreground text-xs whitespace-pre-wrap ${!expanded && isLong ? "line-clamp-2" : ""}`}>
        {content}
      </p>
      {isLong && (
        <button
          type="button"
          className="text-xs text-primary inline-flex items-center gap-0.5 mt-1 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
        >
          {expanded ? <><ChevronUp className="w-3 h-3" aria-hidden="true" /> Ver menos</> : <><ChevronDown className="w-3 h-3" aria-hidden="true" /> Ver mais</>}
        </button>
      )}
    </div>
  );
}

function StatusCell({ p }: { p: PrayerRow }) {
  return (
    <div className="space-y-1">
      <span className={`text-sm ${statusStyle(p.status, !!p.deleted_at)}`}>
        {p.deleted_at ? `Removido (era ${STATUS_LABELS[p.status] ?? p.status})` : (STATUS_LABELS[p.status] ?? p.status)}
      </span>
      {p.status === "pending_review" && !p.deleted_at && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" aria-hidden="true" />
          Na fila {formatDistanceToNow(new Date(p.updated_at ?? p.created_at), { locale: ptBR, addSuffix: false })}
        </p>
      )}
      {p.open_reports > 0 && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <Flag className="w-3 h-3" aria-hidden="true" />
          {p.open_reports === 1 ? "1 denúncia em aberto" : `${p.open_reports} denúncias em aberto`}
        </p>
      )}
    </div>
  );
}

function AuthorCell({ p }: { p: PrayerRow }) {
  return (
    <div className="text-sm space-y-0.5">
      <p>{p.author_name || "Sem nome"}</p>
      {p.is_anonymous && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <EyeOff className="w-3 h-3" aria-hidden="true" /> Anônimo para a comunidade
        </p>
      )}
      {p.author_removed && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <UserX className="w-3 h-3" aria-hidden="true" /> Conta desativada
        </p>
      )}
    </div>
  );
}

// ─── Página ───

export default function AdminPrayers() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Map<string, PrayerRow>>(new Map());
  const [pending, setPending] = useState<{ action: Action; items: PrayerRow[] } | null>(null);
  const [results, setResults] = useState<{ action: Action; items: PrayerRow[]; res: ItemResult[] } | null>(null);
  const [edit, setEdit] = useState<PrayerRow | null>(null);

  // Busca no servidor, com pequena espera enquanto digita
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Filtros mudaram: volta para a 1ª página e limpa a seleção
  useEffect(() => { setPage(0); setSelected(new Map()); }, [tab, search]);
  // A seleção vale só para a página visível
  useEffect(() => { setSelected(new Map()); }, [page]);

  const { data, isLoading, isFetching, isError, error, refetch, isPlaceholderData } = useQuery({
    queryKey: ["admin-prayers", tab, search, page],
    queryFn: () => adminRpc<ListResult>("admin_list_prayers", {
      p_tab: tab, p_search: search || null, p_offset: page * PAGE_SIZE, p_limit: PAGE_SIZE,
    }),
    placeholderData: keepPreviousData,
  });

  // Lista atualizada: a seleção passa a usar a situação atual de cada pedido e
  // solta os que saíram desta aba. Sem isso, a nova tentativa enviaria a
  // situação antiga e seria recusada como "alterado por outra pessoa" para sempre.
  useEffect(() => {
    if (!data || isPlaceholderData) return;
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const fresh = new Map(data.rows.map((r) => [r.id, r]));
      const next = new Map<string, PrayerRow>();
      prev.forEach((_, id) => { const r = fresh.get(id); if (r) next.set(id, r); });
      return next;
    });
  }, [data, isPlaceholderData]);

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);
  const activeTab = TABS.find((t) => t.value === tab)!;

  const selectedRows = useMemo(() => Array.from(selected.values()), [selected]);
  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someOnPageSelected = rows.some((r) => selected.has(r.id));

  // Ações que valem para TODOS os selecionados
  const bulkActions = useMemo(() => {
    if (selectedRows.length === 0) return [] as Action[];
    return (["approve", "review", "violation", "remove", "restore"] as Action[])
      .filter((a) => selectedRows.every((p) => allowedActions(p).includes(a)));
  }, [selectedRows]);

  function toggle(p: PrayerRow, on: boolean) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (on) next.set(p.id, p); else next.delete(p.id);
      return next;
    });
  }
  function togglePage(on: boolean) {
    setSelected((prev) => {
      const next = new Map(prev);
      rows.forEach((r) => (on ? next.set(r.id, r) : next.delete(r.id)));
      return next;
    });
  }

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin-prayers"] });
    qc.invalidateQueries({ queryKey: ["admin-reports"] });
  }

  async function runAction(action: Action, items: PrayerRow[], reason: string) {
    const res = await adminRpc<ItemResult[]>("admin_moderate_prayers", {
      p_items: items.map((p) => ({ id: p.id, status: p.status, deleted: !!p.deleted_at })),
      p_action: action,
      p_reason: reason || null,
    });
    refresh();
    const failed = res.filter((r) => !r.ok);
    const okCount = res.length - failed.length;
    // Mantém selecionados só os que falharam, para nova tentativa
    setSelected(new Map(items.filter((p) => failed.some((f) => f.id === p.id)).map((p) => [p.id, p])));
    if (failed.length === 0) {
      toast.success(okCount === 1 ? "Decisão registrada." : `${okCount} pedidos atualizados.`);
    } else if (items.length === 1) {
      // Pedido único: mostra o erro no próprio diálogo, sem fechar
      throw new Error(failed[0].message ?? "Não foi possível concluir a ação.");
    } else {
      setResults({ action, items, res });
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Pedidos de Oração</h1>
        <p className="text-muted-foreground text-sm">Revise, aprove, restrinja ou remova pedidos. Toda decisão fica no log e o autor é avisado.</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList aria-label="Filtrar pedidos por situação">
            {TABS.map((t) => {
              const n = data?.counts?.[t.value];
              return (
                <TabsTrigger key={t.value} value={t.value} className="whitespace-nowrap">
                  {t.label}
                  {typeof n === "number" && (
                    <span className={`ml-1.5 text-xs ${t.value === "pending" && n > 0 ? "font-bold text-yellow-700 dark:text-yellow-500" : "text-muted-foreground"}`}>
                      {n}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>
      </Tabs>
      <p className="text-xs text-muted-foreground -mt-2">{activeTab.help}</p>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <Input
            className="pl-9"
            aria-label="Buscar pedidos por conteúdo, título ou autor"
            placeholder="Buscar conteúdo, título ou autor..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {isLoading ? "Carregando…" : `Mostrando ${from}–${to} de ${total}`}
          {isFetching && !isLoading ? " · atualizando…" : ""}
        </p>
      </div>

      {/* Barra de seleção em lote */}
      {selectedRows.length > 0 && (
        <div role="region" aria-label="Ações em lote" className="sticky top-14 md:top-2 z-10 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-background/95 backdrop-blur px-3 py-2 shadow-sm">
          <span className="text-sm font-medium">
            {selectedRows.length === 1 ? "1 selecionado" : `${selectedRows.length} selecionados`}
          </span>
          {bulkActions.length === 0 ? (
            <span className="text-xs text-muted-foreground">Os itens selecionados estão em situações diferentes: nenhuma ação vale para todos.</span>
          ) : bulkActions.map((a) => (
            <Button key={a} size="sm" variant={ACTIONS[a].destructive ? "destructive" : "outline"} onClick={() => setPending({ action: a, items: selectedRows })}>
              {ACTIONS[a].label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Map())}>Limpar seleção</Button>
        </div>
      )}

      {isError ? (
        <div role="alert" className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0" aria-hidden="true" />
          <p className="flex-1">Não foi possível carregar os pedidos. {(error as Error)?.message}</p>
          <Button size="sm" variant="outline" onClick={() => void refetch()}><RefreshCw className="w-4 h-4 mr-1" aria-hidden="true" /> Tentar novamente</Button>
        </div>
      ) : (
        <>
          {/* Desktop: tabela */}
          <div className="hidden md:block rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      aria-label="Selecionar todos os pedidos desta página"
                      checked={allOnPageSelected ? true : someOnPageSelected ? "indeterminate" : false}
                      onCheckedChange={(v) => togglePage(v === true)}
                      disabled={rows.length === 0}
                    />
                  </TableHead>
                  <TableHead>Conteúdo</TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Orações</TableHead>
                  <TableHead>Enviado</TableHead>
                  <TableHead className="w-10"><span className="sr-only">Ações</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{search ? "Nenhum pedido encontrado para essa busca." : "Nenhum pedido nesta aba."}</TableCell></TableRow>
                ) : rows.map((p) => (
                  <TableRow key={p.id} className={p.deleted_at ? "bg-muted/20" : ""} data-state={selected.has(p.id) ? "selected" : undefined}>
                    <TableCell className="align-top">
                      <Checkbox aria-label={`Selecionar o pedido "${prayerLabel(p)}"`} checked={selected.has(p.id)} onCheckedChange={(v) => toggle(p, v === true)} />
                    </TableCell>
                    <TableCell className="align-top"><ExpandableContent id={p.id} title={p.title} content={p.content} /></TableCell>
                    <TableCell className="align-top"><AuthorCell p={p} /></TableCell>
                    <TableCell className="align-top"><StatusCell p={p} /></TableCell>
                    <TableCell className="align-top text-sm text-muted-foreground">{p.prayer_count ?? 0}</TableCell>
                    <TableCell className="align-top text-muted-foreground text-xs">
                      {formatDistanceToNow(new Date(p.created_at), { locale: ptBR, addSuffix: true })}
                    </TableCell>
                    <TableCell className="align-top">
                      <RowMenu p={p} onAction={(a) => setPending({ action: a, items: [p] })} onEdit={() => setEdit(p)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Celular: cartões empilhados */}
          <div className="md:hidden space-y-2">
            {rows.length > 0 && (
              <label className="flex items-center gap-2 text-sm px-1">
                <Checkbox
                  checked={allOnPageSelected ? true : someOnPageSelected ? "indeterminate" : false}
                  onCheckedChange={(v) => togglePage(v === true)}
                />
                Selecionar todos desta página
              </label>
            )}
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground text-sm">Carregando…</p>
            ) : rows.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">{search ? "Nenhum pedido encontrado para essa busca." : "Nenhum pedido nesta aba."}</p>
            ) : rows.map((p) => (
              <article key={p.id} className={`rounded-lg border p-3 space-y-2 ${selected.has(p.id) ? "border-primary/60 bg-primary/5" : "border-border"} ${p.deleted_at ? "bg-muted/20" : ""}`}>
                <div className="flex items-start gap-2">
                  <Checkbox className="mt-1" aria-label={`Selecionar o pedido "${prayerLabel(p)}"`} checked={selected.has(p.id)} onCheckedChange={(v) => toggle(p, v === true)} />
                  <div className="flex-1 min-w-0"><ExpandableContent id={`m-${p.id}`} title={p.title} content={p.content} /></div>
                  <RowMenu p={p} onAction={(a) => setPending({ action: a, items: [p] })} onEdit={() => setEdit(p)} />
                </div>
                <div className="grid grid-cols-2 gap-2 pl-7">
                  <AuthorCell p={p} />
                  <StatusCell p={p} />
                </div>
                <p className="pl-7 text-xs text-muted-foreground">
                  {p.prayer_count ?? 0} orações · enviado {formatDistanceToNow(new Date(p.created_at), { locale: ptBR, addSuffix: true })}
                </p>
              </article>
            ))}
          </div>

          {total > PAGE_SIZE && (
            <nav aria-label="Paginação" className="flex items-center justify-between gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((n) => n - 1)}>
                <ChevronLeft className="w-4 h-4 mr-1" aria-hidden="true" /> Anterior
              </Button>
              <span className="text-xs text-muted-foreground">Página {page + 1} de {pageCount}</span>
              <Button variant="outline" size="sm" disabled={page + 1 >= pageCount} onClick={() => setPage((n) => n + 1)}>
                Próxima <ChevronRight className="w-4 h-4 ml-1" aria-hidden="true" />
              </Button>
            </nav>
          )}
        </>
      )}

      {/* Confirmação (um pedido ou lote) */}
      <AdminActionDialog
        open={!!pending}
        onOpenChange={(o) => { if (!o) setPending(null); }}
        title={pending ? (pending.items.length > 1 ? `${ACTIONS[pending.action].label}: ${pending.items.length} pedidos` : ACTIONS[pending.action].title) : ""}
        target={pending && pending.items.length === 1
          ? { id: pending.items[0].id, name: prayerLabel(pending.items[0]), email: pending.items[0].author_name ? `Autor: ${pending.items[0].author_name}` : null }
          : null}
        description={pending && (
          <div className="space-y-2">
            <p>{ACTIONS[pending.action].consequence}</p>
            {pending.items.length > 1 && (
              <>
                <p className="font-medium text-foreground">Isso vale para cada um dos {pending.items.length} pedidos selecionados:</p>
                <ul className="list-disc pl-5 text-xs max-h-32 overflow-y-auto">
                  {pending.items.map((p) => <li key={p.id} className="break-words">{prayerLabel(p)}</li>)}
                </ul>
              </>
            )}
          </div>
        )}
        confirmLabel={pending ? (pending.items.length > 1 ? `${ACTIONS[pending.action].confirm} ${pending.items.length}` : ACTIONS[pending.action].confirm) : ""}
        destructive={pending ? ACTIONS[pending.action].destructive : false}
        reasonOptional={pending ? ACTIONS[pending.action].reasonOptional : false}
        onConfirm={(reason) => runAction(pending!.action, pending!.items, reason)}
      />

      {/* Resultado parcial do lote */}
      <Dialog open={!!results} onOpenChange={(o) => { if (!o) setResults(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-yellow-600" aria-hidden="true" /> Lote concluído em parte</DialogTitle>
            <DialogDescription>
              {results && `${results.res.filter((r) => r.ok).length} de ${results.res.length} pedidos foram atualizados. A lista já mostra a situação atual: os que falharam e continuam nesta aba seguem selecionados para você revisar.`}
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 text-sm">
            {results?.res.map((r) => {
              const p = results.items.find((i) => i.id === r.id);
              return (
                <li key={r.id} className="flex gap-2">
                  {r.ok
                    ? <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" aria-label="Concluído" />
                    : <X className="w-4 h-4 text-destructive shrink-0 mt-0.5" aria-label="Falhou" />}
                  <div className="min-w-0">
                    <p className="break-words">{p ? prayerLabel(p) : r.id}</p>
                    {!r.ok && <p className="text-xs text-destructive">{r.message}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
          <DialogFooter><Button onClick={() => setResults(null)}>Entendi</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <EditPrayerDialog prayer={edit} onClose={() => setEdit(null)} onSaved={refresh} />
    </div>
  );
}

function RowMenu({ p, onAction, onEdit }: { p: PrayerRow; onAction: (a: Action) => void; onEdit: () => void }) {
  const acts = allowedActions(p);
  const icon: Record<Action, JSX.Element> = {
    approve: <Check className="w-4 h-4 mr-2 text-green-600" aria-hidden="true" />,
    review: <Clock className="w-4 h-4 mr-2" aria-hidden="true" />,
    violation: <X className="w-4 h-4 mr-2 text-orange-600" aria-hidden="true" />,
    remove: <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />,
    restore: <Undo2 className="w-4 h-4 mr-2" aria-hidden="true" />,
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Ações para o pedido "${prayerLabel(p)}"`}>
          <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {acts.filter((a) => a !== "remove").map((a) => (
          <DropdownMenuItem key={a} onClick={() => onAction(a)}>{icon[a]} {ACTIONS[a].label}</DropdownMenuItem>
        ))}
        {!p.deleted_at && (
          <DropdownMenuItem onClick={onEdit}><Pencil className="w-4 h-4 mr-2" aria-hidden="true" /> Editar conteúdo</DropdownMenuItem>
        )}
        {acts.includes("remove") && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => onAction("remove")}>{icon.remove} Remover</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Edição de conteúdo ───

function EditPrayerDialog({ prayer, onClose, onSaved }: { prayer: PrayerRow | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (prayer) {
      setTitle(prayer.title ?? ""); setContent(prayer.content ?? ""); setReason(""); setServerError(null); setSaving(false);
    }
  }, [prayer]);

  const contentOk = content.trim().length > 0 && content.trim().length <= 1000;
  const reasonOk = reason.trim().length >= 3;
  const changed = !!prayer && (title.trim() !== (prayer.title ?? "").trim() || content.trim() !== (prayer.content ?? "").trim());

  async function save() {
    if (!prayer || !contentOk || !reasonOk || !changed || saving) return;
    setSaving(true); setServerError(null);
    try {
      await adminRpc("admin_edit_prayer", {
        p_id: prayer.id, p_title: title, p_content: content, p_reason: reason.trim(), p_expected_content: prayer.content,
      });
      onSaved();
      toast.success("Conteúdo atualizado. O pedido voltou para revisão e o autor foi avisado.");
      onClose();
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!prayer} onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar pedido de oração</DialogTitle>
          <DialogDescription>Depois de salvar, o pedido volta para revisão e o autor recebe um aviso.</DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <div className="space-y-1">
            <Label htmlFor="edit-title">Título (opcional)</Label>
            <Input id="edit-title" value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} placeholder="Título do pedido..." />
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-content">Conteúdo</Label>
            <Textarea id="edit-content" className="min-h-[120px]" value={content} maxLength={1000} onChange={(e) => setContent(e.target.value)} aria-describedby="edit-content-count" />
            <p id="edit-content-count" className={`text-xs ${contentOk ? "text-muted-foreground" : "text-destructive"}`}>{content.trim().length}/1000 caracteres</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-reason">Motivo da edição (obrigatório)</Label>
            <Textarea id="edit-reason" className="min-h-[70px]" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} placeholder="Descreva o motivo da edição para os logs de moderação..." />
          </div>
          {serverError && (
            <div role="alert" className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" /><span>{serverError}</span>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={!contentOk || !reasonOk || !changed || saving}>{saving ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
