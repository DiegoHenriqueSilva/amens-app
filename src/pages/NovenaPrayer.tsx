import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronRight, ChevronLeft, CheckCircle2, Sparkles, BookOpen, Quote, Heart, HandHeart, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NOVENAS, UNIVERSAL_PRAYERS } from "@/data/novenas";
import { useNovenaState } from "@/hooks/use-novena-state";
import { ReminderModal } from "@/components/novenas/ReminderModal";
import PageTransition from "@/components/PageTransition";
import { cn } from "@/lib/utils";
import { MercyChaplet } from "@/components/novenas/MercyChaplet";
import { usePushPrompt } from "@/contexts/PushPromptContext";

const NovenaPrayer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const novena = NOVENAS.find(n => n.id === id);
  const { state, updateProgress, setReminder } = useNovenaState(id || "");
  
  const [step, setStep] = useState(0); 
  const [showReminder, setShowReminder] = useState(false);
  const [showConclusion, setShowConclusion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { triggerPushPrompt } = usePushPrompt();

  if (!novena) return null;

  const currentDayData = novena.days.find(d => d.day === state.currentDay) || novena.days[0];

  const steps = [
    { 
      title: "Sinal da Cruz", 
      icon: Sparkles, 
      content: UNIVERSAL_PRAYERS.opening,
      subtitle: "Passo 1"
    },
    { 
      title: "Ato de Contrição", 
      icon: BookOpen, 
      content: UNIVERSAL_PRAYERS.contrition,
      subtitle: "Passo 2"
    },
    { 
      title: "Oração Inicial", 
      icon: Sparkles, 
      content: novena.prayers.initial,
      subtitle: "Passo 3"
    },
    { 
      title: novena.type === "michael" ? "Saudação Angélica" : novena.type === "mercy" ? "Intenção do Dia" : "Leitura e Meditação", 
      icon: novena.type === "michael" ? ShieldCheck : Quote, 
      content: currentDayData.content,
      subtitle: `Passo 4 - Dia ${state.currentDay}`
    },
    { 
      title: novena.type === "mercy" ? "Terço da Misericórdia" : "Orações Comuns", 
      icon: HandHeart, 
      content: novena.type === "mercy" ? "" : UNIVERSAL_PRAYERS.common, // Interativo para mercy
      subtitle: "Passo 5"
    },
    { 
      title: "Oração Final", 
      icon: Heart, 
      content: novena.prayers.final,
      subtitle: "Passo 6"
    },
    { 
      title: "Bênção Final", 
      icon: ShieldCheck, 
      content: UNIVERSAL_PRAYERS.blessing,
      subtitle: "Passo 7"
    },
  ];

  // Identificar se é o passo do Terço Interativo
  const isInteractiveStep = novena.type === "mercy" && step === 4;

  // Auto-scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    updateProgress(state.currentDay);
    setShowConclusion(true);
  };

  const handleFinish = () => {
    if (state.currentDay < 9) {
      setShowReminder(true);
    } else {
      navigate("/novenas");
    }
  };

  const handleConfirmReminder = (time: string) => {
    setReminder(time);
    navigate("/novenas");
    // Trigger push prompt right after navigating
    setTimeout(() => {
        triggerPushPrompt("Não perca sua prece amanhã, autorize as notificações");
    }, 500);
  };

  if (showConclusion) {
    return (
      <PageTransition>
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-16 h-16 rounded-full border border-hairline bg-vellum flex items-center justify-center mb-6"
            >
               <CheckCircle2 size={28} strokeWidth={1.5} className="text-marian" />
            </motion.div>
            <h2 className="font-serif text-[28px] text-ink mb-4">
              {state.currentDay === 9 ? "Novena concluída" : "Dia concluído"}
            </h2>
            <div className="rounded-xl border border-hairline bg-vellum p-6 max-w-md mb-8">
               <p className="font-serif italic text-[16px] text-ink leading-relaxed">
                 {state.currentDay === 9
                   ? "Que as graças solicitadas sejam alcançadas segundo a vontade do Pai. Amém."
                   : "Que a paz de Cristo esteja com você. Amanhã continuaremos nossa caminhada de fé."
                 }
               </p>
            </div>
            <button onClick={handleFinish} className="h-12 px-8 rounded-full bg-ink text-paper text-sm font-medium hover:opacity-90 transition-opacity">
              {state.currentDay < 9 ? "Definir lembrete para amanhã" : "Finalizar novena"}
            </button>

            <ReminderModal 
              open={showReminder} 
              onOpenChange={setShowReminder}
              currentDay={state.currentDay}
              onConfirm={handleConfirmReminder}
            />
        </div>
      </PageTransition>
    );
  }

  const CurrentIcon = steps[step].icon;

  return (
    <PageTransition>
      <div className="min-h-screen w-full pb-32">

        {/* Header */}
        <div className="bg-paper/90 backdrop-blur-md sticky top-0 z-30 border-b border-hairline pt-safe pt-4 pb-4 px-5">
          <div className="flex items-center gap-4 max-w-2xl mx-auto">
            <button onClick={() => navigate("/novenas")} className="p-1 -ml-1 text-ink-soft hover:text-ink transition-colors">
              <ArrowLeft size={20} strokeWidth={1.5} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-[14px] font-medium text-ink leading-none mb-1 truncate">{novena.name}</h1>
              <div className="flex items-center gap-2">
                <span className="text-[9px] uppercase tracking-[0.18em] text-marian">Dia {state.currentDay}</span>
                <span className="text-ink-soft">·</span>
                <span className="text-[9px] uppercase tracking-[0.18em] text-ink-soft truncate">{steps[step].title}</span>
              </div>
            </div>
          </div>
          <div className="max-w-2xl mx-auto mt-3 px-0">
            <div className="h-1 w-full bg-hairline rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-marian rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="px-5 py-6 max-w-2xl mx-auto" ref={containerRef}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
            >
              <div className="min-h-[450px] flex flex-col">
                <div className="flex items-center gap-3 mb-6 pb-5 border-b border-hairline">
                  <div className="w-10 h-10 border border-hairline rounded-full flex items-center justify-center bg-vellum">
                    <CurrentIcon size={18} strokeWidth={1.5} className="text-gold" />
                  </div>
                  <div>
                    <h2 className="font-serif text-[18px] text-ink">{steps[step].title}</h2>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-ink-soft">{steps[step].subtitle}</p>
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                  {isInteractiveStep ? (
                    <MercyChaplet onComplete={handleNext} />
                  ) : (
                    <p className={cn(
                      "font-serif text-[18px] leading-[1.6] text-ink whitespace-pre-wrap py-4",
                      step === 3 ? "italic border-l-2 border-hairline pl-5 text-left" : "text-center"
                    )}>
                      {steps[step].content}
                    </p>
                  )}
                </div>

                {!isInteractiveStep && (
                  <div className="mt-10 pt-6 border-t border-hairline flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex gap-1">
                      {steps.map((_, i) => (
                        <div key={i} className={cn("h-1 rounded-full transition-all duration-300", i === step ? "w-4 bg-marian" : "w-1.5 bg-hairline")} />
                      ))}
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      {step > 0 && (
                        <button
                          onClick={() => setStep(step - 1)}
                          className="flex-1 sm:flex-none h-11 px-5 rounded-full border border-hairline text-ink-soft text-sm hover:text-ink hover:border-ink/30 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <ChevronLeft size={16} strokeWidth={1.5} />
                          Voltar
                        </button>
                      )}

                      <button
                        onClick={handleNext}
                        className="flex-[2] sm:flex-none h-12 px-8 rounded-full bg-ink text-paper text-sm font-medium hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        {step < steps.length - 1 ? "Próxima oração" : "Concluir dia"}
                        <ChevronRight size={16} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </PageTransition>
  );
};

export default NovenaPrayer;
