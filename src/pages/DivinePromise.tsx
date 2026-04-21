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
  const [hasShined, setHasShined] = useState(false);

  useEffect(() => {
    const cached = localStorage.getItem("last_divine_promise");
    if (cached) {
      try {
        setPromise(JSON.parse(cached));
        setHasShined(true); // Se já carregou do cache, não precisa brilhar de novo? Ou talvez sim.
      } catch (e) {
        console.error("Erro ao carregar cache de promessa", e);
      }
    }
  }, []);

  const drawPromise = async () => {
    if (isDrawing) return;
    setIsDrawing(true);
    setPromise(null);
    setHasShined(false); // Reseta o brilho para o novo sorteio

    // Simula um tempo de "sorteio" para o feedback visual
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
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

  const WhatsAppIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.63 1.438h.005c6.505 0 11.84-5.335 11.842-11.892a11.757 11.757 0 00-3.473-8.413"/>
    </svg>
  );

  const InstagramIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
    </svg>
  );

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
        <div className="absolute top-[-8rem] right-[-6rem] w-[28rem] h-[28rem] rounded-full bg-primary/2" />
        <div className="absolute bottom-[-6rem] left-[-6rem] w-[24rem] h-[24rem] rounded-full bg-accent/2" />

        <div className="container mx-auto px-4 py-8 relative z-10 max-w-lg">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="mb-6">
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <motion.div className="text-center mb-10" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-bold mb-3">Divina Promessa</h1>
            <p className="text-muted-foreground text-sm">
              Toque para retirar uma palavra de Deus para você
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {!promise ? (
              <motion.div key="closed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center mt-12">
                <div 
                  className="w-40 h-40 bg-muted rounded-2xl flex items-center justify-center cursor-pointer mb-8 hover:bg-muted/80 transition-colors" 
                  onClick={drawPromise}
                >
                  <BookOpen className="w-16 h-16 text-muted-foreground" />
                </div>
                
                <Button onClick={drawPromise} disabled={isDrawing} size="lg" className="w-full max-w-xs h-14">
                  {isDrawing ? "Buscando..." : "Retirar uma Promessa"}
                </Button>
              </motion.div>
            ) : (
              <motion.div key="open" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="relative">
                  <AnimatePresence>
                    {!hasShined && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1.5 }}
                        exit={{ opacity: 0, scale: 2 }}
                        onAnimationComplete={() => setHasShined(true)}
                        className="absolute inset-0 bg-primary/10 rounded-3xl blur-3xl pointer-events-none"
                      />
                    )}
                  </AnimatePresence>
                  
                  <Card className="p-8 text-center min-h-[300px] flex flex-col justify-center border-primary/10">
                    <motion.blockquote 
                      className="text-xl md:text-2xl font-bold mb-6 italic"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      "{promise.verse}"
                    </motion.blockquote>
                    
                    <motion.p 
                      className="text-sm font-bold text-primary mb-4"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      {promise.ref}
                    </motion.p>
                    
                    {promise.context && (
                      <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        transition={{ delay: 0.7 }} 
                        className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-xl italic"
                      >
                        {promise.context}
                      </motion.div>
                    )}
                  </Card>
                </div>

                <div className="space-y-4">
                  <Button onClick={handleShare} className="w-full h-14 flex items-center justify-center gap-3">
                    <Share2 className="w-5 h-5" />
                    Compartilhar
                  </Button>
                  
                  <div className="flex gap-2">
                    <Button onClick={handleShare} variant="outline" className="flex-1 h-12 flex items-center justify-center gap-2">
                      <WhatsAppIcon />
                    </Button>
                    <Button onClick={handleShare} variant="outline" className="flex-1 h-12 flex items-center justify-center gap-2">
                      <InstagramIcon />
                    </Button>
                  </div>
                  
                  <Button 
                    onClick={() => { localStorage.removeItem("last_divine_promise"); setPromise(null); }} 
                    variant="ghost" 
                    className="w-full text-muted-foreground h-12"
                  >
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
