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

        <div className="container mx-auto px-6 py-8 relative z-10 max-w-lg">
          <div className="max-w-2xl mx-auto mb-6 flex items-center">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0 hover:bg-primary/10 transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </Button>
          </div>

          <motion.div 
            className="max-w-2xl mx-auto text-center mb-10"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-sm uppercase tracking-[0.25em] text-primary mb-2">✦</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-3 text-foreground">Sagrado Terço</h1>
            <div className="divider-gold max-w-[10rem] mx-auto mb-3" />
            <p className="text-muted-foreground">Escolha sua devoção e inicie sua prece</p>
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
                    className="p-6 border-primary/5 bg-white/80 hover:bg-white backdrop-blur-sm transition-all duration-300 rounded-[2rem] cursor-pointer flex items-center gap-5 group hover:-translate-y-1 hover:shadow-xl soft-shadow"
                  >
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

