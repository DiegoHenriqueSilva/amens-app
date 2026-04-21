import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronRight, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface MercyChapletProps {
  onComplete: () => void;
}

export const MercyChaplet = ({ onComplete }: MercyChapletProps) => {
  const [bead, setBead] = useState(0); // 0-54 total steps
  
  // Logic: 
  // Step 0: Large Bead (Decade 1)
  // Steps 1-10: Small Beads
  // Step 11: Large Bead (Decade 2)
  // ... and so on
  
  const isLargeBead = (step: number) => step % 11 === 0 && step < 55;
  const isSmallBead = (step: number) => step % 11 !== 0 && step < 55;
  const isConclusion = (step: number) => step >= 55;

  const getDecade = (step: number) => Math.floor(step / 11) + 1;
  const getSmallBeadCount = (step: number) => step % 11;

  const prayers = {
    large: "Eterno Pai, eu Vos ofereço o Corpo e o Sangue, a Alma e a Divindade do Vosso diletíssimo Filho, Nosso Senhor Jesus Cristo, em expiação dos nossos pecados e dos do mundo inteiro.",
    small: "Pela Sua dolorosa Paixão, tende misericórdia de nós e do mundo inteiro.",
    conclusion: "Santo Deus, Santo Forte, Santo Imortal, tende piedade de nós e do mundo inteiro. (3 vezes)"
  };

  const handleNext = () => {
    if (bead < 55) {
      setBead(bead + 1);
    } else {
      onComplete();
    }
  };

  const handleReset = () => setBead(0);

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto">
      {/* Progress Circles */}
      <div className="flex flex-wrap justify-center gap-1.5 mb-10 px-4">
        {Array.from({ length: 5 }).map((_, d) => (
           <div key={d} className="flex items-center gap-1">
             {/* Large Bead Indicator */}
             <div 
               className={cn(
                 "w-3 h-3 rounded-full border border-primary/30 transition-all duration-300",
                 bead >= d * 11 ? "bg-primary scale-110" : "bg-primary/5"
               )} 
             />
             {/* Small Beads Indicators */}
             <div className="flex gap-0.5">
                {Array.from({ length: 10 }).map((_, b) => {
                  const currentIdx = (d * 11) + (b + 1);
                  return (
                    <div 
                      key={b} 
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-all duration-300",
                        bead >= currentIdx ? "bg-primary" : "bg-primary/10"
                      )}
                    />
                  );
                })}
             </div>
           </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={bead}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          className="text-center min-h-[220px] flex flex-col justify-center px-4"
        >
          <div className="mb-4">
            {isLargeBead(bead) && (
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary bg-primary/10 px-4 py-1 rounded-full">
                Dezena {getDecade(bead)} • Conta Grande
              </span>
            )}
            {isSmallBead(bead) && (
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground bg-secondary px-4 py-1 rounded-full">
                Dezena {getDecade(bead)} • Conta {getSmallBeadCount(bead)}/10
              </span>
            )}
            {isConclusion(bead) && (
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent bg-accent/10 px-4 py-1 rounded-full">
                Conclusão Final
              </span>
            )}
          </div>

          <p className={cn(
            "text-lg font-bold leading-relaxed transition-all duration-500",
            isLargeBead(bead) ? "text-primary" : "text-foreground/80 italic"
          )}>
            {isLargeBead(bead) ? prayers.large : (isConclusion(bead) ? prayers.conclusion : prayers.small)}
          </p>
        </motion.div>
      </AnimatePresence>

      <div className="mt-12 flex items-center gap-3 w-full">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={handleReset}
          className="rounded-2xl border-primary/5 hover:bg-primary/5 h-14 w-14 shrink-0 transition-all active:scale-95"
        >
          <RotateCcw className="w-5 h-5 text-muted-foreground" />
        </Button>
        
        <Button 
          onClick={handleNext} 
          className="flex-1 h-16 rounded-[2rem] gradient-divine shadow-lg hover:shadow-xl group font-black text-lg transition-all active:scale-[0.98]"
        >
          <span>{bead < 55 ? "Próxima Conta" : "Finalizar Terço"}</span>
          <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
      
      <p className="mt-6 text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest text-center">
        Toque para avançar no seu ritmo
      </p>
    </div>
  );
};
