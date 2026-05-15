import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, ChevronRight, RotateCcw, Play, Image as ImageIcon } from "lucide-react";
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
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.35 } }
      }}
    >
      <div
        onClick={() => onSelect(novena.id)}
        className="rounded-xl border border-hairline bg-vellum p-5 flex flex-col items-center text-center cursor-pointer hover:border-marian/30 transition-colors group"
      >
        <div className="relative mb-3">
          <div className="w-16 h-16 rounded-full overflow-hidden border border-hairline">
            {!imgError ? (
              <img
                src={novena.image}
                alt={novena.name}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full bg-hairline flex items-center justify-center">
                <ImageIcon size={20} strokeWidth={1.5} className="text-ink-soft" />
              </div>
            )}
          </div>
          {state.isCompleted && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-marian rounded-full flex items-center justify-center">
              <span className="text-[9px] text-paper font-medium">✓</span>
            </div>
          )}
          {(state.currentDay > 1 && !state.isCompleted) && (
            <div className="absolute -bottom-1.5 -right-1.5 bg-ink text-paper text-[8px] font-medium px-1.5 py-0.5 rounded-full">
              Dia {state.currentDay}
            </div>
          )}
        </div>

        <h2 className="text-[13px] font-medium text-ink mb-1 leading-tight">{novena.name}</h2>
        <p className="text-[10px] text-ink-soft line-clamp-2 mb-3">{novena.focus}</p>

        <span
          className="text-[10px] uppercase tracking-[0.18em] px-3 py-1 rounded-full text-paper"
          style={{ background: novena.colors.from }}
        >
          {state.currentDay > 1 && !state.isCompleted ? "Continuar" : state.isCompleted ? "Repetir" : "Iniciar"}
        </span>
      </div>
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
      <div className="min-h-screen pb-28">

        <div className="px-5 md:px-12 max-w-2xl mx-auto">
          <header className="flex items-center gap-3 pt-safe pt-4 pb-6">
            <button onClick={() => navigate("/")} className="p-1 -ml-1 text-ink-soft hover:text-ink transition-colors">
              <ArrowLeft size={20} strokeWidth={1.5} />
            </button>
            <div>
              <h1 className="font-serif text-[22px] text-ink">Novenas</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-ink-soft">9 dias de devoção</p>
            </div>
          </header>

          <motion.div
            className="grid grid-cols-2 gap-4"
            initial="initial"
            animate="animate"
            variants={{ animate: { transition: { staggerChildren: 0.08 } } }}
          >
            {NOVENAS.map((novena) => (
              <NovenaCard key={novena.id} novena={novena} onSelect={handleSelect} />
            ))}
          </motion.div>
        </div>

        <Dialog open={showProgressDialog} onOpenChange={setShowProgressDialog}>
          <DialogContent className="rounded-xl border border-hairline max-w-sm">
            <DialogHeader className="text-center">
              <DialogTitle className="font-serif text-[22px] text-ink">Continuar jornada?</DialogTitle>
              <DialogDescription className="text-[13px] text-ink-soft">
                Você tem progresso salvo. O que deseja fazer?
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={handleContinue}
                className="h-12 rounded-full bg-ink text-paper text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Play size={14} strokeWidth={1.5} className="fill-paper" />
                Continuar · Dia {activeState.currentDay}
              </button>
              <button
                onClick={handleRestart}
                className="h-11 rounded-full border border-hairline text-ink-soft text-sm hover:text-ink hover:border-ink/30 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw size={14} strokeWidth={1.5} />
                Reiniciar do início
              </button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </PageTransition>
  );
};

export default Novenas;
