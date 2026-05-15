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
import { useDailyTasks } from "@/hooks/use-daily-tasks";

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
  const { completeTask } = useDailyTasks();

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
      completeTask("pray_rosary");
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
      <div className="h-[100dvh] w-full bg-paper text-ink flex flex-col relative overflow-hidden">
        {/* Header */}
        <div className="pt-safe pt-4 px-5 flex justify-between items-center z-50 shrink-0">
          <button onClick={() => navigate("/rosary-selection")} className="p-1 text-ink-soft hover:text-ink transition-colors">
            <ArrowLeft size={20} strokeWidth={1.5} />
          </button>
          <div className="text-center">
            <p className="text-[9px] uppercase tracking-[0.28em] text-ink-soft">Sagrado Terço</p>
            <p className="font-serif italic text-[12px] text-ink-soft truncate max-w-[150px]">{ROSARY_TYPES.find(t => t.id === type)?.name}</p>
          </div>
          <button
            onClick={() => setIsVoiceActive(!isVoiceActive)}
            className={cn("w-9 h-9 rounded-full border transition-all flex items-center justify-center", isVoiceActive ? "bg-gold/10 border-gold text-gold" : "border-hairline text-ink-soft")}
          >
            {isVoiceActive ? <Mic size={16} strokeWidth={1.5} /> : <MicOff size={16} strokeWidth={1.5} />}
          </button>
        </div>

        {/* Horizontal Rosary Visualization Layer */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 px-4 z-20 mt-6 mb-2 w-full max-w-xl mx-auto shrink-0">
          {beads.map((bead, i) => {
            const isActive = currentIndex === i;
            const isPassed = currentIndex > i;
            if (bead.type === "cross") {
                return (
                    <svg 
                        key={i} 
                        onClick={() => setCurrentIndex(i)}
                        width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" 
                        className={cn("w-5 h-5 shrink-0 transition-all mr-1 cursor-pointer hover:scale-110 active:scale-95", isActive ? "text-[#d4a017] scale-125 hover:scale-125" : isPassed ? "text-[#d4a017] opacity-80" : "text-[#d4a017]/40")}
                    >
                        <path d="M12 2v20M6 8h12"/>
                    </svg>
                );
            }
            return (
                <div 
                    key={i} 
                    onClick={() => setCurrentIndex(i)}
                    className={cn(
                        "rounded-full transition-all duration-300 cursor-pointer hover:scale-125 active:scale-95",
                        bead.type === "medal" ? "w-4 h-4 mx-1 flex items-center justify-center" : 
                        bead.type === "large" ? "w-3 h-3 mx-1" : "w-1.5 h-1.5",
                        isActive ? "bg-[#d4a017] scale-150 shadow-md border border-[#d4a017] hover:scale-150" : 
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
        <div className="flex-1 relative flex flex-col items-center justify-start py-8 px-4 z-10 w-full min-h-0 overflow-y-auto style-scrollbar">
           <AnimatePresence mode="wait">
                <motion.div
                key={currentIndex}
                initial={{ opacity: 0, y: 10, scale: 0.98, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, scale: 1.02, filter: "blur(4px)" }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-2xl w-full text-center space-y-6 flex flex-col justify-start pb-8"
                >
                    {beads[currentIndex].mysteryTitle && (
                        <div className="mb-5 flex flex-col items-center">
                            <span className="text-[9px] uppercase tracking-[0.28em] text-gold mb-2">✦ Mistério</span>
                            <h3 className="text-[12px] text-ink-soft uppercase tracking-[0.15em] leading-relaxed px-8">{beads[currentIndex].mysteryTitle}</h3>
                        </div>
                    )}

                    <p className="font-serif italic text-[1.3rem] sm:text-[1.5rem] md:text-[1.9rem] text-ink leading-[1.4] px-4 max-w-3xl mx-auto whitespace-pre-wrap">
                        "{beads[currentIndex].prayer}"
                    </p>
                </motion.div>
            </AnimatePresence>
        </div>

        {/* Global Controls - Improved Ergonomics */}
        <div className="px-6 pb-10 pt-4 flex flex-col items-center z-50 shrink-0 bg-gradient-to-t from-paper via-paper/95 to-transparent">
            {listening && isVoiceActive && (
                <div className="mb-4 flex items-center gap-2 px-4 py-1.5 bg-vellum rounded-full border border-gold/30">
                    <div className="w-1.5 h-1.5 bg-gold rounded-full animate-pulse" />
                    <span className="text-[10px] text-gold uppercase tracking-[0.2em]">Ouvindo…</span>
                </div>
            )}

            <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={handlePrevious} disabled={currentIndex === 0} className="w-11 h-11 rounded-full border border-hairline flex items-center justify-center text-ink-soft disabled:opacity-20 hover:border-ink/30 transition-colors">
                        <ChevronLeft size={20} strokeWidth={1.5} />
                    </button>

                    <div className="relative w-11 h-11 cursor-pointer" onClick={() => setIsSwayEnabled(!isSwayEnabled)}>
                        <div className="w-11 h-11 rounded-full border border-hairline bg-vellum flex items-center justify-center">
                            <span className="text-[11px] font-mono text-ink">{currentIndex + 1}</span>
                        </div>
                        <svg className="absolute inset-0 w-full h-full -rotate-90">
                            <circle cx="22" cy="22" r="19" stroke="transparent" strokeWidth="2" fill="transparent" />
                            <circle cx="22" cy="22" r="19" stroke="#c9a227" strokeWidth="2" fill="transparent"
                                strokeDasharray={119} strokeDashoffset={119 - (currentIndex / (beads.length - 1)) * 119} strokeLinecap="round" />
                        </svg>
                    </div>
                </div>

                <button
                    onClick={handleNext}
                    className="w-20 h-20 rounded-full bg-ink text-paper flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shadow-fab"
                >
                    <ChevronRight size={32} strokeWidth={1.5} />
                </button>
            </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default RosaryPrayer;
