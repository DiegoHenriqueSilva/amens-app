import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Mic, MicOff, ChevronRight, ChevronLeft, Sparkles, Heart, CheckCircle2 } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { PRAYERS, getMysteriesByDay, MISTERIOS, COROS_ANJOS, ROSARY_TYPES } from "@/data/rosary-data";
import { useRosaryVoice } from "@/hooks/use-rosary-voice";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useDailyTasks } from "@/hooks/use-daily-tasks";
import { recordAltarEvent } from '@/features/altar/events';

interface Bead {
  id: number;
  type: "small" | "large" | "medal" | "cross";
  prayer: string;
  name: string;
  mysteryTitle?: string;
  mysteryDescription?: string;
}

const RosaryPrayer = () => {
  const navigate = useNavigate();
  const { type } = useParams();
  const rosaryMeta = ROSARY_TYPES.find(t => t.id === type);
  const altarSessionId = useRef(crypto.randomUUID());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const { completeTask } = useDailyTasks();
  
  const activeBeadRef = useRef<HTMLDivElement>(null);
  const beadsContainerRef = useRef<HTMLDivElement>(null);

  const mysteries = useMemo(() => {
    if (type === "misterios") return getMysteriesByDay();
    return [];
  }, [type]);

  const beads = useMemo(() => {
    const sequence: Bead[] = [];
    let idCounter = 0;

    const addBead = (
      beadType: Bead["type"],
      prayerText: string,
      beadName: string,
      mysteryTitle?: string,
      mysteryDescription?: string
    ) => {
      sequence.push({
        id: idCounter++,
        type: beadType,
        prayer: prayerText,
        name: beadName,
        mysteryTitle,
        mysteryDescription,
      });
    };

    if (type === "misterios") {
      addBead("cross", PRAYERS.SINAL_CRUZ, "Sinal da Cruz (Início)");
      addBead("large", PRAYERS.CREDO, "Símbolo dos Apóstolos (Creio)");
      addBead("large", PRAYERS.PAI_NOSSO, "Pai Nosso (Pelas intenções do Santo Padre)");
      addBead("small", PRAYERS.AVE_MARIA, "1ª Ave Maria (Aumento da Fé)");
      addBead("small", PRAYERS.AVE_MARIA, "2ª Ave Maria (Aumento da Esperança)");
      addBead("small", PRAYERS.AVE_MARIA, "3ª Ave Maria (Aumento da Caridade)");
      addBead("large", PRAYERS.GLORIA, "Glória ao Pai");
      addBead("medal", PRAYERS.SALVE_RAINHA, "Salve Rainha (Medalha)");

      for (let i = 0; i < 5; i++) {
        const mystery = mysteries[i];
        const mysteryTitle = mystery?.title || `${i + 1}º Mistério`;
        const mysteryDesc = mystery?.description;

        addBead("large", PRAYERS.PAI_NOSSO, `Pai Nosso (${i + 1}º Mistério)`, mysteryTitle, mysteryDesc);
        for (let j = 1; j <= 10; j++) {
          addBead("small", PRAYERS.AVE_MARIA, `${j}ª Ave Maria (${i + 1}ª Dezena)`, mysteryTitle, mysteryDesc);
        }
        addBead("large", PRAYERS.GLORIA, `Glória ao Pai (${i + 1}ª Dezena)`, mysteryTitle, mysteryDesc);
        addBead("large", PRAYERS.OH_MEU_JESUS, `Jaculatória (${i + 1}ª Dezena)`, mysteryTitle, mysteryDesc);
      }
      addBead("medal", PRAYERS.SALVE_RAINHA, "Salve Rainha (Oração Final)", "Conclusão");
    } else if (type === "misericordia") {
      addBead("cross", PRAYERS.SINAL_CRUZ, "Sinal da Cruz (Início)");
      addBead("large", PRAYERS.PAI_NOSSO, "Pai Nosso Inicial");
      addBead("small", PRAYERS.AVE_MARIA, "Ave Maria Inicial");
      addBead("large", PRAYERS.CREDO, "Creio");

      for (let i = 0; i < 5; i++) {
        const title = `${i + 1}ª Dezena da Misericórdia`;
        addBead("large", PRAYERS.MISERICORDIA_PAI, "Eterno Pai", title);
        for (let j = 1; j <= 10; j++) {
          addBead("small", PRAYERS.MISERICORDIA_DEZENA, `${j}ª Invocação`, title);
        }
      }
      for (let i = 1; i <= 3; i++) {
        addBead("large", PRAYERS.MISERICORDIA_FIM, `${i}ª Invocação Final (Deus Santo)`, "Conclusão");
      }
    } else if (type === "libertacao") {
      addBead("cross", PRAYERS.SINAL_CRUZ, "Sinal da Cruz (Início)");
      addBead("large", PRAYERS.CREDO, "Creio");
      addBead("medal", PRAYERS.SALVE_RAINHA, "Salve Rainha");

      for (let i = 0; i < 5; i++) {
        const title = `${i + 1}ª Dezena de Libertação`;
        addBead("large", PRAYERS.LIBERTACAO_GRANDE, "Invocação Maior", title);
        for (let j = 1; j <= 10; j++) {
          addBead("small", PRAYERS.LIBERTACAO_PEQUENA, `${j}ª Invocação`, title);
        }
      }
      addBead("large", PRAYERS.SALVE_RAINHA, "Salve Rainha Final", "Oração Final");
    } else if (type === "miguel") {
      addBead("cross", PRAYERS.SINAL_CRUZ, "Sinal da Cruz (Início)");
      addBead("large", PRAYERS.MIGUEL_INICIO, "Invocação a São Miguel");
      addBead("large", PRAYERS.GLORIA, "Glória ao Pai");
      addBead("medal", PRAYERS.MIGUEL_CONCLUSAO, "Consagração a São Miguel");

      const coros = ["Serafins", "Querubins", "Tronos", "Dominações", "Potestades", "Virtudes", "Principados", "Arcanjos", "Anjos"];
      for (let i = 0; i < 9; i++) {
        const title = `Saudação aos ${coros[i]}`;
        addBead("large", COROS_ANJOS[i], `Saudação ao Coro`, title);
        addBead("large", PRAYERS.PAI_NOSSO, `Pai Nosso`, title);
        for (let j = 1; j <= 3; j++) {
          addBead("small", PRAYERS.AVE_MARIA, `${j}ª Ave Maria`, title);
        }
      }
      addBead("large", PRAYERS.MIGUEL_CONCLUSAO, "Oração Final a São Miguel", "Conclusão");
    }

    return sequence;
  }, [type, mysteries]);

  // Scroll active bead into view in the vertical track
  useEffect(() => {
    const bead = activeBeadRef.current;
    const track = beadsContainerRef.current;
    if (bead && track) {
      // Only move the bead track. scrollIntoView also moved the entire page.
      const beadBounds = bead.getBoundingClientRect();
      const trackBounds = track.getBoundingClientRect();
      track.scrollTo({
        top: track.scrollTop + beadBounds.top - trackBounds.top - (track.clientHeight - beadBounds.height) / 2,
        behavior: "smooth",
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
      if (['misterios', 'misericordia', 'libertacao', 'miguel'].includes(type || '')) {
        void recordAltarEvent(type === 'misterios' ? 'rosary_marian' : type === 'misericordia' ? 'rosary_mercy' : 'rosary_special', altarSessionId.current);
      }
      navigate("/");
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      if (navigator.vibrate) navigator.vibrate(20);
      setCurrentIndex(prev => prev - 1);
    }
  };

  const { listening, supported, error: voiceError } = useRosaryVoice(handleNext, isVoiceActive, beads[currentIndex]?.prayer);
  const currentBead = beads[currentIndex] || beads[0];
  const isAtEnd = currentIndex === beads.length - 1;

  useEffect(() => {
    if (!rosaryMeta) {
      toast.error("Essa modalidade de terço não existe.");
    }
  }, [rosaryMeta]);

  if (!rosaryMeta || !currentBead) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background flex items-center justify-center px-6 text-center">
          <Card className="max-w-md p-8 space-y-5 border-primary/15 soft-shadow">
            <div>
              <h1 className="text-2xl font-serif font-bold text-foreground">Modalidade não encontrada</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Escolha uma modalidade disponível para iniciar sua oração.
              </p>
            </div>
            <Button onClick={() => navigate("/rosary-selection")} className="gradient-divine w-full">
              Voltar às modalidades
            </Button>
          </Card>
        </div>
      </PageTransition>
    );
  }

  const handleVoiceToggle = () => {
    if (!supported) {
      setIsVoiceActive(false);
      toast.error("O reconhecimento de voz não está disponível. Use os controles manuais.");
      return;
    }
    setIsVoiceActive(active => !active);
  };

  const voiceStatus = voiceError
    ? voiceError
    : !supported
      ? "Voz indisponível — use os controles manuais"
      : isVoiceActive && listening
        ? "Ouvindo sua oração…"
        : isVoiceActive
          ? "Voz ativada — aguardando o microfone"
          : "Voz desligada — avance manualmente";

  return (
    <PageTransition>
      <div className="min-h-screen h-[100dvh] w-full bg-background text-foreground flex flex-col relative overflow-hidden">
        
        {/* Soft Ambient Divine Glows (same warm aesthetic as /terco) */}
        <div className="absolute top-[-6rem] left-[-4rem] w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none z-0" />
        <div className="absolute bottom-[-6rem] right-[-4rem] w-80 h-80 bg-accent/10 rounded-full blur-3xl pointer-events-none z-0" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none z-0" />

        {/* Top Header */}
        <header className="pt-4 pb-2 px-4 sm:px-8 flex justify-between items-center z-30 shrink-0 border-b border-primary/10 bg-background/60 backdrop-blur-md">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/rosary-selection")} 
            className="rounded-full hover:bg-primary/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Button>

          <div className="text-center flex-1 px-2">
            <h1 className="text-xs sm:text-sm font-bold uppercase tracking-[0.25em] text-primary">
              Sagrado Terço
            </h1>
            <p className="font-serif italic text-muted-foreground text-xs sm:text-sm truncate max-w-[240px] sm:max-w-md mx-auto">
              {rosaryMeta?.name || "Oração do Terço"}
            </p>
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleVoiceToggle}
            className={cn(
              "rounded-full border transition-all duration-300 shadow-sm",
              isVoiceActive 
                ? "bg-amber-500/15 border-amber-500/40 text-amber-600 animate-pulse" 
                : "border-primary/15 text-muted-foreground hover:bg-primary/10"
            )}
            title={isVoiceActive ? "Desativar voz" : "Ativar voz"}
            aria-label={isVoiceActive ? "Desativar auxílio de voz" : "Ativar auxílio de voz"}
          >
            {isVoiceActive ? <Mic className="w-4 h-4 text-amber-600" /> : <MicOff className="w-4 h-4" />}
          </Button>
        </header>

        {/* Main Content: Vertical Rosary beside the Prayer Text */}
        <div className="flex-1 flex flex-row items-stretch gap-3 sm:gap-6 px-3 sm:px-6 py-3 min-h-0 z-10 max-w-5xl mx-auto w-full overflow-hidden">
          
          {/* Vertical Golden Rosary Cord */}
          <div 
            ref={beadsContainerRef}
            className="w-16 sm:w-22 shrink-0 flex flex-col items-center relative py-6 bg-background/60 backdrop-blur-md rounded-3xl border border-primary/20 soft-shadow overflow-y-auto hide-scrollbar select-none"
          >
            {/* Start Badge */}
            <div className="mb-3 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-bold uppercase tracking-wider text-primary/80 shrink-0">
              Início
            </div>

            {/* Connecting Vertical Gold Thread */}
            <div className="w-[3px] bg-gradient-to-b from-[#d4af37]/30 via-[#d4af37]/70 to-[#d4af37]/30 absolute left-1/2 -translate-x-1/2 top-14 bottom-20 z-0 rounded-full shadow-[0_0_8px_rgba(212,175,55,0.4)]" />

            {/* List of Vertical Beads */}
            <div className="flex flex-col items-center gap-4 relative z-10 w-full py-2">
              {beads.map((bead, i) => {
                const isActive = currentIndex === i;
                const isPassed = currentIndex > i;
                const isRef = isActive;

                if (bead.type === "cross") {
                  return (
                    <div
                      key={bead.id}
                      ref={isRef ? activeBeadRef : null}
                      onClick={() => setCurrentIndex(i)}
                      className={cn(
                        "cursor-pointer transition-all duration-300 flex items-center justify-center p-1 rounded-full",
                        isActive ? "scale-125 drop-shadow-[0_0_14px_rgba(212,175,55,0.95)]" : "hover:scale-110 opacity-70 hover:opacity-100"
                      )}
                      title={bead.name}
                    >
                      <svg 
                        width="28" 
                        height="32" 
                        viewBox="0 0 24 28" 
                        className="transition-transform duration-300"
                      >
                        <defs>
                          <linearGradient id={`crossGold-${bead.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#fff2a3" />
                            <stop offset="40%" stopColor="#f5c542" />
                            <stop offset="100%" stopColor="#b8860b" />
                          </linearGradient>
                        </defs>
                        <path 
                          d="M12 2v24M6 9h12" 
                          stroke={isActive || isPassed ? `url(#crossGold-${bead.id})` : "#c5a059"} 
                          strokeWidth={isActive ? "3.2" : "2.4"} 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          fill="none" 
                        />
                      </svg>
                    </div>
                  );
                }

                if (bead.type === "medal") {
                  return (
                    <div
                      key={bead.id}
                      ref={isRef ? activeBeadRef : null}
                      onClick={() => setCurrentIndex(i)}
                      className={cn(
                        "w-8 h-8 rounded-full cursor-pointer transition-all duration-300 flex items-center justify-center border-2",
                        isActive
                          ? "scale-125 bg-gradient-to-br from-[#fff7c2] via-[#d4af37] to-[#8b6508] border-white shadow-[0_0_18px_rgba(212,175,55,0.9)]"
                          : isPassed
                          ? "bg-gradient-to-br from-[#f7d070] via-[#d4af37] to-[#a37f17] border-[#d4af37] opacity-90 hover:scale-110"
                          : "bg-[#d4af37]/15 border-[#d4af37]/40 hover:scale-110 hover:border-[#d4af37]"
                      )}
                      title={bead.name}
                    >
                      <Heart className={cn(
                        "w-4 h-4 transition-colors",
                        isActive || isPassed ? "text-amber-950 fill-amber-950" : "text-[#d4af37]"
                      )} />
                    </div>
                  );
                }

                if (bead.type === "large") {
                  return (
                    <div
                      key={bead.id}
                      ref={isRef ? activeBeadRef : null}
                      onClick={() => setCurrentIndex(i)}
                      className={cn(
                        "w-7 h-7 rounded-full cursor-pointer transition-all duration-300 flex items-center justify-center border-2",
                        isActive
                          ? "scale-125 bg-gradient-to-br from-[#ffffff] via-[#f7d070] to-[#b8860b] border-white ring-4 ring-[#d4af37]/30 shadow-[0_0_16px_rgba(212,175,55,0.95)]"
                          : isPassed
                          ? "bg-gradient-to-br from-[#fff3b0] via-[#d4af37] to-[#996515] border-[#d4af37]/80 opacity-90 hover:scale-110"
                          : "bg-gradient-to-br from-[#fffdf5] via-[#faeed1] to-[#e0c588] border-[#d4af37]/40 hover:scale-110 hover:border-[#d4af37]"
                      )}
                      title={bead.name}
                    >
                      <div className="w-2 h-2 rounded-full bg-white/70" />
                    </div>
                  );
                }

                // Small beads (Ave Marias)
                return (
                  <div
                    key={bead.id}
                    ref={isRef ? activeBeadRef : null}
                    onClick={() => setCurrentIndex(i)}
                    className={cn(
                      "rounded-full cursor-pointer transition-all duration-300 border",
                      isActive
                        ? "w-6 h-6 scale-125 bg-gradient-to-br from-[#ffffff] via-[#fce282] to-[#c59a27] border-white ring-2 ring-[#d4af37]/40 shadow-[0_0_14px_rgba(212,175,55,0.9)]"
                        : isPassed
                        ? "w-4 h-4 bg-gradient-to-br from-[#fff0a6] via-[#d4af37] to-[#a37a1a] border-[#d4af37]/70 opacity-90 hover:scale-125"
                        : "w-3.5 h-3.5 bg-gradient-to-br from-[#fffaf0] to-[#ecd9ad] border-[#d4af37]/40 hover:scale-125 hover:border-[#d4af37]"
                    )}
                    title={bead.name}
                  />
                );
              })}
            </div>

            {/* End / Amém Terminal Indicator */}
            <div 
              onClick={() => setCurrentIndex(beads.length - 1)}
              className={cn(
                "mt-4 mb-2 flex flex-col items-center gap-1 cursor-pointer transition-all duration-300 shrink-0 z-10",
                isAtEnd ? "scale-110" : "opacity-75 hover:opacity-100"
              )}
              title="Fim do Terço"
            >
              <div 
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-500 shadow-md",
                  isAtEnd
                    ? "bg-gradient-to-br from-[#fff2a3] via-[#d4af37] to-[#8b6508] border-white shadow-[0_0_20px_rgba(212,175,55,0.95)] ring-4 ring-amber-400/40 animate-pulse text-amber-950"
                    : "bg-primary/10 border-primary/30 text-primary hover:border-primary"
                )}
              >
                {isAtEnd ? (
                  <Sparkles className="w-4 h-4 fill-current" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
              </div>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-widest transition-colors",
                isAtEnd ? "text-amber-700 font-extrabold" : "text-primary/70"
              )}>
                {isAtEnd ? "Amém!" : "Fim"}
              </span>
            </div>

          </div>

          {/* Right Column: Prayer Card & Guidance */}
          <div className="flex-1 flex flex-col justify-center min-h-0 py-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 1.01 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="flex flex-col justify-center max-w-2xl w-full mx-auto my-auto space-y-4"
              >
                {/* Mystery Information Header */}
                {currentBead.mysteryTitle && (
                  <motion.div 
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center text-center space-y-1"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full shadow-sm">
                      Mistério
                    </span>
                    <h2 className="text-sm sm:text-base md:text-lg font-serif font-bold text-foreground">
                      {currentBead.mysteryTitle}
                    </h2>
                    {currentBead.mysteryDescription && (
                      <p className="text-xs text-muted-foreground italic max-w-lg">
                        {currentBead.mysteryDescription}
                      </p>
                    )}
                  </motion.div>
                )}

                {/* Bead Name Badge */}
                <div className="text-center">
                  <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
                    {currentBead.name}
                  </span>
                </div>

                {/* Main Prayer Card (Warm, Soft Glass Aesthetic) */}
                <Card className="p-6 sm:p-8 md:p-10 bg-card/85 backdrop-blur-md border-primary/20 soft-shadow rounded-3xl relative overflow-hidden shadow-lg border">
                  <div className="absolute top-0 left-0 w-full h-1.5 gradient-divine" />
                  
                  <p className="font-serif italic text-lg sm:text-2xl md:text-3xl text-foreground font-semibold leading-relaxed text-center drop-shadow-sm whitespace-pre-wrap">
                    "{currentBead.prayer}"
                  </p>
                </Card>
              </motion.div>
            </AnimatePresence>
          </div>

        </div>

        {/* Bottom Bar: Ergonomic Controls */}
        <footer className="px-3 sm:px-8 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col items-center z-30 shrink-0 bg-background/80 backdrop-blur-md border-t border-primary/10">
          
          {/* Listening Feedback HUD */}
          <div className={cn(
            "mb-3 px-4 py-1.5 rounded-full border text-[11px] font-bold uppercase tracking-widest text-center",
            voiceError ? "bg-destructive/10 border-destructive/30 text-destructive" : "bg-primary/5 border-primary/20 text-muted-foreground"
          )} role="status" aria-live="polite">
            {voiceStatus}
          </div>

          <div className="w-full max-w-2xl flex items-center justify-between gap-2">
            {/* Previous Bead Button */}
            <Button 
              variant="outline" 
              onClick={handlePrevious} 
              disabled={currentIndex === 0} 
              className="h-11 sm:h-12 min-w-0 px-3 sm:px-5 rounded-full border-primary/20 bg-background/90 hover:bg-primary/10 disabled:opacity-30 shadow-sm transition-all flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-sm font-bold whitespace-nowrap"
              aria-label="Voltar para a conta anterior"
              title="Voltar para a conta anterior"
            >
              <ChevronLeft className="w-5 h-5 text-foreground shrink-0" />
              <span className="sm:hidden">Voltar</span>
              <span className="hidden sm:inline">Conta anterior</span>
            </Button>

            {/* Counter Badge */}
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-[11px] sm:text-xs font-bold text-foreground" aria-label={`Conta ${currentIndex + 1} de ${beads.length}`}>
              <span className="text-primary">{currentIndex + 1}</span>
              <span className="opacity-40">/</span>
              <span className="opacity-70">{beads.length}</span>
            </div>

            {/* Next / Complete Bead Button */}
            <Button 
              onClick={handleNext}
              className="gradient-divine h-11 sm:h-12 min-w-0 px-3 sm:px-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-sm font-bold tracking-wide whitespace-nowrap"
              aria-label={isAtEnd ? "Concluir o terço" : "Seguir para a próxima conta"}
            >
              <span className="sm:hidden">{isAtEnd ? "Concluir" : "Seguir"}</span>
              <span className="hidden sm:inline">{isAtEnd ? "Concluir Terço" : "Próxima conta"}</span>
              <ChevronRight className="w-5 h-5 shrink-0" />
            </Button>
          </div>
        </footer>

      </div>
    </PageTransition>
  );
};

export default RosaryPrayer;
