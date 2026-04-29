import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Sparkles, BookOpen, Heart, Shield, Sword } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { motion } from "framer-motion";
import { ROSARY_TYPES, getMysteriesByDay } from "@/data/rosary-data";
import { cn } from "@/lib/utils";

const RosarySelection = () => {
  const navigate = useNavigate();
  const todayMysteries = getMysteriesByDay();

  return (
    <PageTransition>
      <div className="min-h-screen bg-background relative overflow-hidden pb-28">
        <div className="absolute top-[-10rem] right-[-10rem] w-[30rem] h-[30rem] rounded-full bg-primary/5 blur-3xl opacity-50" />
        <div className="absolute bottom-[-10rem] left-[-10rem] w-[30rem] h-[30rem] rounded-full bg-accent/5 blur-3xl opacity-50" />

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
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-1 text-glow">Sagrado Terço</h1>
            <p className="text-[11px] uppercase tracking-[0.25em] font-bold text-muted-foreground opacity-60">Escolha sua devoção</p>
          </motion.div>

          <div className="space-y-4">
            {ROSARY_TYPES.map((type, idx) => {
              const Icon = {
                'misterios': BookOpen,
                'misericordia': Heart,
                'libertacao': Sparkles,
                'miguel': ArrowLeft // Placeholders, will update icons in imports
              }[type.id] || Sparkles;

              // Correcting icons based on devotion
              let DisplayIcon = BookOpen;
              let iconColor = "text-primary";
              let bgColor = "bg-primary/10";
              
              if (type.id === 'misericordia') {
                  DisplayIcon = Heart;
                  iconColor = "text-red-500";
                  bgColor = "bg-red-50";
              } else if (type.id === 'libertacao') {
                  DisplayIcon = Shield;
                  iconColor = "text-blue-500";
                  bgColor = "bg-blue-50";
              } else if (type.id === 'miguel') {
                  DisplayIcon = Sword;
                  iconColor = "text-amber-600";
                  bgColor = "bg-amber-50";
              }

              return (
                <motion.div
                  key={type.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card 
                    onClick={() => navigate(`/rosary/${type.id}`)}
                    className="p-5 border-primary/5 bg-white/60 hover:bg-white/90 backdrop-blur-sm transition-all rounded-[1.8rem] cursor-pointer flex items-center gap-5 group hover:scale-[1.02] soft-shadow"
                  >
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", bgColor, iconColor)}>
                       <DisplayIcon className={cn("w-6 h-6", type.id === 'misericordia' && "fill-current")} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-stone-800">{type.name}</h3>
                      <p className="text-[11px] text-muted-foreground leading-tight">{type.description}</p>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <div className="text-center mt-12 opacity-30">
            <p className="text-[10px] uppercase tracking-[0.3em] font-bold italic">"Onde dois ou três estiverem unidos..."</p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default RosarySelection;
