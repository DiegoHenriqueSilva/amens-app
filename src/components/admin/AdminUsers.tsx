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
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import { MoreHorizontal, Search, Undo2, ShieldBan } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type StatusFilter = "all" | "active" | "suspended" | "banned";

type UserRow = {
  id: string;
  full_name: string | null;
  display_name: string | null;
  city: string | null;
  state: string | null;
  parish: string | null;
  created_at: string;
  deleted_at: string | null;
  suspended_until: string | null;
  email?: string;
  last_sign_in_at?: string;
  role?: string;
};

const TAB_TOOLTIPS: Record<StatusFilter, string> = {
  all: "Exibe todos os usuários, incluindo banidos e suspensos",
  active: "Apenas usuários sem suspensão e sem banimento",
  suspended: "Usuários com suspensão ativa (suspended_until no futuro)",
  banned: "Usuários com conta banida (soft delete)",
};

async function fetchUsers() {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, display_name, city, state, parish, created_at, deleted_at, suspended_until")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;

  const { data: roles } = await supabase
    .from("user_roles")
    .select("user_id, roles(name)");

  const roleMap: Record<string, string> = {};
  (roles || []).forEach((r: any) => {
    if (r.roles?.name) roleMap[r.user_id] = r.roles.name;
  });

  return (profiles || []).map((p) => ({ ...p, role: roleMap[p.id] || "user" }));
}

async function logAction(moderatorId: string, targetId: string, action: string, reason?: string) {
  const { error } = await supabase.from("moderation_logs").insert({
    moderator_id: moderatorId,
    target_type: "user",
    target_id: targetId,
    action,
    reason: reason || null,
  });
  if (error) console.warn("log insert failed:", error.message);
}

export default function AdminUsers() {
  const { isAdmin } = useUserRole();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [suspendDialog, setSuspendDialog] = useState<{ userId: string; name: string } | null>(null);
  const [suspendDays, setSuspendDays] = useState("7");
  const [suspendReason, setSuspendReason] = useState("");
  const [roleDialog, setRoleDialog] = useState<{ userId: string; name: string; current: string } | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchUsers,
  });

  const { data: authUsers = [] } = useQuery({
    queryKey: ["admin-auth-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_users_admin" as any);
      if (error) return [];
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const authMap = useMemo(() => {
    const map: Record<string, { email: string; last_sign_in_at: string | null }> = {};
    (authUsers as any[]).forEach((u) => { map[u.id] = u; });
    return map;
  }, [authUsers]);

  const { data: sessionData } = useQuery({
    queryKey: ["session"],
    queryFn: () => supabase.auth.getSession().then((r) => r.data),
    staleTime: Infinity,
  });
  const currentUserId = sessionData?.session?.user?.id;

  const now = new Date();

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.full_name?.toLowerCase().includes(q) || u.display_name?.toLowerCase().includes(q) || u.city?.toLowerCase().includes(q) || authMap[u.id]?.email?.toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (statusFilter === "active") return !u.deleted_at && !(u.suspended_until && new Date(u.suspended_until) > now);
    if (statusFilter === "suspended") return !u.deleted_at && !!u.suspended_until && new Date(u.suspended_until) > now;
    if (statusFilter === "banned") return !!u.deleted_at;
    return true;
  });

  const softDelete = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) => {
      const { error } = await supabase.from("profiles").update({ deleted_at: new Date().toISOString(), deleted_by: currentUserId }).eq("id", userId);
      if (error) throw error;
      await logAction(currentUserId!, userId, "soft_delete", reason);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); toast.success("Usuário banido."); },
    onError: (e: any) => toast.error("Erro ao banir: " + e.message),
  });

  const restore = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("profiles").update({ deleted_at: null, deleted_by: null }).eq("id", userId);
      if (error) throw error;
      await logAction(currentUserId!, userId, "restore");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); toast.success("Usuário restaurado."); },
    onError: (e: any) => toast.error("Erro ao restaurar: " + e.message),
  });

  const suspend = useMutation({
    mutationFn: async ({ userId, days, reason }: { userId: string; days: number; reason?: string }) => {
      const until = new Date(Date.now() + days * 86400000).toISOString();
      const { error } = await supabase.from("profiles").update({ suspended_until: until }).eq("id", userId);
      if (error) throw error;
      await logAction(currentUserId!, userId, "suspend", reason || `${days} dias`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setSuspendDialog(null);
      toast.success("Usuário suspenso.");
    },
    onError: (e: any) => toast.error("Erro ao suspender: " + e.message),
  });

  const unsuspend = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("profiles").update({ suspended_until: null }).eq("id", userId);
      if (error) throw error;
      await logAction(currentUserId!, userId, "unsuspend");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); toast.success("Suspensão removida."); },
    onError: (e: any) => toast.error("Erro ao remover suspensão: " + e.message),
  });

  const assignRole = useMutation({
    mutationFn: async ({ userId, roleName }: { userId: string; roleName: string }) => {
      const { data: role } = await supabase.from("roles").select("id").eq("name", roleName).single();
      if (!role) throw new Error("Role not found");
      await supabase.from("user_roles").delete().eq("user_id", userId);
      if (roleName !== "user") {
        await supabase.from("user_roles").insert({ user_id: userId, role_id: role.id, assigned_by: currentUserId });
      }
      await logAction(currentUserId!, userId, "role_assign", roleName);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setRoleDialog(null);
      toast.success("Role atribuída com sucesso.");
    },
    onError: () => toast.error("Erro ao atribuir role."),
  });

  function roleColor(role: string) {
    if (role === "admin") return "destructive";
    if (role === "moderator") return "secondary";
    return "outline";
  }

  function statusBadge(user: UserRow) {
    if (user.deleted_at) return <Badge variant="destructive">Banido</Badge>;
    if (user.suspended_until && new Date(user.suspended_until) > now)
      return <Badge variant="secondary">Suspenso</Badge>;
    return <Badge variant="outline">Ativo</Badge>;
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Usuários</h1>
        <p className="text-muted-foreground text-sm">Gerencie usuários, roles e suspensões</p>
      </div>

      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
        <TabsList>
          {(["all", "active", "suspended", "banned"] as StatusFilter[]).map((t) => (
            <Tooltip key={t}>
              <TooltipTrigger asChild>
                <span>
                  <TabsTrigger value={t}>
                    {{ all: "Todos", active: "Ativos", suspended: "Suspensos", banned: "Banidos" }[t]}
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
        <Input
          className="pl-9"
          placeholder="Buscar por nome, cidade ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-lg border border-border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email / Login</TableHead>
              <TableHead>Cidade/Estado</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Último Login</TableHead>
              <TableHead>Desde</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum usuário encontrado.</TableCell></TableRow>
            ) : filtered.map((user) => (
              <TableRow key={user.id} className={user.deleted_at ? "opacity-50" : ""}>
                <TableCell className="font-medium whitespace-nowrap">{user.display_name || user.full_name || "—"}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{authMap[user.id]?.email || "—"}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{[user.city, user.state].filter(Boolean).join(", ") || "—"}</TableCell>
                <TableCell><Badge variant={roleColor(user.role || "user") as any}>{user.role || "user"}</Badge></TableCell>
                <TableCell>{statusBadge(user)}</TableCell>
                <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                  {authMap[user.id]?.last_sign_in_at
                    ? formatDistanceToNow(new Date(authMap[user.id].last_sign_in_at!), { locale: ptBR, addSuffix: true })
                    : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                  {format(new Date(user.created_at), "dd/MM/yy", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!user.deleted_at && (
                        <>
                          {!user.suspended_until || new Date(user.suspended_until) <= now ? (
                            <DropdownMenuItem onClick={() => setSuspendDialog({ userId: user.id, name: user.display_name || user.full_name || user.id })}>
                              Suspender
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => unsuspend.mutate(user.id)}>
                              Remover suspensão
                            </DropdownMenuItem>
                          )}
                          {isAdmin && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setRoleDialog({ userId: user.id, name: user.display_name || user.full_name || user.id, current: user.role || "user" })}>
                                Alterar role
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => softDelete.mutate({ userId: user.id })}>
                                <ShieldBan className="w-4 h-4 mr-2" /> Banir usuário
                              </DropdownMenuItem>
                            </>
                          )}
                        </>
                      )}
                      {user.deleted_at && isAdmin && (
                        <DropdownMenuItem onClick={() => restore.mutate(user.id)}>
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

      <Dialog open={!!suspendDialog} onOpenChange={() => setSuspendDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Suspender usuário</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Suspender <strong>{suspendDialog?.name}</strong></p>
          <div className="space-y-3">
            <div>
              <Label>Duração (dias)</Label>
              <Input type="number" min={1} value={suspendDays} onChange={(e) => setSuspendDays(e.target.value)} />
            </div>
            <div>
              <Label>Motivo (opcional)</Label>
              <Input value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} placeholder="Ex: conteúdo inapropriado" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialog(null)}>Cancelar</Button>
            <Button onClick={() => suspendDialog && suspend.mutate({ userId: suspendDialog.userId, days: parseInt(suspendDays) || 7, reason: suspendReason })} disabled={suspend.isPending}>
              Suspender
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!roleDialog} onOpenChange={() => setRoleDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Alterar role de {roleDialog?.name}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-2">
            {["user", "moderator", "admin"].map((r) => (
              <Button key={r} variant={roleDialog?.current === r ? "default" : "outline"} onClick={() => roleDialog && assignRole.mutate({ userId: roleDialog.userId, roleName: r })} disabled={assignRole.isPending}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
