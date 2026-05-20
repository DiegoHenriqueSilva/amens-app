import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MoreHorizontal, Check, X, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Tab = "all" | "open" | "resolved" | "dismissed";

const TARGET_LABELS: Record<string, string> = {
  prayer_request: "Pedido de Oração",
  user: "Usuário",
  contribution: "Corrente de Oração",
  message: "Mensagem",
};

const CATEGORY_LABELS: Record<string, string> = {
  inappropriate: "Inapropriado",
  spam: "Spam",
  hate: "Ódio/Discriminação",
  harassment: "Assédio",
  misinformation: "Desinformação",
  other: "Outro",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Aberto",
  resolved: "Resolvido",
  dismissed: "Descartado",
};

const TAB_TOOLTIPS: Record<Tab, string> = {
  all: "Todos os reports, incluindo resolvidos e descartados",
  open: "Reports aguardando análise — requerem ação do moderador",
  resolved: "Reports que foram analisados e tiveram ação tomada",
  dismissed: "Reports descartados por não constituírem violação",
};

async function fetchReports(tab: Tab) {
  let q = supabase
    .from("prayer_reports")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  if (tab !== "all") q = q.eq("status", tab);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export default function AdminReports() {
  const { isAdmin } = useUserRole();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [resolveDialog, setResolveDialog] = useState<any>(null);
  const [resolveNotes, setResolveNotes] = useState("");

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["admin-reports", tab],
    queryFn: () => fetchReports(tab),
  });

  const { data: sessionData } = useQuery({
    queryKey: ["session"],
    queryFn: () => supabase.auth.getSession().then((r) => r.data),
    staleTime: Infinity,
  });
  const currentUserId = sessionData?.session?.user?.id;

  const filtered = reports.filter((r: any) => {
    const q = search.toLowerCase();
    return !q
      || r.description?.toLowerCase().includes(q)
      || r.category?.toLowerCase().includes(q)
      || r.resolution_notes?.toLowerCase().includes(q);
  });

  async function log(targetId: string, action: string, notes?: string) {
    const { error } = await supabase.from("moderation_logs").insert({
      moderator_id: currentUserId,
      target_type: "report",
      target_id: targetId,
      action,
      reason: notes || null,
    });
    if (error) console.warn("log insert failed:", error.message);
  }

  const resolve = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      await supabase.from("prayer_reports").update({
        status: "resolved",
        resolved_by: currentUserId,
        resolved_at: new Date().toISOString(),
        resolution_notes: notes || null,
        moderator_id: currentUserId,
      }).eq("id", id);
      await log(id, "resolve_report", notes);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
      setResolveDialog(null);
      toast.success("Report resolvido.");
    },
    onError: () => toast.error("Erro ao resolver."),
  });

  const dismiss = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("prayer_reports").update({ status: "dismissed", moderator_id: currentUserId }).eq("id", id);
      await log(id, "dismiss_report");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-reports"] }); toast.success("Report descartado."); },
  });

  const deleteReport = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("prayer_reports").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      await log(id, "soft_delete");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-reports"] }); toast.success("Report removido."); },
  });

  const deleteContent = useMutation({
    mutationFn: async (report: any) => {
      if (report.target_type === "prayer_request" && report.prayer_request_id) {
        await supabase.from("prayer_requests").update({ deleted_at: new Date().toISOString(), deleted_by: currentUserId }).eq("id", report.prayer_request_id);
        await supabase.from("moderation_logs").insert({ moderator_id: currentUserId, target_type: "prayer_request", target_id: report.prayer_request_id, action: "soft_delete", reason: "via report" });
      } else if (report.target_type === "contribution" && report.target_contribution_id) {
        await supabase.from("prayer_contributions").update({ deleted_at: new Date().toISOString(), deleted_by: currentUserId }).eq("id", report.target_contribution_id);
        await supabase.from("moderation_logs").insert({ moderator_id: currentUserId, target_type: "contribution", target_id: report.target_contribution_id, action: "soft_delete", reason: "via report" });
      } else if (report.target_type === "user" && report.target_user_id) {
        await supabase.from("profiles").update({ suspended_until: new Date(Date.now() + 7 * 86400000).toISOString() }).eq("id", report.target_user_id);
        await supabase.from("moderation_logs").insert({ moderator_id: currentUserId, target_type: "user", target_id: report.target_user_id, action: "suspend", reason: "via report" });
      }
      await supabase.from("prayer_reports").update({ status: "resolved", resolved_by: currentUserId, resolved_at: new Date().toISOString(), resolution_notes: "Conteúdo removido.", moderator_id: currentUserId }).eq("id", report.id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-reports"] }); toast.success("Conteúdo removido e report resolvido."); },
    onError: () => toast.error("Erro ao remover conteúdo."),
  });

  function statusVariant(s: string): any {
    if (s === "open") return "destructive";
    if (s === "resolved") return "default";
    return "secondary";
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground text-sm">Gerencie denúncias de usuários</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          {(["all", "open", "resolved", "dismissed"] as Tab[]).map((t) => (
            <Tooltip key={t}>
              <TooltipTrigger asChild>
                <span>
                  <TabsTrigger value={t}>
                    {{ all: "Todos", open: "Abertos", resolved: "Resolvidos", dismissed: "Descartados" }[t]}
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
        <Input className="pl-9" placeholder="Buscar descrição ou categoria..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum report encontrado.</TableCell></TableRow>
            ) : filtered.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Badge variant="outline">{TARGET_LABELS[r.target_type] || r.target_type}</Badge>
                </TableCell>
                <TableCell className="text-sm">{CATEGORY_LABELS[r.category] || r.category}</TableCell>
                <TableCell className="text-muted-foreground text-xs max-w-xs">
                  <p className="line-clamp-2">{r.description || "—"}</p>
                  {r.resolution_notes && (
                    <p className="text-primary text-xs mt-1">Resolução: {r.resolution_notes}</p>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant(r.status)}>{STATUS_LABELS[r.status] || r.status}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {formatDistanceToNow(new Date(r.created_at), { locale: ptBR, addSuffix: true })}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {r.status === "open" && (
                        <>
                          <DropdownMenuItem onClick={() => { setResolveDialog(r); setResolveNotes(""); }}>
                            <Check className="w-4 h-4 mr-2 text-green-500" /> Resolver
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deleteContent.mutate(r)}>
                            <Trash2 className="w-4 h-4 mr-2 text-destructive" /> Remover conteúdo
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => dismiss.mutate(r.id)}>
                            <X className="w-4 h-4 mr-2 text-muted-foreground" /> Descartar report
                          </DropdownMenuItem>
                        </>
                      )}
                      {isAdmin && (
                        <>
                          {r.status === "open" && <DropdownMenuSeparator />}
                          <DropdownMenuItem className="text-destructive" onClick={() => deleteReport.mutate(r.id)}>
                            Deletar report
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!resolveDialog} onOpenChange={() => setResolveDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resolver report</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Notas de resolução (opcional)</Label>
            <Textarea value={resolveNotes} onChange={(e) => setResolveNotes(e.target.value)} placeholder="Descreva a ação tomada..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialog(null)}>Cancelar</Button>
            <Button onClick={() => resolveDialog && resolve.mutate({ id: resolveDialog.id, notes: resolveNotes })} disabled={resolve.isPending}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
