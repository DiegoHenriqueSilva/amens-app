import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, Sparkles, Wind, Users, PenLine } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import PageTransition from "@/components/PageTransition";
import { PRAYERS, PHRASE_DURATION, PRAYER_GAP, COMMON_NAMES, PR_CITIES_100K, TOTAL_CYCLE_TIME } from "@/data/prayer-data";
import { motion, AnimatePresence } from "framer-motion";
import { usePrayerQueue } from "@/hooks/use-prayer-queue";
import { useFriends } from "@/hooks/use-friends";
import { cn } from "@/lib/utils";

// Configuration for the Eternal Flow
// EPOCH removed as we now use real-time prayerState

const PrayerChain = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [intention, setIntention] = useState("");
  const [newPhrase, setNewPhrase] = useState("");
  const [isPhraseDialogOpen, setIsPhraseDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [userCount, setUserCount] = useState<number>(0);
  const [hasSentIntentionToday, setHasSentIntentionToday] = useState(false);

  // Calculate the current prayer and phrase based on global time
  const [globalTime, setGlobalTime] = useState(Date.now());
  const [timeOffset, setTimeOffset] = useState<number | null>(null);
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number }[]>([]);
  const [prayerState, setPrayerState] = useState<any>(null);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [hasVoted, setHasVoted] = useState<string | null>(null);
  const { friends } = useFriends();

  const friendIds = useMemo(() => new Set(friends?.map(f => f.id)), [friends]);

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

    // Fetch server time to sync clocks globally
    const syncClock = async () => {
      try {
        const { data: serverMs, error } = await supabase.rpc('get_server_time');
        if (!error && serverMs) {
          const offset = Number(serverMs) - Date.now();
          setTimeOffset(offset);
          setGlobalTime(Date.now() + offset);
          console.log(`[Clock Sync] Server offset: ${offset}ms`);
        }
      } catch (e) {
        console.error("Failed to sync clock:", e);
        setTimeOffset(0); // Fallback to local time
      }
    };
    syncClock();

    const fetchUserCount = async () => {
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      if (count) setUserCount(count);
    };
    fetchUserCount();

    const timer = setInterval(() => {
      setGlobalTime(prev => {
        // If we have an offset, keep using it, otherwise fallback to local
        const currentOffset = timeOffset ?? 0;
        return Date.now() + currentOffset;
      });
    }, 1000);
    
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

    // Fetch and subscribe to prayer_state
    const fetchPrayerState = async () => {
      const { data } = await supabase.from('prayer_state').select('*').limit(1).maybeSingle();
      if (data) setPrayerState(data);
    };
    fetchPrayerState();

    const stateChannel = supabase
      .channel('prayer_state_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prayer_state' }, payload => {
        setPrayerState(payload.new);
        // Reset votes when state changes
        setVotes({});
        setHasVoted(null);
      })
      .subscribe();

    // Fetch and subscribe to votes
    const fetchVotes = async () => {
      const { data } = await supabase.from('prayer_votes').select('prayer_id');
      if (data) {
        const counts = data.reduce((acc: any, v: any) => {
          acc[v.prayer_id] = (acc[v.prayer_id] || 0) + 1;
          return acc;
        }, {});
        setVotes(counts);
      }
    };
    fetchVotes();

    const voteChannel = supabase
      .channel('prayer_votes_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'prayer_votes' }, payload => {
        setVotes(prev => ({
          ...prev,
          [payload.new.prayer_id]: (prev[payload.new.prayer_id] || 0) + 1
        }));
      })
      .subscribe();

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
      supabase.removeChannel(stateChannel);
      supabase.removeChannel(voteChannel);
    };
  }, [timeOffset]); // Add timeOffset to restart timer if needed

  const { currentPrayer, currentPhraseIndex, progress, isVoting, votingTimeLeft } = useMemo(() => {
    if (!prayerState) return { currentPrayer: null, currentPhraseIndex: -1, progress: 0, isVoting: false, votingTimeLeft: 0 };

    const elapsed = globalTime - Number(prayerState.started_at);
    const prayer = PRAYERS.find(p => p.id === prayerState.current_prayer_id);
    
    if (!prayer) return { currentPrayer: null, currentPhraseIndex: -1, progress: 0, isVoting: false, votingTimeLeft: 0 };

    const prayerDuration = prayer.phrases.length * PHRASE_DURATION;

    if (elapsed < prayerDuration) {
      const phraseIndex = Math.floor(elapsed / PHRASE_DURATION);
      const phraseProgress = (elapsed % PHRASE_DURATION) / PHRASE_DURATION;
      return { 
        currentPrayer: prayer, 
        currentPhraseIndex: phraseIndex,
        progress: phraseProgress,
        isVoting: false,
        votingTimeLeft: 0
      };
    }

    // Voting phase
    const timeInVoting = globalTime - (Number(prayerState.started_at) + prayerDuration);
    const votingDuration = 6000; // 6 seconds
    
    if (timeInVoting < votingDuration) {
      return {
        currentPrayer: null,
        currentPhraseIndex: -1,
        progress: 1,
        isVoting: true,
        votingTimeLeft: Math.max(0, Math.ceil((votingDuration - timeInVoting) / 1000))
      };
    }

    // If voting time is up, the FIRST CLIENT to see this will advance the state
    return { currentPrayer: null, currentPhraseIndex: -1, progress: 1, isVoting: true, votingTimeLeft: 0 };
  }, [globalTime, prayerState]);

  const { author } = usePrayerQueue(currentPrayer?.id, currentPhraseIndex, globalTime);

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
      if (!prayerState) return;

      const elapsed = globalTime - Number(prayerState.started_at);
      
      // We look ahead for available slots in the REMAINING time of the CURRENT prayer
      let foundSlot = null;
      let checkPhraseIndex = currentPhraseIndex + 1;
      const prayer = PRAYERS.find(p => p.id === prayerState.current_prayer_id);
      
      if (prayer) {
        for (let i = checkPhraseIndex; i < prayer.phrases.length; i++) {
          const targetTs = Number(prayerState.started_at) + (i * PHRASE_DURATION);
          
          if (targetTs > globalTime + 2000) {
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
      }

      if (foundSlot) {
        const { data: profile } = await supabase.from('profiles').select('full_name, city').eq('id', currentUser.id).single();
        
        await supabase.from('prayer_contributions').insert({
          user_id: currentUser.id,
          target_timestamp: foundSlot,
          author_name: profile?.full_name || currentUser.user_metadata?.full_name || "Intercessor",
          author_city: profile?.city || "Améns"
        });
        
        localStorage.setItem('last_pray_click', Date.now().toString());
      } else {
        toast({ title: "Oração Finalizando", description: "Esta oração está quase acabando. Aguarde a próxima!" });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Voting Logic
  const handleVote = async (prayerId: string) => {
    if (!currentUser || hasVoted || !isVoting) return;
    
    setHasVoted(prayerId);
    try {
      await supabase.rpc('submit_prayer_vote', { p_id: prayerId, u_id: currentUser.id });
    } catch (e) {
      console.error(e);
    }
  };

  // Determine who advances the state (with robustness)
  useEffect(() => {
    // Check every second if we are stuck at 0s
    const checkStuck = setInterval(() => {
      if (isVoting && votingTimeLeft === 0 && prayerState) {
        advanceState();
      }
    }, 2000);
    return () => clearInterval(checkStuck);
  }, [isVoting, votingTimeLeft, prayerState]);

  const advanceState = async () => {
    try {
      // Debounce: only one client should successfully update
      await new Promise(r => setTimeout(r, Math.random() * 1000));
      
      const { data: latest, error: fetchError } = await supabase.from('prayer_state').select('*').limit(1).maybeSingle();
      if (fetchError || !latest) return;

      const nowMs = Date.now() + (timeOffset || 0);
      const prayer = PRAYERS.find(p => p.id === latest.current_prayer_id);
      const prayerDuration = (prayer?.phrases.length || 0) * PHRASE_DURATION;
      const votingDuration = 6000;
      
      // Lenient check: if we are close to the end or past it
      if (nowMs < Number(latest.started_at) + prayerDuration + votingDuration - 300) {
        return; 
      }

      // Logic to pick winner (Social Proof)
      const totalPessoas = Math.floor(userCount / 2) + 10;
      const totalFakeVotes = Math.floor(totalPessoas / 2);
      let winner = null;
      
      if (latest.voting_options && latest.voting_options.length > 0) {
        const finalVotes = latest.voting_options.map((optId: string) => {
          const baseFake = Math.floor(totalFakeVotes / 3);
          const optSeed = optId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
          return {
            id: optId,
            count: (votes[optId] || 0) + baseFake + (optSeed % 3)
          };
        });
        winner = finalVotes.sort((a: any, b: any) => b.count - a.count)[0].id;
      } else {
        winner = PRAYERS[Math.floor(Math.random() * PRAYERS.length)].id;
      }
      
      const nextOptions = [...PRAYERS]
        .filter(p => p.id !== winner)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(p => p.id);

      // Call the simplified autonomous RPC
      const { error: rpcError } = await supabase.rpc('advance_prayer_state', {
        p_winner_id: winner,
        p_next_options: nextOptions
      });

      if (rpcError) {
        console.error("RPC Error:", rpcError);
        toast({ 
          title: "Sincronia Celeste", 
          description: "Ajustando o fluxo da oração...", 
          duration: 2000 
        });
      } else {
        console.log(`[State Advance] Successfully moved to ${winner}`);
      }
    } catch (e) {
      console.error("State advancement failed:", e);
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
          <div className="max-w-md mx-auto flex flex-col items-center">
            <div className="w-full flex justify-between items-center mb-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-[#3d2800] hover:bg-black/5 -ml-2">
                <ArrowLeft className="w-6 h-6" />
              </Button>
              <div className="w-10" />
            </div>

            <div className="text-center space-y-1 mb-6 animate-in fade-in slide-in-from-top duration-700">
               <h1 className="text-[#d4a017] text-2xl font-bold tracking-[0.1em] uppercase drop-shadow-sm">Corrente de Oração</h1>
               <p className="text-[#3d2800]/60 text-[11px] font-medium uppercase tracking-widest">
                 Estamos orando pelas intenções de <span className="text-[#a0720a] font-bold">{Math.floor(userCount / 2) + 10}</span> pessoas
               </p>
               
               <div className="pt-4 flex justify-center">
                 <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-5 py-2.5 rounded-full border border-[#d4a017]/20 soft-shadow ring-1 ring-[#d4a017]/5">
                   <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                   <span className="text-[13px] font-bold tracking-[0.2em] uppercase text-[#3d2800]">
                     {currentPrayer ? currentPrayer.name : "Momento de Silêncio"}
                   </span>
                 </div>
               </div>
            </div>

            {!hasSentIntentionToday && (
              <div className="w-full">
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
          </div>
        </div>

        {/* Dynamic Prayer Display */}
        <div className="flex-1 relative flex flex-col items-center justify-center p-6 pb-12">
          {timeOffset === null || !prayerState ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-8 h-8 border-4 border-[#d4a017] border-t-transparent rounded-full animate-spin" />
              <p className="text-[#3d2800]/50 font-medium text-xs uppercase tracking-widest">Sincronizando Corrente...</p>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              {!isVoting && currentPrayer && currentPhraseIndex >= 0 ? (
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
                
                <h2 className={cn(
                  "font-serif italic font-bold text-[1.7rem] md:text-4xl text-center leading-[1.6] text-[#3d2800] max-w-2xl mx-auto drop-shadow-sm px-4 py-4 transition-all duration-700",
                  author?.user_id === currentUser?.id && "disney-shimmer scale-105",
                  author?.user_id && friendIds.has(author.user_id) && "halo-angelical"
                )}>
                  "{currentPrayer.phrases[currentPhraseIndex]}"
                </h2>
                
                {author && (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 1 }}
                    className={cn(
                      "text-[#a0720a] font-bold mt-10 text-[9px] md:text-[10px] text-center uppercase tracking-[0.2em] opacity-70 px-4 py-2 rounded-full transition-all",
                      author?.user_id === currentUser?.id && "disney-shimmer text-primary opacity-100 scale-110",
                      author?.user_id && friendIds.has(author.user_id) && "text-friend-accent opacity-100 scale-110"
                    )}
                  >
                    — {author.name}, {author.city}
                  </motion.p>
                )}
              </motion.div>
            ) : isVoting ? (
              <motion.div 
                key="voting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full max-w-md mx-auto space-y-8"
              >
                <div className="text-center space-y-2 mb-8">
                  <h3 className="text-[#a0720a] font-bold text-xs uppercase tracking-widest">Próxima Oração</h3>
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-0.5 w-8 bg-[#d4a017]/30" />
                    <span className="text-[10px] text-[#3d2800]/40 font-bold uppercase tracking-widest">A comunidade decide em {votingTimeLeft}s</span>
                    <div className="h-0.5 w-8 bg-[#d4a017]/30" />
                  </div>
                </div>

                <div className="space-y-4">
                  {prayerState.voting_options?.map((optId: string) => {
                    const p = PRAYERS.find(x => x.id === optId);
                    if (!p) return null;
                    
                    // Social Proof Logic for UI visualization
                    const totalPessoas = Math.floor(userCount / 2) + 10;
                    const totalFakeVotes = Math.floor(totalPessoas / 2);
                    const baseFake = Math.floor(totalFakeVotes / 3);
                    
                    // Use a more stable 'random' distribution based on option ID
                    const seed = optId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
                    const subtleExtra = seed % 3;
                    
                    const currentVoteCount = (votes[optId] || 0) + (isVoting ? (baseFake + subtleExtra) : 0);
                    const totalVotesArray = prayerState.voting_options.map((id: string) => {
                      const optSeed = id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
                      return (votes[id] || 0) + (isVoting ? (baseFake + (optSeed % 3)) : 0);
                    });
                    const totalAcross = totalVotesArray.reduce((src: number, next: number) => src + next, 0) || 1;
                    const percent = Math.floor((currentVoteCount / totalAcross) * 100);

                    return (
                      <motion.button
                        key={optId}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleVote(optId)}
                        disabled={!!hasVoted}
                        className={cn(
                          "w-full relative h-[60px] bg-white/50 backdrop-blur-sm rounded-full border border-black/5 overflow-hidden transition-all group",
                          hasVoted === optId && "border-[#d4a017]/40 ring-2 ring-[#d4a017]/10"
                        )}
                      >
                        {/* Vote Progress Bar */}
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#d4a017]/10 to-[#f0c040]/10 border-r border-[#d4a017]/20"
                        />
                        
                        <div className="absolute inset-0 px-6 flex items-center justify-between">
                          <span className={cn(
                            "text-sm font-bold tracking-wide transition-colors",
                            hasVoted === optId ? "text-[#a0720a]" : "text-[#3d2800]/70"
                          )}>
                            {p.name}
                          </span>
                          <span className="text-xs font-bold text-[#a0720a]/80">{percent}%</span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
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
                <p className="text-[#3d2800]/50 font-serif italic text-xl">Preparando Corrente...</p>
              </motion.div>
              )}
            </AnimatePresence>
          )}
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
              <div className="flex-1" />
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
