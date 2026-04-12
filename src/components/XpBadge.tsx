import { getLevel, getNextLevel, getLevelProgress } from "@/lib/xp";
import { Progress } from "@/components/ui/progress";
import { BookOpen } from "lucide-react";

interface XpBadgeProps {
  totalXp: number;
  userName?: string;
  avatarUrl?: string | null;
}

export function XpBadge({ totalXp, userName, avatarUrl }: XpBadgeProps) {
  const level = getLevel(totalXp);
  const next = getNextLevel(totalXp);
  const progress = getLevelProgress(totalXp);

  return (
    <div className="flex flex-col gap-2 group cursor-pointer transition-colors hover:bg-black/5 p-2 rounded-2xl -m-2">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-secondary/50 rounded-xl flex items-center justify-center text-2xl shadow-inner overflow-hidden border border-primary/10">
          {avatarUrl ? (
            <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
          ) : (
            level.emoji
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-baseline justify-between mb-0.5">
            {userName && <p className="text-sm font-black uppercase tracking-widest truncate max-w-[150px]" style={{color: '#5a3e0a'}}>{userName.split(' ')[0]}</p>}
            <span className="text-xs text-muted-foreground font-medium ml-auto">{totalXp} XP</span>
          </div>
          <div className="flex items-baseline justify-between mb-1">
            <h3 className="font-bold text-foreground text-lg">{level.name}</h3>
          </div>
          <Progress value={progress} className="h-2 bg-secondary border border-primary/5" />
          <div className="flex justify-between items-center mt-1">
             <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{totalXp} XP</span>
             {next && (
               <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                 Próximo: {next.name} ({next.minXp} XP)
               </span>
             )}
          </div>
        </div>
        <div className="w-14 h-14 flex items-center justify-center overflow-visible relative flex-shrink-0">
           <img src="/livro_3d.png" alt="Sagração" className="w-full h-full object-contain transition-all duration-500 drop-shadow-sm group-active:drop-shadow-[0_0_20px_rgba(255,215,0,1)] group-active:brightness-125 group-active:scale-110" />
        </div>
      </div>
    </div>
  );
}
