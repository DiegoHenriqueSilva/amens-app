import { useEffect, useId, useRef, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, ChevronDown, FileUp, Plus, RefreshCw, Search, X } from "lucide-react";
import { toast } from "sonner";
import { adminRpc } from "@/lib/admin-rpc";
import { AdminActionDialog } from "./AdminActionDialog";
import { ChurchImportDialog } from "./churches/ChurchImportDialog";
import { DuplicateGroups } from "./churches/DuplicateGroups";
import {
  Church, ChurchSource, SOURCE_LABELS, STATES, StatusBadge, linkedText, place, plural, statusLabel,
} from "./churches/shared";

type Tab = "all" | "active" | "inactive" | "pending_review" | "archived" | "duplicates";
type ListTab = Exclude<Tab, "duplicates">;
type ListRes = { counts: Record<ListTab, number>; total: number; rows: Church[] };
type Action = "approve" | "reject" | "activate" | "deactivate" | "remove" | "restore" | "unmerge";

const PAGE_SIZE = 30;

const TABS: { value: Tab; label: string; help: string }[] = [
  { value: "all", label: "Todas", help: "Todas as igrejas, em qualquer situação." },
  { value: "active", label: "Ativas", help: "Visíveis para todos. São as únicas que a busca de paróquias pode mostrar." },
  { value: "inactive", label: "Inativas", help: "Não ficam visíveis. Inclui as mescladas em outra igreja, que podem ser separadas de novo." },
  { value: "pending_review", label: "Em revisão", help: "Sugeridas por usuários. Só ficam visíveis depois de aprovadas." },
  { value: "archived", label: "Arquivadas", help: "Rejeitadas ou removidas. Não ficam visíveis; as removidas podem ser restauradas." },
  { value: "duplicates", label: "Duplicadas", help: "Mesmo nome na mesma cidade e estado, sem diferenciar acentos e maiúsculas. Ao mesclar, os perfis ligados passam para a igreja que fica." },
];

const ACTION_UI: Record<Action, { menu: string; title: string; confirm: string; destructive?: boolean; reasonOptional?: boolean }> = {
  approve: { menu: "Aprovar", title: "Aprovar igreja", confirm: "Aprovar", reasonOptional: true },
  reject: { menu: "Rejeitar…", title: "Rejeitar sugestão", confirm: "Rejeitar", destructive: true },
  activate: { menu: "Ativar", title: "Ativar igreja", confirm: "Ativar", reasonOptional: true },
  deactivate: { menu: "Inativar…", title: "Inativar igreja", confirm: "Inativar", destructive: true },
  remove: { menu: "Remover…", title: "Remover igreja", confirm: "Remover", destructive: true },
  restore: { menu: "Restaurar", title: "Restaurar igreja", confirm: "Restaurar", reasonOptional: true },
  unmerge: { menu: "Desfazer mesclagem…", title: "Desfazer mesclagem", confirm: "Desfazer", reasonOptional: true },
};

function actionsFor(c: Church): Action[] {
  if (c.deleted_at) return ["restore"];
  if (c.merged_into) return ["unmerge", "remove"];
  switch (c.status) {
    case "pending_review": return ["approve", "reject", "remove"];
    case "active": return ["deactivate", "remove"];
    case "inactive": return ["activate", "remove"];
    case "rejected": return ["approve", "remove"];
  }
}

function consequence(a: Action, c: Church): string {
  const linked = c.linked_profiles > 0 ? ` ${plural(c.linked_profiles, "perfil continua ligado", "perfis continuam ligados")} a ela.` : "";
  switch (a) {
    case "approve": return c.status === "rejected"
      ? "A igreja sai de Arquivadas e passa a ficar visível para todos."
      : "A igreja passa a ficar visível para todos.";
    case "reject": return "A igreja não fica visível e a sugestão vai para Arquivadas.";
    case "activate": return "A igreja volta a ficar visível para todos.";
    case "deactivate": return `A igreja deixa de ficar visível e vai para Inativas.${linked}`;
    case "remove": return `A igreja vai para Arquivadas e deixa de ficar visível. Dá para restaurar depois.${linked}`;
    case "restore": return `A igreja volta à situação de antes da remoção (${statusLabel({ ...c, deleted_at: null }).toLowerCase()}).`;
    case "unmerge": return `A igreja volta a ser separada de "${c.merged_into_name ?? "outra igreja"}", com a situação de antes, e os perfis que tinham sido movidos voltam para ela.`;
  }
}

function useDebounced(value: string, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value.trim()), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

/** Cidade com sugestões. `free`: aceita cidade fora da lista (formulário); sem `free`, só da lista (filtro). */
function CityInput({ id, cities, value, onChange, disabled, free, label }: {
  id: string; cities: string[]; value: string; onChange: (v: string) => void; disabled?: boolean; free?: boolean; label: string;
}) {
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { setText(value); }, [value]);
  const q = text.trim().toLowerCase();
  const suggestions = q.length >= 2 ? cities.filter((c) => c.toLowerCase().includes(q)).slice(0, 25) : [];

  function pick(c: string) { onChange(c); setText(c); setOpen(false); }

  return (
    <div ref={box} className="relative" onBlur={(e) => {
      if (box.current?.contains(e.relatedTarget as Node)) return;
      setOpen(false);
      if (free) onChange(text.trim());
      else if (!cities.includes(text)) setText(value);
    }}>
      <Input
        id={id}
        aria-label={label}
        role="combobox"
        aria-expanded={open && suggestions.length > 0}
        aria-autocomplete="list"
        value={text}
        disabled={disabled}
        placeholder={disabled ? "Escolha o estado primeiro" : free ? "Digite a cidade" : "Todas as cidades"}
        className="pr-8"
        onChange={(e) => { setText(e.target.value); setOpen(true); if (free) onChange(e.target.value); }}
        onFocus={() => setOpen(true)}
      />
      {text && !disabled && (
        <button type="button" aria-label="Limpar cidade" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
          onClick={() => { onChange(""); setText(""); }}>
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      )}
      {open && suggestions.length > 0 && (
        <ul role="listbox" className="absolute z-50 top-full mt-1 w-full max-h-56 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
          {suggestions.map((c) => (
            <li key={c} role="option" aria-selected={c === value}>
              <button type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-accent focus:bg-accent focus:outline-none"
                onMouseDown={(e) => e.preventDefault()} onClick={() => pick(c)}>{c}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function useCities(state: string) {
  return useQuery({
    queryKey: ["admin-church-cities", state],
    queryFn: () => adminRpc<string[]>("admin_church_cities", { p_state: state }),
    enabled: !!state,
    staleTime: 5 * 60 * 1000,
  }).data ?? [];
}

export default function AdminChurches() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("all");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounced(searchInput);
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [source, setSource] = useState<"" | ChurchSource>("");
  const [page, setPage] = useState(0);
  const [pending, setPending] = useState<{ action: Action; church: Church } | null>(null);
  const [form, setForm] = useState<Church | "new" | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const filterCities = useCities(state);

  useEffect(() => { setPage(0); }, [tab, search, state, city, source]);

  const listTab: ListTab = tab === "duplicates" ? "all" : tab;
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["admin-churches", listTab, search, state, city, source, page],
    queryFn: () => adminRpc<ListRes>("admin_list_churches", {
      p_tab: listTab, p_search: search || null, p_state: state || null, p_city: city || null,
      p_source: source || null, p_offset: page * PAGE_SIZE, p_limit: PAGE_SIZE,
    }),
    placeholderData: keepPreviousData,
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeTab = TABS.find((t) => t.value === tab)!;

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin-churches"] });
    qc.invalidateQueries({ queryKey: ["admin-church-duplicates"] });
    qc.invalidateQueries({ queryKey: ["admin-church-cities"] });
  }

  // Lista atualizada: o diálogo aberto passa a mostrar a situação atual da igreja.
  useEffect(() => {
    if (!data) return;
    setPending((p) => {
      const f = p && data.rows.find((r) => r.id === p.church.id);
      return p && f && f !== p.church ? { ...p, church: f } : p;
    });
    // Formulário: atualiza a versão esperada sem apagar o que foi digitado.
    setForm((f) => (f && f !== "new" ? data.rows.find((r) => r.id === f.id) ?? f : f));
  }, [data]);

  async function runAction(a: Action, c: Church, reason: string) {
    try {
      if (a === "unmerge") {
        await adminRpc("admin_unmerge_church", { p_id: c.id, p_reason: reason || null });
      } else {
        await adminRpc("admin_set_church_status", {
          p_id: c.id, p_action: a, p_reason: reason || null,
          p_expected_status: c.status, p_expected_deleted: !!c.deleted_at,
        });
      }
    } catch (e) {
      refresh();
      throw e;
    }
    refresh();
    toast.success({
      approve: "Igreja aprovada.", reject: "Sugestão rejeitada.", activate: "Igreja ativada.", deactivate: "Igreja inativada.",
      remove: "Igreja removida. Ela está em Arquivadas.", restore: "Igreja restaurada.", unmerge: "Mesclagem desfeita.",
    }[a]);
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Igrejas</h1>
          <p className="text-muted-foreground text-sm">Cadastro de paróquias e igrejas. Toda alteração fica no log de moderação.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
            <FileUp className="w-4 h-4 mr-2" aria-hidden="true" /> Importar CSV
          </Button>
          <Button size="sm" onClick={() => setForm("new")}>
            <Plus className="w-4 h-4 mr-2" aria-hidden="true" /> Nova igreja
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="overflow-x-auto -mx-1 px-1">
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <TabsList aria-label="Filtrar igrejas por situação">
              {TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value} className="whitespace-nowrap">
                  {t.label}
                  {t.value !== "duplicates" && data?.counts && (
                    <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">{data.counts[t.value as ListTab].toLocaleString("pt-BR")}</span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <p className="text-xs text-muted-foreground">{activeTab.help}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <Input className="pl-9" aria-label="Buscar por nome, cidade ou estado" placeholder="Buscar nome, cidade ou estado..."
            value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </div>
        <Select value={state || "_all"} onValueChange={(v) => { setState(v === "_all" ? "" : v); setCity(""); }}>
          <SelectTrigger aria-label="Filtrar por estado"><SelectValue placeholder="Todos os estados" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos os estados</SelectItem>
            {STATES.map((s) => <SelectItem key={s.uf} value={s.name}>{s.name} ({s.uf})</SelectItem>)}
          </SelectContent>
        </Select>
        <CityInput id="church-city-filter" label="Filtrar por cidade" cities={filterCities} value={city} onChange={setCity} disabled={!state} />
        {tab !== "duplicates" && (
          <Select value={source || "_all"} onValueChange={(v) => setSource(v === "_all" ? "" : (v as ChurchSource))}>
            <SelectTrigger aria-label="Filtrar por origem"><SelectValue placeholder="Todas as origens" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todas as origens</SelectItem>
              {(Object.keys(SOURCE_LABELS) as ChurchSource[]).map((s) => <SelectItem key={s} value={s}>{SOURCE_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {tab === "duplicates" ? (
        <DuplicateGroups search={search} state={state} city={city} onChanged={refresh} />
      ) : (
        <>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {isFetching && !isLoading ? "Atualizando…" : total > 0 ? `Mostrando ${(page * PAGE_SIZE + 1).toLocaleString("pt-BR")}–${Math.min(total, (page + 1) * PAGE_SIZE).toLocaleString("pt-BR")} de ${plural(total, "igreja", "igrejas")}` : ""}
          </p>

          {isError ? (
            <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
              <AlertTriangle className="w-4 h-4 text-destructive" aria-hidden="true" />
              <span className="flex-1">Não foi possível carregar as igrejas. {error instanceof Error ? error.message : ""}</span>
              <Button size="sm" variant="outline" onClick={() => void refetch()}><RefreshCw className="w-4 h-4 mr-1" aria-hidden="true" /> Tentar novamente</Button>
            </div>
          ) : isLoading ? (
            <p role="status" className="py-8 text-center text-muted-foreground">Carregando igrejas…</p>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">{search || state || source ? "Nenhuma igreja encontrada com esses filtros." : "Nenhuma igreja nesta aba."}</p>
          ) : (
            <>
              {/* Celular: cartões */}
              <ul className="space-y-2 md:hidden" aria-label="Igrejas">
                {rows.map((c) => (
                  <li key={c.id} className={`rounded-lg border border-border p-3 space-y-2 ${c.deleted_at ? "opacity-70" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium break-words">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{place(c)} · {SOURCE_LABELS[c.source]}</p>
                      </div>
                      <StatusBadge c={c} />
                    </div>
                    <ChurchDetails c={c} />
                    <RowActions c={c} onEdit={() => setForm(c)} onAction={(action) => setPending({ action, church: c })} />
                  </li>
                ))}
              </ul>
              {/* Tela larga: tabela */}
              <div className="hidden md:block rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Igreja</TableHead>
                      <TableHead>Cidade/UF</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Situação</TableHead>
                      <TableHead className="w-28"><span className="sr-only">Ações</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((c) => (
                      <TableRow key={c.id} className={c.deleted_at ? "opacity-70" : ""}>
                        <TableCell className="align-top">
                          <p className="font-medium break-words">{c.name}</p>
                          <ChurchDetails c={c} />
                        </TableCell>
                        <TableCell className="align-top text-sm text-muted-foreground whitespace-nowrap">{place(c)}</TableCell>
                        <TableCell className="align-top text-sm text-muted-foreground">{SOURCE_LABELS[c.source]}</TableCell>
                        <TableCell className="align-top"><StatusBadge c={c} /></TableCell>
                        <TableCell className="align-top text-right">
                          <RowActions c={c} onEdit={() => setForm(c)} onAction={(action) => setPending({ action, church: c })} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {pageCount > 1 && (
            <nav aria-label="Paginação" className="flex items-center justify-between gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((n) => n - 1)}>Anterior</Button>
              <span className="text-xs text-muted-foreground">Página {(page + 1).toLocaleString("pt-BR")} de {pageCount.toLocaleString("pt-BR")}</span>
              <Button variant="outline" size="sm" disabled={page + 1 >= pageCount} onClick={() => setPage((n) => n + 1)}>Próxima</Button>
            </nav>
          )}
        </>
      )}

      <AdminActionDialog
        open={!!pending}
        onOpenChange={(o) => { if (!o) setPending(null); }}
        title={pending ? ACTION_UI[pending.action].title : ""}
        target={pending ? { id: pending.church.id, name: `${pending.church.name} · ${place(pending.church)} · ${statusLabel(pending.church)}` } : null}
        description={pending ? consequence(pending.action, pending.church) : undefined}
        confirmLabel={pending ? ACTION_UI[pending.action].confirm : ""}
        destructive={pending ? ACTION_UI[pending.action].destructive : false}
        reasonOptional={pending ? ACTION_UI[pending.action].reasonOptional : false}
        onConfirm={(reason) => runAction(pending!.action, pending!.church, reason)}
      />

      <ChurchFormDialog church={form} onClose={() => setForm(null)} onSaved={refresh} />
      <ChurchImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={refresh} />
    </div>
  );
}

function ChurchDetails({ c }: { c: Church }) {
  return (
    <div className="text-xs text-muted-foreground space-y-0.5">
      {c.address && <p className="break-words">{c.address}</p>}
      <p>
        {linkedText(c.linked_profiles)}
        {c.merged_into && <> · Mesclada em <span className="text-foreground">{c.merged_into_name ?? "outra igreja"}</span></>}
      </p>
    </div>
  );
}

function RowActions({ c, onEdit, onAction }: { c: Church; onEdit: () => void; onAction: (a: Action) => void }) {
  const acts = actionsFor(c);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8" aria-label={`Ações para ${c.name}, ${place(c)}`}>
          Ações <ChevronDown className="w-3.5 h-3.5 ml-1" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!c.deleted_at && <DropdownMenuItem onClick={onEdit}>Editar…</DropdownMenuItem>}
        {acts.filter((a) => a !== "remove").map((a) => (
          <DropdownMenuItem key={a} onClick={() => onAction(a)}>{ACTION_UI[a].menu}</DropdownMenuItem>
        ))}
        {acts.includes("remove") && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => onAction("remove")}>{ACTION_UI.remove.menu}</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ChurchFormDialog({ church, onClose, onSaved }: { church: Church | "new" | null; onClose: () => void; onSaved: () => void }) {
  const ids = useId();
  const editing = church && church !== "new" ? church : null;
  const [name, setName] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const cities = useCities(state);

  useEffect(() => {
    if (!church) return;
    setName(editing?.name ?? ""); setState(editing?.state ?? ""); setCity(editing?.city ?? "");
    setAddress(editing?.address ?? ""); setReason(""); setErr(null); setSaving(false);
    // Só ao abrir ou trocar de igreja; a versão nova do mesmo registro não apaga o que foi digitado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [church === "new" ? "new" : church?.id]);

  const valid = name.trim().length >= 3 && !!state && city.trim().length >= 2;

  async function save() {
    if (!valid || saving) return;
    setSaving(true); setErr(null);
    try {
      await adminRpc("admin_save_church", {
        p_id: editing?.id ?? null, p_name: name, p_city: city, p_state: state, p_address: address || null,
        p_reason: reason || null, p_expected_updated_at: editing?.updated_at ?? null,
      });
      toast.success(editing ? "Igreja atualizada." : "Igreja criada e ativa.");
      onSaved();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Não foi possível salvar.");
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!church} onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar igreja" : "Nova igreja"}</DialogTitle>
          <DialogDescription>
            {editing ? `Situação atual: ${statusLabel(editing).toLowerCase()}. Editar não muda a situação.` : "A igreja criada aqui já entra como ativa."}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <div className="space-y-1.5">
            <Label htmlFor={`${ids}-name`}>Nome da paróquia ou igreja</Label>
            <Input id={`${ids}-name`} value={name} maxLength={150} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Paróquia Nossa Senhora Aparecida" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${ids}-state`}>Estado</Label>
            <Select value={state || undefined} onValueChange={(v) => { setState(v); setCity(""); }}>
              <SelectTrigger id={`${ids}-state`}><SelectValue placeholder="Escolha o estado" /></SelectTrigger>
              <SelectContent>
                {STATES.map((s) => <SelectItem key={s.uf} value={s.name}>{s.name} ({s.uf})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${ids}-city`}>Cidade</Label>
            <CityInput id={`${ids}-city`} label="Cidade" cities={cities} value={city} onChange={setCity} disabled={!state} free />
            <p className="text-xs text-muted-foreground">Escolha da lista ou digite, se a cidade ainda não tiver igrejas.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${ids}-address`}>Endereço (opcional)</Label>
            <Input id={`${ids}-address`} value={address} maxLength={300} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número, bairro" />
          </div>
          {editing && (
            <div className="space-y-1.5">
              <Label htmlFor={`${ids}-reason`}>Motivo da edição (opcional)</Label>
              <Textarea id={`${ids}-reason`} rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
              <p className="text-xs text-muted-foreground">Fica registrado no log de moderação.</p>
            </div>
          )}
          {err && (
            <div role="alert" className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{err}</span>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={!valid || saving}>{saving ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
