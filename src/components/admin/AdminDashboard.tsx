import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, BookOpen, Flag, Church, Clock, Activity, UserPlus, TrendingUp } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, Legend,
} from "recharts";
import { format, subDays, startOfToday } from "date-fns";

type Period = "today" | "week" | "month";

const PERIOD_LABELS: Record<Period, string> = { today: "Hoje", week: "Semana", month: "Mês" };

function periodStart(period: Period): string {
  if (period === "today") return startOfToday().toISOString();
  if (period === "week") return subDays(new Date(), 7).toISOString();
  return subDays(new Date(), 30).toISOString();
}

function periodDays(period: Period): number {
  if (period === "today") return 1;
  if (period === "week") return 7;
  return 30;
}

async function fetchTotals() {
  const [users, prayers, reports, churches, pendingReview] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("prayer_requests").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("status", "active"),
    supabase.from("prayer_reports").select("id", { count: "exact", head: true }).eq("status", "open").is("deleted_at", null),
    supabase.from("churches").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("status", "active"),
    supabase.from("prayer_requests").select("id", { count: "exact", head: true }).eq("status", "pending_review").is("deleted_at", null),
  ]);
  return {
    users: users.count ?? 0,
    prayers: prayers.count ?? 0,
    reports: reports.count ?? 0,
    churches: churches.count ?? 0,
    pendingReview: pendingReview.count ?? 0,
  };
}

async function fetchPeriodStats(period: Period) {
  const since = periodStart(period);
  const days = periodDays(period);

  const [newUsers, newPrayers, newReports, modLogsRaw, prayersChartRaw] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since),
    supabase.from("prayer_requests").select("id", { count: "exact", head: true }).gte("created_at", since),
    supabase.from("prayer_reports").select("id", { count: "exact", head: true }).gte("created_at", since),
    supabase.from("moderation_logs").select("created_at").gte("created_at", since).limit(1000),
    supabase.from("prayer_requests").select("created_at").gte("created_at", since).limit(1000),
  ]);

  const buckets: Record<string, { date: string; pedidos: number; moderacao: number }> = {};
  for (let i = days - 1; i >= 0; i--) {
    const key = format(subDays(new Date(), i), "dd/MM");
    buckets[key] = { date: key, pedidos: 0, moderacao: 0 };
  }
  (prayersChartRaw.data || []).forEach((r: any) => {
    const key = format(new Date(r.created_at), "dd/MM");
    if (buckets[key]) buckets[key].pedidos++;
  });
  (modLogsRaw.data || []).forEach((r: any) => {
    const key = format(new Date(r.created_at), "dd/MM");
    if (buckets[key]) buckets[key].moderacao++;
  });

  return {
    newUsers: newUsers.count ?? 0,
    newPrayers: newPrayers.count ?? 0,
    newReports: newReports.count ?? 0,
    modActions: (modLogsRaw.data || []).length,
    chartData: Object.values(buckets),
  };
}

export default function AdminDashboard() {
  const [period, setPeriod] = useState<Period>("week");

  const { data: totals, isLoading: loadingTotals } = useQuery({
    queryKey: ["admin-totals"],
    queryFn: fetchTotals,
    refetchInterval: 60000,
  });

  const { data: periodStats, isLoading: loadingPeriod } = useQuery({
    queryKey: ["admin-period-stats", period],
    queryFn: () => fetchPeriodStats(period),
    refetchInterval: 60000,
  });

  const totalCards = [
    { label: "Usuários cadastrados", value: totals?.users, icon: Users, color: "text-blue-500" },
    { label: "Pedidos ativos", value: totals?.prayers, icon: BookOpen, color: "text-green-500" },
    { label: "Reports abertos", value: totals?.reports, icon: Flag, color: "text-red-500" },
    { label: "Revisão pendente", value: totals?.pendingReview, icon: Clock, color: "text-yellow-500" },
    { label: "Igrejas ativas", value: totals?.churches, icon: Church, color: "text-purple-500" },
  ];

  const periodCards = [
    { label: "Novos usuários", value: periodStats?.newUsers, icon: UserPlus, color: "text-blue-500" },
    { label: "Novos pedidos", value: periodStats?.newPrayers, icon: TrendingUp, color: "text-green-500" },
    { label: "Novos reports", value: periodStats?.newReports, icon: Flag, color: "text-red-500" },
    { label: "Ações de moderação", value: periodStats?.modActions, icon: Activity, color: "text-orange-500" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Visão geral do sistema</p>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Totais</p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {totalCards.map((card) => (
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-medium text-muted-foreground">{card.label}</CardTitle>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loadingTotals ? "—" : card.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Atividade no período</p>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList>
              {(["today", "week", "month"] as Period[]).map((p) => (
                <TabsTrigger key={p} value={p}>{PERIOD_LABELS[p]}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {periodCards.map((card) => (
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-medium text-muted-foreground">{card.label}</CardTitle>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loadingPeriod ? "—" : card.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Pedidos de oração × ações de moderação — {PERIOD_LABELS[period].toLowerCase()}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={periodStats?.chartData ?? []}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <ChartTooltip />
              <Legend />
              <Line type="monotone" dataKey="pedidos" name="Pedidos" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="moderacao" name="Moderação" stroke="#22c55e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
