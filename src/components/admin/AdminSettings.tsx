import { useEffect, useId, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { adminRpc } from "@/lib/admin-rpc";
import { CELESTIAL_LEVELS } from "@/lib/faith-points";

type Setting = { value: string | null; default: string; updated_at: string | null; updated_by_name: string | null };
type Level = { number: number; min_xp: number; daily_prayers: number; people: number };
type SettingsRes = {
  settings: Record<"xp_global_multiplier" | "auto_escalate_threshold", Setting>;
  overrides: number;
  levels: Level[];
};
type Key = keyof SettingsRes["settings"];

const fmt = (v: string) => v.replace(".", ",");

function lastChange(s: Setting) {
  if (!s.updated_at) return "Ainda no valor padrão.";
  return `Alterado ${s.updated_by_name ? `por ${s.updated_by_name} ` : ""}em ${format(new Date(s.updated_at), "dd/MM/yyyy 'às' HH:mm")}.`;
}

function validate(key: Key, raw: string): string | null {
  const v = raw.trim().replace(",", ".");
  if (key === "xp_global_multiplier") {
    if (!/^\d+(\.\d)?$/.test(v)) return "Use um número com até 1 casa decimal, de 0,1 a 10.";
    const n = Number(v);
    if (n < 0.1 || n > 10) return "O multiplicador vai de 0,1 a 10.";
    return null;
  }
  if (!/^\d+$/.test(v)) return "Use um número inteiro de 2 a 20.";
  const n = Number(v);
  if (n < 2 || n > 20) return "O número de pessoas vai de 2 a 20.";
  return null;
}

export default function AdminSettings() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => adminRpc<SettingsRes>("admin_get_settings", {}),
  });

  if (isLoading) return <p role="status" className="p-6 text-muted-foreground">Carregando configurações…</p>;
  if (isError || !data) {
    return (
      <div className="p-4 md:p-6">
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <AlertTriangle className="w-4 h-4 text-destructive" aria-hidden="true" />
          <span className="flex-1">Não foi possível carregar as configurações. Nada foi alterado. {error instanceof Error ? error.message : ""}</span>
          <Button size="sm" variant="outline" onClick={() => void refetch()}><RefreshCw className="w-4 h-4 mr-1" aria-hidden="true" /> Tentar novamente</Button>
        </div>
      </div>
    );
  }

  const mult = Number((data.settings.xp_global_multiplier.value ?? "1").replace(",", ".")) || 1;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground text-sm">Parâmetros que valem para todo o Améns. Cada alteração fica no log de moderação.</p>
      </div>

      <SettingCard
        k="xp_global_multiplier"
        s={data.settings.xp_global_multiplier}
        title="Multiplicador de XP"
        description="Multiplica o XP de todas as ações da Jornada da Fé."
        label="Multiplicador"
        inputMode="decimal"
        help={(v) => {
          const n = Number(v.replace(",", ".")) || 1;
          return `Vale para os próximos ganhos; o XP já acumulado não muda. Exemplo: orar vale 10 XP, com ${fmt(String(n))} passa a valer ${Math.round(10 * n)} XP. `
            + (data.overrides > 0
              ? `${data.overrides === 1 ? "1 pessoa tem" : `${data.overrides} pessoas têm`} multiplicador individual (em Usuários); para elas, os dois se multiplicam.`
              : "Quem tiver multiplicador individual (em Usuários) recebe os dois multiplicados.");
        }}
      />

      <SettingCard
        k="auto_escalate_threshold"
        s={data.settings.auto_escalate_threshold}
        title="Revisão automática por denúncias"
        description="Quantas pessoas diferentes precisam denunciar um pedido ativo para ele sair do ar e ir para revisão."
        label="Pessoas diferentes"
        inputMode="numeric"
        help={(v) => `Com ${v || "N"}, quando ${v || "N"} pessoas diferentes denunciarem o mesmo pedido ativo, ele fica "Em revisão" e o autor é avisado. Vale para as próximas denúncias. O mínimo é 2: com 1, uma única pessoa tiraria qualquer pedido do ar.`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Níveis da Jornada da Fé</CardTitle>
          <CardDescription>
            Só leitura. Os níveis são fixos no app e no banco. Cada nível muda quantas orações por dia a pessoa pode registrar
            (2 + nível ÷ 5, arredondado para baixo). Multiplicador atual: {fmt(String(mult))}×.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead className="text-right">XP mínimo</TableHead>
                  <TableHead className="text-right">Orações/dia</TableHead>
                  <TableHead className="text-right">Pessoas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.levels.map((l) => {
                  const meta = CELESTIAL_LEVELS[l.number - 1];
                  return (
                    <TableRow key={l.number}>
                      <TableCell className="text-muted-foreground text-xs">{l.number}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{meta ? `${meta.emoji} ${meta.name}` : "—"}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{l.min_xp.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{l.daily_prayers}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{l.people}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Administradores não têm limite diário. "Pessoas" conta quem já ganhou algum XP.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingCard({ k, s, title, description, label, help, inputMode }: {
  k: Key; s: Setting; title: string; description: string; label: string;
  help: (v: string) => string; inputMode: "decimal" | "numeric";
}) {
  const id = useId();
  const qc = useQueryClient();
  const saved = fmt(s.value ?? s.default);
  const [value, setValue] = useState(saved);
  const [baseline, setBaseline] = useState({ value: saved, at: s.updated_at });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Valor novo vindo do servidor: só substitui o campo se não houver edição em andamento.
  useEffect(() => {
    if (baseline.at === s.updated_at && baseline.value === saved) return;
    if (value.trim() === baseline.value) setValue(saved);
    setBaseline({ value: saved, at: s.updated_at });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved, s.updated_at]);

  const dirty = value.trim() !== baseline.value;
  const invalid = dirty ? validate(k, value) : null;

  async function save() {
    if (!dirty || invalid || saving) return;
    setSaving(true); setErr(null);
    try {
      const res = await adminRpc<{ value: string }>("admin_set_setting", { p_key: k, p_value: value, p_expected_updated_at: baseline.at });
      toast.success(`${title}: salvo (${fmt(res.value)}).`);
      setValue(fmt(res.value));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
      await qc.invalidateQueries({ queryKey: ["admin-settings"] });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); void save(); }} aria-label={title}>
          <Label htmlFor={`${id}-v`}>{label}</Label>
          <div className="flex flex-wrap items-start gap-2">
            <Input id={`${id}-v`} className="w-32" inputMode={inputMode} value={value}
              onChange={(e) => { setValue(e.target.value); setErr(null); }}
              aria-invalid={!!invalid} aria-describedby={`${id}-help ${id}-state`} />
            <Button type="submit" disabled={!dirty || !!invalid || saving}>{saving ? "Salvando…" : "Salvar"}</Button>
            {dirty && <Button type="button" variant="outline" disabled={saving} onClick={() => { setValue(baseline.value); setErr(null); }}>Desfazer</Button>}
          </div>
          <p id={`${id}-state`} className={`text-xs ${invalid ? "text-destructive" : dirty ? "text-amber-700 dark:text-amber-400 font-medium" : "text-muted-foreground"}`} aria-live="polite">
            {invalid ?? (dirty ? `Alteração não salva (salvo: ${baseline.value}).` : lastChange(s))}
          </p>
          <p id={`${id}-help`} className="text-xs text-muted-foreground">{help(value.trim() || baseline.value)}</p>
          {err && (
            <div role="alert" className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{err}</span>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
