import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronRight, CheckCircle2, Sparkles, BookOpen, Quote, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NOVENAS } from "@/data/novenas";
import { useNovenaState } from "@/hooks/use-novena-state";
import { ReminderModal } from "@/components/novenas/ReminderModal";
import PageTransition from "@/components/PageTransition";
import { cn } from "@/lib/utils";

const NovenaPrayer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const novena = NOVENAS.find(n => n.id === id);
  const { state, updateProgress, setReminder } = useNovenaState(id || "");
  
  const [step, setStep] = useState(0); // 0: Initial, 1: Reading, 2: Content, 3: Final
  const [showReminder, setShowReminder] = useState(false);
  const [showConclusion, setShowConclusion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!novena) return null;

  const currentDayData = novena.days.find(d => d.day === state.currentDay) || novena.days[state.days.length - 1];

  const steps = [
    { title: "Oração Inicial", icon: Sparkles, content: novena.prayers.initial },
    { title: "Leitura Bíblica", icon: BookOpen, content: `(${currentDayData.reading})\n\n${currentDayData.content}` },
    { title: "Meditação do Dia", icon: Quote, content: currentDayData.content },
    { title: "Oração Final", icon: Heart, content: novena.prayers.final },
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
             {state.currentDay === 9 ? "Novena Concluída!" : "Oração Concluída!"}
           </h2>
           <Card className="p-8 soft-shadow border-primary/10 max-w-md bg-white/50 backdrop-blur-sm mb-8">
              <p className="text-foreground/80 leading-relaxed italic">
                "Que a paz de Cristo esteja com você. Parabéns por dedicar este tempo à sua fé. Que as bênçãos desta novena iluminem o seu caminho e tragam a graça que você busca. Deus te abençoe poderosamente! Obrigado por usar nosso aplicativo para sua jornada espiritual."
              </p>
           </Card>
           <Button onClick={handleFinish} className="w-full max-w-xs h-16 rounded-2xl gradient-divine shadow-lg text-lg">
             {state.currentDay < 9 ? "Próximo Passo" : "Finalizar Jornada"}
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
        <div className="bg-white/70 backdrop-blur-md sticky top-0 z-30 border-b border-primary/5 pt-12 pb-4 px-4">
          <div className="flex items-center gap-4 max-w-2xl mx-auto">
            <Button variant="ghost" size="icon" onClick={() => navigate("/novenas")} className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold leading-none mb-1">{novena.name}</h1>
              <p className="text-xs text-primary font-bold uppercase tracking-widest">Dia {state.currentDay} • {steps[step].title}</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="max-w-2xl mx-auto mt-4 px-2">
            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
               <motion.div 
                 className="h-full bg-primary"
                 initial={{ width: 0 }}
                 animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
               />
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 max-w-2xl" ref={containerRef}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-8 soft-shadow border-primary/5 rounded-[2.5rem] bg-white/80 min-h-[400px] flex flex-col">
                <div className="flex items-center gap-3 mb-6 pb-6 border-b border-primary/5">
                   <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                      <CurrentIcon className="w-5 h-5 text-primary" />
                   </div>
                   <h2 className="text-xl font-bold">{steps[step].title}</h2>
                </div>

                <div className="flex-1">
                   <p className={cn(
                     "text-lg leading-relaxed text-foreground/90 whitespace-pre-wrap",
                     step === 1 ? "italic border-l-4 border-primary/20 pl-6 py-2 bg-primary/5 rounded-r-2xl" : ""
                   )}>
                     {steps[step].content}
                   </p>
                </div>

                <div className="mt-12 pt-6 border-t border-primary/5 flex items-center justify-between">
                   <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
                     Passo {step + 1} de {steps.length}
                   </p>
                   <Button onClick={handleNext} className="rounded-xl gradient-divine px-8 h-12 shadow-md flex items-center gap-2 group">
                     {step < steps.length - 1 ? "Próxima Oração" : "Concluir Dia"}
                     <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
