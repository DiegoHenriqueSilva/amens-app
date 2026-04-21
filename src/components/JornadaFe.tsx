import { motion, AnimatePresence } from "framer-motion";
import { Card } from "./ui/card";
import { CheckCircle2, ChevronDown, ChevronUp, Sparkles, Crown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDailyTasks, DAILY_TASKS } from "@/hooks/use-daily-tasks";
import { cn } from "@/lib/utils";

export const JornadaFe = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { completedTasks, totalCompleted } = useDailyTasks();
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
            <div className="px-4 py-3 space-y-1">
                <p className="text-[11px] text-muted-foreground text-center mb-2 leading-relaxed px-1">
                    Complete pelo menos 5 ações diárias para fortalecer sua coroa de fé e receber <strong className="text-[#8b6508]">+100 Pontos extras!</strong>
                </p>
                <div className="grid grid-cols-1 gap-1">
                    {DAILY_TASKS.map((task) => {
                        const isDone = completedTasks.includes(task.id);
                        return (
                            <div 
                                key={task.id} 
                                onClick={() => {
                                  if (!isDone) {
                                    navigate(task.route);
                                  }
                                }}
                                className={cn(
                                    "flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer group", 
                                    isDone ? "bg-primary/5 border border-primary/10" : "bg-transparent border border-transparent hover:bg-white/50"
                                )}
                            >
                                <span className={cn("text-[11px] font-semibold transition-colors", isDone ? "text-primary/60 line-through decoration-primary/20" : "text-foreground group-hover:text-primary")}>
                                    {task.title} <span className="opacity-40 text-[9px] font-bold ml-1">+{task.xpReward} XP</span>
                                </span>
                                {isDone ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                ) : (
                                    <div className="w-4 h-4 rounded-full border-[1.5px] border-primary/20 shrink-0 group-hover:border-primary/40 transition-colors" />
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
    </div>
  );
};
