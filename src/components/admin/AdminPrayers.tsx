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
import { MoreHorizontal, Search, Undo2, Check, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Tab = "all" | "pending" | "active" | "completed";

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
  pending: "Em revisão + Violação de política — requerem ação",
  active: "Pedidos aprovados e visíveis publicamente",
  completed: "Pedidos marcados como concluídos",
};

async function fetchPrayers(tab: Tab) {
  let q = supabase
    .from("prayer_requests")
    .select("id, title, content, author_name, status, created_at, deleted_at, user_id, prayer_count")
    .order("created_at", { ascending: false })
    .limit(300);

  if (tab === "pending") q = q.in("status", ["pending_review", "policy_violation"]).is("deleted_at", null);
  else if (tab === "active") q = q.eq("status", "active").is("deleted_at", null);
  else if (tab === "completed") q = q.eq("status", "completed").is("deleted_at", null);
  // "all" — sem filtro

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export default function AdminPrayers() {
  const { isAdmin } = useUserRole();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [editDialog, setEditDialog] = useState<any>(null);
  const [editContent, setEditContent] = useState("");

  const { data: prayers = [], isLoading } = useQuery({
    queryKey: ["admin-prayers", tab],
    queryFn: () => fetchPrayers(tab),
  });

  const filtered = prayers.filter((p: any) => {
    const q = search.toLowerCase();
    return !q || p.content?.toLowerCase().includes(q) || p.title?.toLowerCase().includes(q) || p.author_name?.toLowerCase().includes(q);
  });

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
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-prayers"] }); toast.success("Status atualizado."); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const softDelete = useMutation({
    mutationFn: async ({ id, r }: { id: string; r?: string }) => {
      const { error } = await supabase.from("prayer_requests").update({ deleted_at: new Date().toISOString(), deleted_by: currentUserId }).eq("id", id);
      if (error) throw error;
      await log(id, "soft_delete", r);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-prayers"] }); toast.success("Pedido removido."); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const restore = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prayer_requests").update({ deleted_at: null, deleted_by: null }).eq("id", id);
      if (error) throw error;
      await log(id, "restore");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-prayers"] }); toast.success("Pedido restaurado."); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const saveEdit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("prayer_requests").update({ content: editContent, updated_at: new Date().toISOString() }).eq("id", editDialog.id);
      if (error) throw error;
      await log(editDialog.id, "edit_content");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-prayers"] });
      setEditDialog(null);
      toast.success("Conteúdo atualizado.");
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Pedidos de Oração</h1>
        <p className="text-muted-foreground text-sm">Modere, aprove ou remova pedidos</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          {(["all", "pending", "active", "completed"] as Tab[]).map((t) => (
            <Tooltip key={t}>
              <TooltipTrigger asChild>
                <span>
                  <TabsTrigger value={t}>
                    {{ all: "Todos", pending: "Pendentes", active: "Ativos", completed: "Concluídos" }[t]}
                  </TabsTrigger>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p className="text-xs">{TAB_TOOLTIPS[t]}</p></TooltipContent>
            </Tooltip>
          ))}
        </TabsList>
      </Tabs>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar conteúdo, título ou autor..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
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
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum pedido encontrado.</TableCell></TableRow>
            ) : filtered.map((p: any) => (
              <TableRow key={p.id} className={p.deleted_at ? "bg-muted/20" : ""}>
                <TableCell className="max-w-xs">
                  {p.title && <p className="font-medium text-sm">{p.title}</p>}
                  <p className="text-muted-foreground text-xs line-clamp-2">{p.content}</p>
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
                          <DropdownMenuItem onClick={() => { setEditDialog(p); setEditContent(p.content); }}>
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
          <DialogHeader><DialogTitle>Editar conteúdo</DialogTitle></DialogHeader>
          <Textarea className="min-h-[120px]" value={editContent} onChange={(e) => setEditContent(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>Cancelar</Button>
            <Button onClick={() => saveEdit.mutate()} disabled={saveEdit.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
