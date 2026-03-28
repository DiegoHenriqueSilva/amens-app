import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TreeDeciduous, Sparkles, ArrowLeft, Sun, Wind, CloudRain } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { useXp } from "@/hooks/use-xp";

const Tree = () => {
  const navigate = useNavigate();
  const { totalXp } = useXp();
  const [communityXp, setCommunityXp] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommunityStats();
  }, []);

  const fetchCommunityStats = async () => {
    setLoading(true);
    // Sum total XP from all users
    const { data: xpRows } = await supabase.from("user_xp").select("total_xp");
    if (xpRows) {
      const sum = xpRows.reduce((acc, curr) => acc + curr.total_xp, 0);
      setCommunityXp(sum);
    }
    setLoading(false);
  };

  // Determine tree growth level (0-5)
  const growthLevel = Math.min(Math.floor(communityXp / 5000), 5); // Cada 5000 XP comunitário faz a árvore crescer
  
  const getTreeStage = () => {
    if (growthLevel === 0) return { label: "Semente da Fé", description: "O solo está sendo preparado...", icon: <TreeDeciduous className="w-16 h-16 opacity-30" /> };
    if (growthLevel === 1) return { label: "Broto de Esperança", description: "As primeiras preces germinaram.", icon: <TreeDeciduous className="w-20 h-20 text-primary/40" /> };
    if (growthLevel === 2) return { label: "Árvore Jovem", description: "Nossa comunidade cria raízes.", icon: <TreeDeciduous className="w-24 h-24 text-primary/60" /> };
    if (growthLevel === 3) return { label: "Grande Carvalho", description: "O abrigo espiritual está pronto.", icon: <TreeDeciduous className="w-28 h-28 text-primary/80" /> };
    if (growthLevel === 4) return { label: "Árvore Sagrada", description: "Flores de gratidão desabrocham.", icon: <TreeDeciduous className="w-32 h-32 text-primary" /> };
    return { label: "Árvore do Éden", description: "O ápice da nossa conexão divina.", icon: <TreeDeciduous className="w-36 h-36 text-primary drop-shadow-[0_0_15px_rgba(212,175,55,0.4)]" /> };
  };

  const stage = getTreeStage();

  return (
    <PageTransition>
      <div className="min-h-screen bg-background relative overflow-hidden pb-12 flex flex-col items-center">
        {/* Sky / Nature Background */}
        <div className="absolute top-0 left-0 w-full h-[60%] bg-gradient-to-b from-blue-100/30 to-background/50 pointer-events-none" />
        <div className="absolute top-[15%] left-[10%] opacity-20"><Sun className="w-12 h-12 text-yellow-500 animate-pulse" /></div>
        <div className="absolute top-[25%] right-[15%] opacity-15"><Wind className="w-8 h-8 text-primary animate-bounce" /></div>
        <div className="absolute bottom-[20%] left-[20%] opacity-10"><CloudRain className="w-10 h-10 text-primary" /></div>

        <div className="container mx-auto px-6 py-8 relative z-10 max-w-lg w-full">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="mb-6">
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <motion.div 
            className="text-center mb-10"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <h1 className="text-4xl font-extrabold text-foreground mb-1 tracking-tight drop-shadow-sm">Árvore da Fé</h1>
            <p className="text-[11px] uppercase tracking-[0.3em] font-bold text-primary/80">O Fruto das Nossas Preces</p>
          </motion.div>

          {/* Core Tree Visualization */}
          <div className="relative h-[350px] flex flex-col items-center justify-center mb-10">
            {/* Ground / Roots area */}
            <div className="absolute bottom-10 w-full h-[150px] bg-gradient-to-t from-primary/5 to-transparent rounded-full blur-3xl opacity-50" />
            
            <AnimatePresence mode="wait">
              <motion.div 
                key={growthLevel}
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 1.1 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="relative z-10"
              >
                <div className="flex flex-col items-center text-center">
                   <motion.div
                     animate={{ 
                       y: [0, -5, 0],
                       rotate: [-1, 1, -1]
                     }}
                     transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                   >
                     {stage.icon}
                   </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Sparkles around the tree */}
            <AnimatePresence>
               {[1, 2, 3, 4, 5, 6].map(i => (
                 <motion.div
                   key={i}
                   className="absolute"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 0.3 }}
                   style={{
                     top: `${Math.random() * 80 + 10}%`,
                     left: `${Math.random() * 80 + 10}%`,
                   }}
                 >
                   <Sparkles className="w-3 h-3 text-primary animate-pulse" style={{ animationDelay: `${i * 0.5}s` }} />
                 </motion.div>
               ))}
            </AnimatePresence>
          </div>

          {/* Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
             <Card className="p-8 soft-shadow border-primary/15 bg-white/70 backdrop-blur-lg rounded-[2.5rem] text-center border-2">
                <h3 className="text-xl font-bold mb-2 text-foreground">{stage.label}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6 italic opacity-80">"{stage.description}"</p>
                
                <div className="divider-gold max-w-[5rem] mx-auto mb-6" />
                
                <div className="space-y-3">
                   <div className="flex justify-between items-center text-[11px] uppercase tracking-wider font-bold text-muted-foreground/70 px-2">
                      <span>Energia Coletiva</span>
                      <span>{communityXp.toLocaleString()} XP</span>
                   </div>
                   <div className="w-full h-3 bg-secondary/30 rounded-full overflow-hidden p-0.5 border border-primary/5">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-primary/50 to-primary rounded-full shadow-inner"
                        initial={{ width: 0 }}
                        animate={{ width: `${(communityXp % 5000) / 50}%` }}
                        transition={{ duration: 1.5, delay: 0.8 }}
                      />
                   </div>
                   <p className="text-[10px] text-primary/60 font-bold uppercase tracking-widest leading-relaxed">
                      Cada oração enviada ou feita por alguém faz esta árvore crescer.<br/>Seja o jardineiro da fé hoje. 🙏
                   </p>
                </div>
                
                <Button 
                   onClick={() => navigate("/pray")}
                   className="mt-8 gradient-divine w-full rounded-full py-6 text-sm hover:scale-[1.02] transition-transform shadow-lg"
                >
                   <Sparkles className="w-4 h-4 mr-2" />
                   Fortalecer a Árvore
                </Button>
             </Card>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Tree;
