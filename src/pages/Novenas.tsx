import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, ChevronRight, RotateCcw, Play, Sparkles, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NOVENAS } from "@/data/novenas";
import { useNovenaState } from "@/hooks/use-novena-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import PageTransition from "@/components/PageTransition";
import { cn } from "@/lib/utils";

const NovenaCard = ({ novena, onSelect }: { novena: typeof NOVENAS[0], onSelect: (id: string) => void }) => {
  const { state } = useNovenaState(novena.id);
  const [imgError, setImgError] = useState(false);
  
  return (
    <motion.div
      variants={{
        initial: { opacity: 0, y: 15 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.4 } }
      }}
    >
      <Card 
        onClick={() => onSelect(novena.id)}
        className="p-6 h-full text-center flex flex-col items-center justify-between border-primary/5 soft-shadow bg-white/80 backdrop-blur-sm hover:-translate-y-1 hover:shadow-xl transition-all duration-300 rounded-[2rem] group cursor-pointer"
      >
        <div className="relative">
          <div className="w-20 h-20 bg-transparent rounded-full flex items-center justify-center mb-4 overflow-hidden border-2 border-primary/10 shadow-md">
            {!imgError ? (
              <img 
                src={novena.image} 
                alt={novena.name}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            ) : (
              <ImageIcon className="w-8 h-8 text-primary/30" />
            )}
          </div>
          {state.isCompleted && (
            <div className="absolute -top-1 -right-1 bg-green-500 text-white p-1 rounded-full shadow-lg">
              <Sparkles className="w-3 h-3" />
            </div>
          )}
          {(state.currentDay > 1 && !state.isCompleted) && (
             <div className="absolute -bottom-2 right-0 bg-primary text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md uppercase tracking-tighter">
                Dia {state.currentDay}
             </div>
          )}
        </div>

        <div className="mb-4">
          <h2 className="text-lg font-bold mb-2 leading-tight">{novena.name}</h2>
          <p className="text-xs text-muted-foreground leading-tight font-medium line-clamp-2 px-2">
            {novena.focus}
          </p>
        </div>

        <Button 
          size="sm" 
          className={cn(
            "w-full rounded-full text-xs py-5 font-bold shadow-md transition-opacity border-0",
          )}
          style={{ 
            background: `linear-gradient(135deg, ${novena.colors.from}, ${novena.colors.to})`,
            color: '#fff'
          }}
        >
          {state.currentDay > 1 && !state.isCompleted ? "Continuar" : state.isCompleted ? "Rezar de Novo" : "Iniciar"}
        </Button>
      </Card>
    </motion.div>
  );
};

const Novenas = () => {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const { state: activeState, restartNovena } = useNovenaState(selectedId || "");

  const handleSelect = (id: string) => {
    setSelectedId(id);
    const saved = localStorage.getItem(`novena_state_${id}`);
    const state = saved ? JSON.parse(saved) : null;
    
    if (state && (state.currentDay > 1 || state.isCompleted)) {
      setShowProgressDialog(true);
    } else {
      navigate(`/novena/${id}`);
    }
  };

  const handleContinue = () => {
    navigate(`/novena/${selectedId}`);
    setShowProgressDialog(false);
  };

  const handleRestart = () => {
    restartNovena();
    navigate(`/novena/${selectedId}`);
    setShowProgressDialog(false);
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background/70 backdrop-blur-sm relative overflow-hidden pb-32">
        {/* Ambient Blurs */}
        <div className="absolute top-[-6rem] left-[-4rem] w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-6rem] right-[-4rem] w-80 h-80 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="container mx-auto px-6 py-8 relative z-10 max-w-lg">
          <div className="max-w-2xl mx-auto mb-6 flex items-center">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0 hover:bg-primary/10 transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </Button>
          </div>

          <motion.div 
            className="max-w-2xl mx-auto text-center mb-10"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-sm uppercase tracking-[0.25em] text-primary mb-2">✦</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-3 text-foreground">Novenas</h1>
            <div className="divider-gold max-w-[10rem] mx-auto mb-3" />
            <p className="text-muted-foreground">Escolha uma novena para seguir com fé</p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-2 gap-5"
            initial="initial"
            animate="animate"
            variants={{
              animate: { transition: { staggerChildren: 0.1 } }
            }}
          >
            {NOVENAS.map((novena) => (
              <NovenaCard key={novena.id} novena={novena} onSelect={handleSelect} />
            ))}
          </motion.div>
        </div>

        <Dialog open={showProgressDialog} onOpenChange={setShowProgressDialog}>
          <DialogContent className="rounded-[2.5rem] border-primary/15 soft-shadow backdrop-blur-xl bg-card/90 max-w-[90vw]">
            <DialogHeader className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                 <BookOpen className="w-8 h-8 text-primary" />
              </div>
              <DialogTitle className="text-2xl font-bold">Continuar Jornada?</DialogTitle>
              <DialogDescription className="pt-2 text-base text-muted-foreground">
                Você já tem um progresso salvo nesta novena. O que deseja fazer?
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 py-4">
               <Button onClick={handleContinue} size="lg" className="h-14 gradient-divine rounded-2xl flex items-center justify-between px-6 group text-primary-foreground shadow-lg border-0">
                  <div className="flex items-center gap-3">
                    <Play className="w-5 h-5 fill-current" />
                    <span className="font-bold">Continuar: Dia {activeState.currentDay}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 opacity-50 group-hover:translate-x-1 transition-transform" />
               </Button>
               <Button onClick={handleRestart} variant="outline" size="lg" className="h-14 rounded-2xl border-primary/15 hover:bg-primary/5 flex items-center gap-3 group">
                  <RotateCcw className="w-5 h-5 text-muted-foreground group-hover:rotate-[-180deg] transition-transform duration-500" />
                  <span className="font-bold text-muted-foreground">Reiniciar do Início</span>
               </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
};

export default Novenas;
