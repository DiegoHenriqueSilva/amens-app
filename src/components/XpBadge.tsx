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
    <div className="flex flex-col gap-2">
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
            <h3 className="font-bold text-foreground text-lg">
              Nível {CELESTIAL_LEVELS.indexOf(level)} "{level.name}"
            </h3>
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
        <div className="w-10 h-10 border border-primary/10 rounded-xl flex items-center justify-center text-primary/40">
           <BookOpen className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
