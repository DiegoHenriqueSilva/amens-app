import { useState, useMemo } from "react";
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
import { MoreHorizontal, Check, X, Trash2, Search, Pencil, Ban, XCircle } from "lucide-react";
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
    .select("id, reporter_user_id, target_type, prayer_request_id, target_user_id, target_contribution_id, category, description, status, resolution_notes, created_at, deleted_at, moderator_id")
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
  const [prayerEditDialog, setPrayerEditDialog] = useState<{ report: any; prayer: any } | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editReason, setEditReason] = useState("");
  const [banConfirmReport, setBanConfirmReport] = useState<any>(null);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["admin-reports", tab],
    queryFn: () => fetchReports(tab),
  });

  const prayerIds = useMemo(
    () => (reports as any[]).filter((r) => r.prayer_request_id).map((r) => r.prayer_request_id),
    [reports]
  );

  const { data: prayersData = [] } = useQuery({
    queryKey: ["admin-report-prayers", prayerIds.join(",")],
    queryFn: async () => {
      if (!prayerIds.length) return [];
      const { data } = await supabase.from("prayer_requests").select("id, title, content").in("id", prayerIds);
      return data || [];
    },
    enabled: prayerIds.length > 0,
    staleTime: 60000,
  });

  const prayerMap = useMemo(() => {
    const map: Record<string, any> = {};
    (prayersData as any[]).forEach((p) => { map[p.id] = p; });
    return map;
  }, [prayersData]);

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

  async function notify(userId: string | null | undefined, message: string, prayerId?: string | null, type = "system") {
    if (!userId) return;
    await supabase.from("notifications").insert({
      user_id: userId,
      message,
      prayer_request_id: prayerId ?? null,
      type,
      is_read: false,
    });
  }

  function getContentOwnerId(report: any): string | null {
    if (report.target_type === "prayer_request") return report.target_user_id ?? null;
    if (report.target_type === "contribution") return report.target_user_id ?? null;
    if (report.target_type === "user") return report.target_user_id ?? null;
    return null;
  }

  const resolve = useMutation({
    mutationFn: async ({ id, notes, report }: { id: string; notes: string; report: any }) => {
      const { error } = await supabase.from("prayer_reports").update({
        status: "resolved",
        resolved_by: currentUserId,
        resolved_at: new Date().toISOString(),
        resolution_notes: notes || null,
        moderator_id: currentUserId,
      }).eq("id", id);
      if (error) throw error;
      await log(id, "resolve_report", notes);
      await notify(report.reporter_user_id, "Seu report foi analisado e resolvido. Obrigado pela contribuição.");
      const ownerId = getContentOwnerId(report);
      if (ownerId) {
        await notify(ownerId, "Seu conteúdo foi analisado por um moderador.", report.prayer_request_id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
      setResolveDialog(null);
      toast.success("Report resolvido.");
    },
    onError: (e: any) => toast.error("Erro ao resolver: " + e.message),
  });

  const dismiss = useMutation({
    mutationFn: async ({ id, report }: { id: string; report: any }) => {
      const { error } = await supabase.from("prayer_reports").update({ status: "dismissed", moderator_id: currentUserId }).eq("id", id);
      if (error) throw error;
      await log(id, "dismiss_report");
      await notify(report.reporter_user_id, "Seu report foi analisado e descartado. O conteúdo foi considerado dentro das diretrizes.");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-reports"] }); toast.success("Report descartado."); },
    onError: (e: any) => toast.error("Erro ao descartar: " + e.message),
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

  const dismissAsUnfounded = useMutation({
    mutationFn: async ({ id, report }: { id: string; report: any }) => {
      const { error } = await supabase.from("prayer_reports").update({ status: "dismissed", moderator_id: currentUserId }).eq("id", id);
      if (error) throw error;
      await log(id, "dismiss_report", "Sem fundamento");
      await notify(report.reporter_user_id, "Seu report foi analisado. O conteúdo não viola nossas diretrizes e o report foi encerrado.");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-reports"] }); toast.success("Report encerrado como sem fundamento."); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const editPrayer = useMutation({
    mutationFn: async ({ report, title, content, reason }: { report: any; title: string; content: string; reason: string }) => {
      const prayerId = report.prayer_request_id;
      const { error: pErr } = await supabase.from("prayer_requests").update({
        title: title || null,
        content,
        status: "pending_review",
        updated_at: new Date().toISOString(),
      }).eq("id", prayerId);
      if (pErr) throw pErr;
      await supabase.from("moderation_logs").insert({
        moderator_id: currentUserId,
        target_type: "prayer_request",
        target_id: prayerId,
        action: "edit_content",
        reason: reason || "via report",
      });
      const { error: rErr } = await supabase.from("prayer_reports").update({
        status: "resolved",
        resolved_by: currentUserId,
        resolved_at: new Date().toISOString(),
        resolution_notes: "Conteúdo editado pelo moderador.",
        moderator_id: currentUserId,
      }).eq("id", report.id);
      if (rErr) throw rErr;
      await log(report.id, "resolve_report", reason || "Conteúdo editado");
      await notify(report.target_user_id, "Seu pedido de oração foi editado por um moderador e aguarda nova aprovação.", prayerId, "prayer_edit_mod");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
      qc.invalidateQueries({ queryKey: ["admin-prayers"] });
      qc.invalidateQueries({ queryKey: ["admin-report-prayers"] });
      setPrayerEditDialog(null);
      toast.success("Pedido editado e enviado para revisão.");
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const banPrayer = useMutation({
    mutationFn: async ({ id, report }: { id: string; report: any }) => {
      const prayerId = report.prayer_request_id;
      const { error: pErr } = await supabase.from("prayer_requests").update({
        status: "policy_violation",
        updated_at: new Date().toISOString(),
      }).eq("id", prayerId);
      if (pErr) throw pErr;
      await supabase.from("moderation_logs").insert({
        moderator_id: currentUserId,
        target_type: "prayer_request",
        target_id: prayerId,
        action: "ban",
        reason: "via report — violação de política",
      });
      const { error: rErr } = await supabase.from("prayer_reports").update({
        status: "resolved",
        resolved_by: currentUserId,
        resolved_at: new Date().toISOString(),
        resolution_notes: "Pedido banido por violação de política.",
        moderator_id: currentUserId,
      }).eq("id", id);
      if (rErr) throw rErr;
      await log(id, "resolve_report", "Pedido banido");
      await notify(report.reporter_user_id, "Seu report foi confirmado. O conteúdo foi removido por violar nossas diretrizes.");
      await notify(report.target_user_id, "Seu pedido de oração foi removido por violar as diretrizes da plataforma.", prayerId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
      qc.invalidateQueries({ queryKey: ["admin-prayers"] });
      qc.invalidateQueries({ queryKey: ["admin-report-prayers"] });
      setBanConfirmReport(null);
      toast.success("Pedido de oração banido.");
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const reopenReport = useMutation({
    mutationFn: async (report: any) => {
      const prayerId = report.prayer_request_id;
      const notes: string = report.resolution_notes || "";
      const wasEdited = notes.includes("editado");
      const wasBanned = notes.includes("banido") || notes.includes("violação");

      if (prayerId && (wasEdited || wasBanned)) {
        const { error: pErr } = await supabase.from("prayer_requests").update({
          status: "active",
          updated_at: new Date().toISOString(),
        }).eq("id", prayerId);
        if (pErr) throw pErr;
        await supabase.from("moderation_logs").insert({
          moderator_id: currentUserId,
          target_type: "prayer_request",
          target_id: prayerId,
          action: "restore",
          reason: wasEdited ? "Restauração de edição via report" : "Restauração de banimento via report",
        });
        if (wasEdited) {
          await supabase.from("notifications").delete()
            .eq("prayer_request_id", prayerId)
            .eq("type", "prayer_edit_mod");
        }
      }

      const { error } = await supabase.from("prayer_reports").update({
        status: "open",
        resolved_by: null,
        resolved_at: null,
        resolution_notes: null,
        moderator_id: null,
      }).eq("id", report.id);
      if (error) throw error;
      await log(report.id, "restore", "Report reaberto");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
      qc.invalidateQueries({ queryKey: ["admin-prayers"] });
      qc.invalidateQueries({ queryKey: ["admin-report-prayers"] });
      toast.success("Report reaberto e ação revertida.");
    },
    onError: (e: any) => toast.error("Erro ao reabrir: " + e.message),
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
              <TableHead>Descrição / Conteúdo</TableHead>
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
            ) : filtered.map((r: any) => {
              const prayer = r.prayer_request_id ? prayerMap[r.prayer_request_id] : null;
              return (
              <TableRow key={r.id}>
                <TableCell>
                  <Badge variant="outline">{TARGET_LABELS[r.target_type] || r.target_type}</Badge>
                </TableCell>
                <TableCell className="text-sm">{CATEGORY_LABELS[r.category] || r.category}</TableCell>
                <TableCell className="text-muted-foreground text-xs max-w-xs">
                  <p className="line-clamp-2">{r.description || "—"}</p>
                  {prayer && (
                    <div className="mt-1.5 p-2 bg-muted/40 rounded border border-border/60">
                      {prayer.title && <p className="font-medium text-foreground text-xs mb-0.5">{prayer.title}</p>}
                      <p className="line-clamp-2 text-muted-foreground">{prayer.content}</p>
                    </div>
                  )}
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
                      {r.status === "open" && r.target_type === "prayer_request" && (
                        <>
                          <DropdownMenuItem onClick={() => dismissAsUnfounded.mutate({ id: r.id, report: r })}>
                            <XCircle className="w-4 h-4 mr-2 text-muted-foreground" /> Sem Fundamento
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            const prayer = r.prayer_request_id ? prayerMap[r.prayer_request_id] : null;
                            if (!prayer) { toast.error("Pedido não encontrado."); return; }
                            setPrayerEditDialog({ report: r, prayer });
                            setEditTitle(prayer.title || "");
                            setEditContent(prayer.content || "");
                            setEditReason("");
                          }}>
                            <Pencil className="w-4 h-4 mr-2" /> Editar Conteúdo
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setBanConfirmReport(r)}>
                            <Ban className="w-4 h-4 mr-2" /> Banir Pedido
                          </DropdownMenuItem>
                        </>
                      )}
                      {r.status === "open" && r.target_type !== "prayer_request" && (
                        <>
                          <DropdownMenuItem onClick={() => { setResolveDialog(r); setResolveNotes(""); }}>
                            <Check className="w-4 h-4 mr-2 text-green-500" /> Resolver
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deleteContent.mutate(r)}>
                            <Trash2 className="w-4 h-4 mr-2 text-destructive" /> Remover conteúdo
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => dismiss.mutate({ id: r.id, report: r })}>
                            <X className="w-4 h-4 mr-2 text-muted-foreground" /> Descartar report
                          </DropdownMenuItem>
                        </>
                      )}
                      {r.status !== "open" && r.target_type === "prayer_request" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => reopenReport.mutate(r)}>
                            <Check className="w-4 h-4 mr-2 text-green-500" /> Reabrir e Reverter
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
              );
            })}
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
            <Button onClick={() => resolveDialog && resolve.mutate({ id: resolveDialog.id, notes: resolveNotes, report: resolveDialog })} disabled={resolve.isPending}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!prayerEditDialog} onOpenChange={() => setPrayerEditDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Editar Pedido de Oração</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">
            Após salvar, o pedido aguardará aprovação e o report será resolvido. O autor será notificado.
          </p>
          <div className="space-y-3">
            <div>
              <Label>Título (opcional)</Label>
              <Input className="mt-1" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Título do pedido..." />
            </div>
            <div>
              <Label>Conteúdo</Label>
              <Textarea className="mt-1 min-h-[120px]" value={editContent} onChange={(e) => setEditContent(e.target.value)} />
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
            <Button variant="outline" onClick={() => setPrayerEditDialog(null)}>Cancelar</Button>
            <Button
              onClick={() => prayerEditDialog && editPrayer.mutate({ report: prayerEditDialog.report, title: editTitle, content: editContent, reason: editReason })}
              disabled={!editContent.trim() || !editReason.trim() || editPrayer.isPending}
            >
              Salvar e Resolver Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!banConfirmReport} onOpenChange={() => setBanConfirmReport(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Banir Pedido de Oração</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            O pedido será marcado como violação de política. O autor e o reporter serão notificados.
          </p>
          {banConfirmReport && prayerMap[banConfirmReport.prayer_request_id] && (
            <div className="p-3 bg-muted/40 rounded border border-border/60 text-xs">
              {prayerMap[banConfirmReport.prayer_request_id].title && (
                <p className="font-medium text-foreground mb-1">{prayerMap[banConfirmReport.prayer_request_id].title}</p>
              )}
              <p className="text-muted-foreground line-clamp-3">{prayerMap[banConfirmReport.prayer_request_id].content}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanConfirmReport(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => banConfirmReport && banPrayer.mutate({ id: banConfirmReport.id, report: banConfirmReport })}
              disabled={banPrayer.isPending}
            >
              Confirmar Banimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
