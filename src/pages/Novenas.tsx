import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, ChevronRight, RotateCcw, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NOVENAS } from "@/data/novenas";
import { useNovenaState } from "@/hooks/use-novena-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import PageTransition from "@/components/PageTransition";

const NovenaCard = ({ novena, onSelect }: { novena: typeof NOVENAS[0], onSelect: (id: string) => void }) => {
  const { state } = useNovenaState(novena.id);
  
  return (
    <motion.div
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card 
        onClick={() => onSelect(novena.id)}
        className="overflow-hidden cursor-pointer soft-shadow border-primary/10 group transition-all"
      >
        <div className="aspect-[16/10] relative overflow-hidden">
          <img 
            src={novena.image} 
            alt={novena.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
             <div className="flex items-center gap-2 mb-1">
                {state.isCompleted && <Badge className="bg-green-500/20 text-green-400 border-none text-[10px]">Concluída ✨</Badge>}
                {state.currentDay > 1 && !state.isCompleted && (
                  <Badge className="bg-primary/20 text-white border-none text-[10px]">Dia {state.currentDay}</Badge>
                )}
             </div>
             <h3 className="text-xl font-bold text-white leading-tight">{novena.name}</h3>
          </div>
        </div>
        <div className="p-4">
          <p className="text-xs text-muted-foreground line-clamp-2">{novena.focus}</p>
        </div>
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
      <div className="min-h-screen bg-background relative pb-20">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-8">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold tracking-widest text-primary mb-1">Espiritualidade</p>
              <h1 className="text-3xl font-bold">Novenas</h1>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {NOVENAS.map((novena) => (
              <NovenaCard key={novena.id} novena={novena} onSelect={handleSelect} />
            ))}
          </div>
        </div>

        <Dialog open={showProgressDialog} onOpenChange={setShowProgressDialog}>
          <DialogContent className="rounded-[2.5rem] border-primary/20 backdrop-blur-xl bg-card/90">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-primary" />
                Continuar Novena?
              </DialogTitle>
              <DialogDescription className="pt-2 text-base">
                Você já tem um progresso salvo. Deseja continuar de onde parou ou começar uma nova jornada?
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 py-4">
               <Button onClick={handleContinue} size="lg" className="h-16 gradient-divine rounded-2xl flex items-center justify-between px-6 group">
                  <div className="flex items-center gap-3">
                    <Play className="w-5 h-5" />
                    <span className="font-bold">Continuar do Dia {activeState.currentDay}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 opacity-50 group-hover:translate-x-1 transition-transform" />
               </Button>
               <Button onClick={handleRestart} variant="outline" size="lg" className="h-16 rounded-2xl border-primary/10 hover:bg-primary/5 flex items-center gap-3 group">
                  <RotateCcw className="w-5 h-5 text-muted-foreground group-hover:rotate-[-45deg] transition-transform" />
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
