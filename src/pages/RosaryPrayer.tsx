import { useState, useMemo, useEffect, useRef } from "react";
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
}

const RosaryPrayer = () => {
  const navigate = useNavigate();
  const { type } = useParams();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const activeBeadRef = useRef<HTMLDivElement | null>(null);
  const { completeTask } = useDailyTasks();

  const mysteries = useMemo(() => {
    if (type === "misterios") return getMysteriesByDay();
    return [];
  }, [type]);

  const beads = useMemo(() => {
    const sequence: Partial<Bead>[] = [];
    
    if (type === 'misterios') {
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

    return sequence.map((b, i) => ({ ...b, id: i } as Bead));
  }, [type, mysteries]);

  // Auto scroll active bead into view in vertical rail
  useEffect(() => {
    if (activeBeadRef.current) {
      activeBeadRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentIndex]);

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

  // Compute label for current bead
  const currentBead = beads[currentIndex];
  const beadHeaderTitle = useMemo(() => {
    if (!currentBead) return "";
    if (currentBead.type === "cross") return "Sinal da Cruz";
    if (currentBead.type === "medal") return "Medalha de Nossa Senhora";
    if (currentBead.prayer === PRAYERS.AVE_MARIA) {
      // Find decade index
      let aveIndex = 1;
      for (let i = 0; i < currentIndex; i++) {
        if (beads[i].prayer === PRAYERS.AVE_MARIA) {
          aveIndex = (aveIndex % 10) + 1;
        } else if (beads[i].type === "large") {
          aveIndex = 1;
        }
      }
      return `Ave Maria ${aveIndex}/10`;
    }
    if (currentBead.prayer === PRAYERS.PAI_NOSSO) return "Pai Nosso";
    if (currentBead.prayer === PRAYERS.GLORIA) return "Glória ao Pai";
    if (currentBead.prayer === PRAYERS.CREDO) return "Credo Apostólico";
    if (currentBead.prayer === PRAYERS.OH_MEU_JESUS) return "Jaculatória";
    return ROSARY_TYPES.find(t => t.id === type)?.name || "Sagrado Terço";
  }, [currentIndex, currentBead, beads, type]);

  return (
    <PageTransition>
      <div className="h-[100dvh] w-full bg-gradient-to-b from-[#fdfcf9] via-[#f9f7f2] to-[#f4efe4] text-[#3d2800] flex flex-col relative overflow-hidden">
        {/* Soft Golden Ambient Glows */}
        <motion.div 
          animate={{ opacity: [0.08, 0.16, 0.08], scale: [1, 1.15, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10rem] right-[-8rem] w-[35rem] h-[35rem] rounded-full bg-[#f3d98c] blur-[130px] pointer-events-none" 
        />
        <motion.div 
          animate={{ opacity: [0.06, 0.12, 0.06], scale: [1, 1.1, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="absolute bottom-[-10rem] left-[-8rem] w-[35rem] h-[35rem] rounded-full bg-[#d4a017] blur-[140px] pointer-events-none" 
        />
        
        {/* Top Header Bar */}
        <header className="pt-6 px-5 sm:px-8 flex justify-between items-center z-30 shrink-0">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/rosary-selection")} 
            className="rounded-full bg-white/70 hover:bg-white shadow-sm border border-amber-900/10 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-amber-950/70" />
          </Button>

          <div className="text-center flex flex-col items-center">
             <span className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-800/80">Sagrado Terço</span>
             <p className="font-serif italic text-amber-900/50 text-[11px] truncate max-w-[200px]">
               {ROSARY_TYPES.find(t => t.id === type)?.name || 'Devocional'}
             </p>
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsVoiceActive(!isVoiceActive)}
            className={cn(
              "rounded-full border transition-all shadow-sm active:scale-95", 
              isVoiceActive ? "bg-amber-100 border-amber-400 text-amber-700 ring-2 ring-amber-300/40" : "bg-white/70 hover:bg-white border-amber-900/10 text-stone-400"
            )}
            title={isVoiceActive ? "Voz ativada (ouvindo)" : "Ativar reconhecimento de voz"}
          >
            {isVoiceActive ? <Mic className="w-4 h-4 text-amber-600" /> : <MicOff className="w-4 h-4" />}
          </Button>
        </header>

        {/* Main Body: Vertical Rosary Rail on Left + Central Prayer Card */}
        <div className="flex-1 flex flex-row items-stretch min-h-0 relative z-20 px-3 sm:px-6 py-4 gap-3 sm:gap-6 overflow-hidden">
          
          {/* Vertical Beads Column (Left Rail) */}
          <aside className="w-14 sm:w-16 shrink-0 flex flex-col items-center relative rounded-3xl bg-white/50 backdrop-blur-md border border-amber-900/10 shadow-sm py-4 overflow-hidden">
            {/* Golden Thread/Cord Line */}
            <div className="absolute top-4 bottom-4 left-1/2 -translate-x-1/2 w-[1.5px] bg-gradient-to-b from-amber-400/40 via-amber-500/60 to-amber-400/40 rounded-full" />

            {/* Scrollable Beads List */}
            <div className="w-full h-full overflow-y-auto no-scrollbar flex flex-col items-center gap-3 py-2 px-1 relative z-10">
              {beads.map((bead, i) => {
                const isActive = currentIndex === i;
                const isPassed = currentIndex > i;

                if (bead.type === "cross") {
                  return (
                    <div
                      key={i}
                      ref={isActive ? activeBeadRef : null}
                      onClick={() => setCurrentIndex(i)}
                      className={cn(
                        "p-1.5 rounded-full transition-all duration-300 cursor-pointer flex items-center justify-center shrink-0 active:scale-90",
                        isActive ? "scale-125 bg-amber-100 ring-2 ring-amber-400 shadow-md shadow-amber-400/30" : "hover:scale-110"
                      )}
                    >
                      <svg 
                        width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" 
                        className={cn(
                          "w-5 h-5 transition-colors",
                          isActive ? "text-amber-600" : isPassed ? "text-amber-500" : "text-amber-800/30"
                        )}
                      >
                        <path d="M12 2v20M6 8h12"/>
                      </svg>
                    </div>
                  );
                }

                if (bead.type === "medal") {
                  return (
                    <div
                      key={i}
                      ref={isActive ? activeBeadRef : null}
                      onClick={() => setCurrentIndex(i)}
                      className={cn(
                        "w-7 h-7 rounded-full transition-all duration-300 cursor-pointer flex items-center justify-center shrink-0 active:scale-90",
                        isActive ? "bg-amber-400 text-white scale-125 ring-2 ring-amber-300 shadow-md shadow-amber-400/40" :
                        isPassed ? "bg-amber-200 text-amber-700 border border-amber-300" : "bg-white/80 border border-amber-900/15 text-amber-800/30 hover:scale-110"
                      )}
                    >
                      <Heart className={cn("w-3.5 h-3.5", isActive || isPassed ? "fill-current" : "")} />
                    </div>
                  );
                }

                // Small & Large Beads
                return (
                  <div 
                    key={i} 
                    ref={isActive ? activeBeadRef : null}
                    onClick={() => setCurrentIndex(i)}
                    className={cn(
                      "rounded-full transition-all duration-300 cursor-pointer shrink-0 active:scale-90",
                      bead.type === "large" ? "w-4 h-4" : "w-2.5 h-2.5",
                      isActive ? "bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-200 scale-150 ring-2 ring-amber-300 shadow-lg shadow-amber-500/40 border border-white" : 
                      isPassed ? "bg-amber-500/80 border border-amber-600/30" : 
                      bead.type === "large" ? "border-2 border-amber-500/40 bg-white/90 hover:scale-125" : "bg-amber-900/15 hover:bg-amber-900/30 hover:scale-125"
                    )}
                  />
                );
              })}
            </div>
          </aside>

          {/* Central Prayer View */}
          <main className="flex-1 flex flex-col items-center justify-between min-h-0 bg-white/70 backdrop-blur-md rounded-3xl border border-amber-900/10 shadow-sm p-6 sm:p-10 overflow-hidden">
            
            {/* Bead Header Subtitle */}
            <div className="w-full text-center shrink-0 mb-4">
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-[0.3em] text-amber-700/80">
                {beadHeaderTitle}
              </span>
              <div className="w-8 h-[2px] bg-amber-400/50 rounded-full mx-auto mt-1.5" />
            </div>

            {/* Prayer Content with smooth transitions */}
            <div className="flex-1 w-full flex flex-col items-center justify-center overflow-y-auto px-2 sm:px-6 my-auto style-scrollbar">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 1.02 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="max-w-2xl w-full text-center space-y-5"
                >
                  {currentBead?.mysteryTitle && (
                    <div className="flex flex-col justify-center items-center mb-2">
                      <span className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-800 bg-amber-100/90 px-3.5 py-1 rounded-full shadow-sm border border-amber-200 block mb-2">
                        Mistério
                      </span>
                      <h3 className="text-xs sm:text-sm font-bold text-amber-950 uppercase tracking-[0.12em] leading-relaxed">
                        {currentBead.mysteryTitle}
                      </h3>
                    </div>
                  )}
                  
                  <p className="font-serif italic text-lg sm:text-2xl md:text-3xl text-amber-950 font-semibold leading-[1.4] px-2 drop-shadow-sm whitespace-pre-wrap">
                    "{currentBead?.prayer}"
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Bottom Status / Listening Banner */}
            {listening && isVoiceActive && (
              <motion.div 
                initial={{ opacity: 0, y: 6 }} 
                animate={{ opacity: 1, y: 0 }}
                className="shrink-0 mb-2 flex items-center gap-2 px-4 py-1.5 bg-amber-100/80 backdrop-blur-sm rounded-full border border-amber-300 shadow-sm"
              >
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping" />
                <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest">
                  Ouvindo oração...
                </span>
              </motion.div>
            )}

            {/* Ergonomic Bottom Controls */}
            <div className="w-full flex items-center justify-between pt-4 border-t border-amber-900/5 shrink-0 mt-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handlePrevious} 
                disabled={currentIndex === 0} 
                className="w-11 h-11 rounded-full bg-white/80 hover:bg-white shadow-sm border border-amber-900/10 disabled:opacity-20 active:scale-95 transition-all"
                title="Voltar oração"
              >
                <ChevronLeft className="w-5 h-5 text-amber-950/70" />
              </Button>
              
              {/* Circular Progress Bead Number */}
              <div className="flex items-center gap-2 px-3.5 py-1.5 bg-amber-50/80 border border-amber-200/80 rounded-full shadow-inner">
                <span className="text-xs font-black text-amber-900">
                  {currentIndex + 1}
                </span>
                <span className="text-[11px] text-amber-800/40">/</span>
                <span className="text-[11px] font-semibold text-amber-800/60">
                  {beads.length}
                </span>
              </div>

              {/* Primary Next Button */}
              <Button 
                variant="default"
                onClick={handleNext} 
                className="h-11 px-5 sm:px-6 rounded-full bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/25 flex items-center gap-1.5 active:scale-95 transition-all text-white font-bold text-xs uppercase tracking-wider"
              >
                <span>Avançar</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

          </main>
        </div>
      </div>
    </PageTransition>
  );
};

export default RosaryPrayer;
