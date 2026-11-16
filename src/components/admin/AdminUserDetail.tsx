import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CELESTIAL_LEVELS, getLevel, getNextLevel, getLevelProgress } from "@/lib/faith-points";
import { adminRpc } from "@/lib/admin-rpc";
import { AdminActionDialog } from "@/components/admin/AdminActionDialog";

interface Props {
  userId: string;
  userName: string;
  userEmail?: string | null;
  open: boolean;
  onClose: () => void;
}

const UNLIMITED = 2147483647;
const numberFormat = new Intl.NumberFormat("pt-BR");

const ACTION_LABEL: Record<string, string> = {
  xp_override: "XP definido",
  xp_multiplier: "Multiplicador",
  role_assign: "Papel",
  suspend: "Suspensão",
  unsuspend: "Suspensão retirada",
  soft_delete: "Conta removida",
  restore: "Conta restaurada",
};

type LogRow = { id: string; created_at: string; action: string; reason: string | null; moderator_id: string; metadata: Record<string, unknown> | null };

function describeMeta(action: string, meta: LogRow["metadata"]) {
  if (!meta) return null;
  if ("from" in meta && "to" in meta) return `${String(meta.from)} → ${String(meta.to)}`;
  if (action === "suspend" && meta.until) return `${String(meta.days)} dias, até ${format(new Date(String(meta.until)), "dd/MM/yyyy HH:mm")}`;
  return null;
}

export default function AdminUserDetail({ userId, userName, userEmail, open, onClose }: Props) {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<"xp" | "multiplier" | null>(null);
  const [value, setValue] = useState("");

  const xpQuery = useQuery({
    queryKey: ["user-xp", userId],
    queryFn: async () => {
      const { data, error } = await (supabase.from("user_xp" as never) as unknown as ReturnType<typeof supabase.from>)
        .select("total_xp, updated_at").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return data as { total_xp: number; updated_at: string } | null;
    },
    enabled: open,
  });

  const overrideQuery = useQuery({
    queryKey: ["user-xp-override", userId],
    queryFn: async () => {
      // Obs.: a tabela NÃO tem coluna "notes" (a versão anterior pedia e falhava em silêncio,
      // mostrando sempre 1×).
      const { data, error } = await (supabase.from("user_xp_overrides" as never) as unknown as ReturnType<typeof supabase.from>)
        .select("xp_multiplier, updated_at").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return data as { xp_multiplier: number; updated_at: string } | null;
    },
    enabled: open,
  });

  const quotaQuery = useQuery({
    queryKey: ["user-prayer-quota", userId],
    queryFn: async () => {
      const [allowance, level] = await Promise.all([
        adminRpc<number>("prayer_daily_allowance", { p_user: userId }),
        adminRpc<number>("prayer_level_number", { p_user: userId }),
      ]);
      return { allowance, level };
    },
    enabled: open,
  });

  const logsQuery = useQuery({
    queryKey: ["user-detail-logs", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("moderation_logs" as never)
        .select("id, created_at, action, reason, moderator_id, metadata")
        .eq("target_id", userId)
        .eq("target_type", "user")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as unknown as LogRow[];
    },
    enabled: open,
  });

  const { data: authData = [] } = useQuery({
    queryKey: ["admin-auth-users"],
    queryFn: () => adminRpc<{ id: string; email: string | null }[]>("get_users_admin", {}),
    staleTime: 5 * 60 * 1000,
  });
  const emailOf = (id: string) => authData.find((u) => u.id === id)?.email || `${id.slice(0, 8)}…`;

  const totalXp = xpQuery.data?.total_xp ?? 0;
  const currentLevel = getLevel(totalXp);
  const nextLevel = getNextLevel(totalXp);
  const progress = getLevelProgress(totalXp);
  const multiplier = overrideQuery.data?.xp_multiplier ?? 1;

  const parsed = Number(value.replace(",", "."));
  const valueValid = edit === "xp"
    ? Number.isInteger(parsed) && parsed >= 0 && parsed <= 10_000_000
    : edit === "multiplier" ? Number.isFinite(parsed) && parsed >= 0.1 && parsed <= 10 : false;

  async function save(reason: string) {
    if (edit === "xp") {
      await adminRpc("admin_set_user_xp", { p_user: userId, p_xp: parsed, p_reason: reason });
      toast.success(`XP definido em ${numberFormat.format(parsed)}.`);
    } else {
      await adminRpc("admin_set_xp_multiplier", { p_user: userId, p_multiplier: parsed, p_reason: reason });
      toast.success(`Multiplicador definido em ${parsed}×.`);
    }
    await Promise.all(["user-xp", "user-xp-override", "user-prayer-quota", "user-detail-logs"].map((k) =>
      qc.invalidateQueries({ queryKey: [k, userId] })));
    void qc.invalidateQueries({ queryKey: ["admin-logs"] });
  }

  const loadError = xpQuery.isError || overrideQuery.isError;
  const quota = quotaQuery.data;

  return (
    <>
      <Dialog open={open && !edit} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do usuário</DialogTitle>
            <DialogDescription className="break-words">
              {userName}{userEmail ? ` · ${userEmail}` : ""}
            </DialogDescription>
          </DialogHeader>

          {loadError && (
            <div role="alert" className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              Não foi possível carregar o XP ou o multiplicador. Os valores abaixo podem estar incompletos.
            </div>
          )}

          <section className="space-y-3" aria-label="Jornada da fé">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Jornada da Fé</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl" aria-hidden="true">{currentLevel.emoji}</span>
                  <div>
                    <p className="font-semibold">{currentLevel.name}</p>
                    <p className="text-xs text-muted-foreground">{numberFormat.format(totalXp)} XP total</p>
                  </div>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs text-muted-foreground mb-1">Multiplicador atual</p>
                <Badge variant={multiplier !== 1 ? "default" : "outline"} className="text-sm">{multiplier}×</Badge>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs text-muted-foreground mb-1">Cota diária de intercessões</p>
                {quotaQuery.isError ? (
                  <p className="text-sm text-destructive">Indisponível</p>
                ) : !quota ? (
                  <p className="text-sm text-muted-foreground">…</p>
                ) : (
                  <p className="text-sm font-semibold">
                    {quota.allowance >= UNLIMITED ? "Ilimitada (admin)" : `${quota.allowance} por dia`}
                    <span className="block text-xs font-normal text-muted-foreground">nível {quota.level} · +1 a cada 5 níveis</span>
                  </p>
                )}
              </div>
            </div>

            {nextLevel && (
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Próximo: {nextLevel.emoji} {nextLevel.name}</span>
                  <span>{numberFormat.format(totalXp)} / {numberFormat.format(nextLevel.minFaithPoints)} XP</span>
                </div>
                <Progress value={progress} className="h-2" aria-label="Progresso até o próximo nível" />
              </div>
            )}
          </section>

          <Separator />

          <section className="grid gap-3 sm:grid-cols-2" aria-label="Ajustes">
            <div className="rounded-md border border-border p-3 space-y-1.5">
              <p className="text-sm font-medium">XP total</p>
              <p className="text-xs text-muted-foreground">Substitui o XP atual (0 a 10.000.000). Muda o nível e a cota diária.</p>
              <Button size="sm" variant="outline" onClick={() => { setValue(String(totalXp)); setEdit("xp"); }}>Definir XP…</Button>
            </div>
            <div className="rounded-md border border-border p-3 space-y-1.5">
              <p className="text-sm font-medium">Multiplicador de XP</p>
              <p className="text-xs text-muted-foreground">Vale para o XP ganho daqui em diante (0,1 a 10). Não altera o XP atual.</p>
              <Button size="sm" variant="outline" onClick={() => { setValue(String(multiplier)); setEdit("multiplier"); }}>Definir multiplicador…</Button>
            </div>
          </section>

          <Separator />

          <section aria-label="Tabela de níveis">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">Tabela de níveis</p>
            <div className="rounded-md border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead className="text-right">XP mínimo</TableHead>
                    <TableHead className="w-6"><span className="sr-only">Atual</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {CELESTIAL_LEVELS.map((lvl, i) => {
                    const isCurrent = lvl.name === currentLevel.name;
                    return (
                      <TableRow key={lvl.name} className={isCurrent ? "bg-primary/5" : ""} aria-current={isCurrent ? "true" : undefined}>
                        <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                        <TableCell className="text-sm">
                          <span className="mr-1.5" aria-hidden="true">{lvl.emoji}</span>
                          <span className={isCurrent ? "font-semibold text-primary" : ""}>{lvl.name}</span>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">{numberFormat.format(lvl.minFaithPoints)}</TableCell>
                        <TableCell>{isCurrent && <Badge variant="outline" className="text-[10px] px-1 py-0">atual</Badge>}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </section>

          <Separator />

          <section aria-label="Histórico administrativo">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">Histórico administrativo</p>
            {logsQuery.isError ? (
              <p className="text-sm text-destructive">Não foi possível carregar o histórico.</p>
            ) : (logsQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma ação registrada.</p>
            ) : (
              <ul className="space-y-1.5">
                {logsQuery.data!.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-start justify-between gap-x-4 text-xs py-1.5 border-b border-border/40 last:border-0">
                    <div className="min-w-0">
                      <span className="font-medium text-foreground">{ACTION_LABEL[l.action] ?? l.action}</span>
                      {describeMeta(l.action, l.metadata) && <span className="text-muted-foreground ml-1.5">{describeMeta(l.action, l.metadata)}</span>}
                      {l.reason && <p className="text-muted-foreground mt-0.5 break-words">Motivo: {l.reason}</p>}
                      <p className="text-muted-foreground mt-0.5">por {emailOf(l.moderator_id)}</p>
                    </div>
                    <time className="text-muted-foreground whitespace-nowrap" dateTime={l.created_at}>
                      {format(new Date(l.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </DialogContent>
      </Dialog>

      <AdminActionDialog
        open={!!edit}
        onOpenChange={(o) => { if (!o) setEdit(null); }}
        title={edit === "xp" ? "Definir XP total" : "Definir multiplicador de XP"}
        description={edit === "xp"
          ? `Atual: ${numberFormat.format(totalXp)} XP (${currentLevel.name}).`
          : `Atual: ${multiplier}×. Vale para o XP ganho daqui em diante.`}
        confirmLabel="Salvar"
        target={{ id: userId, name: userName, email: userEmail }}
        canConfirm={valueValid}
        onConfirm={save}
      >
        <div className="space-y-1.5">
          <Label htmlFor="admin-value">{edit === "xp" ? "Novo XP total" : "Novo multiplicador"}</Label>
          <Input
            id="admin-value"
            type="number"
            inputMode="decimal"
            min={edit === "xp" ? 0 : 0.1}
            max={edit === "xp" ? 10_000_000 : 10}
            step={edit === "xp" ? 1 : 0.1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={!valueValid}
            aria-describedby="admin-value-help"
          />
          <p id="admin-value-help" className={`text-xs ${valueValid ? "text-muted-foreground" : "text-destructive"}`}>
            {edit === "xp" ? "Número inteiro de 0 a 10.000.000." : "De 0,1 a 10 (ex.: 1,5)."}
          </p>
        </div>
      </AdminActionDialog>
    </>
  );
}
