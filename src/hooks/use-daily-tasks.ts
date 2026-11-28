import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type DailyTaskType =
  | "pray_cause"
  | "read_gospel"
  | "read_promise"
  | "share_word"
  | "share_promise"
  | "send_invite"
  | "pray_rosary"
  | "live_prayer"
  | "share_cause"
  | "pray_novena";

export interface DailyTask {
  id: DailyTaskType;
  title: string;
  xpReward: number;
  route: string;
}

export const DAILY_TASKS: DailyTask[] = [
  { id: "pray_cause", title: "Orar por uma causa", xpReward: 10, route: "/pray" },
  { id: "read_gospel", title: "Ler o Evangelho do dia", xpReward: 15, route: "/daily-gospel" },
  { id: "read_promise", title: "Ler uma Divina Promessa", xpReward: 10, route: "/divine-promise" },
  { id: "share_word", title: "Compartilhar Evangelho do Dia", xpReward: 20, route: "/daily-gospel" },
  { id: "share_promise", title: "Compartilhar Divina Promessa", xpReward: 15, route: "/divine-promise" },
  { id: "send_invite", title: "Enviar um convite", xpReward: 30, route: "/profile" },
  { id: "pray_rosary", title: "Rezar um Terço", xpReward: 50, route: "/rosary-selection" },
  { id: "live_prayer", title: "Entrar na oração ao vivo", xpReward: 25, route: "/prayer-chain" },
  { id: "share_cause", title: "Compartilhar uma causa", xpReward: 15, route: "/pray" },
  { id: "pray_novena", title: "Rezar dia de Novena", xpReward: 30, route: "/novenas" },
];

interface CompletionResult {
  completed: boolean;
  awarded: boolean;
  points_awarded: number;
  bonus_awarded: boolean;
  total_xp: number;
}

export function useDailyTasks() {
  const [completedTasks, setCompletedTasks] = useState<DailyTaskType[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTasks = useCallback(async (activeUserId: string | null) => {
    if (!activeUserId) {
      setUserId(null);
      setCompletedTasks([]);
      setLoading(false);
      return;
    }

    setUserId(activeUserId);
    setLoading(true);
    const { data, error } = await supabase.rpc("get_daily_faith_tasks" as any);
    if (error) {
      setCompletedTasks([]);
      toast.error("Não foi possível carregar sua jornada diária.");
    } else {
      const validTaskIds = new Set(DAILY_TASKS.map((task) => task.id));
      const taskIds = ((data || []) as Array<{ task_id: string }>)
        .map((row) => row.task_id)
        .filter((taskId): taskId is DailyTaskType => validTaskIds.has(taskId as DailyTaskType));
      setCompletedTasks(taskIds);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) void loadTasks(session?.user.id || null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) void loadTasks(session?.user.id || null);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [loadTasks]);

  const completeTask = useCallback(async (taskId: DailyTaskType) => {
    if (!userId || completedTasks.includes(taskId)) return false;

    const taskDef = DAILY_TASKS.find((task) => task.id === taskId);
    if (!taskDef) return false;

    const { data, error } = await supabase.rpc("complete_daily_faith_task" as any, { p_task_id: taskId });
    if (error) {
      toast.error("Não foi possível concluir esta missão. Tente novamente.");
      return false;
    }

    const result = data as CompletionResult;
    if (!result.completed) return false;

    setCompletedTasks((current) => current.includes(taskId) ? current : [...current, taskId]);
    if (result.awarded) {
      toast.success(`Graça alcançada: +${result.points_awarded} Pontos de Fé! 🙏`, { description: taskDef.title });
    }

    if (result.bonus_awarded) {
      toast.success("Jornada de Fé: 5 concluídas! 🎉", { description: "Você ganhou +100 Pontos de Fé bônus!" });
    }
    return result.awarded;
  }, [completedTasks, userId]);

  return { completedTasks, completeTask, totalCompleted: completedTasks.length, loading };
}
