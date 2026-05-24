import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { CELESTIAL_LEVELS } from "@/lib/faith-points";

type AppSetting = { key: string; value: string };

async function fetchSettings(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from("app_settings" as any)
    .select("key, value");
  if (error) throw error;
  const map: Record<string, string> = {};
  (data as AppSetting[]).forEach((s) => { map[s.key] = s.value; });
  return map;
}

async function updateSetting(key: string, value: string) {
  const { data: session } = await supabase.auth.getSession();
  const { error } = await supabase
    .from("app_settings" as any)
    .update({ value, updated_at: new Date().toISOString(), updated_by: session.session?.user.id })
    .eq("key", key);
  if (error) throw error;
}

export default function AdminSettings() {
  const qc = useQueryClient();

  const { data: settings = {}, isLoading } = useQuery({
    queryKey: ["app-settings"],
    queryFn: fetchSettings,
  });

  // --- XP multiplier ---
  const [xpMultiplier, setXpMultiplier] = useState("1.0");
  const [escalateThreshold, setEscalateThreshold] = useState("3");
  const [drawLimit, setDrawLimit] = useState("3");

  useEffect(() => {
    if (settings["xp_global_multiplier"]) setXpMultiplier(settings["xp_global_multiplier"]);
    if (settings["auto_escalate_threshold"]) setEscalateThreshold(settings["auto_escalate_threshold"]);
    if (settings["draw_daily_limit"]) setDrawLimit(settings["draw_daily_limit"]);
  }, [settings]);

  // XP levels from app_settings (optional override)
  const xpLevelsJson = settings["xp_levels_json"] ? JSON.parse(settings["xp_levels_json"]) : null;
  const [levelThresholds, setLevelThresholds] = useState<number[]>(
    CELESTIAL_LEVELS.map((l) => l.minFaithPoints)
  );
  useEffect(() => {
    if (xpLevelsJson) setLevelThresholds(xpLevelsJson);
  }, [settings["xp_levels_json"]]);

  const saveSetting = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => updateSetting(key, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app-settings"] });
      toast.success("Configuração salva.");
    },
    onError: (e: any) => toast.error("Erro ao salvar: " + e.message),
  });

  if (isLoading) return <div className="p-6 text-muted-foreground">Carregando...</div>;

  return (
    <div className="p-6 space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground text-sm">Parâmetros globais da plataforma Amens</p>
      </div>

      {/* XP / Jornada da Fé */}
      <Card>
        <CardHeader>
          <CardTitle>XP / Jornada da Fé</CardTitle>
          <CardDescription>Multiplicador global de XP e thresholds de nível</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label>Multiplicador global de XP</Label>
              <p className="text-xs text-muted-foreground mb-1">Ex: 1.5 = 50% a mais de XP em todas as ações</p>
              <Input
                type="number"
                min="0.1"
                max="10"
                step="0.1"
                value={xpMultiplier}
                onChange={(e) => setXpMultiplier(e.target.value)}
              />
            </div>
            <Button
              onClick={() => saveSetting.mutate({ key: "xp_global_multiplier", value: xpMultiplier })}
              disabled={saveSetting.isPending}
            >
              Salvar
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Thresholds dos níveis (minXP)</Label>
            <p className="text-xs text-muted-foreground">Edite e salve para sobrescrever os valores padrão</p>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead className="w-32">Min XP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {CELESTIAL_LEVELS.map((level, idx) => (
                    <TableRow key={level.name}>
                      <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                      <TableCell className="text-sm">{level.emoji} {level.name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          className="h-7 text-xs"
                          value={levelThresholds[idx] ?? level.minFaithPoints}
                          onChange={(e) => {
                            const next = [...levelThresholds];
                            next[idx] = parseInt(e.target.value) || 0;
                            setLevelThresholds(next);
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button
              onClick={() => saveSetting.mutate({ key: "xp_levels_json", value: JSON.stringify(levelThresholds) })}
              disabled={saveSetting.isPending}
            >
              Salvar thresholds
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sorteio */}
      <Card>
        <CardHeader>
          <CardTitle>Limite do Sorteio</CardTitle>
          <CardDescription>Limite diário global de sorteios (override por usuário nos Detalhes do Usuário)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label>Limite diário global</Label>
              <Input
                type="number"
                min="0"
                value={drawLimit}
                onChange={(e) => setDrawLimit(e.target.value)}
              />
            </div>
            <Button
              onClick={() => saveSetting.mutate({ key: "draw_daily_limit", value: drawLimit })}
              disabled={saveSetting.isPending}
            >
              Salvar
            </Button>
          </div>

        </CardContent>
      </Card>

      {/* Auto-escalação */}
      <Card>
        <CardHeader>
          <CardTitle>Auto-escalação de Reports</CardTitle>
          <CardDescription>Número mínimo de reports para escalar um pedido para revisão</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label>Threshold de reports</Label>
              <p className="text-xs text-muted-foreground mb-1">
                Quando um pedido de oração atingir este número de reports abertos, o status muda para "Em revisão"
              </p>
              <Input
                type="number"
                min="1"
                max="100"
                value={escalateThreshold}
                onChange={(e) => setEscalateThreshold(e.target.value)}
              />
            </div>
            <Button
              onClick={() => saveSetting.mutate({ key: "auto_escalate_threshold", value: escalateThreshold })}
              disabled={saveSetting.isPending}
            >
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
