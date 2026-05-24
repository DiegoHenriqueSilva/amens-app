import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
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
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CELESTIAL_LEVELS, getLevel, getNextLevel, getLevelProgress } from "@/lib/faith-points";

interface Props {
  userId: string;
  userName: string;
  open: boolean;
  onClose: () => void;
}

export default function AdminUserDetail({ userId, userName, open, onClose }: Props) {
  const qc = useQueryClient();
  const [newXp, setNewXp] = useState("");
  const [newMultiplier, setNewMultiplier] = useState("");
  const [editingXp, setEditingXp] = useState(false);
  const [editingMultiplier, setEditingMultiplier] = useState(false);
  const [newDrawLimit, setNewDrawLimit] = useState("");
  const [editingDraw, setEditingDraw] = useState(false);

  const { data: sessionData } = useQuery({
    queryKey: ["session"],
    queryFn: () => supabase.auth.getSession().then((r) => r.data),
    staleTime: Infinity,
  });
  const moderatorId = sessionData?.session?.user?.id;

  const { data: xpData } = useQuery({
    queryKey: ["user-xp", userId],
    queryFn: async () => {
      const { data } = await (supabase.from("user_xp" as any) as any)
        .select("total_xp, updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      return data as { total_xp: number; updated_at: string } | null;
    },
    enabled: open,
  });

  const { data: overrideData } = useQuery({
    queryKey: ["user-xp-override", userId],
    queryFn: async () => {
      const { data } = await (supabase.from("user_xp_overrides" as any) as any)
        .select("xp_multiplier, updated_at, notes")
        .eq("user_id", userId)
        .maybeSingle();
      return data as { xp_multiplier: number; updated_at: string; notes: string | null } | null;
    },
    enabled: open,
  });

  const { data: drawOverride } = useQuery({
    queryKey: ["user-draw-override", userId],
    queryFn: async () => {
      const { data } = await (supabase.from("user_draw_overrides" as any) as any)
        .select("daily_limit")
        .eq("user_id", userId)
        .maybeSingle();
      return data as { daily_limit: number } | null;
    },
    enabled: open,
  });

  const { data: globalDrawLimit } = useQuery({
    queryKey: ["app-setting-draw-limit"],
    queryFn: async () => {
      const { data } = await (supabase.from("app_settings" as any) as any)
        .select("value")
        .eq("key", "draw_daily_limit")
        .maybeSingle();
      return data?.value ? parseInt(data.value, 10) : 3;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["user-detail-logs", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("moderation_logs")
        .select("id, created_at, action, reason, moderator_id")
        .eq("target_id", userId)
        .in("action", ["xp_override", "xp_multiplier", "role_assign"])
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: open,
  });

  const { data: authData = [] } = useQuery({
    queryKey: ["admin-auth-users"],
    queryFn: async () => {
      const { data } = await (supabase as any).rpc("get_users_admin");
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const authMap: Record<string, string> = {};
  (authData as any[]).forEach((u: any) => { authMap[u.id] = u.email || u.id.slice(0, 8) + "…"; });

  const totalXp = xpData?.total_xp ?? 0;
  const currentLevel = getLevel(totalXp);
  const nextLevel = getNextLevel(totalXp);
  const progress = getLevelProgress(totalXp);
  const multiplier = overrideData?.xp_multiplier ?? 1.0;

  async function logAction(action: string, reason: string) {
    await supabase.from("moderation_logs").insert({
      moderator_id: moderatorId,
      target_type: "user",
      target_id: userId,
      action,
      reason,
    });
  }

  const saveXp = useMutation({
    mutationFn: async () => {
      const xp = parseInt(newXp, 10);
      if (isNaN(xp) || xp < 0) throw new Error("XP inválido");
      const { error } = await (supabase.from("user_xp" as any) as any)
        .upsert({ user_id: userId, total_xp: xp, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) throw error;
      await logAction("xp_override", `XP definido: ${totalXp} → ${xp}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-xp", userId] });
      qc.invalidateQueries({ queryKey: ["user-detail-logs", userId] });
      setEditingXp(false);
      setNewXp("");
      toast.success("XP atualizado.");
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const saveMultiplier = useMutation({
    mutationFn: async () => {
      const mult = parseFloat(newMultiplier);
      if (isNaN(mult) || mult <= 0) throw new Error("Multiplicador inválido");
      const { error } = await (supabase.from("user_xp_overrides" as any) as any)
        .upsert({
          user_id: userId,
          xp_multiplier: mult,
          updated_at: new Date().toISOString(),
          updated_by: moderatorId,
        }, { onConflict: "user_id" });
      if (error) throw error;
      await logAction("xp_multiplier", `Multiplicador: ${multiplier}x → ${mult}x`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-xp-override", userId] });
      qc.invalidateQueries({ queryKey: ["user-detail-logs", userId] });
      setEditingMultiplier(false);
      setNewMultiplier("");
      toast.success("Multiplicador atualizado.");
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const saveDrawLimit = useMutation({
    mutationFn: async (limit: number | null) => {
      if (limit === null) {
        const { error } = await (supabase.from("user_draw_overrides" as any) as any)
          .delete().eq("user_id", userId);
        if (error) throw error;
        await logAction("xp_override", "Override de sorteio removido");
      } else {
        const { data: session } = await supabase.auth.getSession();
        const { error } = await (supabase.from("user_draw_overrides" as any) as any)
          .upsert({ user_id: userId, daily_limit: limit, updated_at: new Date().toISOString(), updated_by: session.session?.user.id }, { onConflict: "user_id" });
        if (error) throw error;
        await logAction("xp_override", `Limite de sorteio: ${drawOverride?.daily_limit ?? globalDrawLimit ?? 3} → ${limit}`);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-draw-override", userId] });
      qc.invalidateQueries({ queryKey: ["user-detail-logs", userId] });
      setEditingDraw(false);
      setNewDrawLimit("");
      toast.success("Limite de sorteio atualizado.");
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Usuário</DialogTitle>
          <p className="text-sm text-muted-foreground">{userName}</p>
        </DialogHeader>

        {/* XP e Nível atual */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Jornada da Fé</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{currentLevel.emoji}</span>
                <div>
                  <p className="font-semibold">{currentLevel.name}</p>
                  <p className="text-xs text-muted-foreground">{totalXp.toLocaleString()} XP total</p>
                </div>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">Multiplicador atual</p>
              <Badge variant={multiplier > 1 ? "default" : "outline"} className="text-sm">
                {multiplier}×
              </Badge>
            </div>
          </div>

          {nextLevel && (
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Próximo: {nextLevel.emoji} {nextLevel.name}</span>
                <span>{totalXp.toLocaleString()} / {nextLevel.minFaithPoints.toLocaleString()} XP</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>

        <Separator />

        {/* Editar XP */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Definir XP total</Label>
            {!editingXp && (
              <Button size="sm" variant="outline" onClick={() => { setEditingXp(true); setNewXp(String(totalXp)); }}>
                Editar
              </Button>
            )}
          </div>
          {editingXp && (
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                value={newXp}
                onChange={(e) => setNewXp(e.target.value)}
                placeholder="Ex: 1500"
                className="flex-1"
              />
              <Button size="sm" onClick={() => saveXp.mutate()} disabled={saveXp.isPending}>Salvar</Button>
              <Button size="sm" variant="outline" onClick={() => setEditingXp(false)}>Cancelar</Button>
            </div>
          )}
        </div>

        {/* Editar multiplicador */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <Label>Multiplicador de XP</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Aplica-se ao XP ganho a partir de agora (não altera o XP atual)</p>
            </div>
            {!editingMultiplier && (
              <Button size="sm" variant="outline" onClick={() => { setEditingMultiplier(true); setNewMultiplier(String(multiplier)); }}>
                Editar
              </Button>
            )}
          </div>
          {editingMultiplier && (
            <div className="flex gap-2">
              <Input
                type="number"
                min="0.1"
                step="0.1"
                value={newMultiplier}
                onChange={(e) => setNewMultiplier(e.target.value)}
                placeholder="Ex: 2.0"
                className="flex-1"
              />
              <Button size="sm" onClick={() => saveMultiplier.mutate()} disabled={saveMultiplier.isPending}>Salvar</Button>
              <Button size="sm" variant="outline" onClick={() => setEditingMultiplier(false)}>Cancelar</Button>
            </div>
          )}
        </div>

        <Separator />

        {/* Limite de sorteio */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <Label>Limite de sorteios por dia</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Global: {globalDrawLimit ?? 3}
                {drawOverride ? ` · Override ativo: ${drawOverride.daily_limit}` : " · Sem override"}
              </p>
            </div>
            {!editingDraw && (
              <Button size="sm" variant="outline" onClick={() => { setEditingDraw(true); setNewDrawLimit(String(drawOverride?.daily_limit ?? globalDrawLimit ?? 3)); }}>
                Editar
              </Button>
            )}
          </div>
          {editingDraw && (
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                value={newDrawLimit}
                onChange={(e) => setNewDrawLimit(e.target.value)}
                placeholder="Ex: 5"
                className="flex-1"
              />
              <Button size="sm" onClick={() => saveDrawLimit.mutate(parseInt(newDrawLimit, 10))} disabled={saveDrawLimit.isPending}>Salvar</Button>
              {drawOverride && (
                <Button size="sm" variant="outline" className="text-destructive" onClick={() => saveDrawLimit.mutate(null)} disabled={saveDrawLimit.isPending}>
                  Remover override
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setEditingDraw(false)}>Cancelar</Button>
            </div>
          )}
        </div>

        <Separator />

        {/* Tabela de níveis */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">Tabela de Níveis</p>
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead className="text-right">XP mínimo</TableHead>
                  <TableHead className="w-6" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {CELESTIAL_LEVELS.map((lvl, i) => {
                  const isCurrent = lvl.name === currentLevel.name;
                  return (
                    <TableRow key={lvl.name} className={isCurrent ? "bg-primary/5" : ""}>
                      <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell className="text-sm">
                        <span className="mr-1.5">{lvl.emoji}</span>
                        <span className={isCurrent ? "font-semibold text-primary" : ""}>{lvl.name}</span>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{lvl.minFaithPoints.toLocaleString()}</TableCell>
                      <TableCell>{isCurrent && <Badge variant="outline" className="text-[10px] px-1 py-0">atual</Badge>}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Histórico de alterações */}
        {logs.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">Histórico de alterações</p>
              <div className="space-y-1.5">
                {(logs as any[]).map((l) => (
                  <div key={l.id} className="flex items-start justify-between text-xs py-1.5 border-b border-border/40 last:border-0">
                    <div>
                      <span className="font-medium text-foreground">{l.action === "xp_override" ? "XP" : l.action === "xp_multiplier" ? "Multiplicador" : "Role"}</span>
                      {l.reason && <span className="text-muted-foreground ml-1.5">— {l.reason}</span>}
                      <p className="text-muted-foreground mt-0.5">{authMap[l.moderator_id] || l.moderator_id?.slice(0, 8) + "…"}</p>
                    </div>
                    <span className="text-muted-foreground whitespace-nowrap ml-4">
                      {format(new Date(l.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
