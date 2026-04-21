import { motion, AnimatePresence } from "framer-motion";
import { Card } from "./ui/card";
import { CheckCircle2, ChevronDown, ChevronUp, Sparkles, BookOpen, HeartHandshake, Share2, Crown } from "lucide-react";
import { useState } from "react";
import { useDailyTasks, DAILY_TASKS } from "@/hooks/use-daily-tasks";
import { Progress } from "./ui/progress";
import { cn } from "@/lib/utils";

export const JornadaFe = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { completedTasks, totalCompleted } = useDailyTasks();
  
  const isCrowned = totalCompleted >= 5;

  return (
    <Card className="mx-6 mt-4 p-1 rounded-[2rem] bg-gradient-to-br from-white/90 to-white/60 border border-primary/20 soft-shadow backdrop-blur-md overflow-hidden relative">
      <div 
        className="px-5 py-4 cursor-pointer flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-all", isCrowned ? "bg-amber-100 shadow-[0_0_15px_rgba(251,191,36,0.4)]" : "bg-primary/10")}>
               {isCrowned ? <Crown className="w-5 h-5 text-amber-600 animate-pulse" /> : <Sparkles className="w-5 h-5 text-primary" />}
            </div>
            <div>
                <h3 className="font-bold text-sm text-foreground">Jornada da Fé</h3>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mt-0.5">
                    {totalCompleted} de 5 missões concluídas
                </p>
            </div>
        </div>
        
        <div className="flex items-center gap-3">
             <div className="w-16 h-2 bg-secondary/50 rounded-full overflow-hidden">
                 <motion.div 
                    className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((totalCompleted / 5) * 100, 100)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                 />
             </div>
             {isExpanded ? <ChevronUp className="w-4 h-4 text-primary/50" /> : <ChevronDown className="w-4 h-4 text-primary/50" />}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-primary/5"
          >
            <div className="p-5 space-y-3">
                <p className="text-xs text-muted-foreground text-center mb-4 leading-relaxed px-2">
                    Complete pelo menos 5 ações diárias para fortalecer sua coroa de fé e receber <strong>+100 Pontos extras!</strong>
                </p>
                <div className="grid grid-cols-1 gap-2">
                    {DAILY_TASKS.map((task) => {
                        const isDone = completedTasks.includes(task.id);
                        return (
                            <div 
                                key={task.id} 
                                className={cn(
                                    "flex items-center justify-between p-3 rounded-2xl border transition-all", 
                                    isDone ? "bg-primary/5 border-primary/20" : "bg-white border-transparent hover:border-primary/10"
                                )}
                            >
                                <span className={cn("text-xs font-semibold", isDone ? "text-primary/70 line-through decoration-primary/30" : "text-foreground")}>
                                    {task.title} <span className="opacity-50 text-[10px]">+{task.xpReward} XP</span>
                                </span>
                                {isDone ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-primary/10" />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};
