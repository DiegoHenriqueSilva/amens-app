import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Sparkles, BookOpen, Share2 } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import { divine_promises } from "@/data/divine_promises";

const DivinePromise = () => {
  const navigate = useNavigate();
  const [promise, setPromise] = useState<{verse:string, ref:string, context?:string} | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const cached = localStorage.getItem("last_divine_promise");
    if (cached) {
      try {
        setPromise(JSON.parse(cached));
      } catch (e) {
        console.error("Erro ao carregar cache de promessa", e);
      }
    }
  }, []);

  const drawPromise = async () => {
    if (isDrawing) return;
    setIsDrawing(true);
    setPromise(null);

    // Simula um tempo de "sorteio" para o feedback visual
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      // Sorteia da base local para garantir variedade e evitar repetições imediatas
      const lastPromiseVerese = promise?.verse;
      let availablePromises = divine_promises;
      
      if (lastPromiseVerese) {
        availablePromises = divine_promises.filter(p => p.verse !== lastPromiseVerese);
      }
      
      const randomIndex = Math.floor(Math.random() * availablePromises.length);
      const selectedPromise = availablePromises[randomIndex];
      
      setPromise(selectedPromise);
      localStorage.setItem("last_divine_promise", JSON.stringify(selectedPromise));
      toast.success("Uma promessa foi retirada para você! ✨");
      
    } catch (error) {
      console.error("Erro ao buscar promessa:", error);
      const fallback = divine_promises[0];
      setPromise(fallback);
    } finally {
      setIsDrawing(false);
    }
  };

  const handleShare = async () => {
    if (!promise) return;
    const APP_URL = "https://amens-app.vercel.app";
    const shareText = `✦ Minha Divina Promessa de Hoje ✦\n\n"${promise.verse}"\n— ${promise.ref}\n\n🙏 ${promise.context || ""}\n\nReceba sua promessa também em: ${APP_URL}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Minha Divina Promessa',
          text: shareText,
        });
        toast.success("Promessa compartilhada!");
      } catch (err) {
        console.warn("Share cancelado");
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast.success("Texto da promessa copiado! 📋");
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background relative overflow-hidden">
        <div className="absolute top-[-8rem] right-[-6rem] w-[28rem] h-[28rem] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-[-6rem] left-[-6rem] w-[24rem] h-[24rem] rounded-full bg-accent/5 blur-3xl" />

        <div className="container mx-auto px-4 py-8 relative z-10 max-w-lg">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="mb-6">
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <motion.div className="text-center mb-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-xs uppercase tracking-[0.25em] text-primary mb-2 text-glow font-bold">✦ Caixinha de Promessas ✦</p>
            <h1 className="text-4xl font-bold text-foreground mb-3 text-glow text-soft-outline">Divina Promessa</h1>
            <div className="divider-gold max-w-[6rem] mx-auto mb-4" />
            <p className="text-sm text-muted-foreground leading-relaxed text-glow font-medium">
              Deus tem uma palavra especial para o seu coração hoje. Sorteie uma promessa e receba força.
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {!promise ? (
              <motion.div key="closed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center mt-12">
                <motion.div animate={isDrawing ? { scale: [1, 1.1, 1], rotate: [0, -5, 5, -5, 0] } : { y: [0, -10, 0] }} transition={isDrawing ? { duration: 0.5, repeat: Infinity } : { duration: 4, repeat: Infinity, ease: "easeInOut" }}>
                  <div className="w-40 h-40 gradient-sacred rounded-2xl flex items-center justify-center soft-shadow mb-8 relative border-2 border-primary/20 cursor-pointer shadow-lg hover:shadow-xl transition-all" onClick={drawPromise}>
                    <Sparkles className="w-16 h-16 text-foreground/80 absolute top-4 left-4 opacity-30" />
                    <BookOpen className="w-20 h-20 text-foreground" />
                    <Sparkles className="w-12 h-12 text-foreground/80 absolute bottom-4 right-4 opacity-30" />
                  </div>
                </motion.div>
                
                <Button onClick={drawPromise} disabled={isDrawing} size="lg" className="gradient-divine text-primary-foreground hover:opacity-90 px-8 py-6 text-lg rounded-full mt-4">
                  {isDrawing ? "Buscando Promessa..." : "Retirar uma Promessa"}
                </Button>
              </motion.div>
            ) : (
              <motion.div 
                key="open" 
                initial={{ opacity: 0, scale: 0.8, rotateY: 90 }} 
                animate={{ opacity: 1, scale: 1, rotateY: 0 }} 
                transition={{ duration: 0.8, type: "spring", damping: 12 }}
                className="perspective-1000"
              >
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-[#d4a017] via-[#f0c040] to-[#d4a017] rounded-[2.5rem] blur opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 animate-pulse" />
                  <Card id="promise-card" className="p-10 soft-shadow border-primary/20 text-center bg-white/40 backdrop-blur-xl relative overflow-hidden rounded-[2.5rem] border-2 shadow-2xl min-h-[400px] flex flex-col justify-center">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
                    
                    <div className="w-20 h-20 mx-auto gradient-divine rounded-full flex items-center justify-center mb-8 shadow-xl border-4 border-white/50 ring-4 ring-primary/5">
                      <Sparkles className="w-10 h-10 text-primary-foreground" />
                    </div>
                    
                    <motion.blockquote 
                      className="text-2xl md:text-3xl leading-relaxed text-[#3d2800] italic font-serif mb-8 text-glow-sm"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      "{promise.verse}"
                    </motion.blockquote>
                    
                    <motion.p 
                      className="text-lg font-bold text-[#b8860b] mb-10 tracking-[0.2em] uppercase"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.7 }}
                    >
                      — {promise.ref} —
                    </motion.p>
                    
                    {promise.context && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        transition={{ delay: 1 }} 
                        className="mb-8 p-6 rounded-2xl bg-white/60 border border-primary/10 text-center relative overflow-hidden shadow-inner"
                      >
                        <p className="text-sm text-stone-700/80 leading-relaxed font-medium">
                          {promise.context}
                        </p>
                      </motion.div>
                    )}
                    
                    <div className="divider-gold mx-auto mb-6 w-32" />
                    <p className="text-[11px] uppercase tracking-[0.4em] text-primary/40 font-black">Améns</p>
                  </Card>
                </div>

                <div className="flex flex-col gap-3 mt-8">
                  <Button onClick={handleShare} className="gradient-divine text-primary-foreground rounded-full px-6 py-6 shadow-md hover:scale-[1.02] transition-transform">
                    <Share2 className="w-5 h-5 mr-3" />
                    Compartilhar no Instagram/WhatsApp
                  </Button>
                  
                  <Button onClick={() => { localStorage.removeItem("last_divine_promise"); setPromise(null); }} variant="outline" className="border-primary/30 hover:bg-primary/5 rounded-full px-6 text-primary">
                    Retirar Novamente
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageTransition>
  );
};

export default DivinePromise;
