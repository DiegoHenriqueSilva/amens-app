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
      <div className="min-h-screen bg-background/70 backdrop-blur-sm relative overflow-hidden pb-28">
        {/* Ambient Blurs */}
        <div className="absolute top-[-6rem] left-[-4rem] w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-6rem] right-[-4rem] w-80 h-80 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="absolute top-4 left-4 z-20 rounded-full hover:bg-primary/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </Button>

        <div className="container mx-auto px-4 py-8 relative z-10 max-w-lg">
          <motion.div 
            className="text-center mb-8 pt-2"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-xs uppercase tracking-[0.25em] text-primary mb-2 text-glow font-bold">✦</p>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-foreground font-serif text-soft-outline">Sagrado Terço</h1>
            <p className="text-xs text-muted-foreground font-medium">Escolha sua devoção e inicie sua prece com fé</p>
            <div className="divider-gold max-w-[5rem] mx-auto my-3" />
          </motion.div>

          <div className="space-y-5">
            {ROSARY_TYPES.map((type, idx) => {
              // Correcting icons based on devotion
              let DisplayIcon = BookOpen;
              let iconColor = "text-primary";
              let bgColor = "bg-primary/10";
              
              if (type.id === 'misericordia') {
                  DisplayIcon = Heart;
                  iconColor = "text-red-500";
                  bgColor = "bg-red-50";
              } else if (type.id === 'providencia') {
                  DisplayIcon = Shield;
                  iconColor = "text-blue-500";
                  bgColor = "bg-blue-50";
              } else if (type.id === 'saomiguel') {
                  DisplayIcon = Sword;
                  iconColor = "text-amber-600";
                  bgColor = "bg-amber-50";
              }

              return (
                <motion.div
                  key={type.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1, duration: 0.4 }}
                  onClick={() => navigate(`/rosary/${type.id}`)}
                >
                  <Card className="p-6 transition-all duration-300 relative overflow-hidden group cursor-pointer border-primary/10 bg-white/70 backdrop-blur-md rounded-3xl interactive-card">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110 shadow-sm", bgColor, iconColor)}>
                       <DisplayIcon className={cn("w-7 h-7", type.id === 'misericordia' && "fill-current")} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-foreground mb-1">{type.name}</h3>
                      <p className="text-xs text-muted-foreground leading-snug font-medium">{type.description}</p>
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

