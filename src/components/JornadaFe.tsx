import { motion, AnimatePresence } from "framer-motion";
import { Card } from "./ui/card";
import { CheckCircle2, ChevronDown, ChevronUp, Sparkles, Crown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDailyTasks, DAILY_TASKS } from "@/hooks/use-daily-tasks";
import { cn } from "@/lib/utils";

export const JornadaFe = ({ compact = false }: { compact?: boolean }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { completedTasks, totalCompleted, loading } = useDailyTasks();
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  
  const isCrowned = totalCompleted >= 5;

  // Click outside to collapse
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };
    if (isExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isExpanded]);

  return (
    <div ref={cardRef}>
      <Card className={cn("border border-primary/20 overflow-hidden relative", compact ? "rounded-[18px] bg-white/95 shadow-sm" : "mx-6 mt-4 p-1 rounded-[2rem] bg-gradient-to-br from-white/90 to-white/60 soft-shadow backdrop-blur-md")} aria-busy={loading}>
      <button
        type="button"
        aria-expanded={isExpanded}
        className={cn("w-full text-left cursor-pointer flex items-center justify-between gap-2", compact ? "px-3 py-2.5 min-h-[58px]" : "px-5 py-4")}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={cn("flex items-center min-w-0", compact ? "gap-2" : "gap-3")}>
            <div className={cn("shrink-0 rounded-full flex items-center justify-center", compact ? "w-6 h-6" : "w-10 h-10 bg-primary/10", isCrowned && "bg-amber-100")}>
               {isCrowned ? <Crown className="w-5 h-5 text-amber-600 animate-pulse" /> : <Sparkles className="w-5 h-5 text-primary" />}
            </div>
            <div>
                <h3 className={cn("font-bold text-foreground", compact ? "text-xs min-[520px]:text-base" : "text-sm")}>Jornada diária</h3>
                <p className={cn("text-muted-foreground mt-0.5", compact ? "text-[8px] min-[520px]:text-xs" : "text-[10px] uppercase font-bold tracking-widest")}>
                    {totalCompleted} de 5 missões concluídas
                </p>
            </div>
        </div>
        
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex flex-col items-end gap-1">
             {compact && <span className="text-[9px] min-[520px]:text-xs text-[#8b6508]">{totalCompleted}/5</span>}
             <div className={cn("amens-journey-progress bg-secondary/50 rounded-full overflow-hidden", compact ? "w-14 h-[5px] min-[520px]:w-16 min-[520px]:h-1.5" : "w-16 h-2")}>
                 <motion.div 
                    className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((totalCompleted / 5) * 100, 100)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                 />
             </div>
          </div>
             {isExpanded ? <ChevronUp className="w-4 h-4 text-primary/50" /> : <ChevronDown className="w-4 h-4 text-primary/50" />}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-primary/5"
          >
            <div className="px-4 py-3 space-y-1">
                <p id="journey-description" className="text-[11px] text-muted-foreground text-center mb-2 leading-relaxed px-1">
                    Complete pelo menos 5 ações diárias para fortalecer sua coroa de fé e receber <strong className="text-[#8b6508]">+100 Pontos extras!</strong>
                </p>
                {loading && <p role="status" className="text-center text-[10px] text-muted-foreground mb-2">Carregando suas missões…</p>}
                <div className="grid grid-cols-1 gap-1">
                    {DAILY_TASKS.map((task) => {
                        const isDone = completedTasks.includes(task.id);
                        return (
                            <button
                                type="button"
                                key={task.id} 
                                onClick={() => !isDone && navigate(task.route)}
                                disabled={isDone || loading}
                                aria-label={`${task.title}: ${isDone ? "concluída" : `vale ${task.xpReward} Pontos de Fé`}`}
                                aria-describedby="journey-description"
                                className={cn(
                                    "w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all text-left group disabled:cursor-default",
                                    isDone ? "bg-primary/5 border border-primary/10" : "bg-transparent border border-transparent hover:bg-white/50"
                                )}
                            >
                                <span className={cn("text-[11px] font-semibold transition-colors", isDone ? "text-primary/60 line-through decoration-primary/20" : "text-foreground group-hover:text-primary")}>
                                    {task.title} <span className="opacity-40 text-[9px] font-bold ml-1">+{task.xpReward} Pontos de Fé</span>
                                </span>
                                {isDone ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                ) : (
                                    <div className="w-4 h-4 rounded-full border-[1.5px] border-primary/20 shrink-0 group-hover:border-primary/40 transition-colors" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </Card>
    </div>
  );
};
