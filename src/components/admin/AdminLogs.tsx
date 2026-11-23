import { Fragment, useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, ChevronDown, ChevronRight, Copy, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { adminRpc } from "@/lib/admin-rpc";

// Rótulos de ações (inclui as antigas, que continuam no histórico).
const ACTION_LABELS: Record<string, string> = {
  soft_delete: "Removido",
  restore: "Restaurado",
  suspend: "Suspenso",
  unsuspend: "Suspensão retirada",
  ban: "Banido",
  approve: "Aprovado",
  reject: "Rejeitado / violação",
  send_to_review: "Enviado para revisão",
  auto_escalate: "Revisão automática (denúncias)",
  reopen_report: "Denúncia reaberta",
  delete_report: "Denúncia excluída",
  resolve_report: "Denúncia resolvida",
  dismiss_report: "Denúncia sem fundamento",
  role_assign: "Papel alterado",
  role_revoke: "Papel retirado",
  edit_content: "Conteúdo editado",
  create: "Criado",
  activate: "Ativado",
  deactivate: "Inativado",
  merge: "Mesclada em outra",
  unmerge: "Mesclagem desfeita",
  import: "Importação (lote)",
  reply: "Respondido",
  archive: "Arquivado",
  unarchive: "Desarquivado",
  setting_update: "Configuração alterada",
  xp_override: "XP alterado",
  xp_multiplier: "Multiplicador de XP",
  supporter_on: "Reconhecimento ativado",
  supporter_off: "Reconhecimento desativado",
};

const TARGET_LABELS: Record<string, string> = {
  prayer_request: "Pedido",
  user: "Pessoa",
  report: "Denúncia",
  church: "Igreja",
  contribution: "Participação na corrente",
  feedback: "Feedback",
  setting: "Configuração",
  supporter: "Apoiadores",
};

const STATUS_LABELS: Record<string, string> = {
  active: "ativo", pending_review: "em revisão", rejected: "rejeitado", banned: "banido",
  policy_violation: "violação", completed: "concluído", inactive: "inativa", deleted: "removido",
  unread: "não lido", read: "lido", replied: "respondido", archived: "arquivado",
};

const DETAIL_LABELS: Record<string, string> = {
  from_status: "Situação antes", to_status: "Situação depois", days: "Dias", until: "Até",
  previous_until: "Suspensão anterior até", from: "Antes", to: "Depois", via: "Origem", reports: "Denúncias",
  decision: "Decisão", reverted: "Revertido", target_type: "Tipo do alvo", target_id: "ID do alvo",
  linked_profiles: "Perfis ligados", keep_id: "Igreja que ficou", prev_status: "Situação antes",
  moved_profiles: "Perfis movidos", auto: "Automático", merged: "Igrejas mescladas", file: "Arquivo",
  inserted: "Inseridas", duplicates: "Ignoradas (já existiam)", errors: "Com erro", reply_number: "Resposta nº",
  previous_status: "Situação antes", key: "Configuração", name: "Nome", city: "Cidade", state: "Estado",
  before: "Antes", after: "Depois", suspended_until_before: "Suspensão antes", profiles_back: "Perfis devolvidos",
  reply_id: "ID da resposta", notification_id: "ID do aviso", people: "Pessoas", threshold: "Limite",
};

const VIA_LABELS: Record<string, string> = {
  reports: "decisão em denúncias", dismiss_reports: "denúncias sem fundamento", reopen_reports: "reabertura de denúncias",
};

type LogRow = {
  id: string; source: "moderation" | "supporter"; created_at: string; action: string; reason: string | null;
  automatic: boolean; actor_id: string | null; actor_name: string | null; actor_email: string | null;
  target_type: string; target_id: string | null; target_label: string | null; target_removed: boolean; target_missing: boolean;
  details: Record<string, unknown>; has_previous_text: boolean;
};
type ListRes = { total: number; rows: LogRow[] };
type Actor = { id: string; name: string; count: number };

const PAGE_SIZE = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const when = (iso: string) => format(new Date(iso), "dd/MM/yyyy HH:mm");

function value(k: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.length === 0 ? "nenhum" : `${v.length}`;
  if (typeof v === "boolean") return v ? "sim" : "não";
  if (typeof v === "object") {
    return Object.entries(v as Record<string, unknown>).map(([kk, vv]) => `${DETAIL_LABELS[kk] ?? kk}: ${value(kk, vv)}`).join(" · ");
  }
  const s = String(v);
  if (k === "via") return VIA_LABELS[s] ?? s;
  if (k.endsWith("status") && STATUS_LABELS[s]) return STATUS_LABELS[s];
  if (k === "decision" || k === "reverted") return ACTION_LABELS[s] ?? s;
  if (k === "target_type") return TARGET_LABELS[s] ?? s;
  if (/(_until|until|_at)$/.test(k) && !Number.isNaN(Date.parse(s)) && s.includes("T")) return when(s);
  if (UUID.test(s)) return s.slice(0, 8) + "…";
  return s;
}

function actorText(l: LogRow) {
  if (l.automatic) return "Automático (sistema)";
  if (!l.actor_id) return "Sem registro de quem fez";
  return l.actor_name ?? l.actor_email ?? l.actor_id.slice(0, 8) + "…";
}

function targetText(l: LogRow) {
  if (l.target_missing) return l.target_id ? `Não existe mais (ID ${l.target_id.slice(0, 8)}…)` : "—";
  return (l.target_label ?? "—") + (l.target_removed ? " (removido)" : "");
}

function variant(action: string): "default" | "destructive" | "secondary" {
  if (["soft_delete", "ban", "suspend", "reject", "delete_report"].includes(action)) return "destructive";
  if (["approve", "restore", "unsuspend", "activate"].includes(action)) return "default";
  return "secondary";
}

export default function AdminLogs() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [targetType, setTargetType] = useState("all");
  const [action, setAction] = useState("all");
  const [actor, setActor] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => { const t = setTimeout(() => setSearch(searchInput.trim()), 400); return () => clearTimeout(t); }, [searchInput]);
  useEffect(() => { setPage(0); }, [search, targetType, action, actor, from, to]);

  const rangeError = from && to && to < from ? "A data final é anterior à inicial." : null;

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["admin-logs", targetType, action, actor, search, from, to, page],
    queryFn: () => adminRpc<ListRes>("admin_list_logs", {
      p_target_type: targetType === "all" ? null : targetType, p_action: action === "all" ? null : action,
      p_actor: actor === "all" ? null : actor, p_search: search || null, p_from: from || null, p_to: to || null,
      p_offset: page * PAGE_SIZE, p_limit: PAGE_SIZE,
    }),
    enabled: !rangeError,
    placeholderData: keepPreviousData,
    refetchInterval: 60000,
  });
  const { data: actors = [] } = useQuery({
    queryKey: ["admin-log-actors"],
    queryFn: () => adminRpc<Actor[]>("admin_log_actors", {}),
    staleTime: 5 * 60 * 1000,
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = !!(search || targetType !== "all" || action !== "all" || actor !== "all" || from || to);

  function clear() { setSearchInput(""); setSearch(""); setTargetType("all"); setAction("all"); setActor("all"); setFrom(""); setTo(""); }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Logs de moderação</h1>
        <p className="text-muted-foreground text-sm">Quem fez o quê, sobre qual alvo e com qual motivo. Os registros não podem ser alterados nem apagados pelo painel. Horários de Brasília.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <Input className="pl-9" aria-label="Buscar por quem fez, alvo, motivo ou ID" placeholder="Buscar quem fez, alvo, motivo ou ID..."
            value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </div>
        <Select value={targetType} onValueChange={setTargetType}>
          <SelectTrigger aria-label="Filtrar por tipo de alvo"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {Object.entries(TARGET_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger aria-label="Filtrar por ação"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as ações</SelectItem>
            {Object.entries(ACTION_LABELS).sort((a, b) => a[1].localeCompare(b[1], "pt-BR")).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={actor} onValueChange={setActor}>
          <SelectTrigger aria-label="Filtrar por quem fez"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Qualquer pessoa</SelectItem>
            <SelectItem value="auto">Automático (sistema)</SelectItem>
            {actors.map((a) => <SelectItem key={a.id} value={a.id}>{a.name} ({a.count})</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2">
          <div className="min-w-0 space-y-1">
            <Label htmlFor="log-from" className="text-xs">De</Label>
            <Input id="log-from" type="date" className="min-w-0" value={from} onChange={(e) => setFrom(e.target.value)} aria-invalid={!!rangeError} />
          </div>
          <div className="min-w-0 space-y-1">
            <Label htmlFor="log-to" className="text-xs">Até</Label>
            <Input id="log-to" type="date" className="min-w-0" value={to} onChange={(e) => setTo(e.target.value)} aria-invalid={!!rangeError} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <p className={rangeError ? "text-destructive" : "text-muted-foreground"} aria-live="polite">
          {rangeError ?? (isFetching && !isLoading ? "Atualizando…" : total > 0
            ? `Mostrando ${page * PAGE_SIZE + 1}–${Math.min(total, (page + 1) * PAGE_SIZE)} de ${total.toLocaleString("pt-BR")} registros`
            : "")}
        </p>
        {filtered && <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={clear}>Limpar filtros</Button>}
      </div>

      {isError && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <AlertTriangle className="w-4 h-4 text-destructive" aria-hidden="true" />
          <span className="flex-1">Não foi possível carregar os logs{data ? "; abaixo está a última consulta que funcionou" : ""}. {error instanceof Error ? error.message : ""}</span>
          <Button size="sm" variant="outline" onClick={() => void refetch()}><RefreshCw className="w-4 h-4 mr-1" aria-hidden="true" /> Tentar novamente</Button>
        </div>
      )}

      {rangeError ? (
        <div role="alert" className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <AlertTriangle className="w-4 h-4 text-destructive" aria-hidden="true" />
          <span>Período inválido: a data final é anterior à inicial. Corrija as datas para ver os registros.</span>
        </div>
      ) : isLoading ? (
        <p role="status" className="py-8 text-center text-muted-foreground">Carregando logs…</p>
      ) : rows.length === 0 && !isError ? (
        <p className="py-8 text-center text-muted-foreground">{filtered ? "Nenhum registro com esses filtros." : "Nenhum registro ainda."}</p>
      ) : rows.length > 0 && (
        <>
          {/* Celular: cartões */}
          <ul className="space-y-2 md:hidden" aria-label="Registros">
            {rows.map((l) => (
              <li key={l.id} className="rounded-lg border border-border p-3 space-y-1.5 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={variant(l.action)}>{ACTION_LABELS[l.action] ?? l.action}</Badge>
                  <span className="text-xs text-muted-foreground">{when(l.created_at)}</span>
                </div>
                <p className="break-words"><span className="text-muted-foreground">{TARGET_LABELS[l.target_type] ?? l.target_type}:</span> {targetText(l)}</p>
                <p className="text-xs text-muted-foreground break-words">Por {actorText(l)}</p>
                {l.reason && <p className="text-xs break-words">Motivo: {l.reason}</p>}
                <Details l={l} />
              </li>
            ))}
          </ul>
          {/* Tela larga: tabela com detalhe expansível */}
          <div className="hidden md:block rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"><span className="sr-only">Detalhes</span></TableHead>
                  <TableHead>Quando</TableHead>
                  <TableHead>Quem fez</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Alvo</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((l) => {
                  const isOpen = open === l.id;
                  return (
                    <Fragment key={l.id}>
                      <TableRow className="align-top">
                        <TableCell className="py-2">
                          <Button variant="ghost" size="icon" className="h-7 w-7" aria-expanded={isOpen}
                            aria-label={`${isOpen ? "Fechar" : "Ver"} detalhes: ${ACTION_LABELS[l.action] ?? l.action}, ${when(l.created_at)}`}
                            onClick={() => setOpen(isOpen ? null : l.id)}>
                            {isOpen ? <ChevronDown className="w-4 h-4" aria-hidden="true" /> : <ChevronRight className="w-4 h-4" aria-hidden="true" />}
                          </Button>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{when(l.created_at)}</TableCell>
                        <TableCell className="text-sm">
                          <p className="break-words">{actorText(l)}</p>
                          {l.actor_email && !l.automatic && <p className="text-xs text-muted-foreground break-all">{l.actor_email}</p>}
                        </TableCell>
                        <TableCell><Badge variant={variant(l.action)}>{ACTION_LABELS[l.action] ?? l.action}</Badge></TableCell>
                        <TableCell className="text-sm max-w-xs">
                          <p className="text-xs text-muted-foreground">{TARGET_LABELS[l.target_type] ?? l.target_type}</p>
                          <p className="break-words">{targetText(l)}</p>
                        </TableCell>
                        <TableCell className="text-sm max-w-xs"><p className="line-clamp-3 break-words">{l.reason ?? "—"}</p></TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow>
                          <TableCell />
                          <TableCell colSpan={5} className="bg-muted/30">
                            {l.reason && <p className="text-sm whitespace-pre-wrap break-words mb-2"><span className="text-muted-foreground">Motivo completo:</span> {l.reason}</p>}
                            <Details l={l} always />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {pageCount > 1 && (
        <nav aria-label="Paginação" className="flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((n) => n - 1)}>Anterior</Button>
          <span className="text-xs text-muted-foreground">Página {page + 1} de {pageCount}</span>
          <Button variant="outline" size="sm" disabled={page + 1 >= pageCount} onClick={() => setPage((n) => n + 1)}>Próxima</Button>
        </nav>
      )}
    </div>
  );
}

function Details({ l, always }: { l: LogRow; always?: boolean }) {
  const [show, setShow] = useState(!!always);
  const [prev, setPrev] = useState<{ title: string | null; content: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const entries = Object.entries(l.details ?? {});

  async function loadPrevious() {
    setLoading(true);
    try {
      setPrev(await adminRpc("admin_log_previous_text", { p_log_id: l.id }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível carregar o texto anterior.");
    } finally {
      setLoading(false);
    }
  }

  if (!always && !show) {
    return (entries.length > 0 || l.has_previous_text || l.target_id)
      ? <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setShow(true)}>Ver detalhes</Button>
      : null;
  }

  return (
    <div className="space-y-2 text-xs">
      {entries.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          {entries.map(([k, v]) => (
            <Fragment key={k}>
              <dt className="text-muted-foreground">{DETAIL_LABELS[k] ?? k}</dt>
              <dd className="break-words">{value(k, v)}</dd>
            </Fragment>
          ))}
        </dl>
      )}
      {l.target_id && (
        <p className="flex flex-wrap items-center gap-1 text-muted-foreground">
          ID do alvo: <code className="font-mono break-all">{l.target_id}</code>
          <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Copiar ID do alvo"
            onClick={() => { void navigator.clipboard?.writeText(l.target_id!); toast.success("ID copiado."); }}>
            <Copy className="w-3 h-3" aria-hidden="true" />
          </Button>
        </p>
      )}
      {l.has_previous_text && (
        prev ? (
          <div className="rounded border border-border bg-background px-2 py-1.5 space-y-1">
            <p className="text-muted-foreground">Texto anterior à edição (não compartilhe):</p>
            {prev.title && <p className="font-medium break-words">{prev.title}</p>}
            {prev.content && <p className="whitespace-pre-wrap break-words">{prev.content}</p>}
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setPrev(null)}>Esconder texto anterior</Button>
          </div>
        ) : (
          <p className="text-muted-foreground">
            Texto anterior guardado, escondido por ser conteúdo do usuário.{" "}
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" disabled={loading} onClick={() => void loadPrevious()}>
              {loading ? "Carregando…" : "Mostrar texto anterior"}
            </Button>
          </p>
        )
      )}
    </div>
  );
}
