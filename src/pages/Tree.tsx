import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, ArrowLeft, Sun, Wind, CloudRain } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { useXp } from "@/hooks/use-xp";
import { Player } from "@remotion/player";
import PrayerTree from "@/remotion/PrayerTree/PrayerTree";

const Tree = () => {
  const navigate = useNavigate();
  const { totalXp } = useXp();
  const [communityXp, setCommunityXp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [recentPrayers, setRecentPrayers] = useState<{ name: string; timestamp: string }[]>([]);

  useEffect(() => {
    fetchCommunityStats();
    fetchRecentPrayers();
  }, []);

  const fetchRecentPrayers = async () => {
    // Fetch prayers first
    const { data: prayers } = await supabase
      .from("prayer_requests")
      .select("author_name, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(10);
    
    if (prayers && prayers.length > 0) {
      const userIds = prayers.map(p => p.user_id).filter(Boolean);
      
      // Fetch profiles for these users
      const { data: profiles } = await supabase
        .from("profiles" as any)
        .select("id, full_name, show_real_name, display_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map(((profiles || []) as any[]).map(p => [p.id, p]));

      setRecentPrayers(
        prayers.map(p => {
          const profile: any = profileMap.get(p.user_id);
          return {
            name: profile?.show_real_name 
              ? (profile?.display_name || profile?.full_name?.split(" ")[0] || p.author_name || "Intercessor")
              : "Intercessor",
            timestamp: p.created_at
          };
        })
      );
    }
  };

  const fetchCommunityStats = async () => {
    setLoading(true);
    const { data: xpRows } = await supabase.from("user_xp").select("total_xp");
    if (xpRows) {
      const sum = xpRows.reduce((acc, curr) => acc + curr.total_xp, 0);
      setCommunityXp(sum);
    }
    setLoading(false);
  };

  // Determine tree growth level (0-5)
  // Level threshold: 500 XP per level for initial stages to show progress faster
  const growthLevel = Math.min(Math.floor(communityXp / 1000), 5); 
  
  const getFlowStage = () => {
    if (growthLevel === 0) return { label: "Sussurro de Fé", description: "O solo está sendo preparado no seu coração...", icon: <Wind className="w-16 h-16 text-primary/40 animate-pulse" /> };
    if (growthLevel === 1) return { label: "Brisa de Esperança", description: "As primeiras preces sopram com suavidade.", icon: null };
    if (growthLevel === 2) return { label: "Corrente de Luz", description: "Nossa comunidade flui com determinação divina.", icon: null };
    if (growthLevel === 3) return { label: "Rio da Vida", description: "Um caudal de graças que banha todos os irmãos.", icon: null };
    if (growthLevel === 4) return { label: "Oceano de Graça", description: "A imensidão do amor de Deus em cada prece.", icon: null };
    return { label: "Fluxo Infinito", description: "A conexão ininterrupta com o Reino dos Céus.", icon: null };
  };

  const stage = getFlowStage();

  return (
    <PageTransition>
      <div className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center">
        {/* Sky / Nature Background */}
        <div className="absolute top-0 left-0 w-full h-[60%] bg-gradient-to-b from-primary/5 to-background pointer-events-none" />
        <div className="absolute top-[10%] left-[10%] opacity-20"><Sun className="w-12 h-12 text-yellow-500 animate-pulse" /></div>
        <div className="absolute top-[20%] right-[15%] opacity-15"><Wind className="w-8 h-8 text-primary/40" /></div>

        <div className="container mx-auto px-6 py-8 relative z-10 max-w-lg w-full">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="mb-4 hover:bg-primary/5 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <motion.div 
            className="text-center mb-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <h1 className="text-4xl font-extrabold text-foreground mb-1 tracking-tight text-glow">Fluxo de Orações</h1>
            <div className="w-16 h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent mx-auto rounded-full" />
            <p className="text-[10px] mt-2 uppercase tracking-[0.3em] font-bold text-primary/60">Intercessão e Comunhão Eterna</p>
          </motion.div>

          {/* Core Tree Visualization */}
          <div className="relative h-[382px] flex flex-col items-center justify-center mb-6">
            <AnimatePresence mode="wait">
              <motion.div 
                key={growthLevel}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 1 }}
                className="relative z-10 w-full h-full flex items-center justify-center"
              >
                <Player
                  component={PrayerTree as any}
                  durationInFrames={600} 
                  compositionWidth={400}
                  compositionHeight={450}
                  fps={30}
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'transparent',
                  }}
                  inputProps={{ 
                    prayers: recentPrayers,
                    level: growthLevel 
                  }}
                  autoPlay
                  loop
                />
                <AnimatePresence>
                  {growthLevel === 0 && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                    >
                       <div className="bg-background/20 backdrop-blur-sm p-8 rounded-full">
                          {stage.icon}
                       </div>
                       <p className="text-xs text-muted-foreground font-medium italic mt-4">Sussurrando preces...</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>

            {/* Floating Sparkles for Magic Feel */}
            <motion.div 
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {[...Array(8)].map((_, i) => (
                <Sparkles 
                   key={i} 
                   className="absolute text-primary/30 w-3 h-3 animate-pulse" 
                   style={{ 
                     top: `${Math.random() * 80}%`, 
                     left: `${Math.random() * 80}%`,
                     animationDelay: `${i * 0.4}s`
                   }} 
                />
              ))}
            </motion.div>
          </div>

          {/* Info Card - Simplified & Elegant */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
             <Card className="p-8 soft-shadow border-primary/10 bg-white/40 backdrop-blur-md rounded-[2.5rem] text-center">
                <div className="inline-block px-4 py-1 bg-primary/10 rounded-full text-primary text-[10px] uppercase font-black tracking-widest mb-4">
                   Nível {growthLevel}
                </div>
                <h3 className="text-2xl font-bold mb-2 text-foreground tracking-tight">{stage.label}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed italic opacity-80 mb-6 px-4">"{stage.description}"</p>
                
                <div className="space-y-4">
                   <div className="w-full h-2 bg-secondary/20 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-primary shadow-[0_0_10px_rgba(212,175,55,0.4)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${(communityXp % 1000) / 10}%` }}
                        transition={{ duration: 1.5, delay: 0.5 }}
                      />
                   </div>
                   <div className="flex justify-between items-center px-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">{communityXp.toLocaleString()} XP Coletivo</span>
                      <span className="text-[10px] font-bold text-primary uppercase">Próxima Fase</span>
                   </div>
                </div>
                
                <Button 
                   onClick={() => navigate("/pray")}
                   className="mt-8 gradient-divine w-full rounded-2xl py-6 text-sm font-bold shadow-xl active:scale-95 transition-transform"
                >
                   <Sparkles className="w-4 h-4 mr-2" />
                   Alimentar o Fluxo
                </Button>
             </Card>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Tree;
