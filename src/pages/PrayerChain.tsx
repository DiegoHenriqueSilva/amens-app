import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Player } from "@remotion/player";
import { supabase } from "@/integrations/supabase/fixed-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, Sparkles, Wind, Users } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import PrayerWriting from "@/remotion/PrayerChain/PrayerWriting";
import { PRAYERS, PHRASE_DURATION, PRAYER_GAP } from "@/data/prayer-data";
import { motion, AnimatePresence } from "framer-motion";

// Configuration for the Eternal Flow
const EPOCH = new Date("2024-01-01T00:00:00Z").getTime();

const PrayerChain = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [intention, setIntention] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [onlineCount, setOnlineCount] = useState(0);

  // Calculate the current prayer and phrase based on global time
  const [globalTime, setGlobalTime] = useState(Date.now());

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
        content: intention.trim(),
        status: "pending"
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

  return (
    <PageTransition>
      <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
        
        {/* Header Overlay */}
        <div className="absolute top-0 left-0 right-0 p-6 z-20 flex justify-between items-center bg-gradient-to-b from-background/90 via-background/60 to-transparent">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-foreground/70 hover:text-foreground">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex items-center gap-2 bg-foreground/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-foreground/10">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium tracking-wider uppercase">Sopro Eterno</span>
          </div>
          <div className="w-10" />
        </div>

        {/* Remotion Player Section */}
        <div className="flex-1 relative flex items-center justify-center">
          {currentPrayer ? (
            <Player
              component={PrayerWriting}
              durationInFrames={60}
              compositionWidth={1080}
              compositionHeight={1920}
              fps={30}
              style={{ width: "100%", height: "100%" }}
              inputProps={{ 
                phrases: currentPrayer.phrases.slice(0, currentPhraseIndex + 1).map((phrase, idx) => ({
                  index: idx,
                  text: phrase,
                  contributorName: "Intercessor da Fé",
                  contributorCity: "Améns"
                })),
                isEternalFlow: true
              }}
              autoPlay
              loop
            />
          ) : (
            <div className="text-center space-y-4">
              <Wind className="w-12 h-12 text-primary/40 mx-auto animate-pulse" />
              <p className="text-primary/60 font-serif italic text-lg text-glow">O silêncio é o intervalo da alma...</p>
            </div>
          )}
          
          {/* Progress Bar Overlay */}
          <div className="absolute bottom-32 left-10 right-10 h-0.5 bg-white/10 rounded-full overflow-hidden">
             <motion.div 
               className="h-full bg-primary"
               initial={false}
               animate={{ width: `${progress * 100}%` }}
               transition={{ duration: 1, ease: "linear" }}
             />
          </div>
        </div>

        {/* Intention Input Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-8 pt-20 bg-gradient-to-t from-background via-background/90 to-transparent z-20">
          <div className="max-w-md mx-auto">
            <form onSubmit={handleSubmitIntention} className="relative group">
               <Input 
                 placeholder={currentUser ? "Sua intenção para a corrente..." : "Faça login para enviar intenção"}
                 value={intention}
                 onChange={(e) => setIntention(e.target.value)}
                 className="bg-foreground/5 border-foreground/10 py-7 pl-6 pr-16 rounded-2xl focus:ring-primary/50 text-foreground placeholder:text-foreground/40"
                 disabled={!currentUser || isSubmitting}
               />
               <Button 
                 type="submit" 
                 disabled={!intention.trim() || isSubmitting}
                 className="absolute right-2 top-2 bottom-2 rounded-xl gradient-divine"
               >
                 {isSubmitting ? <Sparkles className="animate-spin w-5 h-5" /> : <Send className="w-5 h-5" />}
               </Button>
            </form>
            
            <div className="mt-6 flex items-center justify-center gap-6 text-foreground/50">
               <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary/60" />
                  <span className="text-[11px] font-bold uppercase tracking-widest">{onlineCount + 12} Orando</span>
               </div>
               <div className="w-1 h-1 bg-foreground/20 rounded-full" />
               <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary/60" />
                  <span className="text-[11px] font-bold uppercase tracking-widest">Fluxo Contínuo</span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default PrayerChain;
