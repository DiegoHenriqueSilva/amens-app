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

        {/* Main Body: Centered Container with Beads immediately next to Prayer Card */}
        <div className="flex-1 flex items-center justify-center min-h-0 relative z-20 px-3 sm:px-6 py-2 pb-6 overflow-hidden">
          <div className="w-full max-w-4xl h-full flex flex-row items-stretch justify-center gap-3 sm:gap-6 min-h-0">
            
            {/* Vertical Beads Rail (Directly beside prayer card) */}
            <aside className="w-16 sm:w-20 shrink-0 flex flex-col items-center relative rounded-[2rem] bg-white/70 backdrop-blur-md border border-amber-900/10 shadow-md py-4 overflow-hidden">
              {/* Golden Thread/Cord Line */}
              <div className="absolute top-6 bottom-6 left-1/2 -translate-x-1/2 w-[2px] bg-gradient-to-b from-amber-400/30 via-amber-500/60 to-amber-400/30 rounded-full" />

              {/* Scrollable Beads List with hidden scrollbars */}
              <div 
                className="w-full h-full overflow-y-auto flex flex-col items-center gap-3.5 py-4 px-1 relative z-10 select-none"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
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
                          "w-9 h-9 rounded-full transition-all duration-300 cursor-pointer flex items-center justify-center shrink-0 active:scale-90",
                          isActive 
                            ? "scale-125 bg-gradient-to-b from-amber-100 to-amber-200 ring-4 ring-amber-400/50 shadow-[0_0_16px_rgba(245,158,11,0.6)]" 
                            : "hover:scale-110 bg-white/80 shadow-sm border border-amber-900/10"
                        )}
                        title="Sinal da Cruz"
                      >
                        <svg 
                          width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" 
                          className={cn(
                            "w-5 h-5 transition-colors filter drop-shadow-sm",
                            isActive ? "text-amber-700" : isPassed ? "text-amber-600" : "text-amber-800/40"
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
                          "w-8 h-8 rounded-full transition-all duration-300 cursor-pointer flex items-center justify-center shrink-0 active:scale-90",
                          isActive 
                            ? "bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-200 text-white scale-125 ring-4 ring-amber-300 shadow-[0_0_18px_rgba(245,158,11,0.6)] border border-white" 
                            : isPassed 
                            ? "bg-gradient-to-tr from-amber-500 to-amber-300 text-white shadow-sm border border-amber-400/50" 
                            : "bg-gradient-to-tr from-[#f0ebe1] to-[#ffffff] border border-amber-900/15 text-amber-800/40 shadow-sm hover:scale-110"
                        )}
                        title="Medalha"
                      >
                        <Heart className={cn("w-4 h-4 transition-transform", isActive ? "scale-110 fill-current" : isPassed ? "fill-current" : "")} />
                      </div>
                    );
                  }

                  // Large Bead (Our Father / Mystery)
                  if (bead.type === "large") {
                    return (
                      <div 
                        key={i} 
                        ref={isActive ? activeBeadRef : null}
                        onClick={() => setCurrentIndex(i)}
                        className={cn(
                          "w-5 h-5 rounded-full transition-all duration-300 cursor-pointer shrink-0 active:scale-90 relative",
                          isActive 
                            ? "scale-150 ring-4 ring-amber-300/70 shadow-[0_0_20px_rgba(245,158,11,0.7)] border-2 border-white" 
                            : isPassed 
                            ? "shadow-sm border border-amber-600/30 hover:scale-125" 
                            : "shadow-sm border border-amber-900/20 hover:scale-125"
                        )}
                        style={{
                          background: isActive
                            ? "radial-gradient(circle at 35% 30%, #ffffff 0%, #fbbf24 45%, #b45309 100%)"
                            : isPassed
                            ? "radial-gradient(circle at 35% 30%, #fff7ed 0%, #d97706 60%, #92400e 100%)"
                            : "radial-gradient(circle at 35% 30%, #ffffff 0%, #fef3c7 40%, #d1c1a5 100%)"
                        }}
                        title={bead.mysteryTitle || "Pai Nosso"}
                      />
                    );
                  }

                  // Small Bead (Hail Mary)
                  return (
                    <div 
                      key={i} 
                      ref={isActive ? activeBeadRef : null}
                      onClick={() => setCurrentIndex(i)}
                      className={cn(
                        "w-3.5 h-3.5 rounded-full transition-all duration-300 cursor-pointer shrink-0 active:scale-90",
                        isActive 
                          ? "scale-150 ring-4 ring-amber-300/80 shadow-[0_0_16px_rgba(245,158,11,0.8)] border border-white" 
                          : isPassed 
                          ? "shadow-sm border border-amber-600/20" 
                          : "shadow-sm border border-stone-300/40 hover:scale-125"
                      )}
                      style={{
                        background: isActive
                          ? "radial-gradient(circle at 35% 30%, #ffffff 0%, #f59e0b 50%, #b45309 100%)"
                          : isPassed
                          ? "radial-gradient(circle at 35% 30%, #fef3c7 0%, #d97706 60%, #92400e 100%)"
                          : "radial-gradient(circle at 35% 30%, #ffffff 0%, #f3ede2 50%, #cdc2b0 100%)"
                      }}
                      title="Ave Maria"
                    />
                  );
                })}
              </div>
            </aside>

            {/* Central Prayer View */}
            <main className="flex-1 flex flex-col items-center justify-between min-h-0 bg-white/80 backdrop-blur-md rounded-[2rem] border border-amber-900/10 shadow-lg p-6 sm:p-10 overflow-hidden relative">
              
              {/* Top Golden Border Line */}
              <div className="absolute top-0 left-8 right-8 h-[3px] bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-70" />

              {/* Bead Header Subtitle */}
              <div className="w-full text-center shrink-0 mb-3 pt-1">
                <span className="text-[11px] sm:text-xs font-black uppercase tracking-[0.35em] text-amber-800/80">
                  {beadHeaderTitle}
                </span>
                <div className="w-10 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent rounded-full mx-auto mt-2" />
              </div>

              {/* Prayer Content with smooth transitions */}
              <div className="flex-1 w-full flex flex-col items-center justify-center overflow-y-auto px-2 sm:px-8 my-auto style-scrollbar">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -12, scale: 1.02 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="max-w-2xl w-full text-center space-y-6"
                  >
                    {currentBead?.mysteryTitle && (
                      <div className="flex flex-col justify-center items-center mb-2">
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-800 bg-amber-100/90 px-4 py-1.5 rounded-full shadow-sm border border-amber-300/50 block mb-2.5">
                          Mistério
                        </span>
                        <h3 className="text-xs sm:text-sm font-bold text-amber-950 uppercase tracking-[0.12em] leading-relaxed">
                          {currentBead.mysteryTitle}
                        </h3>
                      </div>
                    )}
                    
                    <p className="font-serif italic text-lg sm:text-2xl md:text-3xl text-[#2c1d0a] font-semibold leading-[1.45] px-2 drop-shadow-sm whitespace-pre-wrap">
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
                  className="shrink-0 mb-2 flex items-center gap-2 px-4 py-1.5 bg-amber-100/90 backdrop-blur-sm rounded-full border border-amber-300 shadow-sm"
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
                  className="w-11 h-11 rounded-full bg-white/90 hover:bg-white shadow-sm border border-amber-900/10 disabled:opacity-20 active:scale-95 transition-all"
                  title="Voltar oração"
                >
                  <ChevronLeft className="w-5 h-5 text-amber-950/70" />
                </Button>
                
                {/* Circular Progress Bead Number */}
                <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-50 border border-amber-200/90 rounded-full shadow-inner">
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
                  className="h-11 px-6 sm:px-7 rounded-full bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/25 flex items-center gap-2 active:scale-95 transition-all text-white font-bold text-xs uppercase tracking-wider"
                >
                  <span>Avançar</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

            </main>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default RosaryPrayer;
