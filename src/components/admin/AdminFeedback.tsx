import { useEffect, useId, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { adminRpc } from "@/lib/admin-rpc";

type Tab = "unread" | "read" | "replied" | "archived" | "all";
type Status = Exclude<Tab, "all">;
type Reply = { id: string; body: string; created_at: string; author_name: string };
type Feedback = {
  id: string;
  category: string;
  message: string;
  status: Status;
  created_at: string;
  has_author: boolean;
  author_name: string | null;
  author_email: string | null;
  author_removed: boolean | null;
  replies: Reply[];
};
type ListRes = { counts: Record<Tab, number>; total: number; rows: Feedback[] };

const PAGE_SIZE = 20;
const LONG = 400;

const TABS: { value: Tab; label: string; help: string }[] = [
  { value: "unread", label: "Não lidos", help: "Ninguém da equipe marcou como lido nem respondeu ainda." },
  { value: "read", label: "Lidos", help: "Já lidos, ainda sem resposta." },
  { value: "replied", label: "Respondidos", help: "Com pelo menos uma resposta enviada ao usuário." },
  { value: "archived", label: "Arquivados", help: "Fora da fila. Dá para voltar para Não lidos." },
  { value: "all", label: "Todos", help: "Todos os feedbacks, em qualquer situação." },
];

const CATEGORY_LABELS: Record<string, string> = {
  sugestao: "Sugestão",
  bug: "Problema / Bug",
  elogio: "Elogio",
  outro: "Outro",
};

const STATUS_LABELS: Record<Status, string> = {
  unread: "Não lido",
  read: "Lido",
  replied: "Respondido",
  archived: "Arquivado",
};

function plural(n: number, one: string, many: string) {
  return `${n.toLocaleString("pt-BR")} ${n === 1 ? one : many}`;
}

function authorLine(f: Feedback): string {
  if (!f.has_author) return "Sem conta (a conta foi excluída)";
  const parts = [f.author_name ?? "Sem nome", f.author_email].filter(Boolean);
  return parts.join(" · ") + (f.author_removed ? " · conta removida pela moderação" : "");
}

/** O que o usuário recebe em Mensagens (mesmo formato do servidor). */
function notificationPreview(message: string, body: string) {
  const one = message.replace(/\s+/g, " ");
  const preview = one.slice(0, 80) + (message.length > 80 ? "…" : "");
  return `A equipe do Améns respondeu ao seu feedback "${preview}":\n\n${body.trim() || "…"}`;
}

export default function AdminFeedback() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("unread");
  const [category, setCategory] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [replying, setReplying] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { const t = setTimeout(() => setSearch(searchInput.trim()), 350); return () => clearTimeout(t); }, [searchInput]);
  useEffect(() => { setPage(0); }, [tab, category, search]);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["admin-feedback", tab, category, search, page],
    queryFn: () => adminRpc<ListRes>("admin_list_feedback", {
      p_tab: tab, p_category: category === "all" ? null : category, p_search: search || null,
      p_offset: page * PAGE_SIZE, p_limit: PAGE_SIZE,
    }),
    placeholderData: keepPreviousData,
    refetchInterval: 30000,
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeTab = TABS.find((t) => t.value === tab)!;

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin-feedback"] });
    qc.invalidateQueries({ queryKey: ["admin-feedback-unread"] });
  }

  // Lista atualizada: o diálogo de resposta passa a ver as respostas atuais (ex.: outra pessoa respondeu).
  useEffect(() => {
    if (!data) return;
    setReplying((r) => (r ? data.rows.find((x) => x.id === r.id) ?? r : r));
  }, [data]);

  async function setStatus(f: Feedback, status: Exclude<Status, "replied">, done: string) {
    setBusy(f.id);
    try {
      await adminRpc("admin_set_feedback_status", { p_id: f.id, p_status: status, p_expected_status: f.status });
      toast.success(done);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível mudar a situação.");
    } finally {
      setBusy(null);
      refresh();
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Feedback</h1>
        <p className="text-muted-foreground text-sm">Sugestões, problemas e elogios enviados pelo app. Cada resposta chega ao usuário em Mensagens e fica no histórico.</p>
      </div>

      <div className="space-y-2">
        <div className="overflow-x-auto -mx-1 px-1">
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <TabsList aria-label="Filtrar feedback por situação">
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

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <Input className="pl-9" aria-label="Buscar no texto, no nome ou no e-mail" placeholder="Buscar texto, nome ou e-mail..."
            value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="sm:w-48" aria-label="Filtrar por categoria"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground" aria-live="polite">
        {isFetching && !isLoading ? "Atualizando…" : total > 0 ? `Mostrando ${page * PAGE_SIZE + 1}–${Math.min(total, (page + 1) * PAGE_SIZE)} de ${plural(total, "feedback", "feedbacks")}` : ""}
      </p>

      {isError ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <AlertTriangle className="w-4 h-4 text-destructive" aria-hidden="true" />
          <span className="flex-1">Não foi possível carregar o feedback. {error instanceof Error ? error.message : ""}</span>
          <Button size="sm" variant="outline" onClick={() => void refetch()}><RefreshCw className="w-4 h-4 mr-1" aria-hidden="true" /> Tentar novamente</Button>
        </div>
      ) : isLoading ? (
        <p role="status" className="py-8 text-center text-muted-foreground">Carregando feedback…</p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">{search || category !== "all" ? "Nenhum feedback com esses filtros." : tab === "unread" ? "Nenhum feedback esperando leitura." : "Nenhum feedback nesta aba."}</p>
      ) : (
        <ul className="space-y-3" aria-label="Feedbacks">
          {rows.map((f) => (
            <FeedbackCard key={f.id} f={f} busy={busy === f.id}
              onReply={() => setReplying(f)}
              onStatus={(s, done) => void setStatus(f, s, done)} />
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

      <ReplyDialog f={replying} onClose={() => setReplying(null)} onChanged={refresh} />
    </div>
  );
}

function FeedbackCard({ f, busy, onReply, onStatus }: {
  f: Feedback; busy: boolean; onReply: () => void; onStatus: (s: Exclude<Status, "replied">, done: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const long = f.message.length > LONG;
  const text = long && !open ? f.message.slice(0, LONG).trimEnd() + "…" : f.message;
  const canReply = f.has_author;
  return (
    <li className={`rounded-lg border p-3 sm:p-4 space-y-3 ${f.status === "unread" ? "border-primary/40 bg-primary/5" : "border-border"}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant={f.category === "bug" ? "destructive" : "secondary"}>{CATEGORY_LABELS[f.category] ?? f.category}</Badge>
        <Badge variant={f.status === "unread" ? "default" : "outline"}>{STATUS_LABELS[f.status]}</Badge>
        <span className="text-muted-foreground" title={format(new Date(f.created_at), "dd/MM/yyyy HH:mm")}>
          {formatDistanceToNow(new Date(f.created_at), { locale: ptBR, addSuffix: true })}
        </span>
      </div>
      <p className="text-sm text-muted-foreground break-words">{authorLine(f)}</p>
      <div>
        <p className="text-sm whitespace-pre-wrap break-words">{text}</p>
        {long && (
          <Button variant="link" size="sm" className="h-auto p-0 text-xs" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? "Ver menos" : "Ver tudo"}
          </Button>
        )}
      </div>
      {f.replies.length > 0 && (
        <ol className="space-y-2" aria-label="Respostas enviadas">
          {f.replies.map((r) => (
            <li key={r.id} className="rounded-md border-l-2 border-primary/50 bg-muted/40 px-3 py-2 text-sm">
              <p className="text-xs text-muted-foreground">Resposta de {r.author_name} · {format(new Date(r.created_at), "dd/MM/yyyy 'às' HH:mm")}</p>
              <p className="whitespace-pre-wrap break-words">{r.body}</p>
            </li>
          ))}
        </ol>
      )}
      <div className="flex flex-wrap gap-2" role="group" aria-label={`Ações para o feedback de ${f.author_name ?? "usuário"}`}>
        {canReply && (
          <Button size="sm" onClick={onReply} disabled={busy}>{f.replies.length ? "Responder de novo…" : "Responder…"}</Button>
        )}
        {f.status === "unread" && <Button size="sm" variant="outline" disabled={busy} onClick={() => onStatus("read", "Marcado como lido.")}>Marcar como lido</Button>}
        {f.status === "read" && <Button size="sm" variant="outline" disabled={busy} onClick={() => onStatus("unread", "Voltou para Não lidos.")}>Marcar como não lido</Button>}
        {f.status !== "archived"
          ? <Button size="sm" variant="outline" disabled={busy} onClick={() => onStatus("archived", "Arquivado.")}>Arquivar</Button>
          : <Button size="sm" variant="outline" disabled={busy} onClick={() => onStatus("unread", "Desarquivado: voltou para Não lidos.")}>Desarquivar</Button>}
      </div>
    </li>
  );
}

function ReplyDialog({ f, onClose, onChanged }: { f: Feedback | null; onClose: () => void; onChanged: () => void }) {
  const id = useId();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Contagem vista ao abrir: se outra pessoa responder no meio, o servidor recusa e a lista nova é mostrada.
  const [expected, setExpected] = useState(0);

  useEffect(() => {
    if (!f) return;
    setText(""); setErr(null); setSending(false); setExpected(f.replies.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f?.id]);

  const valid = text.trim().length >= 2 && text.length <= 2000;

  async function send() {
    if (!f || !valid || sending) return;
    setSending(true); setErr(null);
    try {
      await adminRpc("admin_reply_feedback", { p_id: f.id, p_body: text, p_expected_replies: expected });
      toast.success("Resposta enviada. O usuário vai vê-la em Mensagens.");
      onChanged();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Não foi possível enviar.");
      onChanged();
    } finally {
      setSending(false);
    }
  }

  const others = f ? f.replies.length - expected : 0;

  return (
    <Dialog open={!!f} onOpenChange={(o) => { if (!o && !sending) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{f?.replies.length ? "Responder de novo" : "Responder feedback"}</DialogTitle>
          <DialogDescription>A resposta chega ao usuário em Mensagens e fica no histórico deste feedback.</DialogDescription>
        </DialogHeader>
        {f && (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void send(); }}>
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm space-y-1">
              <p><span className="text-muted-foreground">Para:</span> <span className="font-medium break-words">{authorLine(f)}</span></p>
              <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[f.category] ?? f.category} · {format(new Date(f.created_at), "dd/MM/yyyy 'às' HH:mm")}</p>
              <p className="whitespace-pre-wrap break-words max-h-40 overflow-y-auto">{f.message}</p>
            </div>
            {f.replies.length > 0 && (
              <div className="text-sm space-y-1">
                <p className="font-medium">{plural(f.replies.length, "resposta já enviada", "respostas já enviadas")}{others > 0 ? ` (${others} ${others === 1 ? "chegou" : "chegaram"} agora)` : ""}:</p>
                <ol className="space-y-1 max-h-32 overflow-y-auto">
                  {f.replies.map((r) => (
                    <li key={r.id} className="rounded border-l-2 border-primary/50 bg-muted/30 px-2 py-1 text-xs">
                      <span className="text-muted-foreground">{r.author_name} · {format(new Date(r.created_at), "dd/MM HH:mm")}:</span> {r.body}
                    </li>
                  ))}
                </ol>
                <p className="text-xs text-muted-foreground">A nova resposta vai como outra mensagem; as anteriores continuam com o usuário.</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-body`}>Sua resposta</Label>
              <Textarea id={`${id}-body`} rows={4} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)}
                aria-describedby={`${id}-help`} />
              <p id={`${id}-help`} className="text-xs text-muted-foreground">{text.length}/2.000 caracteres.</p>
            </div>
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">Ver como o usuário vai receber</summary>
              <p className="mt-1 whitespace-pre-wrap break-words rounded border border-border px-2 py-1">{notificationPreview(f.message, text)}</p>
            </details>
            {err && (
              <div role="alert" className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{err}</span>
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-0 flex-wrap">
              <Button type="button" variant="outline" onClick={onClose} disabled={sending}>Cancelar</Button>
              {/* keys distintas: sem elas o React reaproveita o <button>, que vira submit durante o clique e envia sem querer */}
              {others > 0 ? (
                <Button key="ack" type="button" onClick={() => { setExpected(f.replies.length); setErr(null); }}>Li a resposta nova; continuar</Button>
              ) : (
                <Button key="send" type="submit" disabled={!valid || sending}>{sending ? "Enviando…" : "Enviar resposta"}</Button>
              )}
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
