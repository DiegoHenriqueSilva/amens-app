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

const DivinePromise = () => {
  const navigate = useNavigate();
  const [promise, setPromise] = useState<any>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasShined, setHasShined] = useState(false);
  const { completeTask } = useDailyTasks();

  // Carregar do cache inicial com segurança
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
        completeTask("read_promise");
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
      } catch (err) {
        // Ignorar cancelamento
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast.success("Texto copiado! 📋");
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
        {/* Decorações de fundo */}
        <div className="absolute top-[-10rem] right-[-10rem] w-[30rem] h-[30rem] rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-10rem] left-[-10rem] w-[30rem] h-[30rem] rounded-full bg-accent/5 blur-3xl pointer-events-none" />

        <div className="container mx-auto px-6 py-12 relative z-10 max-w-lg flex-1 flex flex-col">
          <header className="flex items-center mb-10">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-full hover:bg-primary/10">
              <ArrowLeft className="w-5 h-5 text-primary" />
            </Button>
            <div className="ml-4">
              <h1 className="text-2xl font-black text-foreground tracking-tight">Divina Promessa</h1>
              <p className="text-[10px] uppercase font-bold tracking-widest text-primary/60">Uma palavra de luz para você</p>
            </div>
          </header>

          <main className="flex-1 flex flex-col justify-center">
            <AnimatePresence mode="wait">
              {!promise ? (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  className="flex flex-col items-center"
                >
                  <div 
                    className={cn(
                      "w-48 h-48 bg-white/50 backdrop-blur-md rounded-[3rem] shadow-xl border border-primary/10 flex items-center justify-center cursor-pointer transition-all duration-500",
                      isDrawing ? "animate-pulse scale-95" : "hover:scale-105 hover:bg-white"
                    )}
                    onClick={drawPromise}
                  >
                    {isDrawing ? (
                      <Loader2 className="w-16 h-16 text-primary animate-spin" />
                    ) : (
                      <BookOpen className="w-20 h-20 text-primary/40" />
                    )}
                  </div>
                  
                  <div className="mt-12 w-full max-w-xs space-y-4">
                    <p className="text-center text-sm text-muted-foreground mb-6">
                      Abra o livro e receba a promessa que Deus tem reservada para o seu coração neste dia.
                    </p>
                    <Button 
                      onClick={drawPromise} 
                      disabled={isDrawing} 
                      size="lg" 
                      className="w-full h-16 rounded-2xl shadow-lg gradient-divine text-lg font-bold"
                    >
                      {isDrawing ? "Buscando luz..." : "Retirar Promessa"}
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="content"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8"
                >
                  <div className="relative">
                    <AnimatePresence>
                      {!hasShined && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1.5 }}
                          exit={{ opacity: 0, scale: 2 }}
                          onAnimationComplete={() => setHasShined(true)}
                          className="absolute inset-0 bg-primary/20 rounded-full blur-3xl pointer-events-none mx-auto"
                          style={{ width: '80%', height: '80%', top: '10%' }}
                        />
                      )}
                    </AnimatePresence>
                    
                    <Card className="p-10 text-center min-h-[350px] flex flex-col justify-center border-primary/10 rounded-[3rem] bg-white/80 backdrop-blur-sm shadow-2xl relative z-10">
                      <div className="mb-6 opacity-20">
                         <Sparkles className="w-8 h-8 mx-auto text-primary" />
                      </div>
                      
                      <motion.blockquote 
                        className="text-xl md:text-2xl font-black text-foreground leading-tight italic mb-8"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        "{promise.verse}"
                      </motion.blockquote>
                      
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                      >
                        <p className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-6">
                          {promise.ref}
                        </p>
                      </motion.div>
                      
                      {promise.context && (
                        <motion.div 
                          initial={{ opacity: 0 }} 
                          animate={{ opacity: 1 }} 
                          transition={{ delay: 0.6 }} 
                          className="text-xs text-muted-foreground leading-relaxed italic bg-primary/5 p-5 rounded-2xl border border-primary/5"
                        >
                          {promise.context}
                        </motion.div>
                      )}
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <Button onClick={handleShare} className="h-16 rounded-2xl flex items-center justify-center gap-3 gradient-divine shadow-lg font-bold text-lg">
                      <Share2 className="w-5 h-5" />
                      Compartilhar Promessa
                    </Button>
                    
                    <Button 
                      onClick={() => { localStorage.removeItem("last_divine_promise"); setPromise(null); }} 
                      variant="ghost" 
                      className="w-full text-muted-foreground h-12 font-bold uppercase tracking-widest text-[10px] hover:bg-primary/5"
                    >
                      Retirar Outra Palavra
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>
    </PageTransition>
  );
};

export default DivinePromise;
