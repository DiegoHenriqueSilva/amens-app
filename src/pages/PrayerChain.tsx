import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, Sparkles, Wind, Users, Heart } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { PRAYERS, PHRASE_DURATION, PRAYER_GAP, TOTAL_CYCLE_TIME } from "@/data/prayer-data";
import { motion, AnimatePresence } from "framer-motion";
import { usePrayerQueue } from "@/hooks/use-prayer-queue";
import { useFriends } from "@/hooks/use-friends";
import { cn } from "@/lib/utils";

// Marco zero para a sincronização global (1º de Janeiro de 2024)
const EPOCH = new Date("2024-01-01T00:00:00Z").getTime();

const PrayerChain = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [intention, setIntention] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [userCount, setUserCount] = useState<number>(0);
  const [hasSentIntentionToday, setHasSentIntentionToday] = useState(false);
  const [globalTime, setGlobalTime] = useState(Date.now());
  const [timeOffset, setTimeOffset] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(true);
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number }[]>([]);
  const { friends } = useFriends();
  const syncAttempted = useRef(false);

  const friendIds = useMemo(() => new Set(friends?.map(f => f.id)), [friends]);

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user ?? null);
      
      if (session?.user) {
        // Fetch profile
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (prof) setProfile(prof);

        // Check today's intention
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase
          .from('prayer_intentions')
          .select('id')
          .eq('user_id', session.user.id)
          .gte('created_at', `${today}T00:00:00Z`)
          .limit(1);
        if (data && data.length > 0) setHasSentIntentionToday(true);
      }
    };

    const syncClock = async () => {
      if (syncAttempted.current) return;
      syncAttempted.current = true;
      try {
        const { data: serverMs, error } = await supabase.rpc('get_server_time');
        if (!error && serverMs) {
          const offset = Number(serverMs) - Date.now();
          setTimeOffset(offset);
          setGlobalTime(Date.now() + offset);
        }
      } catch (e) {
        console.error("Failed to sync clock:", e);
      } finally {
        setIsSyncing(false);
      }
    };

    fetchInitialData();
    syncClock();

    const fetchUserCount = async () => {
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      if (count) setUserCount(count);
    };
    fetchUserCount();

    const timer = setInterval(() => {
      setGlobalTime(Date.now() + (timeOffset || 0));
    }, 1000);
    
    // Realtime Presence
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
  }, [timeOffset]);

  // Lógica Determinística da Corrente
  const { currentPrayer, currentPhraseIndex, progress } = useMemo(() => {
    const elapsed = globalTime - EPOCH;
    const cycleElapsed = elapsed % TOTAL_CYCLE_TIME;
    
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

  const { author, isLoading: queueLoading } = usePrayerQueue(currentPrayer?.id, currentPhraseIndex, globalTime);

  const handleOrarJunto = async () => {
    if (!currentUser) {
      toast({ title: "Entrar na Corrente", description: "Faça login para orar junto.", variant: "destructive" });
      navigate("/auth");
      return;
    }

    const lastClick = localStorage.getItem('last_pray_click');
    if (lastClick && Date.now() - parseInt(lastClick) < 10000) {
      toast({ title: "Sinta a Paz", description: "Aguarde 10 segundos entre suas orações." });
      return;
    }

    // Efeito Visual imediato
    const newSparkles = Array.from({ length: 15 }).map((_, i) => ({
      id: Date.now() + i,
      x: 0, y: 0
    }));
    setSparkles(prev => [...prev, ...newSparkles]);
    setTimeout(() => setSparkles([]), 2500);

    try {
      const elapsed = globalTime - EPOCH;
      const cycleStart = Math.floor(elapsed / TOTAL_CYCLE_TIME) * TOTAL_CYCLE_TIME;
      
      let foundSlot = null;
      let checkPhraseIndex = currentPhraseIndex + 1;
      let initialPrayerIndex = PRAYERS.findIndex(p => p.id === currentPrayer?.id);
      let checkPrayerIndex = initialPrayerIndex === -1 ? 0 : initialPrayerIndex;
      let cycleOffset = 0;
      
      // Lookahead improved for 45 seconds window
      for (let s = 0; s < 45; s++) {
        const prayer = PRAYERS[checkPrayerIndex];
        if (!prayer) break;
        
        if (checkPhraseIndex >= prayer.phrases.length) {
          checkPhraseIndex = 0;
          const prevIndex = checkPrayerIndex;
          checkPrayerIndex = (checkPrayerIndex + 1) % PRAYERS.length;
          if (checkPrayerIndex === 0 && prevIndex !== -1) cycleOffset += TOTAL_CYCLE_TIME;
          continue;
        }
        
        if (checkPhraseIndex > 0) { 
           let accum = 0;
           for (let p = 0; p < checkPrayerIndex; p++) {
             accum += (PRAYERS[p].phrases.length * PHRASE_DURATION) + PRAYER_GAP;
           }
           const targetTs = EPOCH + cycleStart + cycleOffset + accum + (checkPhraseIndex * PHRASE_DURATION);
           
           if (targetTs > globalTime + 4000) { // Robust safety buffer
             const { data: success, error } = await supabase.rpc('join_prayer_chain', {
               p_target_timestamp: targetTs,
               p_author_name: profile?.full_name || currentUser.user_metadata?.full_name || "Intercessor",
               p_author_city: profile?.city || "Améns"
             });

             if (!error && success) {
               foundSlot = targetTs;
               toast({ title: "Lugar Reservado!", description: "Sua voz se unirá à corrente em instantes." });
               break;
             }
           }
        }
        checkPhraseIndex++;
      }

      if (foundSlot) {
        localStorage.setItem('last_pray_click', Date.now().toString());
      } else {
        toast({ title: "Fluxo Intenso", description: "Todos os próximos slots estão ocupados. Tente novamente!" });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Conexão Instável", description: "Não conseguimos reservar seu lugar." });
    }
  };

  const handleSubmitIntention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intention.trim() || isSubmitting || !currentUser) return;
    setIsSubmitting(true);
    try {
      await supabase.from("prayer_intentions").insert({ user_id: currentUser.id, content: intention.trim() });
      toast({ title: "Intenção Unida!", description: "Sua prece agora faz parte da corrente eterna." });
      setIntention("");
      setHasSentIntentionToday(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#faf9f6] text-foreground flex flex-col relative overflow-hidden paper-texture">
        
        {/* Divine Glow Elements */}
        <motion.div 
          animate={{ opacity: [0.03, 0.08, 0.03], scale: [1, 1.2, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10rem] right-[-10rem] w-[40rem] h-[40rem] rounded-full bg-[#e8c547] blur-[120px] pointer-events-none" 
        />
        <motion.div 
          animate={{ opacity: [0.02, 0.06, 0.02], scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-10rem] left-[-10rem] w-[40rem] h-[40rem] rounded-full bg-[#b8860b] blur-[120px] pointer-events-none" 
        />

        <div className="p-6 relative z-20">
          <div className="max-w-md mx-auto flex flex-col items-center">
            <div className="w-full flex justify-between items-center mb-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-[#3d2800] hover:bg-black/5 -ml-2 rounded-full h-12 w-12">
                <ArrowLeft className="w-6 h-6" />
              </Button>
            </div>

            <div className="text-center space-y-1 mb-8">
               <motion.h1 
                 initial={{ opacity: 0, y: -10 }} 
                 animate={{ opacity: 1, y: 0 }}
                 className="text-[#d4a017] text-3xl font-bold tracking-[0.15em] uppercase drop-shadow-sm"
               >
                 Corrente de Oração
               </motion.h1>
               <motion.p 
                 initial={{ opacity: 0 }} 
                 animate={{ opacity: 0.6 }}
                 className="text-[#3d2800]/60 text-[11px] font-bold uppercase tracking-[0.25em]"
               >
                 Unindo corações de <span className="text-[#a0720a] font-black">{Math.floor(userCount / 2) + 12}</span> fiéis
               </motion.p>
               
               <div className="pt-6 flex justify-center">
                 <motion.div 
                   className="flex items-center gap-3 bg-white/90 backdrop-blur-xl px-7 py-3 rounded-full border border-[#d4a017]/30 soft-shadow ring-4 ring-[#d4a017]/5"
                   whileHover={{ scale: 1.05 }}
                 >
                   <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.6)]" />
                   <span className="text-[14px] font-black tracking-[0.25em] uppercase text-[#3d2800] text-glow-gold">
                     {currentPrayer ? currentPrayer.name : "Momento de Silêncio"}
                   </span>
                 </motion.div>
               </div>
            </div>

            <AnimatePresence>
              {!hasSentIntentionToday && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="w-full overflow-hidden"
                >
                  <form onSubmit={handleSubmitIntention} className="relative group mb-4">
                    <Input 
                      placeholder={currentUser ? "Pelo que oramos hoje?" : "Fazer login para enviar intenção"}
                      value={intention}
                      onChange={(e) => setIntention(e.target.value)}
                      className="bg-white/80 border-[#d4a017]/20 py-8 pl-8 pr-16 rounded-[2.5rem] text-[#3d2800] soft-shadow font-semibold text-base focus-visible:ring-[#d4a017]/30"
                      disabled={!currentUser || isSubmitting}
                    />
                    <Button 
                      type="submit" 
                      disabled={!intention.trim() || isSubmitting}
                      className="absolute right-3 top-3 bottom-3 w-12 rounded-full bg-gradient-to-r from-[#d4a017] to-[#f0c040] border-0 shadow-lg hover:shadow-xl transition-all"
                    >
                      <Send className="w-5 h-5 text-white" />
                    </Button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex-1 relative flex flex-col items-center justify-center p-8 pb-16">
          {isSyncing ? (
            <div className="flex flex-col items-center gap-5">
              <div className="w-10 h-10 border-4 border-[#d4a017] border-t-transparent rounded-full animate-spin shadow-sm" />
              <p className="text-[#3d2800]/40 text-xs font-black uppercase tracking-[0.3em] animate-pulse">Sincronizando Corrente...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {currentPrayer && currentPhraseIndex >= 0 ? (
              <motion.div 
                key={`${currentPrayer.id}-${currentPhraseIndex}`}
                initial={{ opacity: 0, scale: 0.92, filter: "blur(10px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 1.08, filter: "blur(10px)" }}
                transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
                className="w-full flex flex-col items-center -mt-16"
              >
                <motion.div 
                  animate={{ y: [0, -8, 0], scale: [1, 1.05, 1] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="w-20 h-20 bg-gradient-to-tr from-[#d4a017] to-[#f0c040] rounded-full flex items-center justify-center mx-auto mb-14 shadow-2xl border-4 border-white/50 ring-8 ring-[#d4a017]/5"
                >
                  <Sparkles className="text-white w-10 h-10" />
                </motion.div>
                
                <h2 className={cn(
                  "font-serif italic font-bold text-[2.2rem] md:text-[3.2rem] text-center leading-[1.3] text-[#3d2800] max-w-3xl mx-auto drop-shadow-sm px-6 py-6 transition-all duration-1000",
                  author?.user_id === currentUser?.id && "disney-shimmer scale-105 text-[#a0720a]",
                  author?.user_id && friendIds.has(author.user_id) && "halo-angelical"
                )}>
                  "{currentPrayer.phrases[currentPhraseIndex]}"
                </h2>
                
                {author && !queueLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={`author-${author.name}`}
                    className="mt-14 space-y-2 flex flex-col items-center"
                  >
                    <div className="w-8 h-px bg-gradient-to-r from-transparent via-[#d4a017]/40 to-transparent" />
                    <p className={cn(
                      "text-[#a0720a] font-black text-[10px] md:text-[12px] text-center uppercase tracking-[0.4em] opacity-80 px-4 py-2 transition-all",
                      author?.user_id === currentUser?.id && "disney-shimmer text-primary opacity-100 scale-110",
                      author?.user_id && friendIds.has(author.user_id) && "text-friend-accent opacity-100 scale-110"
                    )}>
                      — {author.name}, {author.city} —
                    </p>
                  </motion.div>
                )}
                {queueLoading && (
                  <div className="mt-14 h-4 w-40 bg-[#d4a017]/10 animate-pulse rounded-full" />
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="gap"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 3, ease: "easeInOut" }}
                className="text-center space-y-8"
              >
                <Wind className="w-20 h-20 text-[#d4a017]/20 mx-auto animate-pulse" />
                <p className="text-[#3d2800]/50 font-serif italic text-2xl md:text-3xl tracking-wide">O silêncio é o abraço de Deus...</p>
              </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Action Button Container */}
        <div className="absolute right-8 bottom-32 z-30 flex flex-col items-end">
           <AnimatePresence>
              {sparkles.map((s) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                  animate={{ 
                    opacity: 0, 
                    scale: [0, 2, 0], 
                    x: Math.random() * -400 - 50, 
                    y: Math.random() * -500 - 100 
                  }}
                  transition={{ duration: 2, ease: "easeOut" }}
                  className="absolute pointer-events-none"
                >
                  <Sparkles className="text-[#f0c040] w-5 h-5" />
                </motion.div>
              ))}
           </AnimatePresence>
           
           <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }}>
             <Button 
               onClick={handleOrarJunto}
               className="rounded-full shadow-2xl bg-white/95 backdrop-blur-md hover:bg-white text-[#d4a017] border-2 border-[#d4a017]/30 flex items-center gap-3 px-8 py-9 active:shadow-inner transition-all group"
             >
               <div className="flex flex-col items-center">
                 <span className="text-[14px] font-black uppercase tracking-[0.2em] text-[#3d2800] group-hover:text-primary">Orar junto</span>
                 <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">Unir sua voz</span>
               </div>
               <div className="w-10 h-10 bg-[#d4a017]/10 rounded-full flex items-center justify-center group-hover:bg-[#d4a017]/20 transition-colors">
                 <Heart className="w-6 h-6 text-[#d4a017] fill-current" />
               </div>
             </Button>
           </motion.div>
        </div>

        {/* Footer info & Progress */}
        <div className="bg-white/80 backdrop-blur-2xl border-t border-[#d4a017]/10 p-8 relative z-20 pb-28 shadow-[0_-15px_50px_rgba(212,175,55,0.08)]">
          <div className="max-w-md mx-auto flex flex-col gap-6">
            <div className="flex items-center justify-between text-[#3d2800]/60 px-2">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-[#d4a017]" />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em]">{onlineCount + 12} Orando agora</span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#a0720a] bg-[#d4a017]/10 px-3 py-1 rounded-full">Fluxo Sagrado</span>
            </div>
            
            <div className="w-full h-2.5 bg-black/5 rounded-full overflow-hidden shadow-inner ring-1 ring-[#d4a017]/5">
               <motion.div 
                 className="h-full bg-gradient-to-r from-[#d4a017] via-[#f0c040] to-[#d4a017]"
                 initial={{ width: "0%" }}
                 animate={{ width: `${progress * 100}%` }}
                 transition={{ duration: 1, ease: "linear" }}
               >
                 <div className="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/shimmer.png')] opacity-20" />
               </motion.div>
            </div>
          </div>
        </div>

      </div>
    </PageTransition>
  );
};

export default PrayerChain;
