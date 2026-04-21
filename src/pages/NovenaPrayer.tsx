import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronRight, CheckCircle2, Sparkles, BookOpen, Quote, Heart, HandsPraying, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NOVENAS, UNIVERSAL_PRAYERS } from "@/data/novenas";
import { useNovenaState } from "@/hooks/use-novena-state";
import { ReminderModal } from "@/components/novenas/ReminderModal";
import PageTransition from "@/components/PageTransition";
import { cn } from "@/lib/utils";

const NovenaPrayer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const novena = NOVENAS.find(n => n.id === id);
  const { state, updateProgress, setReminder } = useNovenaState(id || "");
  
  const [step, setStep] = useState(0); 
  const [showReminder, setShowReminder] = useState(false);
  const [showConclusion, setShowConclusion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!novena) return null;

  const currentDayData = novena.days.find(d => d.day === state.currentDay) || novena.days[0];

  const steps = [
    { 
      title: "Passo 1: Abertura", 
      icon: Sparkles, 
      content: UNIVERSAL_PRAYERS.opening,
      subtitle: "Sinal da Cruz"
    },
    { 
      title: "Passo 2: Ato de Contrição", 
      icon: BookOpen, 
      content: UNIVERSAL_PRAYERS.contrition,
      subtitle: "Arrependimento"
    },
    { 
      title: "Passo 3: Oração Inicial", 
      icon: Sparkles, 
      content: novena.prayers.initial,
      subtitle: "Fixo"
    },
    { 
      title: novena.type === "michael" ? "Passo 4: Saudação Angélica" : novena.type === "mercy" ? "Passo 4: Intenção" : "Passo 4: Meditação e Leitura", 
      icon: novena.type === "michael" ? ShieldCheck : Quote, 
      content: currentDayData.reading ? `*Leitura: ${currentDayData.reading}*\n\n${currentDayData.content}` : currentDayData.content,
      subtitle: `Dia ${state.currentDay}`
    },
    { 
      title: novena.type === "mercy" ? "Passo 5: Terço da Misericórdia" : "Passo 5: Pedido e Confiança", 
      icon: HandsPraying, 
      content: novena.prayers.petition || "(Faça aqui o seu pedido em silêncio)",
      subtitle: novena.type === "mercy" ? "Interativo" : "Pessoal"
    },
    { 
      title: "Passo 6: Oração Final", 
      icon: Heart, 
      content: novena.prayers.final,
      subtitle: "Conclusão"
    },
    { 
      title: "Passo 7: Orações Comuns", 
      icon: HandsPraying, 
      content: UNIVERSAL_PRAYERS.common,
      subtitle: "Pai Nosso, Ave Maria e Glória"
    },
    { 
      title: "Passo 8: Bênção Final", 
      icon: ShieldCheck, 
      content: UNIVERSAL_PRAYERS.blessing,
      subtitle: "Envio"
    },
  ];

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
  };

  if (showConclusion) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }}
              className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6"
            >
               <CheckCircle2 className="w-10 h-10 text-primary" />
            </motion.div>
            <h2 className="text-3xl font-bold mb-4">
              {state.currentDay === 9 ? "Novena Concluída!" : "Dia Concluído! 🙏"}
            </h2>
            <Card className="p-8 soft-shadow border-primary/10 max-w-md bg-white/50 backdrop-blur-sm mb-8">
               <p className="text-foreground/80 leading-relaxed italic text-sm">
                 {state.currentDay === 9 
                   ? "Parabéns por concluir sua jornada de 9 dias. Que as graças solicitadas sejam alcançadas segundo a vontade do Pai. Amém."
                   : "Que a paz de Cristo esteja com você. Amanhã continuaremos nossa caminhada de fé."
                 }
               </p>
            </Card>
            <Button onClick={handleFinish} className="w-full max-w-xs h-16 rounded-2xl gradient-divine shadow-lg text-lg font-bold">
              {state.currentDay < 9 ? "Definir Lembrete de Amanhã" : "Finalizar Novena"}
            </Button>

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
      <div className="min-h-screen bg-background pb-32">
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-md sticky top-0 z-30 border-b border-primary/5 pt-12 pb-4 px-6">
          <div className="flex items-center gap-4 max-w-2xl mx-auto">
            <Button variant="ghost" size="icon" onClick={() => navigate("/novenas")} className="rounded-full hover:bg-primary/5">
              <ArrowLeft className="w-5 h-5 text-primary" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-black leading-none mb-1 truncate">{novena.name}</h1>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Dia {state.currentDay}</span>
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest truncate">{steps[step].title}</span>
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="max-w-2xl mx-auto mt-6 px-2">
            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
               <motion.div 
                 className="h-full bg-primary"
                 initial={{ width: 0 }}
                 animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
               />
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-8 max-w-2xl" ref={containerRef}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-8 soft-shadow border-primary/5 rounded-[3rem] bg-white/80 min-h-[450px] flex flex-col relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100%] pointer-events-none" />

                <div className="flex items-center gap-4 mb-8 pb-6 border-b border-primary/5">
                   <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shadow-inner">
                      <CurrentIcon className="w-6 h-6 text-primary" />
                   </div>
                   <div>
                      <h2 className="text-xl font-black text-foreground tracking-tight">{steps[step].title}</h2>
                      <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-primary/60">{steps[step].subtitle}</p>
                   </div>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                   <p className={cn(
                     "text-lg leading-relaxed text-foreground/90 whitespace-pre-wrap text-center py-4",
                     step === 3 && currentDayData.reading ? "italic border-l-4 border-primary/20 pl-6 text-left" : ""
                   )}>
                     {steps[step].content}
                   </p>
                </div>

                <div className="mt-12 pt-8 border-t border-primary/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                   <div className="flex flex-col">
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.25em]">
                        Passo {step + 1} de {steps.length}
                      </p>
                      <div className="flex gap-1 mt-1">
                        {steps.map((_, i) => (
                          <div key={i} className={cn("h-1 rounded-full transition-all duration-300", i === step ? "w-4 bg-primary" : "w-1.5 bg-primary/10")} />
                        ))}
                      </div>
                   </div>
                   <Button onClick={handleNext} className="w-full sm:w-auto rounded-2xl h-14 px-10 gradient-divine shadow-lg hover:shadow-xl flex items-center justify-center gap-3 group text-base font-bold">
                     <span>{step < steps.length - 1 ? "Próxima Oração" : "Concluir Dia"}</span>
                     <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                   </Button>
                </div>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </PageTransition>
  );
};

export default NovenaPrayer;
