import { useMemo, useState } from "react";
import { AdminSupporter } from "@/features/insignias/AdminSupporter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";
import AdminUserDetail from "@/components/admin/AdminUserDetail";
import { AdminActionDialog, type AdminTarget } from "@/components/admin/AdminActionDialog";
import { adminRpc } from "@/lib/admin-rpc";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertTriangle, MoreHorizontal, Search, Undo2, ShieldBan, User, Clock, ShieldCheck, Heart } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

/*
 * Todas as ações passam por comandos no servidor (RPC) que validam ator, alvo,
 * motivo e prazo e gravam o log de moderação na mesma transação.
 * Regras: docs/admin/ADM02-usuarios.md
 */

type StatusFilter = "all" | "active" | "suspended" | "banned";
type RoleName = "user" | "moderator" | "admin";

type UserRow = {
  id: string;
  full_name: string | null;
  display_name: string | null;
  city: string | null;
  state: string | null;
  created_at: string;
  deleted_at: string | null;
  suspended_until: string | null;
  role: RoleName;
};

type AuthInfo = { id: string; email: string | null; last_sign_in_at: string | null };

const PAGE_LIMIT = 1000;
const ROLE_LABEL: Record<RoleName, string> = { user: "Usuário", moderator: "Moderador", admin: "Admin" };
const ROLE_RANK: Record<RoleName, number> = { user: 0, moderator: 1, admin: 2 };
const TAB_LABEL: Record<StatusFilter, string> = { all: "Todos", active: "Ativos", suspended: "Suspensos", banned: "Removidos" };
const TAB_HELP: Record<StatusFilter, string> = {
  all: "Todos os usuários, inclusive suspensos e removidos.",
  active: "Usuários sem suspensão vigente e não removidos.",
  suspended: "Usuários com suspensão vigente: leem o app, mas não interagem.",
  banned: "Contas removidas pela moderação: não interagem e não aparecem no app.",
};

async function fetchUsers() {
  const { data: profiles, error, count } = await supabase
    .from("profiles")
    .select("id, full_name, display_name, city, state, created_at, deleted_at, suspended_until", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(PAGE_LIMIT);
  if (error) throw error;

  const { data: roles, error: rolesError } = await supabase.from("user_roles").select("user_id, roles(name)");
  if (rolesError) throw rolesError;

  // Se houver mais de um papel, vale o maior (admin > moderador > usuário).
  const roleMap: Record<string, RoleName> = {};
  for (const r of (roles ?? []) as { user_id: string; roles: { name: string } | null }[]) {
    const name = r.roles?.name as RoleName | undefined;
    if (name && name in ROLE_RANK && ROLE_RANK[name] > ROLE_RANK[roleMap[r.user_id] ?? "user"]) roleMap[r.user_id] = name;
  }

  const rows: UserRow[] = (profiles ?? []).map((p) => ({ ...p, role: roleMap[p.id] ?? "user" }));
  return { rows, total: count ?? rows.length };
}

const isSuspended = (u: UserRow, now: Date) => !!u.suspended_until && new Date(u.suspended_until) > now;
const displayName = (u: UserRow) => u.display_name || u.full_name || "Sem nome";

type ActionState =
  | { type: "suspend" | "unsuspend" | "remove" | "restore" | "role"; user: UserRow }
  | null;

export default function AdminUsers() {
  const { isAdmin } = useUserRole();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [action, setAction] = useState<ActionState>(null);
  const [suspendDays, setSuspendDays] = useState("7");
  const [newRole, setNewRole] = useState<RoleName>("user");
  const [detailUser, setDetailUser] = useState<AdminTarget | null>(null);
  const [supporterUser, setSupporterUser] = useState<{ id: string; name: string } | null>(null);

  const usersQuery = useQuery({ queryKey: ["admin-users"], queryFn: fetchUsers });
  const users = usersQuery.data?.rows ?? [];

  const { data: authUsers = [], isError: authError } = useQuery({
    queryKey: ["admin-auth-users"],
    queryFn: async () => adminRpc<AuthInfo[]>("get_users_admin", {}),
    staleTime: 5 * 60 * 1000,
  });
  const authMap = useMemo(() => {
    const map: Record<string, AuthInfo> = {};
    for (const u of authUsers ?? []) map[u.id] = u;
    return map;
  }, [authUsers]);

  const { data: sessionData } = useQuery({
    queryKey: ["session"],
    queryFn: () => supabase.auth.getSession().then((r) => r.data),
    staleTime: Infinity,
  });
  const currentUserId = sessionData?.session?.user?.id;

  const now = new Date();
  const q = search.trim().toLowerCase();
  const filtered = users.filter((u) => {
    const matchSearch = !q
      || u.full_name?.toLowerCase().includes(q)
      || u.display_name?.toLowerCase().includes(q)
      || u.city?.toLowerCase().includes(q)
      || authMap[u.id]?.email?.toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (statusFilter === "active") return !u.deleted_at && !isSuspended(u, now);
    if (statusFilter === "suspended") return !u.deleted_at && isSuspended(u, now);
    if (statusFilter === "banned") return !!u.deleted_at;
    return true;
  });

  const target: AdminTarget | null = action
    ? { id: action.user.id, name: displayName(action.user), email: authMap[action.user.id]?.email }
    : null;

  const days = Number(suspendDays);
  const daysValid = Number.isInteger(days) && days >= 1 && days <= 365;
  const suspendUntil = daysValid ? new Date(Date.now() + days * 86400000) : null;

  async function done(message: string) {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["admin-users"] }),
      qc.invalidateQueries({ queryKey: ["user-detail-logs"] }),
      qc.invalidateQueries({ queryKey: ["admin-logs"] }),
    ]);
    toast.success(message);
  }

  async function runAction(reason: string) {
    if (!action) return;
    const id = action.user.id;
    switch (action.type) {
      case "suspend":
        await adminRpc("admin_suspend_user", { p_user: id, p_days: days, p_reason: reason });
        return done(`Usuário suspenso até ${format(suspendUntil!, "dd/MM/yyyy HH:mm")}.`);
      case "unsuspend":
        await adminRpc("admin_unsuspend_user", { p_user: id, p_reason: reason });
        return done("Suspensão retirada.");
      case "remove":
        await adminRpc("admin_set_user_removed", { p_user: id, p_removed: true, p_reason: reason });
        return done("Conta removida.");
      case "restore":
        await adminRpc("admin_set_user_removed", { p_user: id, p_removed: false, p_reason: reason });
        return done("Conta restaurada.");
      case "role":
        await adminRpc("admin_set_user_role", { p_user: id, p_role: newRole, p_reason: reason });
        return done(`Papel alterado para ${ROLE_LABEL[newRole]}.`);
    }
  }

  function open(type: NonNullable<ActionState>["type"], user: UserRow) {
    if (type === "suspend") setSuspendDays("7");
    if (type === "role") setNewRole(user.role === "user" ? "moderator" : "user");
    setAction({ type, user });
  }

  function statusBadge(user: UserRow) {
    if (user.deleted_at) return <Badge variant="destructive">Removido</Badge>;
    if (isSuspended(user, now)) {
      return (
        <Badge variant="secondary" className="gap-1 whitespace-nowrap">
          <Clock className="w-3 h-3" aria-hidden="true" />
          Suspenso até {format(new Date(user.suspended_until!), "dd/MM HH:mm")}
        </Badge>
      );
    }
    return <Badge variant="outline">Ativo</Badge>;
  }

  const dialogConfig = action && {
    suspend: { title: "Suspender usuário", confirm: "Suspender", destructive: true,
      description: "Durante a suspensão a pessoa continua lendo o app, mas não cria pedidos, não ora, não reage, não contribui na corrente e não convida amigos." },
    unsuspend: { title: "Retirar suspensão", confirm: "Retirar suspensão", destructive: false,
      description: action.user.suspended_until ? `Suspenso até ${format(new Date(action.user.suspended_until), "dd/MM/yyyy HH:mm")}. A pessoa volta a interagir imediatamente.` : undefined },
    remove: { title: "Remover conta (banir)", confirm: "Remover conta", destructive: true,
      description: "A conta deixa de aparecer no app e não poderá interagir. É uma remoção lógica: pode ser desfeita em \"Restaurar\"." },
    restore: { title: "Restaurar conta", confirm: "Restaurar", destructive: false,
      description: "A conta volta a aparecer e a interagir no app." },
    role: { title: "Alterar papel", confirm: "Alterar papel", destructive: newRole === "admin",
      description: `Papel atual: ${ROLE_LABEL[action.user.role]}.` },
  }[action.type];

  const total = usersQuery.data?.total ?? 0;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Usuários</h1>
        <p className="text-muted-foreground text-sm">Gerencie papéis, suspensões e remoções. Toda ação exige motivo e fica no log de moderação.</p>
      </div>

      <div className="space-y-1">
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <div className="overflow-x-auto -mx-1 px-1">
            <TabsList aria-label="Filtrar por situação">
              {(Object.keys(TAB_LABEL) as StatusFilter[]).map((t) => (
                <TabsTrigger key={t} value={t}>{TAB_LABEL[t]}</TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
        <p className="text-xs text-muted-foreground" aria-live="polite">{TAB_HELP[statusFilter]}</p>
      </div>

      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
        <Input
          className="pl-9"
          placeholder="Buscar por nome, cidade ou e-mail…"
          aria-label="Buscar usuários"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {(usersQuery.isError || authError || total > users.length) && (
        <div role="alert" className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-0.5">
            {usersQuery.isError && <p>Não foi possível carregar os usuários. <button className="underline" onClick={() => void usersQuery.refetch()}>Tentar novamente</button></p>}
            {authError && <p>E-mails e último acesso indisponíveis no momento.</p>}
            {total > users.length && <p>Mostrando os {users.length} cadastros mais recentes de {total}. A busca considera apenas estes.</p>}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border overflow-x-auto">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Cidade/UF</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Último acesso</TableHead>
              <TableHead>Desde</TableHead>
              <TableHead className="w-12"><span className="sr-only">Ações</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usersQuery.isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Carregando…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum usuário encontrado.</TableCell></TableRow>
            ) : filtered.map((user) => {
              const name = displayName(user);
              const isSelf = user.id === currentUserId;
              const suspended = isSuspended(user, now);
              return (
                <TableRow key={user.id} className={user.deleted_at ? "opacity-60" : ""}>
                  <TableCell className="font-medium">
                    {name}{isSelf && <span className="ml-1.5 text-xs text-muted-foreground">(você)</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">{authMap[user.id]?.email || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{[user.city, user.state].filter(Boolean).join(", ") || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === "admin" ? "destructive" : user.role === "moderator" ? "secondary" : "outline"}>
                      {ROLE_LABEL[user.role]}
                    </Badge>
                  </TableCell>
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
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Ações para ${name}`}>
                          <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
                        {isAdmin && (
                          <DropdownMenuItem onClick={() => setDetailUser({ id: user.id, name, email: authMap[user.id]?.email })}>
                            <User className="w-4 h-4 mr-2" aria-hidden="true" /> Ver detalhes e XP
                          </DropdownMenuItem>
                        )}
                        {isAdmin && !user.deleted_at && (
                          <DropdownMenuItem onClick={() => setSupporterUser({ id: user.id, name })}>
                            <Heart className="w-4 h-4 mr-2" aria-hidden="true" /> Reconhecimento de doação
                          </DropdownMenuItem>
                        )}
                        {isAdmin && !user.deleted_at && (
                          <DropdownMenuItem disabled={isSelf} onClick={() => open("role", user)}>
                            <ShieldCheck className="w-4 h-4 mr-2" aria-hidden="true" /> Alterar papel{isSelf && " (não em si)"}
                          </DropdownMenuItem>
                        )}

                        {!user.deleted_at && (
                          <>
                            <DropdownMenuSeparator />
                            {suspended ? (
                              <DropdownMenuItem onClick={() => open("unsuspend", user)}>
                                <Undo2 className="w-4 h-4 mr-2" aria-hidden="true" /> Retirar suspensão
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem disabled={isSelf} className="text-amber-700 dark:text-amber-400" onClick={() => open("suspend", user)}>
                                <Clock className="w-4 h-4 mr-2" aria-hidden="true" /> Suspender…{isSelf && " (não em si)"}
                              </DropdownMenuItem>
                            )}
                            {isAdmin && (
                              <DropdownMenuItem
                                disabled={isSelf || user.role === "admin"}
                                className="text-destructive focus:text-destructive"
                                onClick={() => open("remove", user)}
                              >
                                <ShieldBan className="w-4 h-4 mr-2" aria-hidden="true" />
                                Remover conta…{isSelf ? " (não em si)" : user.role === "admin" ? " (retire o admin antes)" : ""}
                              </DropdownMenuItem>
                            )}
                          </>
                        )}
                        {user.deleted_at && isAdmin && (
                          <DropdownMenuItem onClick={() => open("restore", user)}>
                            <Undo2 className="w-4 h-4 mr-2" aria-hidden="true" /> Restaurar conta…
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

      <AdminActionDialog
        open={!!action}
        onOpenChange={(o) => { if (!o) setAction(null); }}
        title={dialogConfig?.title ?? ""}
        description={dialogConfig?.description}
        confirmLabel={dialogConfig?.confirm ?? "Confirmar"}
        destructive={dialogConfig?.destructive}
        target={target}
        canConfirm={action?.type === "suspend" ? daysValid : action?.type === "role" ? newRole !== action.user.role : true}
        onConfirm={runAction}
      >
        {action?.type === "suspend" && (
          <div className="space-y-1.5">
            <Label htmlFor="suspend-days">Duração em dias (1 a 365)</Label>
            <Input
              id="suspend-days"
              type="number"
              inputMode="numeric"
              min={1}
              max={365}
              step={1}
              value={suspendDays}
              onChange={(e) => setSuspendDays(e.target.value)}
              aria-invalid={!daysValid}
              aria-describedby="suspend-days-help"
            />
            <p id="suspend-days-help" className={`text-xs ${daysValid ? "text-muted-foreground" : "text-destructive"}`}>
              {daysValid
                ? `Suspenso até ${format(suspendUntil!, "dd/MM/yyyy 'às' HH:mm")} (seu horário local).`
                : "Informe um número inteiro de 1 a 365."}
            </p>
          </div>
        )}
        {action?.type === "role" && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium mb-1">Novo papel</legend>
            <RadioGroup value={newRole} onValueChange={(v) => setNewRole(v as RoleName)}>
              {(["user", "moderator", "admin"] as RoleName[]).map((r) => (
                <div key={r} className="flex items-center gap-2">
                  <RadioGroupItem value={r} id={`role-${r}`} />
                  <Label htmlFor={`role-${r}`} className="font-normal">
                    {ROLE_LABEL[r]}{r === action.user.role && " (atual)"}
                    <span className="block text-xs text-muted-foreground">
                      {r === "user" ? "Sem acesso ao painel." : r === "moderator" ? "Pedidos, reports, feedback e igrejas." : "Acesso total ao painel."}
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </fieldset>
        )}
      </AdminActionDialog>

      {detailUser && (
        <AdminUserDetail
          userId={detailUser.id}
          userName={detailUser.name}
          userEmail={detailUser.email}
          open={!!detailUser}
          onClose={() => setDetailUser(null)}
        />
      )}

      {isAdmin && supporterUser && <AdminSupporter user={supporterUser} onClose={() => setSupporterUser(null)} />}
    </div>
  );
}
