import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MoreHorizontal, Search, Undo2, Check, X, ChevronDown, ChevronUp, Trash2, Filter } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Tab = "all" | "pending" | "active" | "completed" | "banned_users";

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  completed: "Concluído",
  pending_review: "Em revisão",
  policy_violation: "Violação",
  banned: "Banido",
};

function statusStyle(status: string, deleted: boolean): string {
  if (deleted) return "line-through text-muted-foreground/50";
  if (status === "active") return "text-green-600 font-medium";
  if (status === "pending_review") return "text-yellow-600 font-medium";
  if (status === "policy_violation") return "text-orange-600 font-medium";
  if (status === "banned") return "text-red-600 font-medium";
  if (status === "completed") return "text-blue-600";
  return "text-muted-foreground";
}

const TAB_TOOLTIPS: Record<Tab, string> = {
  all: "Todos os pedidos, incluindo deletados",
  pending: "Pedidos com status pending_review — aguardam aprovação do moderador. Inclui auto-escalados por reports.",
  active: "Pedidos aprovados e visíveis publicamente",
  completed: "Pedidos marcados como concluídos",
  banned_users: "Pedidos com status policy_violation (ação de moderação tomada) + todos os pedidos de usuários banidos.",
};

const PRAYER_BASE_SELECT = "id, title, content, author_name, status, created_at, deleted_at, user_id, prayer_count";

async function fetchPrayers(tab: Tab, bannedUserIds?: string[]) {
  if (tab === "banned_users") {
    const queries: Promise<any>[] = [
      supabase.from("prayer_requests")
        .select(PRAYER_BASE_SELECT)
        .eq("status", "policy_violation")
        .order("created_at", { ascending: false })
        .limit(300),
    ];
    if (bannedUserIds && bannedUserIds.length > 0) {
      queries.push(
        supabase.from("prayer_requests")
          .select(PRAYER_BASE_SELECT)
          .in("user_id", bannedUserIds)
          .order("created_at", { ascending: false })
          .limit(300)
      );
    }
    const results = await Promise.all(queries);
    const seen = new Set<string>();
    const merged: any[] = [];
    results.forEach((res) => {
      (res.data || []).forEach((r: any) => {
        if (!seen.has(r.id)) { seen.add(r.id); merged.push(r); }
      });
    });
    return merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  let q = supabase
    .from("prayer_requests")
    .select(PRAYER_BASE_SELECT)
    .order("created_at", { ascending: false })
    .limit(300);

  if (tab === "pending") q = q.eq("status", "pending_review").is("deleted_at", null);
  else if (tab === "active") q = q.eq("status", "active").is("deleted_at", null);
  else if (tab === "completed") q = q.eq("status", "completed").is("deleted_at", null);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

function ExpandableContent({ title, content }: { title?: string | null; content?: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = (content?.length ?? 0) > 120;

  return (
    <div style={{ width: "280px", wordBreak: "break-word" }}>
      {title && <p className="font-medium text-sm mb-0.5">{title}</p>}
      <p className={`text-muted-foreground text-xs whitespace-pre-wrap ${!expanded && isLong ? "line-clamp-2" : ""}`}>
        {content}
      </p>
      {isLong && (
        <button
          className="text-[10px] text-primary flex items-center gap-0.5 mt-1 hover:underline"
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
        >
          {expanded ? <><ChevronUp className="w-3 h-3" /> Ver menos</> : <><ChevronDown className="w-3 h-3" /> Ver mais</>}
        </button>
      )}
    </div>
  );
}

export default function AdminPrayers() {
  const { isAdmin } = useUserRole();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editDialog, setEditDialog] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editReason, setEditReason] = useState("");

  const { data: bannedProfiles = [] } = useQuery({
    queryKey: ["banned-profiles-ids"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .not("deleted_at", "is", null)
        .limit(500);
      return (data || []).map((p: any) => p.id);
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: prayers = [], isLoading } = useQuery({
    queryKey: ["admin-prayers", tab, bannedProfiles],
    queryFn: () => fetchPrayers(tab, bannedProfiles as string[]),
  });

  const filtered = prayers.filter((p: any) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || p.content?.toLowerCase().includes(q) || p.title?.toLowerCase().includes(q) || p.author_name?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" ? true : statusFilter === "deleted" ? !!p.deleted_at : p.status === statusFilter && !p.deleted_at;
    return matchesSearch && matchesStatus;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length && filtered.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((p: any) => p.id));
    }
  };

  const { data: sessionData } = useQuery({
    queryKey: ["session"],
    queryFn: () => supabase.auth.getSession().then((r) => r.data),
    staleTime: Infinity,
  });
  const currentUserId = sessionData?.session?.user?.id;

  async function log(targetId: string, action: string, r?: string) {
    const { error } = await supabase.from("moderation_logs").insert({
      moderator_id: currentUserId,
      target_type: "prayer_request",
      target_id: targetId,
      action,
      reason: r || null,
    });
    if (error) console.warn("log insert failed:", error.message);
  }

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, r }: { id: string; status: string; r?: string }) => {
      const { error } = await supabase.from("prayer_requests").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      await log(id, status === "active" ? "approve" : "reject", r);
      if (status === "active") {
        await supabase.from("prayer_reports")
          .update({ status: "open", resolved_by: null, resolved_at: null, resolution_notes: null, moderator_id: null })
          .eq("prayer_request_id", id)
          .eq("status", "resolved")
          .or("resolution_notes.ilike.%editado%,resolution_notes.ilike.%banido%,resolution_notes.ilike.%violação%");
        await supabase.from("notifications").delete()
          .eq("prayer_request_id", id)
          .eq("type", "prayer_edit_mod");
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-prayers"] }); qc.invalidateQueries({ queryKey: ["admin-reports"] }); toast.success("Status atualizado."); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const softDelete = useMutation({
    mutationFn: async ({ id, r }: { id: string; r?: string }) => {
      const { error } = await supabase.from("prayer_requests").update({ deleted_at: new Date().toISOString(), deleted_by: currentUserId }).eq("id", id);
      if (error) throw error;
      await log(id, "soft_delete", r);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-prayers"] }); qc.invalidateQueries({ queryKey: ["admin-reports"] }); toast.success("Pedido removido."); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const restore = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prayer_requests").update({ deleted_at: null, deleted_by: null }).eq("id", id);
      if (error) throw error;
      await log(id, "restore");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-prayers"] }); qc.invalidateQueries({ queryKey: ["admin-reports"] }); toast.success("Pedido restaurado."); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const saveEdit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("prayer_requests")
        .update({
          title: editTitle || null,
          content: editContent,
          status: "pending_review",
          updated_at: new Date().toISOString(),
        })
        .eq("id", editDialog.id);
      if (error) throw error;
      await log(editDialog.id, "edit_content", editReason || undefined);
      if (editDialog.user_id) {
        await supabase.from("notifications").insert({
          user_id: editDialog.user_id,
          message: "Seu pedido de oração foi editado pelo moderador e aguarda nova aprovação.",
          prayer_request_id: editDialog.id,
          type: "prayer_edit_mod",
          is_read: false,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-prayers"] });
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
      setEditDialog(null);
      toast.success("Conteúdo atualizado. Pedido enviado para revisão.");
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const bulkUpdateStatus = useMutation({
    mutationFn: async ({ ids, status, reason }: { ids: string[]; status: string; reason?: string }) => {
      const updatedAt = new Date().toISOString();
      const { error } = await supabase
        .from("prayer_requests")
        .update({ status, updated_at: updatedAt })
        .in("id", ids);
      if (error) throw error;

      await Promise.all(ids.map((id) => log(id, status === "active" ? "approve" : "reject", reason)));
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["admin-prayers"] });
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
      setSelectedIds([]);
      toast.success(`${variables.ids.length} pedidos atualizados com sucesso!`);
    },
    onError: (e: any) => toast.error("Erro na ação em massa: " + e.message),
  });

  const bulkSoftDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      const deletedAt = new Date().toISOString();
      const { error } = await supabase
        .from("prayer_requests")
        .update({ deleted_at: deletedAt, deleted_by: currentUserId })
        .in("id", ids);
      if (error) throw error;

      await Promise.all(ids.map((id) => log(id, "soft_delete")));
    },
    onSuccess: (_, ids) => {
      qc.invalidateQueries({ queryKey: ["admin-prayers"] });
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
      setSelectedIds([]);
      toast.success(`${ids.length} pedidos removidos com sucesso.`);
    },
    onError: (e: any) => toast.error("Erro ao remover pedidos: " + e.message),
  });

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Pedidos de Oração</h1>
        <p className="text-muted-foreground text-sm">Modere, aprove ou remova pedidos</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v as Tab); setSelectedIds([]); }}>
        <TabsList>
          {(["all", "pending", "active", "completed", "banned_users"] as Tab[]).map((t) => (
            <Tooltip key={t}>
              <TooltipTrigger asChild>
                <span>
                  <TabsTrigger value={t}>
                    {{ all: "Todos", pending: "Pendentes", active: "Ativos", completed: "Concluídos", banned_users: "Banidos" }[t]}
                  </TabsTrigger>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p className="text-xs">{TAB_TOOLTIPS[t]}</p></TooltipContent>
            </Tooltip>
          ))}
        </TabsList>
      </Tabs>

      {/* Barra de Filtros: Busca textual + Filtro de status */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            className="pl-9" 
            placeholder="Buscar conteúdo, título ou autor..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground hidden sm:inline" />
          <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setSelectedIds([]); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">🟢 Ativos</SelectItem>
              <SelectItem value="pending_review">🟡 Em revisão</SelectItem>
              <SelectItem value="policy_violation">🟠 Violação</SelectItem>
              <SelectItem value="completed">🔵 Concluídos</SelectItem>
              <SelectItem value="deleted">⚪ Deletados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Barra Flutuante de Ações em Massa */}
      {selectedIds.length > 0 && (
        <div className="bg-primary/10 border border-primary/20 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-sm">
              {selectedIds.length} selecionado{selectedIds.length > 1 ? "s" : ""}
            </span>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])} className="text-xs h-8">
              Desmarcar todos
            </Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white text-xs h-8 shadow-sm"
              disabled={bulkUpdateStatus.isPending}
              onClick={() => bulkUpdateStatus.mutate({ ids: selectedIds, status: "active" })}
            >
              <Check className="w-3.5 h-3.5 mr-1" /> Aprovar Selecionados
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-orange-500 text-orange-600 hover:bg-orange-50 text-xs h-8"
              disabled={bulkUpdateStatus.isPending}
              onClick={() => bulkUpdateStatus.mutate({ ids: selectedIds, status: "policy_violation" })}
            >
              <X className="w-3.5 h-3.5 mr-1" /> Marcar Violação
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="text-xs h-8"
              disabled={bulkSoftDelete.isPending}
              onClick={() => bulkSoftDelete.mutate(selectedIds)}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Remover Selecionados
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded cursor-pointer accent-primary" 
                  checked={selectedIds.length === filtered.length && filtered.length > 0} 
                  onChange={toggleSelectAll} 
                  title="Selecionar todos os filtrados"
                />
              </TableHead>
              <TableHead>Conteúdo</TableHead>
              <TableHead>Autor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Orações</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum pedido encontrado.</TableCell></TableRow>
            ) : filtered.map((p: any) => (
              <TableRow key={p.id} className={p.deleted_at ? "bg-muted/20" : selectedIds.includes(p.id) ? "bg-primary/5" : ""}>
                <TableCell className="w-12 text-center align-top pt-4">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded cursor-pointer accent-primary" 
                    checked={selectedIds.includes(p.id)} 
                    onChange={() => toggleSelect(p.id)} 
                  />
                </TableCell>
                <TableCell className="align-top">
                  <ExpandableContent title={p.title} content={p.content} />
                </TableCell>
                <TableCell className="text-sm">{p.author_name || "Anônimo"}</TableCell>
                <TableCell>
                  <span className={`text-sm ${statusStyle(p.status, !!p.deleted_at)}`}>
                    {p.deleted_at ? "Deletado" : (STATUS_LABELS[p.status] || p.status)}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.prayer_count}</TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {formatDistanceToNow(new Date(p.created_at), { locale: ptBR, addSuffix: true })}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!p.deleted_at && (
                        <>
                          {p.status !== "active" && (
                            <DropdownMenuItem onClick={() => updateStatus.mutate({ id: p.id, status: "active" })}>
                              <Check className="w-4 h-4 mr-2 text-green-500" /> Aprovar
                            </DropdownMenuItem>
                          )}
                          {p.status !== "policy_violation" && (
                            <DropdownMenuItem onClick={() => updateStatus.mutate({ id: p.id, status: "policy_violation" })}>
                              <X className="w-4 h-4 mr-2 text-orange-500" /> Marcar violação
                            </DropdownMenuItem>
                          )}
                          {p.status !== "pending_review" && (
                            <DropdownMenuItem onClick={() => updateStatus.mutate({ id: p.id, status: "pending_review" })}>
                              Colocar em revisão
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => { setEditDialog(p); setEditTitle(p.title || ""); setEditContent(p.content || ""); setEditReason(""); }}>
                            Editar conteúdo
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => softDelete.mutate({ id: p.id })}>
                            Remover (soft delete)
                          </DropdownMenuItem>
                        </>
                      )}
                      {p.deleted_at && (
                        <DropdownMenuItem onClick={() => restore.mutate(p.id)}>
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

      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar pedido de oração</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">
            Após salvar, o pedido voltará para revisão e o autor será notificado.
          </p>
          <div className="space-y-3">
            <div>
              <Label>Título (opcional)</Label>
              <Input
                className="mt-1"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Título do pedido..."
              />
            </div>
            <div>
              <Label>Conteúdo</Label>
              <Textarea
                className="mt-1 min-h-[120px]"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
              />
            </div>
            <div>
              <Label>Motivo da edição *</Label>
              <Textarea
                className="mt-1 min-h-[70px]"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="Descreva o motivo da edição para os logs de moderação..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>Cancelar</Button>
            <Button onClick={() => saveEdit.mutate()} disabled={!editContent || !editReason.trim() || saveEdit.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
