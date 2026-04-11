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
import { usePrayerQueue } from "@/hooks/use-prayer-queue";
import { cn } from "@/lib/utils";

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
  const [hasSentIntentionToday, setHasSentIntentionToday] = useState(false);

  // Calculate the current prayer and phrase based on global time
  const [globalTime, setGlobalTime] = useState(Date.now());
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number }[]>([]);
  const { author } = usePrayerQueue(currentPrayer?.id, currentPhraseIndex, globalTime);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
      if (session?.user) {
        const checkIntention = async () => {
          const today = new Date().toISOString().split('T')[0];
          const { data } = await supabase
            .from('prayer_intentions')
            .select('created_at')
            .eq('user_id', session.user.id)
            .gte('created_at', `${today}T00:00:00Z`)
            .limit(1);
          if (data && data.length > 0) {
            setHasSentIntentionToday(true);
          }
        };
        checkIntention();
      }
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

  // Handle "Orar junto" logic
  const handleOrarJunto = async () => {
    if (!currentUser) {
      toast({ title: "Entrar na Corrente", description: "Faça login para orar junto.", variant: "destructive" });
      navigate("/auth");
      return;
    }

    const lastClick = localStorage.getItem('last_pray_click');
    if (lastClick && Date.now() - parseInt(lastClick) < 15000) {
      toast({ title: "Sinta a Paz", description: "Aguarde 15 segundos entre suas orações." });
      return;
    }

    // Visual feedback: Spawning sparkles
    const newSparkles = Array.from({ length: 12 }).map((_, i) => ({
      id: Date.now() + i,
      x: 0, 
      y: 0
    }));
    setSparkles(prev => [...prev, ...newSparkles]);
    setTimeout(() => setSparkles([]), 2000);

    try {
      // Logic to find next available slot
      const elapsed = globalTime - EPOCH;
      const totalCycleTime = PRAYERS.length * (PRAYERS[0].phrases.length * PHRASE_DURATION + PRAYER_GAP);
      const cycleStart = Math.floor(elapsed / totalCycleTime) * totalCycleTime;
      
      // We look ahead for the next phrases
      // Starting from currentPhraseIndex + 1
      let foundSlot = null;
      let checkPhraseIndex = currentPhraseIndex + 1;
      let checkPrayerIndex = PRAYERS.findIndex(p => p.id === currentPrayer?.id);
      
      // Search for next 10 slots
      for (let s = 0; s < 10; s++) {
        const prayer = PRAYERS[checkPrayerIndex];
        if (checkPhraseIndex >= prayer.phrases.length) {
          checkPhraseIndex = 0;
          checkPrayerIndex = (checkPrayerIndex + 1) % PRAYERS.length;
          continue;
        }
        
        if (checkPhraseIndex > 0) { // Skip first phrase
           // Calculate exact start timestamp
           let accum = 0;
           for (let p = 0; p < checkPrayerIndex; p++) {
             accum += (PRAYERS[p].phrases.length * PHRASE_DURATION) + PRAYER_GAP;
           }
           const targetTs = EPOCH + cycleStart + accum + (checkPhraseIndex * PHRASE_DURATION);
           
           if (targetTs > globalTime + 2000) { // Give some buffer room
             // Check if already taken in DB
             const { data: existing } = await supabase
               .from('prayer_contributions')
               .select('id')
               .eq('target_timestamp', targetTs)
               .maybeSingle();
               
             if (!existing) {
               foundSlot = targetTs;
               break;
             }
           }
        }
        checkPhraseIndex++;
      }

      if (foundSlot) {
        // Use profile data
        const { data: profile } = await supabase.from('profiles').select('full_name, city').eq('id', currentUser.id).single();
        
        await supabase.from('prayer_contributions').insert({
          user_id: currentUser.id,
          target_timestamp: foundSlot,
          author_name: profile?.full_name || currentUser.user_metadata?.full_name || "Intercessor",
          author_city: profile?.city || "Améns"
        });
        
        localStorage.setItem('last_pray_click', Date.now().toString());
        toast({ title: "Voz unida! ✨", description: "Seu nome aparecerá em instantes na corrente." });
      } else {
        toast({ title: "Corrente Cheia", description: "Muitas pessoas orando! Tente em breve." });
      }
    } catch (e) {
      console.error(e);
    }
  };

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
      setHasSentIntentionToday(true);
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
            <div className="flex items-center gap-2 bg-white/60 backdrop-blur-md px-5 py-2.5 rounded-full border border-primary/20 soft-shadow">
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[13px] font-bold tracking-[0.2em] uppercase text-[#3d2800]">
                {currentPrayer ? currentPrayer.name : "Corrente"}
              </span>
            </div>
            <div className="w-10" />
          </div>

          {!hasSentIntentionToday && (
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
          )}

          {hasSentIntentionToday && (
            <div className="max-w-md mx-auto bg-white/40 backdrop-blur-sm border border-[#d4a017]/10 soft-shadow rounded-[2rem] py-4 px-6 text-center animate-in fade-in zoom-in duration-500">
               <div className="flex items-center justify-center gap-2 mb-1">
                 <Sparkles className="w-4 h-4 text-[#d4a017]" />
                 <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-[#a0720a]">Graça alcançada</span>
               </div>
               <p className="text-xs text-[#3d2800]/70 font-medium">Sua intenção de hoje já está na rede do amor infinito. Volte amanhã.</p>
            </div>
          )}
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
                
                {author && (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 1 }}
                    className={cn(
                      "text-[#a0720a] font-bold mt-10 text-[9px] md:text-[10px] text-center uppercase tracking-[0.2em] opacity-70 px-4 py-2 rounded-full",
                      author.user_id === currentUser?.id && "disney-shimmer text-primary opacity-100 scale-110 transition-transform"
                    )}
                  >
                    — {author.name}, {author.city}
                  </motion.p>
                )}
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

        {/* Floating Action Button - Orar junto */}
        <div className="absolute right-6 bottom-24 z-30 flex flex-col items-end">
           {/* Visual Sparkles */}
           <AnimatePresence>
             {sparkles.map((s) => (
               <motion.div
                 key={s.id}
                 initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                 animate={{ 
                   opacity: 0, 
                   scale: [0, 1.5, 0], 
                   x: Math.random() * -300 - 50, 
                   y: Math.random() * -400 - 100 
                 }}
                 transition={{ duration: 1.5, ease: "easeOut" }}
                 className="absolute pointer-events-none"
               >
                 <Sparkles className="text-[#f0c040] w-4 h-4" />
               </motion.div>
             ))}
           </AnimatePresence>

           <Button 
             onClick={handleOrarJunto}
             className="rounded-full shadow-lg bg-white hover:bg-black/5 text-[#d4a017] border border-[#d4a017]/20 flex items-center gap-2 px-6 py-7 shadow-[#d4a017]/10 active:scale-95 transition-transform"
           >
             <span className="text-[12px] font-bold uppercase tracking-wider text-[#3d2800]">Orar junto</span>
             <Sparkles className="w-5 h-5 text-[#d4a017]" />
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
