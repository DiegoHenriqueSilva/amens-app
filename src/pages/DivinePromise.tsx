import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Sparkles, BookOpen, Share2, Loader2 } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { divine_promises } from "@/data/divine_promises";
import { cn } from "@/lib/utils";
import { useDailyTasks } from "@/hooks/use-daily-tasks";
import { InviteGatePopup } from "@/components/InviteGatePopup";
import { supabase } from "@/integrations/supabase/client";

const DivinePromise = () => {
  const navigate = useNavigate();
  const [promise, setPromise] = useState<any>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasShined, setHasShined] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { completeTask } = useDailyTasks();

  // Mark read_promise task as done when user enters this page
  useEffect(() => {
    completeTask("read_promise");
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session?.user);
    });
  }, []);
  useEffect(() => {
    try {
      const cached = localStorage.getItem("last_divine_promise");
      if (cached && cached !== "null" && cached !== "undefined") {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === "object" && parsed.verse) {
          setPromise(parsed);
          setHasShined(true);
        }
      }
    } catch (e) {
      console.warn("Erro ao carregar cache de promessa:", e);
      localStorage.removeItem("last_divine_promise");
    }
  }, []);

  const drawPromise = async () => {
    if (isDrawing) return;
    
    setIsDrawing(true);
    setPromise(null);
    setHasShined(false);

    // Feedback visual do sorteio
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      if (!divine_promises || divine_promises.length === 0) {
        throw new Error("Base de dados de promessas não encontrada.");
      }

      // Evita repetir a mesma promessa imediatamente
      let availablePromises = divine_promises;
      const currentVerse = promise?.verse;
      
      if (currentVerse && divine_promises.length > 1) {
        availablePromises = divine_promises.filter(p => p.verse !== currentVerse);
      }
      
      const randomIndex = Math.floor(Math.random() * availablePromises.length);
      const selectedPromise = availablePromises[randomIndex];
      
      if (selectedPromise) {
        setPromise(selectedPromise);
        localStorage.setItem("last_divine_promise", JSON.stringify(selectedPromise));
        toast.success("Uma promessa foi retirada para você! ✨");
        // (task already counted on mount)
      } else {
        setPromise(divine_promises[0]);
      }
    } catch (error) {
      console.error("Erro ao buscar promessa:", error);
      setPromise(divine_promises[0] || null);
    } finally {
      setIsDrawing(false);
    }
  };

  const handleShare = async () => {
    if (!promise || !promise.verse) return;
    
    const APP_URL = "https://amens-app.vercel.app";
    const shareText = `✦ Minha Divina Promessa de Hoje ✦\n\n"${promise.verse}"\n— ${promise.ref}\n\n🙏 ${promise.context || ""}\n\nReceba sua promessa também em: ${APP_URL}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Minha Divina Promessa',
          text: shareText,
        });
        toast.success("Pronto!");
        completeTask("share_promise");
      } catch (err) {
        // Ignorar cancelamento
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast.success("Texto copiado! 📋");
      completeTask("share_promise");
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen pb-28 flex flex-col">

        <div className="px-5 md:px-12 max-w-2xl mx-auto w-full flex-1 flex flex-col">
          <header className="flex items-center gap-3 pt-safe pt-4 pb-8">
            <button onClick={() => navigate("/")} className="p-1 -ml-1 text-ink-soft hover:text-ink transition-colors">
              <ArrowLeft size={20} strokeWidth={1.5} />
            </button>
            <div>
              <h1 className="font-serif text-[22px] text-ink">Divina Promessa</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-ink-soft">Uma palavra para hoje</p>
            </div>
          </header>

          <div className="flex-1 flex flex-col justify-center">
            <AnimatePresence mode="wait">
              {!promise ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="flex flex-col items-center"
                >
                  <div
                    className={cn(
                      "w-44 h-44 bg-vellum border border-hairline rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-300",
                      isDrawing ? "opacity-60 scale-95" : "hover:scale-105 hover:border-marian/30"
                    )}
                    onClick={drawPromise}
                  >
                    {isDrawing ? (
                      <div className="w-8 h-8 rounded-full border-2 border-marian border-t-transparent animate-spin" />
                    ) : (
                      <BookOpen size={48} strokeWidth={1} className="text-ink-soft/40" />
                    )}
                  </div>

                  <div className="mt-10 w-full max-w-xs space-y-4 text-center">
                    <p className="text-[13px] text-ink-soft leading-relaxed">
                      Abra o livro e receba a promessa que Deus reservou para o seu coração neste dia.
                    </p>
                    <button
                      onClick={drawPromise}
                      disabled={isDrawing}
                      className="w-full h-12 rounded-full bg-ink text-paper text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {isDrawing ? "Buscando…" : "Receber promessa"}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="content"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-5"
                >
                  <div className="rounded-xl border border-hairline bg-vellum p-8 text-center">
                    <p className="text-[9px] uppercase tracking-[0.28em] text-gold mb-6">✦ Palavra de hoje</p>

                    <motion.blockquote
                      className="font-serif text-[24px] md:text-[28px] leading-[1.35] text-ink italic mb-6"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      "{promise.verse}"
                    </motion.blockquote>

                    <motion.p
                      className="text-[10px] uppercase tracking-[0.28em] text-ink-soft mb-5"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.35 }}
                    >
                      {promise.ref}
                    </motion.p>

                    {promise.context && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-[12px] text-ink-soft leading-relaxed italic pt-4 border-t border-hairline"
                      >
                        {promise.context}
                      </motion.p>
                    )}
                  </div>

                  <button
                    onClick={handleShare}
                    className="w-full h-12 rounded-full bg-ink text-paper text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <Share2 size={16} strokeWidth={1.5} />
                    Compartilhar promessa
                  </button>

                  <button
                    onClick={() => { localStorage.removeItem("last_divine_promise"); setPromise(null); }}
                    className="w-full text-[11px] text-ink-soft hover:text-ink transition-colors py-2"
                  >
                    Receber outra palavra
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <InviteGatePopup isAuthenticated={isAuthenticated} />
      </div>
    </PageTransition>
  );
};

export default DivinePromise;
