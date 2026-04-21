import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useXp } from "./use-xp";
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
  | "share_cause";

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
];

export function useDailyTasks() {
  const [completedTasks, setCompletedTasks] = useState<DailyTaskType[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const { addXp } = useXp();

  // Helper para gerar a chave diária
  const getDailyKey = (uid: string) => {
    const today = new Date().toISOString().split("T")[0];
    return `amens_journey_${uid}_${today}`;
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUserId(session.user.id);
        const stored = localStorage.getItem(getDailyKey(session.user.id));
        if (stored) {
          try {
            setCompletedTasks(JSON.parse(stored));
          } catch(e) {}
        }
      }
    });
  }, []);

  const completeTask = async (taskId: DailyTaskType) => {
    if (!userId) return;
    
    // Já completou hoje
    if (completedTasks.includes(taskId)) return;

    // Recupera dados
    const taskDef = DAILY_TASKS.find(t => t.id === taskId);
    if (!taskDef) return;

    // Atualiza estado e localstorage
    const newCompleted = [...completedTasks, taskId];
    setCompletedTasks(newCompleted);
    localStorage.setItem(getDailyKey(userId), JSON.stringify(newCompleted));

    // Award XP (Note: we use a custom action bypass or generic action in addXp if possible, 
    // mas se o addXP rpc só aceitar 'pray', 'submit', 'react', chamaremos multiplas vezes ou ajustamos o payload)
    // Para simplificar e contornar a limitação do enum 'action' da RPC, se o backend rejeitar actions soltos, usaremos 'pray' como base.
    try {
        await supabase.rpc("add_xp", {
            p_user_id: userId,
            p_xp_amount: taskDef.xpReward,
            p_action: "pray" // Fallback seguro
        });
        toast.success(`Graça Alcançada: +${taskDef.xpReward} Pontos! 🙏`, { description: taskDef.title });
    } catch(e) {}

    // Bonus check (Se bateu 5 tasks no momento deste clique)
    if (newCompleted.length === 5) {
        toast.success("Jornada de Fé: 5 Concluídas! 🎉", { description: "Você ganhou +100 Pontos Bônus!" });
        await supabase.rpc("add_xp", { p_user_id: userId, p_xp_amount: 100, p_action: "pray" });
    }
  };

  return { completedTasks, completeTask, totalCompleted: completedTasks.length };
}
