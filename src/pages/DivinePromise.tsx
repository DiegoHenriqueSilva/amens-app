import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Sparkles, BookOpen, Share2 } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

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

    const fallbackPromise = {
      verse: "Porque eu bem sei os pensamentos que tenho a vosso respeito, diz o Senhor; pensamentos de paz, e não de mal, para vos dar o fim que esperais.",
      ref: "Jeremias 29:11",
      context: "Deus tem um plano perfeito para sua vida. Confie Nele."
    };

    try {
      const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
      if (!GEMINI_API_KEY) {
        throw new Error("API Key ausente");
      }

      const promptPromise = `Gere uma "Divina Promessa" encorajadora baseada na Bíblia Sagrada para alguém que está buscando conforto.
Sua tarefa é sortear um versículo bíblico muito encorajador e adicionar uma curtíssima reflexão amorosa.
Devolva APENAS um objeto JSON válido. Exemplo:
{
  "verse": "O texto do versículo bíblico",
  "ref": "A referência bíblica",
  "context": "Uma frase de encorajamento ou reflexão amorosa (1 a 2 frases)"
}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: promptPromise }] }] })
      });

      if (!response.ok) throw new Error('Falha na resposta da API');

      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      
      const cleanJson = textResponse.replace(/^\s*(`+json|`+)\s*/, '').replace(/\s*`+\s*$/, '').trim();
      const parsed = JSON.parse(cleanJson);
      
      if (parsed.verse && parsed.ref) {
        setPromise(parsed);
        localStorage.setItem("last_divine_promise", JSON.stringify(parsed));
      } else {
        throw new Error("Formato inválido retornado pela IA");
      }
    } catch (error) {
      console.error("Erro ao buscar promessa:", error);
      toast.error("Retiramos uma promessa especial para você offline.");
      setPromise(fallbackPromise);
    } finally {
      setIsDrawing(false);
    }
  };

  const handleShare = async () => {
    if (!promise) return;
    const shareText = `✦ Minha Divina Promessa de Hoje ✦\n\n"${promise.verse}"\n— ${promise.ref}\n\n🙏 ${promise.context || ""}\n\nReceba sua promessa também em: ${window.location.origin}`;
    
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
              <motion.div key="open" initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 100 }}>
                <div className="relative">
                  <motion.div id="promise-card" className="p-10 soft-shadow border-primary/20 text-center bg-card/60 backdrop-blur-md relative overflow-hidden rounded-3xl border-2">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl flex -translate-y-1/2 translate-x-1/2" />
                    
                    <div className="w-16 h-16 mx-auto gradient-divine rounded-full flex items-center justify-center mb-6 shadow-inner">
                      <Sparkles className="w-8 h-8 text-primary-foreground" />
                    </div>
                    
                    <motion.blockquote className="text-xl md:text-2xl leading-relaxed text-foreground italic font-serif mb-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                      "{promise.verse}"
                    </motion.blockquote>
                    
                    <motion.p className="text-base font-semibold text-primary mb-8 tracking-wide" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                      — {promise.ref}
                    </motion.p>
                    
                    {promise.context && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mb-8 p-5 rounded-xl bg-accent/10 border border-accent/20 text-center relative overflow-hidden">
                        <p className="text-sm text-foreground/90 leading-relaxed italic">
                          {promise.context}
                        </p>
                      </motion.div>
                    )}
                    
                    <div className="divider-gold mx-auto mb-4" />
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground opacity-50">✦ App Améns ✦</p>
                  </motion.div>
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
