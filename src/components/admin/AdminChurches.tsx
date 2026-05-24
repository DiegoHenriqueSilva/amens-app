import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import { MoreHorizontal, Plus, Search, Undo2, Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

type ChurchStatus = "all" | "active" | "inactive" | "pending_review" | "archived" | "duplicates";

type Church = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  is_active: boolean;
  status: string;
  source: string | null;
  deleted_at: string | null;
  created_at: string;
};

const PAGE_SIZE = 30;

const STATUS_TAB_TOOLTIPS: Record<ChurchStatus, string> = {
  all: "Todas as igrejas, incluindo removidas e rejeitadas",
  active: "Igrejas ativas e visíveis para os usuários (is_active = true, status = active)",
  inactive: "Igrejas desativadas (is_active = false, status = active), mas não removidas",
  pending_review: "Igrejas submetidas por usuários aguardando aprovação",
  archived: "Igrejas rejeitadas (status = rejected) ou removidas (deleted_at IS NOT NULL)",
  duplicates: "Igrejas que possuem outra com mesmo nome, cidade e estado",
};

const STATE_OPTIONS = [
  "Acre", "Alagoas", "Amapá", "Amazonas", "Bahia", "Ceará",
  "Distrito Federal", "Espírito Santo", "Goiás", "Maranhão",
  "Mato Grosso", "Mato Grosso do Sul", "Minas Gerais",
  "Pará", "Paraíba", "Paraná", "Pernambuco", "Piauí",
  "Rio de Janeiro", "Rio Grande do Norte", "Rio Grande do Sul",
  "Rondônia", "Roraima", "Santa Catarina", "São Paulo",
  "Sergipe", "Tocantins",
];

const emptyForm = { name: "", city: "", state: "" };

function normalizeChurchName(name: string): string {
  if (!name) return name;
  const particles = new Set(["de", "da", "do", "das", "dos", "e", "em", "a", "o", "as", "os", "na", "no", "nas", "nos", "ao", "aos"]);
  const str = name.trim().replace(/\s+/g, " ");
  const normalized = str.toLowerCase().split(" ").map((w, i) => {
    if (i > 0 && particles.has(w)) return w;
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(" ");
  return normalized
    .replace(/par[oó]quia/gi, "Paróquia")
    .replace(/parroquia/gi, "Paróquia");
}

function applyFilters(q: any, stateFilter: string, cityFilter: string, search: string, sourceFilter: string) {
  if (stateFilter) q = q.eq("state", stateFilter);
  if (cityFilter) q = q.eq("city", cityFilter);
  if (sourceFilter) q = q.eq("source", sourceFilter);
  if (search) q = q.or(`name.ilike.%${search}%,city.ilike.%${search}%,state.ilike.%${search}%`);
  return q;
}

async function fetchChurches(
  statusFilter: ChurchStatus,
  stateFilter: string,
  cityFilter: string,
  search: string,
  page: number,
  sourceFilter = ""
): Promise<{ data: Church[]; count: number }> {
  const offset = (page - 1) * PAGE_SIZE;
  const baseSelect = "id, name, city, state, is_active, status, source, deleted_at, created_at";

  if (statusFilter === "duplicates") {
    const { data, error } = await (supabase as any).rpc("get_duplicate_churches");
    if (error) throw error;
    let rows = (data || []) as Church[];
    if (stateFilter) rows = rows.filter((r) => r.state === stateFilter);
    if (cityFilter) rows = rows.filter((r) => r.city === cityFilter);
    if (sourceFilter) rows = rows.filter((r) => (r.source ?? "import") === sourceFilter);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((r) =>
        r.name?.toLowerCase().includes(q) ||
        r.city?.toLowerCase().includes(q) ||
        r.state?.toLowerCase().includes(q)
      );
    }
    return { data: rows.slice(offset, offset + PAGE_SIZE), count: rows.length };
  }

  if (statusFilter === "archived") {
    const [rejRes, delRes] = await Promise.all([
      applyFilters(
        supabase.from("churches").select(baseSelect).eq("status", "rejected").is("deleted_at", null).order("state").order("name"),
        stateFilter, cityFilter, search, sourceFilter
      ).limit(500),
      applyFilters(
        supabase.from("churches").select(baseSelect).not("deleted_at", "is", null).order("state").order("name"),
        stateFilter, cityFilter, search, sourceFilter
      ).limit(500),
    ]);
    const seen = new Set<string>();
    const combined: Church[] = [];
    [...(rejRes.data || []), ...(delRes.data || [])].forEach((r) => {
      if (!seen.has(r.id)) { seen.add(r.id); combined.push(r as Church); }
    });
    combined.sort((a, b) => {
      const s = (a.state ?? "").localeCompare(b.state ?? "", "pt-BR");
      if (s !== 0) return s;
      return (a.name ?? "").localeCompare(b.name ?? "", "pt-BR");
    });
    return { data: combined.slice(offset, offset + PAGE_SIZE), count: combined.length };
  }

  let q = supabase
    .from("churches")
    .select(baseSelect, { count: "exact" })
    .order("state", { ascending: true })
    .order("city", { ascending: true })
    .order("name", { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1);

  if (statusFilter === "inactive") {
    q = q.is("deleted_at", null).eq("is_active", false).eq("status", "active");
  } else if (statusFilter === "active") {
    q = q.is("deleted_at", null).eq("status", "active").eq("is_active", true);
  } else if (statusFilter === "pending_review") {
    q = q.is("deleted_at", null).eq("status", "pending_review");
  }

  q = applyFilters(q, stateFilter, cityFilter, search, sourceFilter);

  const { data, count, error } = await q;
  if (error) throw error;
  return { data: (data || []) as Church[], count: count ?? 0 };
}

async function fetchCities(stateFilter: string): Promise<string[]> {
  if (!stateFilter) return [];
  try {
    const { data, error } = await (supabase as any).rpc("get_church_cities", { state_name: stateFilter });
    if (!error && data) {
      return (data as any[]).map((r) => r.city || r).filter(Boolean) as string[];
    }
  } catch {}
  const { data } = await supabase
    .from("churches")
    .select("city")
    .eq("state", stateFilter)
    .is("deleted_at", null)
    .not("city", "is", null)
    .order("city")
    .limit(500);
  const unique = [...new Set((data || []).map((r: any) => r.city).filter(Boolean))] as string[];
  return unique.sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function CitySearchInput({
  cities,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  cities: string[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setText(value); }, [value]);

  const suggestions = text.length >= 3
    ? cities.filter((c) => c.toLowerCase().includes(text.toLowerCase())).slice(0, 25)
    : [];

  function handleSelect(city: string) {
    onChange(city);
    setText(city);
    setOpen(false);
  }

  function handleChange(v: string) {
    setText(v);
    if (value) onChange("");
    setOpen(true);
  }

  function handleBlur(e: React.FocusEvent) {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setOpen(false);
      if (!value) setText("");
    }
  }

  return (
    <div ref={containerRef} className="relative w-44" onBlur={handleBlur}>
      <Input
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => text.length >= 3 && setOpen(true)}
        placeholder={disabled ? "Selecione um estado" : (placeholder ?? "Digite 3+ letras...")}
        disabled={disabled}
        className="w-full pr-6"
      />
      {value && !disabled && (
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={() => { onChange(""); setText(""); setOpen(false); }}
          tabIndex={-1}
        >
          <X className="w-3 h-3" />
        </button>
      )}
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto">
          {suggestions.map((city) => (
            <button
              key={city}
              type="button"
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(city)}
            >
              {city}
            </button>
          ))}
        </div>
      )}
      {open && text.length >= 3 && suggestions.length === 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-popover border border-border rounded-md shadow-md px-3 py-2 text-xs text-muted-foreground">
          Nenhuma cidade encontrada
        </div>
      )}
    </div>
  );
}

const SOURCE_LABELS: Record<string, string> = {
  import: "Importada",
  app: "Usuário",
};

function sourceBadge(source: string | null) {
  if (!source || source === "import") {
    return <Badge variant="secondary" className="text-xs font-normal">Importada</Badge>;
  }
  return <Badge variant="outline" className="text-xs font-normal">Usuário</Badge>;
}

function statusBadge(c: Church) {
  if (c.deleted_at) return <Badge variant="destructive">Removida</Badge>;
  if (c.status === "pending_review") return <Badge variant="secondary">Em Revisão</Badge>;
  if (c.status === "rejected") return <Badge variant="outline" className="text-destructive border-destructive/30">Rejeitada</Badge>;
  return c.is_active
    ? <Badge variant="default">Ativa</Badge>
    : <Badge variant="secondary">Inativa</Badge>;
}

export default function AdminChurches() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ChurchStatus>("all");
  const [stateFilter, setStateFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [page, setPage] = useState(1);
  const [formDialog, setFormDialog] = useState<null | Partial<Church>>(null);
  const [form, setForm] = useState(emptyForm);
  const [resolveConfirm, setResolveConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    church: Church;
    type: "approve" | "reject" | "activate" | "deactivate" | "remove" | "restore";
    label: string;
  } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [editReason, setEditReason] = useState("");

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [statusFilter, stateFilter, cityFilter, sourceFilter]);

  const { data: churchResult, isLoading } = useQuery({
    queryKey: ["admin-churches", statusFilter, stateFilter, cityFilter, sourceFilter, debouncedSearch, page],
    queryFn: () => fetchChurches(statusFilter, stateFilter, cityFilter, debouncedSearch, page, sourceFilter),
    placeholderData: (prev) => prev,
  });

  const churches = churchResult?.data ?? [];
  const totalCount = churchResult?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const { data: filterCities = [] } = useQuery({
    queryKey: ["admin-church-cities", stateFilter],
    queryFn: () => fetchCities(stateFilter),
    enabled: !!stateFilter,
    staleTime: 2 * 60 * 1000,
  });

  const { data: formCities = [] } = useQuery({
    queryKey: ["admin-church-cities", form.state],
    queryFn: () => fetchCities(form.state),
    enabled: !!form.state,
    staleTime: 2 * 60 * 1000,
  });

  const { data: sessionData } = useQuery({
    queryKey: ["session"],
    queryFn: () => supabase.auth.getSession().then((r) => r.data),
    staleTime: Infinity,
  });
  const currentUserId = sessionData?.session?.user?.id;

  async function logChurch(targetId: string, action: string, reason?: string) {
    await supabase.from("moderation_logs").insert({
      moderator_id: currentUserId,
      target_type: "church",
      target_id: targetId,
      action,
      reason: reason || null,
    });
  }

  const save = useMutation({
    mutationFn: async () => {
      const normalized = { ...form, name: normalizeChurchName(form.name) };
      if (formDialog?.id) {
        const { error } = await supabase.from("churches").update({ ...normalized, updated_at: new Date().toISOString() }).eq("id", formDialog.id);
        if (error) throw error;
        await logChurch(formDialog.id, "edit_content", editReason || undefined);
      } else {
        const { data, error } = await supabase.from("churches").insert({ ...normalized, status: "active", source: "app" }).select("id").single();
        if (error) throw error;
        if (data) await logChurch(data.id, "create");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-churches"] });
      setFormDialog(null);
      toast.success(formDialog?.id ? "Igreja atualizada." : "Igreja criada.");
    },
    onError: (e: any) => toast.error("Erro ao salvar: " + e.message),
  });

  const approve = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { error } = await supabase.from("churches").update({ status: "active", updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      await logChurch(id, "approve", reason);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-churches"] }); setPendingAction(null); toast.success("Igreja aprovada."); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const reject = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { error } = await supabase.from("churches").update({ status: "rejected", updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      await logChurch(id, "reject", reason);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-churches"] }); setPendingAction(null); toast.success("Igreja rejeitada."); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, current, reason }: { id: string; current: boolean; reason?: string }) => {
      const { error } = await supabase.from("churches").update({ is_active: !current, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      await logChurch(id, current ? "deactivate" : "activate", reason);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-churches"] }); setPendingAction(null); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const softDelete = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { error } = await supabase.from("churches").update({ deleted_at: new Date().toISOString(), deleted_by: currentUserId }).eq("id", id);
      if (error) throw error;
      await logChurch(id, "soft_delete", reason);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-churches"] }); setPendingAction(null); toast.success("Igreja removida."); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const restore = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { error } = await supabase.from("churches").update({ deleted_at: null, deleted_by: null }).eq("id", id);
      if (error) throw error;
      await logChurch(id, "restore", reason);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-churches"] }); setPendingAction(null); toast.success("Igreja restaurada."); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const resolveAllDuplicates = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_duplicate_churches");
      if (error) throw error;
      const rows = (data || []) as Church[];

      const groups: Record<string, Church[]> = {};
      rows.forEach((c) => {
        const key = `${c.name}|${c.city ?? ""}|${c.state ?? ""}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(c);
      });

      const toDeactivate: string[] = [];
      Object.values(groups).forEach((group) => {
        const nonDeleted = group.filter((c) => !c.deleted_at);
        if (nonDeleted.length <= 1) return;
        const sorted = [...nonDeleted].sort((a, b) => {
          const score = (c: Church) =>
            (c.is_active ? 0 : 2) + (c.status === "active" ? 0 : 1);
          const diff = score(a) - score(b);
          if (diff !== 0) return diff;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
        sorted.slice(1).filter((c) => c.is_active).forEach((c) => toDeactivate.push(c.id));
      });

      if (toDeactivate.length === 0) return 0;
      for (let i = 0; i < toDeactivate.length; i += 100) {
        const batch = toDeactivate.slice(i, i + 100);
        const { error: err } = await supabase
          .from("churches")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .in("id", batch);
        if (err) throw err;
      }
      await Promise.all(toDeactivate.map((id) => logChurch(id, "deactivate", "Resolver duplicatas")));
      return toDeactivate.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["admin-churches"] });
      setResolveConfirm(false);
      toast.success(`${count} igrejas inativadas. Um registro ativo mantido por grupo.`);
    },
    onError: (e: any) => { toast.error("Erro: " + e.message); setResolveConfirm(false); },
  });

  function openCreate() { setForm(emptyForm); setFormDialog({}); }
  function openEdit(c: Church) { setForm({ name: c.name, city: c.city || "", state: c.state || "" }); setFormDialog(c); setEditReason(""); }

  function executeAction() {
    if (!pendingAction) return;
    const { church, type } = pendingAction;
    const reason = actionReason || undefined;
    if (type === "approve") approve.mutate({ id: church.id, reason });
    else if (type === "reject") reject.mutate({ id: church.id, reason });
    else if (type === "activate") toggleActive.mutate({ id: church.id, current: false, reason });
    else if (type === "deactivate") toggleActive.mutate({ id: church.id, current: true, reason });
    else if (type === "remove") softDelete.mutate({ id: church.id, reason });
    else if (type === "restore") restore.mutate({ id: church.id, reason });
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Igrejas</h1>
          <p className="text-muted-foreground text-sm">Gerencie as paróquias e igrejas cadastradas</p>
        </div>
        <div className="flex gap-2">
          {statusFilter === "duplicates" && totalCount > 0 && (
            <Button size="sm" variant="outline" onClick={() => setResolveConfirm(true)}>
              Resolver todas
            </Button>
          )}
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Nova Igreja
          </Button>
        </div>
      </div>

      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as ChurchStatus)}>
        <TabsList>
          {(["all", "active", "inactive", "pending_review", "archived", "duplicates"] as ChurchStatus[]).map((t) => (
            <Tooltip key={t}>
              <TooltipTrigger asChild>
                <span>
                  <TabsTrigger value={t}>
                    {{ all: "Todas", active: "Ativas", inactive: "Inativas", pending_review: "Em Revisão", archived: "Arquivadas", duplicates: "Duplicatas" }[t]}
                  </TabsTrigger>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p className="text-xs">{STATUS_TAB_TOOLTIPS[t]}</p></TooltipContent>
            </Tooltip>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar nome, cidade ou estado..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={stateFilter || "_all"}
          onValueChange={(v) => { setStateFilter(v === "_all" ? "" : v); setCityFilter(""); }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todos os estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos os estados</SelectItem>
            {STATE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <CitySearchInput
          cities={filterCities as string[]}
          value={cityFilter}
          onChange={setCityFilter}
          disabled={!stateFilter}
        />
        <Select value={sourceFilter || "_all"} onValueChange={(v) => setSourceFilter(v === "_all" ? "" : v)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todas origens</SelectItem>
            <SelectItem value="import">Importada</SelectItem>
            <SelectItem value="app">Usuário</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Estado</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : churches.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma igreja encontrada.</TableCell></TableRow>
            ) : churches.map((c: Church) => (
              <TableRow key={c.id} className={c.deleted_at ? "opacity-50" : ""}>
                <TableCell className="text-muted-foreground text-sm">{c.state || "—"}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{c.city || "—"}</TableCell>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{sourceBadge(c.source)}</TableCell>
                <TableCell>{statusBadge(c)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!c.deleted_at && (
                        <>
                          {c.status === "pending_review" && (
                            <>
                              <DropdownMenuItem onClick={() => { setPendingAction({ church: c, type: "approve", label: "Aprovar Igreja" }); setActionReason(""); }}>
                                <Check className="w-4 h-4 mr-2 text-green-500" /> Aprovar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setPendingAction({ church: c, type: "reject", label: "Rejeitar Igreja" }); setActionReason(""); }}>
                                <X className="w-4 h-4 mr-2 text-destructive" /> Rejeitar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem onClick={() => openEdit(c)}>Editar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setPendingAction({ church: c, type: c.is_active ? "deactivate" : "activate", label: c.is_active ? "Desativar Igreja" : "Ativar Igreja" }); setActionReason(""); }}>
                            {c.is_active ? "Desativar" : "Ativar"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => { setPendingAction({ church: c, type: "remove", label: "Remover Igreja" }); setActionReason(""); }}>
                            Remover
                          </DropdownMenuItem>
                        </>
                      )}
                      {c.deleted_at && (
                        <DropdownMenuItem onClick={() => { setPendingAction({ church: c, type: "restore", label: "Restaurar Igreja" }); setActionReason(""); }}>
                          <Undo2 className="w-4 h-4 mr-2" /> Restaurar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {totalCount > 0
            ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, totalCount)} de ${totalCount} igrejas`
            : "Nenhuma igreja"}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="px-2">Página {page} de {totalPages}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Dialog open={resolveConfirm} onOpenChange={setResolveConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolver todas as duplicatas?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Para cada grupo com o mesmo nome, cidade e estado, será mantido{" "}
            <strong>apenas um registro ativo</strong> (o mais antigo com status ativo).
            Os demais serão <strong>inativados</strong> (não removidos).
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveConfirm(false)}>Cancelar</Button>
            <Button onClick={() => resolveAllDuplicates.mutate()} disabled={resolveAllDuplicates.isPending}>
              {resolveAllDuplicates.isPending ? "Processando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingAction} onOpenChange={() => setPendingAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pendingAction?.label}</DialogTitle>
          </DialogHeader>
          {pendingAction && (
            <p className="text-sm text-muted-foreground">
              {pendingAction.church.name}
              {pendingAction.church.city ? ` — ${pendingAction.church.city}/${pendingAction.church.state}` : ""}
            </p>
          )}
          <div className="space-y-1">
            <Label>Motivo / Justificativa</Label>
            <Textarea
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="Opcional — aparecerá nos logs de moderação"
              className="min-h-[80px]"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingAction(null)}>Cancelar</Button>
            <Button
              variant={pendingAction?.type === "remove" || pendingAction?.type === "reject" ? "destructive" : "default"}
              onClick={executeAction}
              disabled={approve.isPending || reject.isPending || toggleActive.isPending || softDelete.isPending || restore.isPending}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={formDialog !== null} onOpenChange={() => setFormDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{formDialog?.id ? "Editar igreja" : "Nova Igreja"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome da paróquia / igreja *</Label>
              <Input
                className="mt-1"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Paróquia Nossa Senhora Aparecida"
              />
            </div>
            <div>
              <Label>Estado</Label>
              <Select
                value={form.state || "_none"}
                onValueChange={(v) => setForm((prev) => ({ ...prev, state: v === "_none" ? "" : v, city: "" }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione o estado..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— Nenhum —</SelectItem>
                  {STATE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cidade</Label>
              <div className="mt-1">
                <CitySearchInput
                  cities={formCities as string[]}
                  value={form.city}
                  onChange={(v) => setForm((prev) => ({ ...prev, city: v }))}
                  disabled={!form.state}
                  placeholder={form.state ? "Digite 3+ letras para buscar..." : "Selecione um estado primeiro"}
                />
              </div>
              {form.state && !form.city && (
                <p className="text-xs text-muted-foreground mt-1">
                  Ou digite manualmente se a cidade não aparecer.
                </p>
              )}
            </div>
          </div>
          {formDialog?.id && (
            <div>
              <Label>Motivo da edição</Label>
              <Textarea
                className="mt-1 min-h-[70px]"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="Opcional — aparecerá nos logs de moderação"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormDialog(null)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={!form.name || save.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
