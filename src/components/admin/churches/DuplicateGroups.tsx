import { useEffect, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { adminRpc } from "@/lib/admin-rpc";
import { AdminActionDialog } from "../AdminActionDialog";
import { Church, SOURCE_LABELS, StatusBadge, linkedText, place, plural, sinceText } from "./shared";

type Group = { key: string; suggested_keep: string; members: Church[] };
type GroupsRes = { total_groups: number; total_churches: number; groups: Group[] };
type ResolveRes = { groups: number; churches: number; profiles: number; remaining_groups?: number };

const PAGE = 20;

export function DuplicateGroups({ search, state, city, onChanged }: {
  search: string; state: string; city: string; onChanged: () => void;
}) {
  const [page, setPage] = useState(0);
  const [keep, setKeep] = useState<Record<string, string>>({});
  const [merging, setMerging] = useState<Group | null>(null);
  const [resolveOpen, setResolveOpen] = useState(false);

  useEffect(() => { setPage(0); }, [search, state, city]);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["admin-church-duplicates", search, state, city, page],
    queryFn: () => adminRpc<GroupsRes>("admin_list_duplicate_groups", {
      p_search: search || null, p_state: state || null, p_city: city || null, p_offset: page * PAGE, p_limit: PAGE,
    }),
    placeholderData: keepPreviousData,
  });

  // Diálogo aberto acompanha a lista atual (ex.: outra pessoa mesclou parte do grupo).
  useEffect(() => {
    if (!data) return;
    setMerging((m) => (m ? data.groups.find((g) => g.key === m.key) ?? m : m));
  }, [data]);

  const groups = data?.groups ?? [];
  const pages = Math.max(1, Math.ceil((data?.total_groups ?? 0) / PAGE));
  const keepOf = (g: Group) => keep[g.key] ?? g.suggested_keep;

  async function merge(g: Group, reason: string) {
    const k = keepOf(g);
    try {
      const res = await adminRpc<{ moved_profiles: number; merged: string[] }>("admin_merge_churches", {
        p_keep: k, p_merge: g.members.filter((m) => m.id !== k).map((m) => m.id), p_reason: reason || null,
      });
      toast.success(`${plural(res.merged.length, "igreja mesclada", "igrejas mescladas")}; ${plural(res.moved_profiles, "perfil mudou", "perfis mudaram")} de igreja.`);
    } finally {
      onChanged();
      void refetch();
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {isFetching && !isLoading ? "Atualizando…" : data ? `${plural(data.total_groups, "grupo", "grupos")} · ${plural(data.total_churches, "igreja", "igrejas")}` : ""}
        </p>
        {!!data?.total_groups && (
          <Button size="sm" variant="outline" onClick={() => setResolveOpen(true)}>Resolver todas…</Button>
        )}
      </div>

      {isError ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <AlertTriangle className="w-4 h-4 text-destructive" aria-hidden="true" />
          <span className="flex-1">Não foi possível carregar as duplicadas. {error instanceof Error ? error.message : ""}</span>
          <Button size="sm" variant="outline" onClick={() => void refetch()}><RefreshCw className="w-4 h-4 mr-1" aria-hidden="true" /> Tentar novamente</Button>
        </div>
      ) : isLoading ? (
        <p role="status" className="py-8 text-center text-muted-foreground">Carregando duplicadas…</p>
      ) : groups.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">{search || state ? "Nenhuma duplicada com esses filtros." : "Nenhuma igreja duplicada."}</p>
      ) : (
        <ul className="space-y-3" aria-label="Grupos de igrejas duplicadas">
          {groups.map((g) => {
            const first = g.members[0];
            const k = keepOf(g);
            return (
              <li key={g.key} className="rounded-lg border border-border p-3 sm:p-4 space-y-3">
                <div>
                  <p className="font-medium break-words">{first.name} · {place(first)}</p>
                  <p className="text-xs text-muted-foreground">{plural(g.members.length, "cadastro igual", "cadastros iguais")}. Escolha qual fica:</p>
                </div>
                <RadioGroup value={k} onValueChange={(v) => setKeep((s) => ({ ...s, [g.key]: v }))} aria-label={`Qual igreja fica: ${first.name}, ${place(first)}`}>
                  {g.members.map((m) => (
                    <div key={m.id} className="flex items-start gap-2 rounded-md border border-border/60 px-2 py-2">
                      <RadioGroupItem value={m.id} id={`keep-${m.id}`} className="mt-1" />
                      <Label htmlFor={`keep-${m.id}`} className="flex-1 font-normal space-y-0.5 cursor-pointer">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <StatusBadge c={m} />
                          <span className="text-xs text-muted-foreground">{SOURCE_LABELS[m.source]} · {sinceText(m.created_at)}</span>
                          {m.id === g.suggested_keep && <Badge variant="outline" className="text-[10px]">sugerida</Badge>}
                        </span>
                        <span className="block text-sm break-words">{m.name}</span>
                        <span className="block text-xs text-muted-foreground break-words">
                          {linkedText(m.linked_profiles)}{m.address ? ` · ${m.address}` : " · sem endereço"}
                        </span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => setMerging(g)}>Mesclar…</Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label="Paginação das duplicadas" className="flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((n) => n - 1)}>Anterior</Button>
          <span className="text-xs text-muted-foreground">Página {page + 1} de {pages}</span>
          <Button variant="outline" size="sm" disabled={page + 1 >= pages} onClick={() => setPage((n) => n + 1)}>Próxima</Button>
        </nav>
      )}

      <AdminActionDialog
        open={!!merging}
        onOpenChange={(o) => { if (!o) setMerging(null); }}
        title="Mesclar igrejas duplicadas"
        target={merging ? (() => { const k = merging.members.find((m) => m.id === keepOf(merging))!; return { id: k.id, name: `Fica: ${k.name} · ${place(k)}` }; })() : null}
        description={merging ? mergeConsequence(merging, keepOf(merging)) : undefined}
        confirmLabel="Mesclar"
        reasonOptional
        onConfirm={(reason) => merge(merging!, reason)}
      />

      <ResolveAllDialog open={resolveOpen} onOpenChange={setResolveOpen} state={state} onDone={() => { onChanged(); void refetch(); }} />
    </div>
  );
}

function mergeConsequence(g: Group, keepId: string): string {
  const others = g.members.filter((m) => m.id !== keepId);
  const moved = others.reduce((s, m) => s + m.linked_profiles, 0);
  const k = g.members.find((m) => m.id === keepId)!;
  return `${plural(others.length, "igreja fica inativa e marcada", "igrejas ficam inativas e marcadas")} como mesclada${others.length === 1 ? "" : "s"} nesta. `
    + (moved ? `${plural(moved, "perfil passa", "perfis passam")} para ela. ` : "Nenhum perfil muda de igreja. ")
    + (k.status !== "active" ? "Esta igreja passa a ficar ativa. " : "")
    + "Dá para desfazer depois, na aba Inativas.";
}

function ResolveAllDialog({ open, onOpenChange, state, onDone }: {
  open: boolean; onOpenChange: (o: boolean) => void; state: string; onDone: () => void;
}) {
  const stopRef = useRef(false);
  const [phase, setPhase] = useState<"preview" | "running" | "done">("preview");
  const [preview, setPreview] = useState<ResolveRes | null>(null);
  const [done, setDone] = useState({ groups: 0, churches: 0, profiles: 0 });
  const [err, setErr] = useState<string | null>(null);
  const [stopped, setStopped] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPhase("preview"); setPreview(null); setErr(null); setStopped(false); setDone({ groups: 0, churches: 0, profiles: 0 });
    adminRpc<ResolveRes>("admin_resolve_duplicates", { p_state: state || null, p_dry_run: true })
      .then(setPreview)
      .catch((e) => setErr(e instanceof Error ? e.message : "Não foi possível calcular a prévia."));
  }, [open, state]);

  async function run() {
    stopRef.current = false;
    setPhase("running");
    setErr(null);
    const acc = { groups: 0, churches: 0, profiles: 0 };
    try {
      for (;;) {
        if (stopRef.current) { setStopped(true); break; }
        const r = await adminRpc<ResolveRes>("admin_resolve_duplicates", { p_state: state || null, p_dry_run: false, p_limit: 100 });
        acc.groups += r.groups; acc.churches += r.churches; acc.profiles += r.profiles;
        setDone({ ...acc });
        if (!r.remaining_groups || r.groups === 0) break;
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "erro de conexão");
    }
    setPhase("done");
    onDone();
  }

  const total = preview?.groups ?? 0;
  const scope = state ? `em ${state}` : "em todos os estados";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (phase !== "running") onOpenChange(o); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Resolver todas as duplicadas</DialogTitle>
          <DialogDescription>Em cada grupo fica a igreja sugerida: a que tem mais perfis ligados; depois a ativa; depois a que tem endereço; depois a mais antiga.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {!preview && !err && <p role="status">Calculando a prévia {scope}…</p>}
          {preview && phase === "preview" && (
            <p>
              Serão mesclados <strong>{plural(preview.groups, "grupo", "grupos")}</strong> {scope}: {plural(preview.churches, "igreja fica inativa", "igrejas ficam inativas")} e {plural(preview.profiles, "perfil muda", "perfis mudam")} de igreja. Cada mesclagem fica no log e pode ser desfeita depois, uma a uma.
            </p>
          )}
          {phase !== "preview" && (
            <div role="status" className="space-y-1">
              <p>{phase === "running" ? "Mesclando…" : stopped ? "Parado." : err ? "Parou com erro." : "Concluído."} {plural(done.groups, "grupo resolvido", "grupos resolvidos")} de {total.toLocaleString("pt-BR")} · {plural(done.churches, "igreja inativada", "igrejas inativadas")} · {plural(done.profiles, "perfil movido", "perfis movidos")}.</p>
              <Progress value={total ? Math.min(100, (done.groups / total) * 100) : 100} aria-label="Progresso da resolução" />
              {(stopped || err) && done.groups < total && <p className="text-muted-foreground">O que já foi mesclado fica gravado. O restante continua na aba Duplicadas.</p>}
            </div>
          )}
          {err && (
            <div role="alert" className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-destructive">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{err}</span>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          {phase === "preview" && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={() => void run()} disabled={!preview || preview.groups === 0}>Mesclar {plural(total, "grupo", "grupos")}</Button>
            </>
          )}
          {phase === "running" && <Button variant="outline" onClick={() => { stopRef.current = true; }}>Parar depois deste lote</Button>}
          {phase === "done" && <Button onClick={() => onOpenChange(false)}>Fechar</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
