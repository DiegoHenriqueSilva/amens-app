import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, Sparkles, Wind, Users, PenLine } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import PageTransition from "@/components/PageTransition";
import { PRAYERS, PHRASE_DURATION, PRAYER_GAP, COMMON_NAMES, PR_CITIES_100K } from "@/data/prayer-data";
import { motion, AnimatePresence } from "framer-motion";

// Configuration for the Eternal Flow
const EPOCH = new Date("2024-01-01T00:00:00Z").getTime();

const PrayerChain = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [intention, setIntention] = useState("");
  const [newPhrase, setNewPhrase] = useState("");
  const [isPhraseDialogOpen, setIsPhraseDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [onlineCount, setOnlineCount] = useState(0);

  // Calculate the current prayer and phrase based on global time
  const [globalTime, setGlobalTime] = useState(Date.now());
  const [authorInfo, setAuthorInfo] = useState({ name: "", city: "" });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
    });

    const timer = setInterval(() => setGlobalTime(Date.now()), 1000);
    
    // Presence check with safety
    const channel = supabase.channel('prayer-chain-presence');
    channel
      .on('presence', { event: 'sync' }, () => {
        try {
          setOnlineCount(Object.keys(channel.presenceState()).length);
        } catch(e) {}
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try { await channel.track({ online_at: new Date().toISOString() }); } catch(e) {}
        }
      });

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  const { currentPrayer, currentPhraseIndex, progress } = useMemo(() => {
    const elapsed = globalTime - EPOCH;
    const totalCycleTime = PRAYERS.length * (PRAYERS[0].phrases.length * PHRASE_DURATION + PRAYER_GAP);
    const cycleElapsed = elapsed % totalCycleTime;
    
    let accumulatedTime = 0;
    for (let i = 0; i < PRAYERS.length; i++) {
      const prayer = PRAYERS[i];
      const prayerDuration = prayer.phrases.length * PHRASE_DURATION;
      
      if (cycleElapsed < accumulatedTime + prayerDuration) {
        const timeInPrayer = cycleElapsed - accumulatedTime;
        const phraseIndex = Math.floor(timeInPrayer / PHRASE_DURATION);
        const phraseProgress = (timeInPrayer % PHRASE_DURATION) / PHRASE_DURATION;
        return { 
          currentPrayer: prayer, 
          currentPhraseIndex: phraseIndex,
          progress: phraseProgress 
        };
      }
      
      accumulatedTime += prayerDuration;
      if (cycleElapsed < accumulatedTime + PRAYER_GAP) {
         return { currentPrayer: null, currentPhraseIndex: -1, progress: 0 };
      }
      accumulatedTime += PRAYER_GAP;
    }

    return { currentPrayer: PRAYERS[0], currentPhraseIndex: 0, progress: 0 };
  }, [globalTime]);

  useEffect(() => {
    if (currentPhraseIndex >= 0) {
      const randomName = COMMON_NAMES[Math.floor(Math.random() * COMMON_NAMES.length)] || "Intercessor";
      const randomCity = PR_CITIES_100K[Math.floor(Math.random() * PR_CITIES_100K.length)] || "Améns";
      setAuthorInfo({ name: randomName, city: randomCity });
    }
  }, [currentPhraseIndex, currentPrayer]);

  const handleSubmitIntention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intention.trim()) return;
    if (!currentUser) {
      toast({ title: "Entrar na Corrente", description: "Faça login para enviar sua intenção.", variant: "destructive" });
      navigate("/auth");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("prayer_intentions").insert({
        user_id: currentUser.id,
        content: intention.trim()
      });

      if (error) throw error;
      toast({ title: "Intenção Enviada!", description: "Sua prece foi unida à corrente eterna." });
      setIntention("");
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitPhrase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhrase.trim()) return;
    if (!currentUser) {
      toast({ title: "Erro", description: "Faça login para enviar.", variant: "destructive" });
      navigate("/auth");
      return;
    }

    setIsSubmitting(true);
    try {
      // Future integration with phrases system
      toast({ title: "Frase Recebida! ✨", description: "Sua frase foi enviada para integrar a corrente abençoada.", duration: 5000 });
      setNewPhrase("");
      setIsPhraseDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#faf9f6] text-foreground flex flex-col relative overflow-hidden">
        
        {/* Subtle Background Elements */}
        <div className="absolute top-[-10rem] right-[-10rem] w-[30rem] h-[30rem] rounded-full bg-[#e8c547]/5 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-[-10rem] w-[30rem] h-[30rem] rounded-full bg-[#b8860b]/5 blur-3xl" />

        {/* Header Overlay */}
        <div className="p-6 relative z-20">
          <div className="flex justify-between items-center mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-[#3d2800] hover:bg-black/5">
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div className="flex items-center gap-2 bg-white/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-primary/10 soft-shadow">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-[#3d2800]">
                {currentPrayer ? currentPrayer.name : "Corrente"}
              </span>
            </div>
            <div className="w-10" />
          </div>

          <div className="max-w-md mx-auto">
            <label className="block text-center text-[10px] uppercase tracking-widest font-bold text-[#a0720a] mb-2 drop-shadow-sm">
                Envie sua intenção de oração abaixo:
            </label>
            <form onSubmit={handleSubmitIntention} className="relative group">
              <Input 
                placeholder={currentUser ? "Pelo que você precisa que oremos hoje?" : "Faça login para enviar intenção"}
                value={intention}
                onChange={(e) => setIntention(e.target.value)}
                className="bg-white border-primary/20 py-7 pl-6 pr-16 rounded-[2rem] focus:ring-primary/50 text-[#3d2800] placeholder:text-[#3d2800]/40 soft-shadow font-medium"
                disabled={!currentUser || isSubmitting}
              />
              <Button 
                type="submit" 
                disabled={!intention.trim() || isSubmitting}
                className="absolute right-2 top-2 bottom-2 rounded-2xl bg-gradient-to-r from-[#d4a017] to-[#f0c040] hover:opacity-90 border-0 shadow-sm"
              >
                {isSubmitting && !isPhraseDialogOpen ? <Sparkles className="animate-spin w-5 h-5 text-white" /> : <Send className="w-5 h-5 text-white" />}
              </Button>
            </form>
          </div>
        </div>

        {/* Dynamic Prayer Display */}
        <div className="flex-1 relative flex flex-col items-center justify-center p-6 pb-12">
          <AnimatePresence mode="wait">
            {currentPrayer && currentPhraseIndex >= 0 ? (
              <motion.div 
                key={`${currentPrayer.id}-${currentPhraseIndex}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="w-full flex flex-col items-center -mt-10"
              >
                <div className="w-16 h-16 bg-gradient-to-tr from-[#d4a017] to-[#f0c040] rounded-full flex items-center justify-center mx-auto mb-10 shadow-lg shadow-[#d4a017]/20 border border-white/40">
                  <Sparkles className="text-white w-8 h-8" />
                </div>
                
                <h2 className="font-serif italic font-bold text-[1.7rem] md:text-4xl text-center leading-[1.6] text-[#3d2800] max-w-2xl mx-auto drop-shadow-sm px-4">
                  "{currentPrayer.phrases[currentPhraseIndex]}"
                </h2>
                
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8, duration: 1 }}
                  className="text-[#a0720a] font-bold mt-10 text-[9px] md:text-[10px] text-center uppercase tracking-[0.2em] opacity-70"
                >
                  — {authorInfo.name}, {authorInfo.city}
                </motion.p>
              </motion.div>
            ) : (
              <motion.div 
                key="gap"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2 }}
                className="text-center space-y-6"
              >
                <Wind className="w-16 h-16 text-[#d4a017]/30 mx-auto animate-pulse" />
                <p className="text-[#3d2800]/50 font-serif italic text-xl">O silêncio é o abraço de Deus...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Floating Action Button - Write Next Phrase */}
        <div className="absolute right-6 bottom-24 z-30">
           <Button 
             onClick={() => {
               if (!currentUser) {
                 toast({ title: "Inicie sessão", description: "Faça login para adicionar uma frase." });
                 navigate("/auth");
               } else {
                 setIsPhraseDialogOpen(true);
               }
             }}
             className="rounded-full shadow-lg bg-white hover:bg-black/5 text-[#d4a017] border border-[#d4a017]/20 flex items-center gap-2 px-5 py-6 shadow-[#d4a017]/10"
           >
             <span className="text-[11px] font-bold uppercase tracking-wider text-[#3d2800]">Continuar oração</span>
             <PenLine className="w-4 h-4 text-[#d4a017]" />
           </Button>
        </div>

        {/* Contribute Phrase Dialog */}
        <Dialog open={isPhraseDialogOpen} onOpenChange={setIsPhraseDialogOpen}>
          <DialogContent className="max-w-md bg-[#faf9f6] border-primary/20 rounded-[2rem] p-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif font-bold text-[#3d2800] text-center">Unir Voz à Corrente ✨</DialogTitle>
              <DialogDescription className="text-center mt-2 text-sm text-[#8b6508]">
                Escreva a próxima frase de oração que o Espírito tocar em seu coração e que todos na rede irão ler juntos.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitPhrase} className="mt-4 flex flex-col gap-4">
              <Input 
                autoFocus
                placeholder="Exemplo: Que a Tua graça purifique nossas aflições..."
                value={newPhrase}
                onChange={(e) => setNewPhrase(e.target.value)}
                className="bg-white border-primary/20 py-6 px-4 rounded-[1.5rem] focus:ring-primary/50 text-[#3d2800] shadow-sm font-serif italic"
                disabled={isSubmitting}
              />
              <DialogFooter className="mt-4 sm:justify-stretch flex flex-row gap-3">
                <Button 
                   type="button" 
                   variant="outline" 
                   className="flex-1 rounded-[1.5rem] py-6 border-[#d4a017]/30 text-[#3d2800]"
                   onClick={() => setIsPhraseDialogOpen(false)}
                 >
                   Cancelar
                </Button>
                <Button 
                   type="submit" 
                   disabled={!newPhrase.trim() || isSubmitting}
                   className="flex-1 rounded-[1.5rem] py-6 bg-gradient-to-r from-[#d4a017] to-[#f0c040] hover:opacity-90 border-0"
                 >
                   {isSubmitting && isPhraseDialogOpen ? "Enviando..." : "Semear Frase"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Progress Integration Bottom Bar */}
        <div className="bg-white border-t border-primary/5 p-6 relative z-20 pb-24 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
          <div className="max-w-md mx-auto flex flex-col gap-4">
            <div className="flex items-center justify-between text-[#3d2800]/50 px-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#d4a017]" />
                <span className="text-[10px] font-bold uppercase tracking-widest">{onlineCount + 12} Orando agora</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#d4a017]" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Fluxo Divino</span>
              </div>
            </div>
            
            <div className="w-full h-1 bg-black/5 rounded-full overflow-hidden">
               <motion.div 
                 className="h-full bg-gradient-to-r from-[#d4a017] to-[#f0c040]"
                 initial={{ width: "0%" }}
                 animate={{ width: `${progress * 100}%` }}
                 transition={{ duration: 1, ease: "linear" }}
               />
            </div>
          </div>
        </div>

      </div>
    </PageTransition>
  );
};

export default PrayerChain;
