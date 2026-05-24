import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MoreHorizontal, Archive, Eye, Reply } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";

type FeedbackStatus = "all" | "unread" | "read" | "replied" | "archived";

const CATEGORY_LABELS: Record<string, string> = {
  sugestao: "Sugestão",
  bug: "Bug",
  elogio: "Elogio",
  outro: "Outro",
};

const STATUS_LABELS: Record<string, string> = {
  unread: "Não lido",
  read: "Lido",
  replied: "Respondido",
  archived: "Arquivado",
};

async function fetchFeedback(status: FeedbackStatus) {
  let q = (supabase.from("user_feedback" as any) as any)
    .select("id, user_id, category, message, status, created_at, reply_text, replied_by, replied_at")
    .order("created_at", { ascending: false })
    .limit(300);
  if (status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export default function AdminFeedback() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<FeedbackStatus>("unread");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [replyDialog, setReplyDialog] = useState<any>(null);
  const [replyText, setReplyText] = useState("");

  const { data: sessionData } = useQuery({
    queryKey: ["session"],
    queryFn: () => supabase.auth.getSession().then((r) => r.data),
    staleTime: Infinity,
  });
  const currentUserId = sessionData?.session?.user?.id;

  const { data: feedback = [], isLoading } = useQuery({
    queryKey: ["admin-feedback", tab],
    queryFn: () => fetchFeedback(tab),
    refetchInterval: 30000,
  });

  const { data: profilesData = [] } = useQuery({
    queryKey: ["profiles-slim"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, display_name, full_name").limit(1000);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: authData = [] } = useQuery({
    queryKey: ["admin-auth-users"],
    queryFn: async () => {
      const { data } = await (supabase as any).rpc("get_users_admin");
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const profileMap = useMemo(() => {
    const map: Record<string, string> = {};
    (profilesData as any[]).forEach((p) => {
      map[p.id] = p.display_name || p.full_name || "";
    });
    return map;
  }, [profilesData]);

  const authMap = useMemo(() => {
    const map: Record<string, string> = {};
    (authData as any[]).forEach((u) => { map[u.id] = u.email || ""; });
    return map;
  }, [authData]);

  const filtered = (feedback as any[]).filter((f) =>
    categoryFilter === "all" || f.category === categoryFilter
  );

  const sendReply = useMutation({
    mutationFn: async ({ feedbackId, userId, message, feedback }: { feedbackId: string; userId: string; message: string; feedback: any }) => {
      const categoryLabel = CATEGORY_LABELS[feedback.category] || feedback.category;
      const preview = feedback.message?.slice(0, 80) + (feedback.message?.length > 80 ? "…" : "");
      const fullMessage = `Em resposta ao seu feedback (${categoryLabel}): "${preview}"\n\n${message}`;
      await supabase.from("notifications").insert({
        user_id: userId,
        message: fullMessage,
        type: "system",
        is_read: false,
      });
      await (supabase.from("user_feedback" as any) as any).update({
        status: "replied",
        reply_text: message,
        replied_by: currentUserId,
        replied_at: new Date().toISOString(),
      }).eq("id", feedbackId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-feedback"] });
      qc.invalidateQueries({ queryKey: ["admin-feedback-unread"] });
      setReplyDialog(null);
      setReplyText("");
      toast.success("Resposta enviada como notificação.");
    },
    onError: (e: any) => toast.error("Erro ao enviar: " + e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase.from("user_feedback" as any) as any)
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-feedback"] });
      qc.invalidateQueries({ queryKey: ["admin-feedback-unread"] });
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  function statusVariant(s: string): any {
    if (s === "unread") return "destructive";
    if (s === "replied") return "default";
    if (s === "archived") return "secondary";
    return "outline";
  }

  function categoryVariant(c: string): any {
    if (c === "bug") return "destructive";
    if (c === "elogio") return "default";
    return "secondary";
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Feedback de Usuários</h1>
        <p className="text-muted-foreground text-sm">Mensagens e sugestões enviadas pelos usuários do Amens</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as FeedbackStatus)}>
          <TabsList>
            <TabsTrigger value="unread">Não lidos</TabsTrigger>
            <TabsTrigger value="read">Lidos</TabsTrigger>
            <TabsTrigger value="replied">Respondidos</TabsTrigger>
            <TabsTrigger value="archived">Arquivados</TabsTrigger>
            <TabsTrigger value="all">Todos</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            <SelectItem value="sugestao">Sugestão</SelectItem>
            <SelectItem value="bug">Bug</SelectItem>
            <SelectItem value="elogio">Elogio</SelectItem>
            <SelectItem value="outro">Outro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Usuário / Login</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Mensagem / Resposta</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum feedback encontrado.</TableCell></TableRow>
            ) : filtered.map((f: any) => {
              const name = f.user_id ? (profileMap[f.user_id] || "") : "";
              const email = f.user_id ? (authMap[f.user_id] || "") : "";
              const replierEmail = f.replied_by ? (authMap[f.replied_by] || f.replied_by.slice(0, 8) + "…") : null;
              return (
                <TableRow key={f.id} className={f.status === "unread" ? "font-medium" : ""}>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {formatDistanceToNow(new Date(f.created_at), { locale: ptBR, addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-sm">
                    {f.user_id ? (
                      <div>
                        {name && <p className="leading-tight">{name}</p>}
                        <p className={`text-muted-foreground text-xs leading-tight ${!name ? "" : "mt-0.5"}`}>{email || f.user_id.slice(0, 8) + "…"}</p>
                      </div>
                    ) : "Anônimo"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={categoryVariant(f.category)}>{CATEGORY_LABELS[f.category] || f.category}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-sm">
                    <p className="line-clamp-3 whitespace-pre-wrap">{f.message}</p>
                    {f.reply_text && (
                      <div className="mt-2 p-2 bg-muted/40 rounded border-l-2 border-primary/50 text-xs">
                        <p className="text-foreground font-medium mb-0.5">
                          Resposta de {replierEmail}
                          {f.replied_at && (
                            <span className="text-muted-foreground font-normal ml-1">
                              — {format(new Date(f.replied_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                            </span>
                          )}
                        </p>
                        <p className="line-clamp-3 whitespace-pre-wrap">{f.reply_text}</p>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(f.status)}>{STATUS_LABELS[f.status] || f.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {f.user_id && (
                          <DropdownMenuItem onClick={() => { setReplyDialog(f); setReplyText(""); }}>
                            <Reply className="w-4 h-4 mr-2" /> Responder
                          </DropdownMenuItem>
                        )}
                        {f.status !== "read" && f.status !== "replied" && (
                          <DropdownMenuItem onClick={() => updateStatus.mutate({ id: f.id, status: "read" })}>
                            <Eye className="w-4 h-4 mr-2" /> Marcar como lido
                          </DropdownMenuItem>
                        )}
                        {f.status !== "archived" && (
                          <DropdownMenuItem onClick={() => updateStatus.mutate({ id: f.id, status: "archived" })}>
                            <Archive className="w-4 h-4 mr-2" /> Arquivar
                          </DropdownMenuItem>
                        )}
                        {f.status !== "unread" && (
                          <DropdownMenuItem onClick={() => updateStatus.mutate({ id: f.id, status: "unread" })}>
                            Marcar como não lido
                          </DropdownMenuItem>
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

      <p className="text-xs text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? "registro" : "registros"}. Atualiza a cada 30s.
      </p>

      <Dialog open={!!replyDialog} onOpenChange={() => setReplyDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Responder feedback</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">
            A resposta será enviada como notificação no app para o usuário.
          </p>
          {replyDialog && (
            <div className="p-3 bg-muted/40 rounded border border-border/60 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">{CATEGORY_LABELS[replyDialog.category] || replyDialog.category}</p>
              <p className="line-clamp-3">{replyDialog.message}</p>
            </div>
          )}
          <div>
            <Label>Sua resposta</Label>
            <Textarea
              className="mt-1 min-h-[100px]"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Digite sua resposta..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyDialog(null)}>Cancelar</Button>
            <Button
              onClick={() => replyDialog && sendReply.mutate({ feedbackId: replyDialog.id, userId: replyDialog.user_id, message: replyText, feedback: replyDialog })}
              disabled={!replyText.trim() || sendReply.isPending}
            >
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
