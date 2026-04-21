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
  const [isSwayEnabled, setIsSwayEnabled] = useState(true);

  const mysteries = useMemo(() => {
    if (type === "misterios") return getMysteriesByDay();
    return [];
  }, [type]);

  const beads = useMemo(() => {
    const sequence: Partial<Bead>[] = [];
    
    // --- Define the sequence based on type ---
    // --- Sequence Definition with clear separation ---
    if (type === 'misterios') {
        sequence.push({ type: "cross", prayer: PRAYERS.SINAL_CRUZ });
        sequence.push({ type: "large", prayer: PRAYERS.CREDO });
        sequence.push({ type: "large", prayer: PRAYERS.PAI_NOSSO });
        sequence.push({ type: "small", prayer: PRAYERS.AVE_MARIA });
        sequence.push({ type: "small", prayer: PRAYERS.AVE_MARIA });
        sequence.push({ type: "small", prayer: PRAYERS.AVE_MARIA });
        sequence.push({ type: "large", prayer: PRAYERS.GLORIA });
        sequence.push({ type: "medal", prayer: PRAYERS.SALVE_RAINHA }); // The Junction

        for (let i = 0; i < 5; i++) {
            const mystery = mysteries[i];
            sequence.push({ type: "large", prayer: PRAYERS.PAI_NOSSO, mysteryTitle: mystery?.title });
            for (let j = 0; j < 10; j++) sequence.push({ type: "small", prayer: PRAYERS.AVE_MARIA });
            sequence.push({ type: "large", prayer: PRAYERS.GLORIA });
            sequence.push({ type: "large", prayer: PRAYERS.OH_MEU_JESUS });
        }
        // Removed the extra cross at the end to avoid confusion/overlap
    } 
    else if (type === 'misericordia') {
        sequence.push({ type: "cross", prayer: PRAYERS.SINAL_CRUZ });
        sequence.push({ type: "large", prayer: PRAYERS.PAI_NOSSO });
        sequence.push({ type: "small", prayer: PRAYERS.AVE_MARIA });
        sequence.push({ type: "large", prayer: PRAYERS.CREDO });
        for (let i = 0; i < 5; i++) {
            sequence.push({ type: "large", prayer: PRAYERS.MISERICORDIA_PAI });
            for (let j = 0; j < 10; j++) sequence.push({ type: "small", prayer: PRAYERS.MISERICORDIA_DEZENA });
        }
        for (let i = 0; i < 3; i++) sequence.push({ type: "large", prayer: PRAYERS.MISERICORDIA_FIM });
    }
    else if (type === 'libertacao') {
        sequence.push({ type: "cross", prayer: PRAYERS.SINAL_CRUZ });
        sequence.push({ type: "large", prayer: PRAYERS.CREDO });
        sequence.push({ type: "medal", prayer: PRAYERS.SALVE_RAINHA });
        for (let i = 0; i < 5; i++) {
            sequence.push({ type: "large", prayer: PRAYERS.LIBERTACAO_GRANDE });
            for (let j = 0; j < 10; j++) sequence.push({ type: "small", prayer: PRAYERS.LIBERTACAO_PEQUENA });
        }
        sequence.push({ type: "large", prayer: PRAYERS.SALVE_RAINHA });
    }
    else if (type === 'miguel') {
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
        sequence.push({ type: "large", prayer: PRAYERS.MIGUEL_CONCLUSAO });
    }

    const stemCount = (type === 'misterios') ? 8 : (type === 'misericordia' ? 4 : (type === 'libertacao' ? 3 : (type === 'miguel' ? 4 : 4)));
    const loopCount = sequence.length - stemCount;

    return sequence.map((b, i) => ({ ...b, id: i, x: 0, y: 0 } as Bead));
  }, [type, mysteries]);

  const handleNext = () => {
    if (currentIndex < beads.length - 1) {
      if (navigator.vibrate) navigator.vibrate(40);
      setCurrentIndex(prev => prev + 1);
    } else {
      toast.success("Terço finalizado. Que a paz esteja com você! 🙏");
      navigate("/");
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
        if (navigator.vibrate) navigator.vibrate(20);
        setCurrentIndex(prev => prev - 1);
    }
  };

  const { listening } = useRosaryVoice(handleNext, isVoiceActive, beads[currentIndex]?.prayer);

  // Legacy OrnateCross component removed

  return (
    <PageTransition>
      <div className="h-screen w-full bg-[#faf9f6] text-[#3d2800] flex flex-col relative overflow-hidden pb-32 paper-texture">
        {/* Divine Glow Elements */}
        <motion.div 
          animate={{ opacity: [0.03, 0.08, 0.03], scale: [1, 1.2, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10rem] right-[-10rem] w-[40rem] h-[40rem] rounded-full bg-[#e8c547] blur-[120px] pointer-events-none" 
        />
        <motion.div 
          animate={{ opacity: [0.02, 0.06, 0.02], scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-10rem] left-[-10rem] w-[40rem] h-[40rem] rounded-full bg-[#b8860b] blur-[120px] pointer-events-none" 
        />
        
        {/* Header */}
        <div className="pt-8 px-6 flex justify-between items-center z-50">
          <Button variant="ghost" size="icon" onClick={() => navigate("/rosary-selection")} className="rounded-full bg-white/40 hover:bg-white shadow-sm border border-primary/5">
            <ArrowLeft className="w-5 h-5 text-stone-500" />
          </Button>
          <div className="text-center">
             <h2 className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary/60">Sagrado Terço</h2>
             <p className="font-serif italic text-stone-400 text-[9px] truncate max-w-[150px]">{ROSARY_TYPES.find(t => t.id === type)?.name}</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsVoiceActive(!isVoiceActive)}
            className={cn("rounded-full border transition-all shadow-sm", isVoiceActive ? "bg-amber-100 border-amber-300 text-amber-600" : "bg-white/40 border-primary/5 text-stone-300")}
          >
            {isVoiceActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </Button>
        </div>

        {/* Horizontal Rosary Visualization Layer */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 px-6 z-20 mt-8 mb-2 w-full max-w-xl mx-auto">
          {beads.map((bead, i) => {
            const isActive = currentIndex === i;
            const isPassed = currentIndex > i;
            if (bead.type === "cross") {
                return (
                    <svg key={i} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" 
                         className={cn("w-5 h-5 shrink-0 transition-all mr-1", isActive ? "text-[#d4a017] scale-125" : isPassed ? "text-[#d4a017] opacity-80" : "text-[#d4a017]/40")}
                    >
                        <path d="M12 2v20M6 8h12"/>
                    </svg>
                );
            }
            return (
                <div 
                    key={i} 
                    className={cn(
                        "rounded-full transition-all duration-300",
                        bead.type === "medal" ? "w-4 h-4 mx-1.5 flex items-center justify-center" : 
                        bead.type === "large" ? "w-3 h-3 mx-1" : "w-1.5 h-1.5",
                        isActive ? "bg-[#d4a017] scale-150 shadow-md border border-[#d4a017]" : 
                        isPassed ? "bg-[#d4a017] opacity-80" : 
                        (bead.type === "large" || bead.type === "medal") ? "border border-[#d4a017]/40 bg-[#d4a017]/10" : "bg-[#d4a017]/20"
                    )}
                >
                    {bead.type === "medal" && <Heart className={cn("w-2.5 h-2.5", isActive || isPassed ? "text-white fill-current" : "text-[#d4a017]/40")} />}
                </div>
            );
          })}
        </div>

        {/* Central Space for Prayers */}
        <div className="flex-1 relative flex flex-col items-center justify-center p-8 z-10 w-full min-h-[300px]">
           <AnimatePresence mode="wait">
                <motion.div
                key={currentIndex}
                initial={{ opacity: 0, y: 10, scale: 0.98, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, scale: 1.02, filter: "blur(4px)" }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-2xl w-full text-center space-y-6 flex flex-col justify-center min-h-[250px]"
                >
                    {beads[currentIndex].mysteryTitle && (
                        <div className="mb-6 flex flex-col justify-center items-center">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#a0720a] bg-[#d4a017]/10 px-4 py-1.5 rounded-full shadow-sm border border-[#d4a017]/10 block mb-3">Mistério</span>
                            <h3 className="text-xs md:text-sm font-bold text-[#3d2800] uppercase tracking-[0.15em] leading-relaxed px-8">{beads[currentIndex].mysteryTitle}</h3>
                        </div>
                    )}
                    
                    <p className="font-serif italic text-[1.4rem] md:text-[2.2rem] text-[#3d2800] font-bold leading-[1.3] px-4 drop-shadow-sm max-w-3xl mx-auto">
                        "{beads[currentIndex].prayer}"
                    </p>
                </motion.div>
            </AnimatePresence>
        </div>

        {/* Legacy Visualization Layer Removed */}

        {/* Global Controls - Improved Ergonomics */}
        <div className="pb-32 px-8 flex flex-col items-center z-50">
            {/* Listening HUD */}
            {listening && isVoiceActive && (
                <div className="mb-6 flex items-center gap-3 px-6 py-2 bg-white/90 backdrop-blur-md rounded-full border border-amber-200 shadow-lg">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                    <span className="text-[10px] font-black text-amber-800 uppercase tracking-[0.2em]">Ouvindo...</span>
                </div>
            )}

            <div className="w-full flex items-center justify-between">
                {/* Secondary Controls (Left/Center-ish) */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={handlePrevious} disabled={currentIndex === 0} className="w-12 h-12 rounded-full bg-white/40 shadow-sm border border-stone-100 disabled:opacity-20 transition-all">
                        <ChevronLeft className="w-6 h-6 text-stone-500" />
                    </Button>
                    
                    <div className="group relative" onClick={() => setIsSwayEnabled(!isSwayEnabled)}>
                        <div className="w-12 h-12 bg-white rounded-full shadow-lg border border-primary/10 flex items-center justify-center transition-transform group-active:scale-95 cursor-pointer">
                            <span className="text-xs font-black text-amber-700">{currentIndex + 1}</span>
                            <svg className="absolute inset-0 w-full h-full -rotate-90">
                                <circle cx="24" cy="24" r="20" stroke="#f8f8f8" strokeWidth="2" fill="transparent" />
                                <circle cx="24" cy="24" r="20" stroke="#d4af37" strokeWidth="3" fill="transparent"
                                    strokeDasharray={125} strokeDashoffset={125 - (currentIndex / (beads.length - 1)) * 125} strokeLinecap="round" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Primary Action Button (Bottom Right for Thumb) */}
                <Button 
                    variant="default"
                    onClick={handleNext} 
                    className="w-20 h-20 rounded-full bg-amber-500 hover:bg-amber-600 shadow-xl shadow-amber-500/30 flex items-center justify-center group active:scale-95 transition-all text-white border-4 border-white/20"
                >
                    <ChevronRight className="w-10 h-10 transition-transform group-hover:translate-x-1" />
                </Button>
            </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default RosaryPrayer;
