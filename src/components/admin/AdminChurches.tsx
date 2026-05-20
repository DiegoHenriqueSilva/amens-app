import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { MoreHorizontal, Plus, Search, Undo2, Check, X } from "lucide-react";
import { toast } from "sonner";

type ChurchStatus = "all" | "active" | "pending_review" | "rejected" | "deleted";

type Church = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  is_active: boolean;
  status: string;
  deleted_at: string | null;
  created_at: string;
};

const STATUS_TAB_TOOLTIPS: Record<ChurchStatus, string> = {
  all: "Todas as igrejas, incluindo removidas",
  active: "Igrejas ativas e visíveis para os usuários",
  pending_review: "Igrejas submetidas por usuários aguardando aprovação",
  rejected: "Igrejas reprovadas pela moderação",
  deleted: "Igrejas removidas (soft delete)",
};

const emptyForm = { name: "", city: "", state: "" };

async function fetchChurches(statusFilter: ChurchStatus, stateFilter: string) {
  let q = supabase
    .from("churches")
    .select("id, name, city, state, is_active, status, deleted_at, created_at")
    .order("name")
    .limit(500);

  if (statusFilter === "deleted") {
    q = q.not("deleted_at", "is", null);
  } else {
    q = q.is("deleted_at", null);
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
  }

  if (stateFilter) q = q.eq("state", stateFilter);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
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
  const [citySearch, setCitySearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ChurchStatus>("all");
  const [stateFilter, setStateFilter] = useState("");
  const [formDialog, setFormDialog] = useState<null | Partial<Church>>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: churches = [], isLoading } = useQuery({
    queryKey: ["admin-churches", statusFilter, stateFilter],
    queryFn: () => fetchChurches(statusFilter, stateFilter),
  });

  const { data: sessionData } = useQuery({
    queryKey: ["session"],
    queryFn: () => supabase.auth.getSession().then((r) => r.data),
    staleTime: Infinity,
  });
  const currentUserId = sessionData?.session?.user?.id;

  const stateOptions = [
    "Acre", "Alagoas", "Amapá", "Amazonas", "Bahia", "Ceará",
    "Distrito Federal", "Espírito Santo", "Goiás", "Maranhão",
    "Mato Grosso", "Mato Grosso do Sul", "Minas Gerais",
    "Pará", "Paraíba", "Paraná", "Pernambuco", "Piauí",
    "Rio de Janeiro", "Rio Grande do Norte", "Rio Grande do Sul",
    "Rondônia", "Roraima", "Santa Catarina", "São Paulo",
    "Sergipe", "Tocantins",
  ];

  const filtered = churches.filter((c: Church) => {
    const q = search.toLowerCase();
    const cityQ = citySearch.toLowerCase();
    const nameMatch = !q || c.name?.toLowerCase().includes(q);
    const cityMatch = !cityQ || c.city?.toLowerCase().includes(cityQ);
    return nameMatch && cityMatch;
  });

  const save = useMutation({
    mutationFn: async () => {
      if (formDialog?.id) {
        const { error } = await supabase.from("churches").update({ ...form, updated_at: new Date().toISOString() }).eq("id", formDialog.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("churches").insert({ ...form, status: "active" });
        if (error) throw error;
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
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("churches").update({ status: "active", updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-churches"] }); toast.success("Igreja aprovada."); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const reject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("churches").update({ status: "rejected", updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-churches"] }); toast.success("Igreja rejeitada."); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, current }: { id: string; current: boolean }) => {
      const { error } = await supabase.from("churches").update({ is_active: !current, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-churches"] }); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("churches").update({ deleted_at: new Date().toISOString(), deleted_by: currentUserId }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-churches"] }); toast.success("Igreja removida."); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const restore = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("churches").update({ deleted_at: null, deleted_by: null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-churches"] }); toast.success("Igreja restaurada."); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  function openCreate() {
    setForm(emptyForm);
    setFormDialog({});
  }

  function openEdit(c: Church) {
    setForm({ name: c.name, city: c.city || "", state: c.state || "" });
    setFormDialog(c);
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Igrejas</h1>
          <p className="text-muted-foreground text-sm">Gerencie as paróquias e igrejas cadastradas</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Nova Igreja
        </Button>
      </div>

      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as ChurchStatus)}>
        <TabsList>
          {(["all", "active", "pending_review", "rejected", "deleted"] as ChurchStatus[]).map((t) => (
            <Tooltip key={t}>
              <TooltipTrigger asChild>
                <span>
                  <TabsTrigger value={t}>
                    {{ all: "Todas", active: "Ativas", pending_review: "Em Revisão", rejected: "Rejeitadas", deleted: "Removidas" }[t]}
                  </TabsTrigger>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p className="text-xs">{STATUS_TAB_TOOLTIPS[t]}</p></TooltipContent>
            </Tooltip>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9 w-52" placeholder="Buscar por nome..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={stateFilter || "_all"} onValueChange={(v) => setStateFilter(v === "_all" ? "" : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todos os estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos os estados</SelectItem>
            {stateOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input className="w-44" placeholder="Filtrar por cidade..." value={citySearch} onChange={(e) => setCitySearch(e.target.value)} />
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Cidade/Estado</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhuma igreja encontrada.</TableCell></TableRow>
            ) : filtered.map((c: Church) => (
              <TableRow key={c.id} className={c.deleted_at ? "opacity-50" : ""}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{[c.city, c.state].filter(Boolean).join(", ") || "—"}</TableCell>
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
                              <DropdownMenuItem onClick={() => approve.mutate(c.id)}>
                                <Check className="w-4 h-4 mr-2 text-green-500" /> Aprovar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => reject.mutate(c.id)}>
                                <X className="w-4 h-4 mr-2 text-destructive" /> Rejeitar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem onClick={() => openEdit(c)}>Editar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleActive.mutate({ id: c.id, current: c.is_active })}>
                            {c.is_active ? "Desativar" : "Ativar"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => softDelete.mutate(c.id)}>
                            Remover
                          </DropdownMenuItem>
                        </>
                      )}
                      {c.deleted_at && (
                        <DropdownMenuItem onClick={() => restore.mutate(c.id)}>
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

      <Dialog open={formDialog !== null} onOpenChange={() => setFormDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{formDialog?.id ? "Editar igreja" : "Nova Igreja"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome da paróquia / igreja *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Paróquia Nossa Senhora Aparecida"
              />
            </div>
            <div>
              <Label>Cidade</Label>
              <Input value={form.city} onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))} />
            </div>
            <div>
              <Label>Estado</Label>
              <Input value={form.state} onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormDialog(null)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={!form.name || save.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
