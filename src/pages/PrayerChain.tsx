import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Sparkles, MessageCircle, Heart, Users, Clock } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { Player } from "@remotion/player";
import PrayerWriting from "@/remotion/PrayerChain/PrayerWriting";
import { PRAYERS, PR_CITIES_100K, COMMON_NAMES, type Prayer } from "@/data/prayer-data";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const PrayerChain = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [contributions, setContributions] = useState<any[]>([]);
  const [intentionsCount, setIntentionsCount] = useState(0);
  const [myIntention, setMyIntention] = useState<string | null>(null);
  const [showIntentionModal, setShowIntentionModal] = useState(false);
  const [intentionInput, setIntentionInput] = useState("");
  const [isSubmittingIntention, setIsSubmittingIntention] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const lastInteractionRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initSession();
    fetchIntentionsCount();
    fetchMyIntention();

    const channel = supabase
      .channel("prayer_chain_updates")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "prayer_chain_sessions" },
        (payload) => {
          handleSessionUpdate(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const initSession = async () => {
    setLoading(true);
    // Find active session
    let { data: sessions, error } = await supabase
      .from("prayer_chain_sessions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error fetching session:", error);
      setLoading(false);
      return;
    }

    if (!sessions || sessions.length === 0) {
      // Create a new session
      const initialPrayer = PRAYERS[0];
      const { data: newSession, error: createError } = await supabase
        .from("prayer_chain_sessions")
        .insert({
          prayer_type: initialPrayer.id,
          current_phrase_index: -1,
          last_interaction_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (newSession) setSession(newSession);
    } else {
      setSession(sessions[0]);
      // Update local timer ref
      lastInteractionRef.current = new Date(sessions[0].last_interaction_at).getTime();
    }
    setLoading(false);
    startIdleTimer();
  };

  const handleSessionUpdate = (newSession: any) => {
    setSession(prev => {
      // If prayer changed or index reset
      if (prev?.id !== newSession.id || newSession.current_phrase_index < prev?.current_phrase_index) {
        setContributions([]);
      }
      
      // If a new phrase was added
      if (newSession.current_phrase_index !== prev?.current_phrase_index) {
        const prayer = PRAYERS.find(p => p.id === newSession.prayer_type);
        if (prayer && newSession.current_phrase_index >= 0) {
          const newPhrase = {
            index: newSession.current_phrase_index,
            text: prayer.phrases[newSession.current_phrase_index],
            contributorName: newSession.last_contributor_name,
            contributorCity: newSession.last_contributor_city
          };
          setContributions(old => [...old, newPhrase]);
        }
      }
      
      lastInteractionRef.current = new Date(newSession.last_interaction_at).getTime();
      return newSession;
    });
  };

  const startIdleTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const now = Date.now();
      if (now - lastInteractionRef.current > 5000) {
        // Only one of the clients (randomly) will try to push a fake update
        // to avoid unnecessary requests.
        if (Math.random() < 0.2) {
           triggerAutoProgression();
        }
      }
    }, 1000);
  };

  const triggerAutoProgression = async () => {
    if (!session) return;
    
    const prayer = PRAYERS.find(p => p.id === session.prayer_type);
    if (!prayer) return;

    const nextIndex = session.current_phrase_index + 1;
    let nextPrayerId = session.prayer_type;
    let finalNextIndex = nextIndex;

    if (nextIndex >= prayer.phrases.length) {
      // Check if 15s passed since the last phrase of the previous prayer
      const finishedAt = new Date(session.last_interaction_at).getTime();
      if (Date.now() - finishedAt < 15000) {
        return; // Still in the 15s cooldown period
      }

      // Finished! Pick another prayer
      const otherPrayers = PRAYERS.filter(p => p.id !== session.prayer_type);
      const randomPrayer = otherPrayers[Math.floor(Math.random() * otherPrayers.length)];
      nextPrayerId = randomPrayer.id;
      finalNextIndex = -1; // Reset for next prayer
    }

    const fakeName = COMMON_NAMES[Math.floor(Math.random() * COMMON_NAMES.length)];
    const fakeCity = PR_CITIES_100K[Math.floor(Math.random() * PR_CITIES_100K.length)];

    await supabase
      .from("prayer_chain_sessions")
      .update({
        prayer_type: nextPrayerId,
        current_phrase_index: finalNextIndex,
        last_interaction_at: new Date().toISOString(),
        last_contributor_name: fakeName,
        last_contributor_city: fakeCity
      })
      .eq("id", session.id)
      .lt("last_interaction_at", new Date(Date.now() - 4500).toISOString()); // Row level concurrency check
  };

  const handleSendPhrase = async () => {
    if (!session) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const prayer = PRAYERS.find(p => p.id === session.prayer_type);
    if (!prayer) return;

    const nextIndex = session.current_phrase_index + 1;
    if (nextIndex >= prayer.phrases.length) return;

    const myName = user.user_metadata?.display_name || user.user_metadata?.full_name?.split(" ")[0] || "Um fiel";
    const myCity = user.user_metadata?.city || "Brasil";

    // Optimistic local update as requested: "mesmo que mais pessoas tiverem feito isso ao mesmo tempo que eu, aparecerá o meu nome"
    const myContr = {
      index: nextIndex,
      text: prayer.phrases[nextIndex],
      contributorName: myName,
      contributorCity: myCity
    };
    setContributions(prev => [...prev, myContr]);

    const { error } = await supabase
      .from("prayer_chain_sessions")
      .update({
        current_phrase_index: nextIndex,
        last_interaction_at: new Date().toISOString(),
        last_contributor_name: myName,
        last_contributor_city: myCity
      })
      .eq("id", session.id);

    if (error) {
      // Revert if error
      toast.error("Alguém foi mais rápido! 🙏");
      setContributions(prev => prev.filter(c => c.index !== nextIndex));
    }
  };

  const fetchIntentionsCount = async () => {
    const { data } = await supabase.from("prayer_intentions_count").select("*").single();
    if (data) setIntentionsCount(data.total_intentions || 0);
  };

  const fetchMyIntention = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date();
    today.setHours(0,0,0,0);

    const { data } = await supabase
      .from("prayer_intentions")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", today.toISOString())
      .limit(1);
    
    if (data && data.length > 0) setMyIntention(data[0].content);
  };

  const handleSubmitIntention = async () => {
    if (!intentionInput.trim()) return;
    setIsSubmittingIntention(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("prayer_intentions")
      .insert({
        user_id: user.id,
        content: intentionInput
      });

    if (error) {
      toast.error("Erro ao enviar intenção.");
    } else {
      toast.success("Intenção de oração enviada! 🙏");
      setMyIntention(intentionInput);
      setShowIntentionModal(false);
      fetchIntentionsCount();
    }
    setIsSubmittingIntention(false);
  };

  const currentPrayer = PRAYERS.find(p => p.id === (session?.prayer_type || PRAYERS[0].id));
  const nextPhrase = currentPrayer?.phrases[session?.current_phrase_index + 1];

  return (
    <PageTransition>
      <div className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center">
        {/* Sky Gradient */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-primary/5 via-background to-background pointer-events-none" />
        
        <div className="container mx-auto px-6 py-8 relative z-10 max-w-lg w-full flex flex-col h-full">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="mb-4 hover:bg-primary/5 rounded-full self-start">
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <motion.div 
            className="text-center mb-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-extrabold text-foreground mb-1 tracking-tight text-glow">Corrente de Oração</h1>
            <div className="w-16 h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent mx-auto rounded-full" />
            
            {currentPrayer && (
              <motion.h2 
                key={currentPrayer.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-primary font-serif italic text-lg mt-3"
              >
                {currentPrayer.name}
              </motion.h2>
            )}

            <div className="mt-4 flex flex-col items-center">
               <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-bold uppercase tracking-widest bg-white/40 px-4 py-2 rounded-full border border-primary/10">
                  <Users className="w-3.5 h-3.5" />
                  {myIntention ? `Minha Intenção: ${myIntention.substring(0, 15)}...` : "Coloque sua intenção"}
                  {intentionsCount > 0 && ` e as intenções de mais ${intentionsCount} pessoas`}
               </div>
               {!myIntention && (
                 <Button 
                   variant="ghost" 
                   size="sm" 
                   onClick={() => setShowIntentionModal(true)}
                   className="text-[10px] text-primary mt-2 font-bold hover:bg-primary/5"
                 >
                   <Sparkles className="w-3 h-3 mr-1" /> Enviar Intenção Hoje
                 </Button>
               )}
            </div>
          </motion.div>

          {/* Core Writing Area */}
          <div className="flex-1 relative min-h-[400px] mb-8 paper-texture soft-shadow-lg rounded-[2.5rem] border border-primary/5 overflow-hidden">
             {/* Angelic Light Rays */}
             <div className="absolute inset-0 bg-radial-gradient from-white/20 via-transparent to-transparent opacity-50" />
             
             <div className="absolute inset-0 z-10 overflow-y-auto hide-scrollbar p-8">
                <Player
                  component={PrayerWriting as any}
                  durationInFrames={150} 
                  compositionWidth={400}
                  compositionHeight={800}
                  fps={30}
                  style={{
                    width: '100%',
                    height: 'auto',
                    minHeight: '100%',
                    background: 'transparent',
                  }}
                  inputProps={{ 
                    phrases: contributions
                  }}
                  autoPlay
                />
             </div>
          </div>

          <AnimatePresence>
            {nextPhrase && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full pb-8"
              >
                <Card className="p-6 bg-white/80 backdrop-blur-md border-primary/20 soft-shadow rounded-3xl text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-3 italic opacity-60">Sua vez de elevar a voz:</p>
                  <Button 
                    onClick={handleSendPhrase}
                    className="w-full gradient-sacred text-foreground font-serif text-lg py-8 rounded-2xl shadow-lg active:scale-95 transition-all"
                  >
                    {nextPhrase}
                  </Button>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {!nextPhrase && session?.current_phrase_index >= 0 && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center pb-8">
                <p className="text-primary font-bold animate-pulse italic">Oração concluída. Aguardando o início de uma nova corrente...</p>
             </motion.div>
          )}
        </div>

        {/* Intention Modal */}
        <Dialog open={showIntentionModal} onOpenChange={setShowIntentionModal}>
          <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-md border-primary/20 soft-shadow rounded-[2rem]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <Heart className="w-6 h-6 text-primary" />
                Sua Intenção
              </DialogTitle>
              <DialogDescription>
                Escreva abaixo o que está no seu coração hoje. Sua intenção será elevada nesta corrente.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea 
                placeholder="Ex: Pela saúde da minha família, por um novo emprego..." 
                value={intentionInput}
                onChange={(e) => setIntentionInput(e.target.value)}
                className="rounded-2xl border-primary/10 bg-white/50 h-32 focus-visible:ring-primary"
              />
            </div>
            <DialogFooter>
              <Button 
                onClick={handleSubmitIntention} 
                disabled={!intentionInput.trim() || isSubmittingIntention}
                className="w-full rounded-xl gradient-divine"
              >
                {isSubmittingIntention ? "Elevando..." : "Confirmar Intenção"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
};

export default PrayerChain;
