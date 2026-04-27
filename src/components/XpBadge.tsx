import { getLevel, getNextLevel, getLevelProgress, CELESTIAL_LEVELS } from "@/lib/xp";
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

  const levelIndex = CELESTIAL_LEVELS.findIndex(l => l.name === level.name);
  const displayLevel = levelIndex !== -1 ? levelIndex + 1 : 1;
  const iconPath = `/level-icons/${displayLevel}.png`;
  
  return (
    <div className="flex flex-col gap-2 group cursor-pointer transition-colors hover:bg-black/5 p-2 rounded-2xl -m-2">
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
            <span className="text-xs text-muted-foreground font-medium ml-auto">{totalXp} Pontos de Fé</span>
          </div>
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className="font-black text-[#5a3e0a] text-lg whitespace-nowrap">
              Nível {displayLevel}
            </h3>
            {displayLevel <= 20 && (
              <img src={iconPath} alt={level.name} className="h-6 object-contain" />
            )}
            {displayLevel > 20 && (
              <span className="font-bold text-foreground text-sm">"{level.name}"</span>
            )}
          </div>
          <Progress value={progress} className="h-2 bg-secondary border border-primary/5" />
          <div className="flex justify-between items-center mt-1">
             <div />
             {next && (
               <span className="text-[10px] text-muted-foreground font-bold tracking-wider">
                 Proximo: {next.name}
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
