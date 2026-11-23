import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, Sparkles, Wind, Users, Heart, Flag } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { PRAYERS, PHRASE_DURATION, PRAYER_GAP, TOTAL_CYCLE_TIME, BR_CITIES_200K, COMMON_NAMES } from "@/data/prayer-data";
import { motion, AnimatePresence } from "framer-motion";
import { Contributor, usePrayerQueue } from "@/hooks/use-prayer-queue";
import { useFriends } from "@/hooks/use-friends";
import { cn } from "@/lib/utils";
import { useDailyTasks } from "@/hooks/use-daily-tasks";
import "./prayer-chain.css";
import { ReportContributionDialog } from "@/components/ReportContributionDialog";

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
  const [hasSentIntentionToday, setHasSentIntentionToday] = useState(false);
  const [globalTime, setGlobalTime] = useState(Date.now());
  const [timeOffset, setTimeOffset] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(true);
  const [reportedContribution, setReportedContribution] = useState<{ id: string; authorName?: string } | null>(null);
  const { completeTask } = useDailyTasks();
  const { friends } = useFriends();
  const syncAttempted = useRef(false);
  const timeOffsetRef = useRef(0);

  const friendIds = useMemo(() => new Set(friends?.map(f => f.id)), [friends]);

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user ?? null);
      
      if (session?.user) {
        // Fetch profile
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (prof) setProfile(prof);
        completeTask("live_prayer"); // User entered the live prayer chain

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
        const { data: serverMs, error } = await supabase.rpc('get_server_time' as any);
        if (!error && serverMs) {
          const offset = Number(serverMs) - Date.now();
          timeOffsetRef.current = offset;
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

    const timer = setInterval(() => {
      if (!document.hidden) setGlobalTime(Date.now() + timeOffsetRef.current);
    }, 1000);
    
    // Realtime Presence
    const channel = supabase.channel('prayer-chain-presence');
    const updateOnlineCount = () => {
      try { setOnlineCount(Object.keys(channel.presenceState()).length); } catch (e) {}
    };
    channel
      .on('presence', { event: 'sync' }, updateOnlineCount)
      .on('presence', { event: 'join' }, updateOnlineCount)
      .on('presence', { event: 'leave' }, updateOnlineCount)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try {
            await channel.track({ online_at: new Date().toISOString() });
            updateOnlineCount();
          } catch(e) {}
        }
      });

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, []);

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

  const { recentContributors, isLoading: queueLoading } = usePrayerQueue(currentPrayer?.id, currentPhraseIndex, globalTime);
  const [hasClickedOrarJunto, setHasClickedOrarJunto] = useState(false);
  const [ambientContributor, setAmbientContributor] = useState<Contributor | null>(null);
  const displayedPrayerCount = Math.max(6, onlineCount - 1 + 6 + (hasClickedOrarJunto ? 1 : 0));

  useEffect(() => {
    let nextMessageTimer: number | undefined;
    let dismissTimer: number | undefined;
    let stopped = false;

    const showAmbientContributor = () => {
      if (stopped || document.hidden) {
        nextMessageTimer = window.setTimeout(showAmbientContributor, 8000);
        return;
      }
      const name = COMMON_NAMES[Math.floor(Math.random() * COMMON_NAMES.length)];
      const city = BR_CITIES_200K[Math.floor(Math.random() * BR_CITIES_200K.length)];
      setAmbientContributor({ timestamp: Date.now(), name, city });
      dismissTimer = window.setTimeout(() => setAmbientContributor(null), 5500);
      nextMessageTimer = window.setTimeout(showAmbientContributor, 14000 + Math.floor(Math.random() * 9000));
    };

    nextMessageTimer = window.setTimeout(showAmbientContributor, 5000 + Math.floor(Math.random() * 5000));
    return () => {
      stopped = true;
      if (nextMessageTimer) window.clearTimeout(nextMessageTimer);
      if (dismissTimer) window.clearTimeout(dismissTimer);
    };
  }, []);

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
             const { data: success, error } = await supabase.rpc('join_prayer_chain' as any, {
               p_target_timestamp: targetTs,
               p_author_name: profile?.full_name || currentUser.user_metadata?.full_name || "Intercessor",
               p_author_city: profile?.city || "Améns"
             });

             if (!error && success) {
               foundSlot = targetTs;
               break;
             }
           }
        }
        checkPhraseIndex++;
      }

      if (foundSlot) {
        localStorage.setItem('last_pray_click', Date.now().toString());
        setHasClickedOrarJunto(true);
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
      <div className="prayer-chain-page min-h-[100dvh] w-full text-foreground flex flex-col relative overflow-x-hidden pb-20">
        
        {/* Header Section */}
        <div className="pt-4 pb-2 px-6 relative z-20 shrink-0">
          <div className="max-w-md mx-auto flex flex-col items-center">
            <div className="w-full flex justify-between items-center mb-2">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-[#3d2800] hover:bg-black/5 -ml-2 rounded-full h-10 w-10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </div>

            <div className="text-center space-y-1 mb-4">
               <motion.h1 
                 initial={{ opacity: 0, y: -10 }} 
                 animate={{ opacity: 1, y: 0 }}
                 className="text-[#d4a017] text-2xl font-bold tracking-[0.15em] uppercase drop-shadow-sm"
               >
                 Corrente de Oração
               </motion.h1>
               
               <div className="pt-3 flex justify-center">
                 <motion.div 
                   className="flex items-center gap-3 bg-white/90  px-6 py-2 rounded-full border border-[#d4a017]/30 soft-shadow ring-4 ring-[#d4a017]/5"
                   whileHover={{ scale: 1.05 }}
                 >
                   <div className="w-2.5 h-2.5 bg-green-500 rounded-full  shadow-[0_0_15px_rgba(34,197,94,0.6)]" />
                   <span className="text-[12px] font-black tracking-[0.25em] uppercase text-[#3d2800] text-glow-gold">
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
                  <form onSubmit={handleSubmitIntention} className="relative group mb-2">
                    <Input 
                      placeholder={currentUser ? "Escreva uma intenção de oração" : "Entrar para enviar intenção"}
                      value={intention}
                      onChange={(e) => setIntention(e.target.value)}
                      className="bg-white/80 border-[#d4a017]/20 py-6 pl-6 pr-14 rounded-[2rem] text-[#3d2800] soft-shadow font-semibold text-sm focus-visible:ring-[#d4a017]/30"
                      disabled={!currentUser || isSubmitting}
                    />
                    <Button 
                      type="submit" 
                      disabled={!intention.trim() || isSubmitting}
                      className="absolute right-2 top-2 bottom-2 w-10 rounded-full bg-gradient-to-r from-[#d4a017] to-[#f0c040] border-0 shadow-sm"
                    >
                      <Send className="w-4 h-4 text-white" />
                    </Button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Main Prayer Text Section */}
        <div className="flex-1 relative flex flex-col items-center justify-center px-8 text-center min-h-0">
          {isSyncing ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-3 border-[#d4a017] border-t-transparent rounded-full animate-spin shadow-sm" />
              <p className="text-[#3d2800]/40 text-[10px] font-black uppercase tracking-[0.3em] ">Sincronizando...</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center w-full mt-4">
              <AnimatePresence mode="wait">
                {currentPrayer && currentPhraseIndex >= 0 ? (
                <motion.div 
                  key={`${currentPrayer.id}-${currentPhraseIndex}`}
                  initial={{ opacity: 0, scale: 0.95,  }}
                  animate={{ opacity: 1, scale: 1,  }}
                  exit={{ opacity: 0, scale: 1.05,  }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full flex flex-col items-center mb-6"
                >
                  <div className="w-14 h-14 bg-gradient-to-tr from-[#d4a017] to-[#f0c040] rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl border-2 border-white/50 ring-4 ring-[#d4a017]/5">
                    <Sparkles className="text-white w-7 h-7" />
                  </div>
                  
                  <h2 className="font-serif italic font-bold text-[1.4rem] md:text-[2.2rem] text-center leading-[1.3] text-[#3d2800] max-w-3xl mx-auto drop-shadow-sm px-4 ">
                    "{currentPrayer.phrases[currentPhraseIndex]}"
                  </h2>
                </motion.div>
              ) : (
                <motion.div 
                  key="gap"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center space-y-4 mb-6"
                >
                  <Wind className="w-14 h-14 text-[#d4a017]/20 mx-auto " />
                  <p className="text-[#3d2800]/50 font-serif italic text-lg md:text-xl tracking-wide">O silêncio é o abraço de Deus...</p>
                </motion.div>
                )}
              </AnimatePresence>

              {/* Fixed List (Outside AnimatePresence) */}
              {(recentContributors.length > 0 || ambientContributor) && !queueLoading && (
                <div className="mt-2 flex flex-col items-center w-full max-w-xs shrink-0">
                  <p className="text-[#a0720a] text-[10px] uppercase tracking-[0.3em] font-bold mb-3 opacity-60 border-b border-[#a0720a]/20 pb-1 w-full text-center">
                    Unidos em oração agora
                  </p>
                  <div className="flex flex-col gap-1.5 w-full justify-end max-h-[160px] overflow-y-auto py-2">
                    <AnimatePresence initial={false}>
                      {[...recentContributors, ...(ambientContributor ? [ambientContributor] : [])].slice(0, 3).map((contrib) => (
                        <motion.div 
                          key={`${contrib.user_id || contrib.name}-${contrib.timestamp}`}
                          initial={{ opacity: 0, scale: 0.9, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -6 }}
                          transition={{ duration: 0.35 }}
                          className={cn(
                            "text-[#3d2800]/70 font-semibold text-[11px] md:text-[13px] text-center tracking-wide px-2 py-1 rounded-full transition-all",
                            contrib?.user_id === currentUser?.id && "text-primary font-bold bg-[#d4a017]/10 soft-shadow",
                            contrib?.user_id && friendIds.has(contrib.user_id) && "text-friend-accent font-bold bg-friend-accent/10 soft-shadow"
                          )}>
                          {/*
                            <button
                              type="button"
                              aria-label={`Denunciar contribuição de ${contrib.name}`}
                              title="Denunciar contribuição"
                              className="ml-2 inline-flex rounded-full p-1 text-[#a0720a]/60 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                              onClick={() => setReportedContribution({ id: contrib.id!, authorName: contrib.name })}
                            >
                              <Flag className="h-3 w-3" aria-hidden="true" />
                            </button>
                          */}
                        {null}
                          {contrib.id && contrib.user_id !== currentUser?.id && (
                            <button
                              type="button"
                              aria-label={`Denunciar contribuição de ${contrib.name}`}
                              title="Denunciar contribuição"
                              className="ml-2 inline-flex rounded-full p-1 text-[#a0720a]/60 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                              onClick={() => setReportedContribution({ id: contrib.id!, authorName: contrib.name })}
                            >
                              <Flag className="h-3 w-3" aria-hidden="true" />
                            </button>
                          )}
                          {contrib.name} ({contrib.city}) — entrou na oração
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Button & Online Info Section */}
        <div className="shrink-0 relative z-30 flex flex-col items-center pb-8 pt-4">
           {!hasClickedOrarJunto && (
             <motion.div 
               whileHover={{ scale: 1.05 }} 
               whileTap={{ scale: 0.95 }}
               className="relative z-30 mb-6"
             >
               <Button 
                 onClick={handleOrarJunto}
                 className="rounded-full shadow-2xl bg-white/95  hover:bg-white text-[#d4a017] border-2 border-[#d4a017]/30 flex items-center gap-4 px-10 py-8 group transition-all"
               >
                 <div className="flex flex-col items-center">
                   <span className="text-[16px] font-black uppercase tracking-[0.2em] text-[#3d2800] group-hover:text-primary">Orar junto</span>
                   <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Unir sua voz</span>
                 </div>
                 <div className="w-11 h-11 bg-[#d4a017]/10 rounded-full flex items-center justify-center group-hover:bg-[#d4a017]/20 transition-colors">
                   <Heart className="w-6 h-6 text-[#d4a017] fill-current" />
                 </div>
               </Button>
             </motion.div>
           )}

           <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-3 bg-white/40  px-4 py-1.5 rounded-full border border-black/5">
                <Users className="w-4 h-4 text-[#d4a017]" />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#3d2800]/70">
                  {displayedPrayerCount} pessoas orando junto
                </span>
              </div>
              
              <div className="w-48 h-1.5 bg-black/5 rounded-full overflow-hidden shadow-inner flex shrink-0">
                <motion.div 
                  className="h-full bg-gradient-to-r from-[#d4a017] via-[#f0c040] to-[#d4a017] relative"
                  initial={{ width: "0%" }}
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ duration: 1, ease: "linear" }}
                >
                </motion.div>
              </div>
           </div>
        </div>

        {/* Global Progress Indicator (Hidden or reduced) */}
         <div className="h-2 shrink-0 bg-transparent" />
         <ReportContributionDialog
           open={Boolean(reportedContribution)}
           contributionId={reportedContribution?.id ?? null}
           authorName={reportedContribution?.authorName}
           onClose={() => setReportedContribution(null)}
           onConfirmed={() => setReportedContribution(null)}
         />
      </div>
    </PageTransition>
  );
};

export default PrayerChain;
