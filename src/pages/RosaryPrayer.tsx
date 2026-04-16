import { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mic, MicOff, ChevronRight, ChevronLeft, Sparkles, Heart } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { PRAYERS, getMysteriesByDay, MISTERIOS, COROS_ANJOS, ROSARY_TYPES } from "@/data/rosary-data";
import { useRosaryVoice } from "@/hooks/use-rosary-voice";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Bead {
  id: number;
  type: "small" | "large" | "medal" | "cross";
  prayer: string;
  mysteryTitle?: string;
  x: number;
  y: number;
}

const RosaryPrayer = () => {
  const navigate = useNavigate();
  const { type } = useParams();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  const mysteries = useMemo(() => {
    if (type === "misterios") return getMysteriesByDay();
    return [];
  }, [type]);

  // Generate beads sequence based on Devotion Type
  const beads = useMemo(() => {
    const sequence: Partial<Bead>[] = [];
    
    if (type === 'misterios') {
        // --- Traditional Marian Rosary ---
        sequence.push({ type: "cross", prayer: PRAYERS.SINAL_CRUZ });
        sequence.push({ type: "large", prayer: PRAYERS.CREDO });
        sequence.push({ type: "large", prayer: PRAYERS.PAI_NOSSO });
        sequence.push({ type: "small", prayer: PRAYERS.AVE_MARIA });
        sequence.push({ type: "small", prayer: PRAYERS.AVE_MARIA });
        sequence.push({ type: "small", prayer: PRAYERS.AVE_MARIA });
        sequence.push({ type: "large", prayer: PRAYERS.GLORIA });
        sequence.push({ type: "medal", prayer: PRAYERS.SALVE_RAINHA });

        for (let i = 0; i < 5; i++) {
            const mystery = mysteries[i];
            sequence.push({ type: "large", prayer: PRAYERS.PAI_NOSSO, mysteryTitle: mystery?.title });
            for (let j = 0; j < 10; j++) sequence.push({ type: "small", prayer: PRAYERS.AVE_MARIA });
            sequence.push({ type: "large", prayer: PRAYERS.GLORIA });
            sequence.push({ type: "large", prayer: PRAYERS.OH_MEU_JESUS });
        }
        sequence.push({ type: "cross", prayer: PRAYERS.SINAL_CRUZ });
    } 
    else if (type === 'misericordia') {
        // --- Mercy Rosary ---
        sequence.push({ type: "cross", prayer: PRAYERS.SINAL_CRUZ });
        sequence.push({ type: "large", prayer: PRAYERS.PAI_NOSSO });
        sequence.push({ type: "small", prayer: PRAYERS.AVE_MARIA });
        sequence.push({ type: "large", prayer: PRAYERS.CREDO });

        for (let i = 0; i < 5; i++) {
            sequence.push({ type: "large", prayer: PRAYERS.MISERICORDIA_PAI });
            for (let j = 0; j < 10; j++) sequence.push({ type: "small", prayer: PRAYERS.MISERICORDIA_DEZENA });
        }
        for (let i = 0; i < 3; i++) sequence.push({ type: "large", prayer: PRAYERS.MISERICORDIA_FIM });
        sequence.push({ type: "cross", prayer: PRAYERS.SINAL_CRUZ });
    }
    else if (type === 'libertacao') {
        // --- Liberation Rosary ---
        sequence.push({ type: "cross", prayer: PRAYERS.SINAL_CRUZ });
        sequence.push({ type: "large", prayer: PRAYERS.CREDO });
        sequence.push({ type: "medal", prayer: PRAYERS.SALVE_RAINHA });

        for (let i = 0; i < 5; i++) {
            sequence.push({ type: "large", prayer: PRAYERS.LIBERTACAO_GRANDE });
            for (let j = 0; j < 10; j++) sequence.push({ type: "small", prayer: PRAYERS.LIBERTACAO_PEQUENA });
        }
        sequence.push({ type: "large", prayer: PRAYERS.SALVE_RAINHA });
        sequence.push({ type: "cross", prayer: PRAYERS.SINAL_CRUZ });
    }
    else if (type === 'miguel') {
        // --- St. Michael Arcanjo Crown (9x3 Structure) ---
        sequence.push({ type: "cross", prayer: PRAYERS.SINAL_CRUZ });
        sequence.push({ type: "large", prayer: PRAYERS.MIGUEL_INICIO });
        sequence.push({ type: "large", prayer: PRAYERS.GLORIA });
        sequence.push({ type: "medal", prayer: PRAYERS.MIGUEL_CONCLUSAO });

        const coros = ["Serafins", "Querubins", "Tronos", "Dominações", "Potestades", "Virtudes", "Principados", "Arcanjos", "Anjos"];
        for (let i = 0; i < 9; i++) {
            sequence.push({ type: "large", prayer: COROS_ANJOS[i], mysteryTitle: `Saudação aos ${coros[i]}` });
            sequence.push({ type: "large", prayer: PRAYERS.PAI_NOSSO });
            for (let j = 0; j < 3; j++) sequence.push({ type: "small", prayer: PRAYERS.AVE_MARIA });
        }
        // 4 Final beads
        sequence.push({ type: "large", prayer: PRAYERS.MIGUEL_HONRA_MIGUEL });
        sequence.push({ type: "large", prayer: PRAYERS.MIGUEL_HONRA_GABRIEL });
        sequence.push({ type: "large", prayer: PRAYERS.MIGUEL_HONRA_RAFAEL });
        sequence.push({ type: "large", prayer: PRAYERS.MIGUEL_HONRA_ANJO });
        sequence.push({ type: "large", prayer: PRAYERS.MIGUEL_CONCLUSAO });
        sequence.push({ type: "cross", prayer: PRAYERS.SINAL_CRUZ });
    }

    // Calculate dynamic layout coordinates (Stem + Loop)
    return sequence.map((b, i) => {
      let x = 50, y = 50;
      
      const stemCount = type === 'miguel' ? 4 : (type === 'libertacao' ? 3 : 7);
      
      if (i < stemCount) {
        x = 50;
        y = 92 - (i * 5); // Stem at the bottom
      } else {
        const loopIdx = i - (stemCount - 1);
        const totalInLoop = sequence.length - (stemCount - 1);
        const angle = (Math.PI / 2) + (loopIdx / totalInLoop) * Math.PI * 2;
        
        const radiusX = type === 'miguel' ? 38 : 34; // Slightly wider for Miguel
        const radiusY = 24;
        
        x = 50 + Math.cos(angle) * radiusX;
        y = 32 + Math.sin(angle) * radiusY;
      }
      return { ...b, id: i, x, y } as Bead;
    });
  }, [type, mysteries]);

  const handleNext = () => {
    if (currentIndex < beads.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      toast.success("Terço finalizado. Que a paz esteja com você! 🙏");
      navigate("/");
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  };

  const { listening } = useRosaryVoice(handleNext, isVoiceActive, beads[currentIndex]?.prayer);

  return (
    <PageTransition>
      <div className="h-screen w-full bg-[#faf9f6] flex flex-col relative overflow-hidden paper-texture">
        {/* Divine Background Glow */}
        <div className="absolute top-[-5rem] left-[10%] w-[80%] h-[40%] rounded-full bg-primary/5 blur-[80px] pointer-events-none" />
        
        {/* Header */}
        <div className="pt-6 px-6 flex justify-between items-center z-20">
          <Button variant="ghost" size="icon" onClick={() => navigate("/rosary-selection")} className="rounded-full bg-white/50 backdrop-blur-sm shadow-sm border border-primary/10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="text-center flex-1">
             <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/70 mb-0.5">Sagrado Terço</h2>
             <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                {ROSARY_TYPES.find(t => t.id === type)?.name || 'Devocional'}
             </p>
          </div>
          <Button 
            variant={isVoiceActive ? "default" : "outline"} 
            size="icon" 
            onClick={() => setIsVoiceActive(!isVoiceActive)}
            className={cn(
                "rounded-full transition-all border-primary/20", 
                isVoiceActive ? "bg-amber-500 text-white animate-pulse shadow-lg shadow-amber-500/30" : "bg-white/50 backdrop-blur-sm shadow-sm"
            )}
          >
            {isVoiceActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </Button>
        </div>

        {/* Visual Rosary Section (The Core) */}
        <div className="flex-1 relative">
           <div className="absolute inset-0">
              {/* Central Prayer Text */}
              <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[78%] text-center z-0 min-h-[160px] flex items-center justify-center">
                <AnimatePresence mode="wait">
                    <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="w-full"
                    >
                        {beads[currentIndex].mysteryTitle && (
                            <div className="mb-2">
                                <span className="text-[7px] font-black uppercase tracking-[0.5em] text-amber-600/50 block mb-0.5">Mistério</span>
                                <h3 className="text-[10px] font-bold text-stone-700 leading-tight px-6 uppercase tracking-widest">{beads[currentIndex].mysteryTitle}</h3>
                            </div>
                        )}
                        
                        <p className="font-serif italic text-base md:text-lg text-stone-900 leading-relaxed px-3">
                            {beads[currentIndex].prayer}
                        </p>
                    </motion.div>
                </AnimatePresence>
              </div>

              {/* The Beads */}
              {beads.map((bead, i) => (
                <motion.div
                  key={bead.id}
                  initial={false}
                  animate={{
                    scale: currentIndex === i ? 1.3 : (bead.type === 'large' ? 1.1 : 1),
                    opacity: 1,
                    // Golden Glow for current bead
                    boxShadow: currentIndex === i 
                        ? "0 0 20px 4px rgba(251, 191, 36, 0.6)" 
                        : "0 2px 4px rgba(0,0,0,0.1)",
                    // 3D Spherical Gradient
                    background: currentIndex === i 
                        ? "radial-gradient(circle at 30% 30%, #fff 0%, #fbbf24 40%, #d97706 100%)" 
                        : (currentIndex > i 
                            ? "radial-gradient(circle at 30% 30%, #d4a017 0%, #92400e 100%)" 
                            : "radial-gradient(circle at 30% 30%, #fff 0%, #e5e7eb 40%, #9ca3af 100%)"
                        )
                  }}
                  onClick={() => setCurrentIndex(i)}
                  className={cn(
                    "absolute transition-all duration-500 border border-black/5 z-10",
                    bead.type === "large" ? "w-4 h-4 -ml-2 -mt-2 rounded-full" : 
                    bead.type === "cross" ? "w-8 h-8 -ml-4 -mt-4 bg-transparent border-0 z-20" : 
                    bead.type === "medal" ? "w-6 h-6 -ml-3 -mt-3 ring-2 ring-amber-300/30 ring-offset-1 p-0.5 rounded-full" :
                    "w-2.5 h-2.5 -ml-1.25 -mt-1.25 rounded-full"
                  )}
                  style={{ left: `${bead.x}%`, top: `${bead.y}%` }}
                >
                   {bead.type === "cross" && (
                    <div className="w-full h-full flex items-center justify-center filter drop-shadow-md">
                        <div className="absolute w-1.5 h-full bg-gradient-to-b from-amber-200 via-amber-500 to-amber-700 rounded-px" />
                        <div className="absolute h-1.5 w-full bg-gradient-to-r from-amber-200 via-amber-500 to-amber-700 rounded-px" />
                    </div>
                   )}
                   {bead.type === "medal" && (
                    <div className="w-full h-full bg-gradient-to-tr from-amber-600 to-amber-200 rounded-full flex items-center justify-center p-0.5 shadow-inner">
                        <Heart className="w-full h-full text-amber-900/40 fill-current" />
                    </div>
                   )}
                </motion.div>
              ))}
           </div>
        </div>

        {/* Floating Controls (Bottom) */}
        <div className="pb-12 px-8 flex flex-col items-center gap-6 z-40">
           <div className="bg-white/40 backdrop-blur-xl rounded-full border border-white/50 p-2 shadow-xl flex items-center gap-6">
                <Button variant="ghost" size="icon" onClick={handlePrevious} disabled={currentIndex === 0} className="w-10 h-10 rounded-full hover:bg-black/5">
                    <ChevronLeft className="w-5 h-5 text-stone-400" />
                </Button>
                
                <div className="relative w-12 h-12 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90">
                        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" fill="transparent" className="text-stone-100/50" />
                        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2.5" fill="transparent" className="text-amber-500"
                            strokeDasharray={125} strokeDashoffset={125 - (currentIndex / (beads.length - 1)) * 125} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-black text-amber-700">{currentIndex + 1}</span>
                    </div>
                </div>

                <Button variant="ghost" size="icon" onClick={handleNext} className="w-10 h-10 rounded-full bg-amber-500/10 hover:bg-amber-500/20 group">
                    <ChevronRight className="w-6 h-6 text-amber-600 group-hover:scale-110 transition-transform" />
                </Button>
           </div>
           
           {listening && isVoiceActive && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 backdrop-blur-md rounded-full border border-amber-500/20 shadow-sm"
                >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest animate-pulse">Ouvindo...</span>
                </motion.div>
            )}
        </div>
      </div>
    </PageTransition>
  );
};

export default RosaryPrayer;
