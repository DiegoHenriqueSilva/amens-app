import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  Users, BookOpen, Flag, Church, Clock, Activity, UserPlus, TrendingUp, Percent, Zap, Info, AlertTriangle, RefreshCw,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

/*
 * Definições de cada métrica: docs/admin/ADM01-dashboard.md
 *  - Totais: estado ATUAL, contagem exata (count head) por card, com erro próprio.
 *  - Período: RPC admin_dashboard_period (agregação no servidor, sem limite de
 *    linhas), dias corridos no fuso America/Sao_Paulo, contando EVENTOS.
 */

type Period = "today" | "week" | "month";

const PERIOD_LABELS: Record<Period, string> = { today: "Hoje", week: "Semana", month: "Mês" };
const PERIOD_DESCRIPTIONS: Record<Period, string> = {
  today: "hoje desde 00:00",
  week: "hoje e os 6 dias anteriores",
  month: "hoje e os 29 dias anteriores",
};

const numberFormat = new Intl.NumberFormat("pt-BR");
const percentFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

/** Resultado de uma métrica: valor exato ou erro explícito (nunca "0" por falha). */
type Metric = { value: number; error: null } | { value: null; error: string };

async function exactCount(query: PromiseLike<{ count: number | null; error: { message: string } | null }>): Promise<Metric> {
  const { count, error } = await query;
  if (error || count === null) return { value: null, error: error?.message ?? "Contagem indisponível" };
  return { value: count, error: null };
}

async function fetchTotals() {
  const [users, prayers, reports, pendingReview, churches] = await Promise.all([
    exactCount(supabase.from("profiles").select("id", { count: "exact", head: true }).is("deleted_at", null)),
    exactCount(supabase.from("prayer_requests").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("status", "active")),
    exactCount(supabase.from("prayer_reports").select("id", { count: "exact", head: true }).eq("status", "open").is("deleted_at", null)),
    exactCount(supabase.from("prayer_requests").select("id", { count: "exact", head: true }).eq("status", "pending_review").is("deleted_at", null)),
    exactCount(supabase.from("churches").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("status", "active")),
  ]);
  return { users, prayers, reports, pendingReview, churches };
}

interface PeriodStats {
  period: Period;
  timezone: string;
  first_day: string;
  last_day: string;
  generated_at: string;
  new_users: number;
  new_prayers: number;
  approved_prayers: number;
  approval_rate: number | null;
  new_reports: number;
  mod_actions: number;
  active_users: number;
  series: { day: string; prayers: number; mod_actions: number }[];
}

async function fetchPeriodStats(period: Period): Promise<PeriodStats> {
  // RPC criada em supabase/migrations/20261116030000_adm01_admin_dashboard_period.sql
  const { data, error } = await (supabase.rpc as unknown as (
    fn: string, args: Record<string, unknown>,
  ) => Promise<{ data: PeriodStats | null; error: { message: string } | null }>)("admin_dashboard_period", { p_period: period });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Resposta vazia do servidor");
  return data;
}

/** "2026-11-16" -> "16/11" sem passar por Date (evita deslocamento de fuso). */
function dayLabel(isoDay: string) {
  const [, m, d] = isoDay.split("-");
  return `${d}/${m}`;
}

function MetricCard({ label, metric, display, detail, icon: Icon, color, tooltip }: {
  label: string;
  metric: { loading: boolean; error: string | null; value: number | null };
  display?: string;
  detail?: string;
  icon: LucideIcon;
  color: string;
  tooltip: string;
}) {
  const { loading, error, value } = metric;
  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-row items-start justify-between gap-2 p-4 pb-2 space-y-0">
        <div className="flex items-center gap-1 min-w-0">
          <CardTitle className="text-xs font-medium text-muted-foreground leading-tight">{label}</CardTitle>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="shrink-0 rounded-sm p-0.5 text-muted-foreground/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Como é calculado: ${label}`}
              >
                <Info className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" className="max-w-xs text-xs leading-relaxed">{tooltip}</PopoverContent>
          </Popover>
        </div>
        <Icon className={`w-4 h-4 ${color} shrink-0`} aria-hidden="true" />
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {loading ? (
          <div className="h-8 w-16 rounded bg-muted animate-pulse" role="status" aria-label={`Carregando ${label}`} />
        ) : error ? (
          <div className="flex items-center gap-1.5 text-sm text-destructive" role="alert" title={error}>
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Indisponível</span>
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold tabular-nums break-words">
              {display ?? (value === null ? "—" : numberFormat.format(value))}
            </div>
            {detail && <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const [period, setPeriod] = useState<Period>("week");

  const totalsQuery = useQuery({
    queryKey: ["admin-totals"],
    queryFn: fetchTotals,
    refetchInterval: 60000,
  });

  const periodQuery = useQuery({
    queryKey: ["admin-period-stats", period],
    queryFn: () => fetchPeriodStats(period),
    refetchInterval: 60000,
    retry: 1,
  });

  const totals = totalsQuery.data;
  const totalMetric = (key: keyof NonNullable<typeof totals>) => {
    if (totalsQuery.isLoading) return { loading: true, error: null, value: null };
    if (totalsQuery.isError) return { loading: false, error: (totalsQuery.error as Error).message, value: null };
    const m = totals![key];
    return { loading: false, error: m.error, value: m.value };
  };

  const stats = periodQuery.data;
  const periodMetric = (value: number | undefined) => {
    if (periodQuery.isLoading) return { loading: true, error: null, value: null };
    if (periodQuery.isError || !stats) return { loading: false, error: (periodQuery.error as Error | null)?.message ?? "Indisponível", value: null };
    return { loading: false, error: null, value: value ?? null };
  };

  const totalCards = [
    {
      label: "Usuários cadastrados",
      metric: totalMetric("users"),
      icon: Users,
      color: "text-blue-500",
      tooltip: "Estado atual: perfis não removidos (deleted_at vazio). Inclui usuários suspensos. Contas de login sem perfil não entram.",
    },
    {
      label: "Pedidos ativos",
      metric: totalMetric("prayers"),
      icon: BookOpen,
      color: "text-green-500",
      tooltip: "Estado atual: pedidos com status 'active' e não removidos. São os visíveis ao público. Pedidos concluídos (completed) não entram.",
    },
    {
      label: "Reports abertos",
      metric: totalMetric("reports"),
      icon: Flag,
      color: "text-red-500",
      tooltip: "Estado atual: denúncias com status 'open' e não removidas. Aguardam ação da moderação.",
    },
    {
      label: "Revisão pendente",
      metric: totalMetric("pendingReview"),
      icon: Clock,
      color: "text-yellow-500",
      tooltip: "Estado atual: pedidos com status 'pending_review' e não removidos. Estão ocultos do público e aguardam aprovação ou rejeição.",
    },
    {
      label: "Igrejas ativas",
      metric: totalMetric("churches"),
      icon: Church,
      color: "text-purple-500",
      tooltip: "Estado atual: igrejas com status 'active' e não removidas. Sugestões em revisão não entram.",
    },
  ];

  const periodText = PERIOD_DESCRIPTIONS[period];
  const periodCards = [
    {
      label: "Novos usuários",
      metric: periodMetric(stats?.new_users),
      icon: UserPlus,
      color: "text-blue-500",
      tooltip: `Perfis criados no período (${periodText}, horário de Brasília), inclusive os removidos depois.`,
    },
    {
      label: "Novos pedidos",
      metric: periodMetric(stats?.new_prayers),
      icon: TrendingUp,
      color: "text-green-500",
      tooltip: `Pedidos de oração criados no período (${periodText}), em qualquer status, inclusive os removidos depois pela moderação.`,
    },
    {
      label: "Usuários ativos",
      metric: periodMetric(stats?.active_users),
      icon: Zap,
      color: "text-violet-500",
      tooltip: `Pessoas diferentes (logadas) que criaram um pedido OU participaram da corrente de oração no período (${periodText}). Participações anônimas não entram.`,
    },
    {
      label: "Taxa de aprovação",
      metric: periodMetric(stats?.approval_rate ?? undefined),
      display: stats && stats.approval_rate !== null ? `${percentFormat.format(stats.approval_rate)}%` : undefined,
      detail: stats ? `${numberFormat.format(stats.approved_prayers)} de ${numberFormat.format(stats.new_prayers)} pedidos` : undefined,
      icon: Percent,
      color: "text-teal-500",
      tooltip: `Pedidos criados no período que hoje estão aprovados (status 'active' ou 'completed' e não removidos) ÷ todos os pedidos criados no período, inclusive os removidos. Sem pedidos no período, mostra "—".`,
    },
    {
      label: "Novos reports",
      metric: periodMetric(stats?.new_reports),
      icon: Flag,
      color: "text-red-500",
      tooltip: `Denúncias criadas no período (${periodText}), em qualquer status.`,
    },
    {
      label: "Ações de moderação",
      metric: periodMetric(stats?.mod_actions),
      icon: Activity,
      color: "text-orange-500",
      tooltip: `Registros do log de moderação criados no período (${periodText}): aprovações, remoções, suspensões, papéis etc.`,
    },
  ];

  const chartData = (stats?.series ?? []).map((p) => ({ date: dayLabel(p.day), pedidos: p.prayers, moderacao: p.mod_actions }));
  const rangeLabel = stats
    ? stats.first_day === stats.last_day
      ? dayLabel(stats.last_day)
      : `${dayLabel(stats.first_day)} a ${dayLabel(stats.last_day)}`
    : null;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Visão geral do sistema</p>
      </div>

      <section aria-labelledby="dash-totais">
        <h2 id="dash-totais" className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Totais agora
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          {totalCards.map((card) => <MetricCard key={card.label} {...card} />)}
        </div>
      </section>

      <section aria-labelledby="dash-periodo" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="dash-periodo" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Atividade no período
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5" aria-live="polite">
              {rangeLabel ? `${rangeLabel} · horário de Brasília` : " "}
            </p>
          </div>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList aria-label="Período">
              {(["today", "week", "month"] as Period[]).map((p) => (
                <TabsTrigger key={p} value={p}>{PERIOD_LABELS[p]}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {periodQuery.isError && (
          <div role="alert" className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" aria-hidden="true" />
            <span className="flex-1 min-w-0">Não foi possível carregar as métricas do período. Os totais acima continuam válidos.</span>
            <Button size="sm" variant="outline" onClick={() => void periodQuery.refetch()} className="gap-1">
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Tentar novamente
            </Button>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {periodCards.map((card) => <MetricCard key={card.label} {...card} />)}
        </div>
      </section>

      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-sm font-medium">
            Pedidos criados × ações de moderação por dia — {PERIOD_LABELS[period].toLowerCase()}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-56 p-2 md:p-6 md:pt-0">
          {periodQuery.isError ? (
            <p className="h-full flex items-center justify-center text-sm text-muted-foreground">Gráfico indisponível.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={16} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={40} />
                <ChartTooltip formatter={(v: number) => numberFormat.format(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="pedidos" name="Pedidos criados" stroke="hsl(var(--primary))" strokeWidth={2} dot={period === "today"} />
                <Line type="monotone" dataKey="moderacao" name="Ações de moderação" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 3" dot={period === "today"} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
