import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ACTION_LABELS: Record<string, string> = {
  soft_delete: "Deletado",
  restore: "Restaurado",
  suspend: "Suspenso",
  unsuspend: "Suspensão removida",
  ban: "Banido",
  approve: "Aprovado",
  reject: "Rejeitado",
  resolve_report: "Report resolvido",
  dismiss_report: "Report descartado",
  role_assign: "Role atribuída",
  role_revoke: "Role revogada",
  edit_content: "Conteúdo editado",
  create: "Criado",
  activate: "Ativado",
  deactivate: "Inativado",
  xp_override: "XP alterado",
  xp_multiplier: "Multiplicador XP",
};

const TARGET_LABELS: Record<string, string> = {
  prayer_request: "Pedido de Oração",
  user: "Usuário",
  report: "Report",
  church: "Igreja",
  contribution: "Corrente de Oração",
};

async function fetchLogs(targetType: string, action: string) {
  let q = supabase
    .from("moderation_logs")
    .select("id, created_at, moderator_id, target_type, target_id, action, reason")
    .order("created_at", { ascending: false })
    .limit(500);

  if (targetType !== "all") q = q.eq("target_type", targetType);
  if (action !== "all") q = q.eq("action", action);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export default function AdminLogs() {
  const [search, setSearch] = useState("");
  const [targetType, setTargetType] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["admin-logs", targetType, actionFilter],
    queryFn: () => fetchLogs(targetType, actionFilter),
    refetchInterval: 30000,
  });

  const { data: authData = [] } = useQuery({
    queryKey: ["admin-auth-users"],
    queryFn: async () => {
      const { data } = await (supabase as any).rpc("get_users_admin");
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const authMap = useMemo(() => {
    const map: Record<string, string> = {};
    (authData as any[]).forEach((u) => { map[u.id] = u.email || u.id.slice(0, 8) + "…"; });
    return map;
  }, [authData]);

  const churchIds = useMemo(
    () => [...new Set((logs as any[]).filter((l) => l.target_type === "church" && l.target_id).map((l) => l.target_id))],
    [logs]
  );

  const { data: churchesData = [] } = useQuery({
    queryKey: ["admin-log-churches", churchIds],
    queryFn: async () => {
      if (!churchIds.length) return [];
      const { data } = await supabase.from("churches").select("id, name, city, state").in("id", churchIds);
      return data || [];
    },
    enabled: churchIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const churchMap = useMemo(() => {
    const map: Record<string, string> = {};
    (churchesData as any[]).forEach((c) => {
      map[c.id] = [c.name, c.city && `${c.city}/${c.state}`].filter(Boolean).join(" — ");
    });
    return map;
  }, [churchesData]);

  const filtered = logs.filter((l: any) => {
    const q = search.toLowerCase();
    const moderatorEmail = authMap[l.moderator_id] || "";
    const targetEmail = l.target_type === "user" ? (authMap[l.target_id] || "") : "";
    return !q
      || l.action?.toLowerCase().includes(q)
      || l.reason?.toLowerCase().includes(q)
      || moderatorEmail.toLowerCase().includes(q)
      || targetEmail.toLowerCase().includes(q);
  });

  function actionVariant(action: string): any {
    if (["soft_delete", "ban", "suspend"].includes(action)) return "destructive";
    if (["approve", "restore", "unsuspend"].includes(action)) return "default";
    return "secondary";
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Logs de Moderação</h1>
        <p className="text-muted-foreground text-sm">Auditoria completa de todas as ações administrativas e de moderação</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar login, ação ou motivo..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Select value={targetType} onValueChange={setTargetType}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Tipo de conteúdo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="prayer_request">Pedidos de Oração</SelectItem>
                  <SelectItem value="user">Usuários</SelectItem>
                  <SelectItem value="report">Reports</SelectItem>
                  <SelectItem value="church">Igrejas</SelectItem>
                  <SelectItem value="contribution">Corrente de Oração</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p className="text-xs">Filtra logs pelo tipo de objeto afetado</p></TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Tipo de ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  <SelectItem value="soft_delete">Deletado</SelectItem>
                  <SelectItem value="restore">Restaurado</SelectItem>
                  <SelectItem value="suspend">Suspenso</SelectItem>
                  <SelectItem value="unsuspend">Suspensão removida</SelectItem>
                  <SelectItem value="ban">Banido</SelectItem>
                  <SelectItem value="approve">Aprovado</SelectItem>
                  <SelectItem value="reject">Rejeitado</SelectItem>
                  <SelectItem value="resolve_report">Report resolvido</SelectItem>
                  <SelectItem value="dismiss_report">Report descartado</SelectItem>
                  <SelectItem value="role_assign">Role atribuída</SelectItem>
                  <SelectItem value="edit_content">Conteúdo editado</SelectItem>
                  <SelectItem value="create">Criado</SelectItem>
                  <SelectItem value="activate">Ativado</SelectItem>
                  <SelectItem value="deactivate">Inativado</SelectItem>
                  <SelectItem value="xp_override">XP alterado</SelectItem>
                  <SelectItem value="xp_multiplier">Multiplicador XP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p className="text-xs">Filtra logs pela ação executada</p></TooltipContent>
        </Tooltip>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Moderador / Admin</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Alvo</TableHead>
              <TableHead>Motivo / Notas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum log encontrado.</TableCell></TableRow>
            ) : filtered.map((l: any) => {
              const targetLabel = l.target_type === "user"
                ? (authMap[l.target_id] || (l.target_id ? l.target_id.slice(0, 8) + "…" : "—"))
                : l.target_type === "church"
                ? (churchMap[l.target_id] || (l.target_id ? l.target_id.slice(0, 8) + "…" : "—"))
                : (l.target_id ? l.target_id.slice(0, 8) + "…" : "—");

              return (
                <TableRow key={l.id}>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {format(new Date(l.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {authMap[l.moderator_id] || (l.moderator_id ? l.moderator_id.slice(0, 8) + "…" : "—")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={actionVariant(l.action)}>{ACTION_LABELS[l.action] || l.action}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {TARGET_LABELS[l.target_type] || l.target_type}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {targetLabel}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs max-w-xs">
                    <p className="line-clamp-2">{l.reason || "—"}</p>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">Exibindo {filtered.length} de {logs.length} registros. Atualiza automaticamente a cada 30s.</p>
    </div>
  );
}
