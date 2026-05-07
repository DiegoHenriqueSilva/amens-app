import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getLevel, getNextLevel, getLevelProgress, CELESTIAL_LEVELS } from "@/lib/faith-points";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface FaithPointsBadgeProps {
  totalFaithPoints: number;
  userName?: string;
  avatarUrl?: string | null;
}

export function FaithPointsBadge({ totalFaithPoints, userName, avatarUrl }: FaithPointsBadgeProps) {
  const navigate = useNavigate();
  const level = getLevel(totalFaithPoints);
  const next = getNextLevel(totalFaithPoints);
  const progress = getLevelProgress(totalFaithPoints);

  const levelIndex = CELESTIAL_LEVELS.findIndex(l => l.name === level.name);
  const displayLevel = levelIndex !== -1 ? levelIndex + 1 : 1;
  const iconPath = `/level-icons/${displayLevel}.png`;

  const [showLevelUpAnim, setShowLevelUpAnim] = useState(false);
  const lastLevelRef = useRef(displayLevel);

  useEffect(() => {
    // Only trigger if level actually increased and it's not the initial mount
    if (displayLevel > lastLevelRef.current) {
      setShowLevelUpAnim(true);
      const timer = setTimeout(() => setShowLevelUpAnim(false), 6000);
      return () => clearTimeout(timer);
    }
    lastLevelRef.current = displayLevel;
  }, [displayLevel]);

  return (
    <motion.div 
      animate={showLevelUpAnim ? {
        boxShadow: [
          "0 0 0px rgba(212, 175, 55, 0)",
          "0 0 25px rgba(212, 175, 55, 0.4)",
          "0 0 0px rgba(212, 175, 55, 0)"
        ],
        scale: [1, 1.02, 1],
      } : {}}
      transition={showLevelUpAnim ? {
        repeat: Infinity,
        duration: 2,
        ease: "easeInOut"
      } : {}}
      onClick={() => navigate("/profile")}
      className={cn(
        "flex flex-col gap-2 group cursor-pointer transition-all p-2 rounded-2xl -m-2 relative",
        showLevelUpAnim ? "bg-white/90 ring-2 ring-primary/20" : "hover:bg-black/5"
      )}
    >
      <AnimatePresence>
        {showLevelUpAnim && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute -top-3 -right-3 bg-primary text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg z-20 border-2 border-white animate-bounce"
          >
            NÍVEL UP! ✨
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-secondary/50 rounded-xl flex items-center justify-center text-2xl shadow-inner overflow-hidden border border-primary/10">
          {avatarUrl ? (
            <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
          ) : (
            <img src={iconPath} alt={level.name} className="w-full h-full object-contain p-1" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-baseline justify-between mb-0.5">
            {userName && <p className="text-sm font-black uppercase tracking-widest truncate max-w-[150px]" style={{color: '#5a3e0a'}}>{userName.split(' ')[0]}</p>}
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-xs text-muted-foreground font-medium">{totalFaithPoints} Pontos de Fé</span>
              <Dialog>
                <DialogTrigger asChild>
                  <button className="p-0.5 hover:bg-primary/10 rounded-full transition-colors outline-none" onClick={(e) => e.stopPropagation()}>
                    <Info className="w-3.5 h-3.5 text-primary/60" />
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-[90vw] sm:max-w-[400px] rounded-[2rem] border-primary/20 bg-white/95 backdrop-blur-md">
                  <DialogHeader className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                       <Info className="w-6 h-6 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-black text-foreground">Jornada da Fé</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground leading-relaxed pt-2">
                      Sua dedicação é o que move esta comunidade. Os <span className="font-bold text-foreground">Pontos de Fé</span> são conquistados através de cada oração, pedido e interação dentro do aplicativo.
                      <br /><br />
                      Ao subir de nível, você fortalece sua caminhada espiritual e desbloqueia <span className="font-bold text-foreground">novas funcionalidades e utilidades exclusivas</span> que serão disponibilizadas em breve.
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-black text-[#5a3e0a]/60 uppercase tracking-[0.2em] whitespace-nowrap">
              Nível {displayLevel}
            </span>
            {displayLevel <= 20 && (
              <img 
                src={iconPath} 
                alt={level.name} 
                className="h-6 w-auto object-contain drop-shadow-sm" 
              />
            )}
            {displayLevel > 20 && (
              <h3 className="font-black text-[#5a3e0a] text-xs">
                "{level.name}"
              </h3>
            )}
          </div>
          <Progress value={progress} className="h-2 bg-secondary border border-primary/5" />
          <div className="flex justify-between items-center mt-1.5">
             <div />
             {next && (
               <span className="text-[11px] text-muted-foreground font-bold tracking-tight">
                 Proximo: <span className="text-primary/70 uppercase font-black">{next.name}</span>
               </span>
             )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
