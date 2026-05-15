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
      <div className="flex flex-col items-center w-full max-w-xl mx-auto">
        {/* Progress Circles */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 mb-10 px-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#a0720a] w-5 h-5 opacity-80 shrink-0 mr-1">
            <path d="M12 2v20M6 8h12"/>
          </svg>
          {Array.from({ length: 5 }).map((_, d) => (
             <div key={d} className="flex items-center gap-1">
               {/* Large Bead Indicator */}
               <div 
                 className={cn(
                   "w-3 h-3 rounded-full border border-[#d4a017]/40 transition-all duration-300 shadow-sm",
                   bead >= d * 11 ? "bg-[#d4a017] border-[#d4a017] scale-110" : "bg-[#d4a017]/10"
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
                          bead >= currentIdx ? "bg-[#d4a017]" : "bg-[#d4a017]/20"
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
            initial={{ opacity: 0, y: 10, scale: 0.95, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, scale: 0.95, filter: "blur(4px)" }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="text-center min-h-[220px] flex flex-col justify-center px-4 w-full"
          >
            <div className="mb-6 flex justify-center">
              {isLargeBead(bead) && (
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#a0720a] bg-[#d4a017]/10 px-4 py-1.5 rounded-full shadow-sm border border-[#d4a017]/10">
                  Dezena {getDecade(bead)} • Conta Grande
                </span>
              )}
              {isSmallBead(bead) && (
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#3d2800]/60 bg-black/5 px-4 py-1.5 rounded-full">
                  Dezena {getDecade(bead)} • Conta {getSmallBeadCount(bead)}/10
                </span>
              )}
              {isConclusion(bead) && (
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#a0720a] bg-[#d4a017]/10 px-4 py-1.5 rounded-full shadow-sm border border-[#d4a017]/10">
                  Conclusão Final
                </span>
              )}
            </div>

            <p className={cn(
              "font-serif italic font-bold leading-[1.3] text-[#3d2800] max-w-3xl mx-auto drop-shadow-sm transition-all duration-500",
              isLargeBead(bead) ? "text-[1.4rem] md:text-[2rem]" : "text-[1.3rem] md:text-[1.8rem] opacity-90",
              isConclusion(bead) && "text-[1.4rem] md:text-[2rem] text-[#d4a017]"
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
          className="flex-1 h-12 rounded-full bg-ink text-paper text-sm font-medium hover:opacity-90 transition-opacity active:scale-95 flex items-center justify-center gap-1"
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
