import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Heart, Shield, Sword } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { motion } from "framer-motion";
import { ROSARY_TYPES } from "@/data/rosary-data";
import { cn } from "@/lib/utils";

const RosarySelection = () => {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div className="min-h-screen pb-28">

        <div className="px-5 md:px-12 max-w-2xl mx-auto">
          <header className="flex items-center gap-3 pt-safe pt-4 pb-6">
            <button onClick={() => navigate("/")} className="p-1 -ml-1 text-ink-soft hover:text-ink transition-colors">
              <ArrowLeft size={20} strokeWidth={1.5} />
            </button>
            <div>
              <h1 className="font-serif text-[22px] text-ink">Sagrado Terço</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-ink-soft">Escolha sua devoção</p>
            </div>
          </header>

          <div className="space-y-3">
            {ROSARY_TYPES.map((type, idx) => {
              let DisplayIcon = BookOpen;
              let iconClass = "text-marian";

              if (type.id === 'misericordia') {
                DisplayIcon = Heart;
                iconClass = "text-red-500";
              } else if (type.id === 'libertacao') {
                DisplayIcon = Shield;
                iconClass = "text-blue-500";
              } else if (type.id === 'miguel') {
                DisplayIcon = Sword;
                iconClass = "text-amber-600";
              }

              return (
                <motion.div
                  key={type.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                >
                  <button
                    onClick={() => navigate(`/rosary/${type.id}`)}
                    className="w-full rounded-xl border border-hairline bg-vellum hover:border-marian/30 transition-colors p-4 flex items-center gap-4 text-left"
                  >
                    <div className={cn("w-10 h-10 rounded-full border border-hairline flex items-center justify-center shrink-0", iconClass)}>
                      <DisplayIcon size={18} strokeWidth={1.5} className={cn(type.id === 'misericordia' && "fill-current")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-ink leading-tight">{type.name}</p>
                      <p className="text-[11px] text-ink-soft mt-0.5 leading-snug">{type.description}</p>
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>

          <p className="text-center text-[11px] text-ink-soft italic mt-10 opacity-50">
            "Onde dois ou três estiverem unidos…"
          </p>
        </div>

      </div>
    </PageTransition>
  );
};

export default RosarySelection;
