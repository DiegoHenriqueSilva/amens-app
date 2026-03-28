import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, Sparkles, ArrowLeft, Heart, Globe, Award, TrendingUp } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { useXp } from "@/hooks/use-xp";

const Community = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<any[]>([]);
  const [totalPrayers, setTotalPrayers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGlobalStats();
    fetchRecentActivities();
    
    // Subscribe to new intercessions for real-time feel
    const channel = supabase
      .channel("public-activities")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "prayer_intercessions" },
        () => {
          fetchGlobalStats();
          fetchRecentActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchGlobalStats = async () => {
    const { count } = await supabase
      .from("prayer_intercessions")
      .select("*", { count: "exact", head: true });
    setTotalPrayers(count || 0);
  };

  const fetchRecentActivities = async () => {
    setLoading(true);
    // Mimic a "feed" of generic activities
    // In a real app, we'd have a dedicated activity table or complex join
    const { data: intercessions } = await supabase
      .from("prayer_intercessions")
      .select("*, prayer_requests(location)")
      .order("created_at", { ascending: false })
      .limit(15);

    if (intercessions) {
      setActivities(intercessions);
    }
    setLoading(false);
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background relative overflow-hidden pb-12">
        <div className="absolute top-[-8rem] right-[-8rem] w-[25rem] h-[25rem] rounded-full bg-primary/10 blur-3xl opacity-50" />
        <div className="absolute bottom-[-8rem] left-[-8rem] w-[25rem] h-[25rem] rounded-full bg-accent/10 blur-3xl opacity-50" />

        <div className="container mx-auto px-6 py-8 relative z-10 max-w-lg">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="mb-6">
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <motion.div 
            className="text-center mb-10"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-2 text-glow">Comunidade</h1>
            <div className="divider-gold max-w-[8rem] mx-auto mb-4" />
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-[0.2em]">Unidos em Uma Só Fé</p>
          </motion.div>

          {/* Global Impact Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-8 mb-8 soft-shadow border-primary/15 bg-gradient-to-br from-white/80 to-primary/5 backdrop-blur-md rounded-[2.5rem] border-2">
              <div className="flex flex-col items-center text-center">
                <Globe className="w-6 h-6 text-primary/70 mb-3 animate-pulse" />
                <h3 className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground mb-2">Impacto Global de Graça</h3>
                <div className="text-5xl font-black text-primary mb-1 tracking-tighter tabular-nums drop-shadow-sm">
                  {totalPrayers.toLocaleString()}
                </div>
                <p className="text-xs font-bold text-muted-foreground opacity-60">Orações Intercedidas no App</p>
              </div>
            </Card>
          </motion.div>

          {/* Faith Wall / Feed */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
               <div className="flex items-center gap-2">
                 <TrendingUp className="w-4 h-4 text-primary" />
                 <h2 className="text-xs uppercase font-bold tracking-widest text-foreground/70">Mural da Fé em Tempo Real</h2>
               </div>
               <span className="flex items-center gap-1.5">
                 <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                 <span className="text-[10px] font-bold text-green-600 uppercase">Ao Vivo</span>
               </span>
            </div>

            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {loading ? (
                  [1, 2, 3].map(i => (
                    <Card key={i} className="p-5 border-primary/5 bg-white/40 rounded-3xl animate-pulse h-20" />
                  ))
                ) : activities.length > 0 ? (
                  activities.map((activity, index) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="p-5 flex items-center gap-4 border-primary/5 soft-shadow bg-white/60 rounded-[1.8rem] hover:bg-white transition-all transform hover:-translate-y-0.5">
                        <div className="w-12 h-12 bg-secondary/50 rounded-2xl flex items-center justify-center text-primary/70 border border-primary/10">
                           <Sparkles className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[13px] font-medium leading-tight text-foreground/90">
                            Uma pessoa em <span className="text-primary font-bold">{(activity.prayer_requests as any)?.location || "Lugar Sagrado"}</span> acabou de interceder por uma causa.
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1 font-bold">há {Math.floor((new Date().getTime() - new Date(activity.created_at).getTime()) / 60000)} min</p>
                        </div>
                        <Heart className="w-4 h-4 text-primary/30 fill-primary/5" />
                      </Card>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-10 opacity-40">
                    <p className="text-sm italic">O silêncio é prece, mas a comunidade logo se moverá... 🙏</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Top Intercessors - Teaser */}
          <motion.div 
             className="mt-12"
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ delay: 0.6 }}
          >
             <Card className="p-6 border-dashed border-primary/20 bg-primary/5 rounded-[2rem] text-center">
                <Award className="w-6 h-6 text-primary/60 mx-auto mb-2" />
                <h3 className="text-sm font-bold mb-1">Ranking de Intercessores</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">Mostre sua luz na comunidade. O ranking mensal chega na próxima versão! ✨</p>
             </Card>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Community;
