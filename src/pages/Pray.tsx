import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Heart, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useXp } from "@/hooks/use-xp";
import { XP_REWARDS } from "@/lib/xp";
import PageTransition from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.25 } },
};

const Pray = () => {
  const [prayerRequest, setPrayerRequest] = useState<any>(null);
  const [suggestedPrayer, setSuggestedPrayer] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const navigate = useNavigate();
  const { addXp } = useXp();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth");
    });
  }, [navigate]);

  const fetchRandomPrayerRequest = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('prayer_requests').select('*').lt('prayer_count', 5).limit(10);
      if (error) throw error;
      if (data && data.length > 0) {
        const randomRequest = data[Math.floor(Math.random() * data.length)];
        setPrayerRequest(randomRequest);
        await supabase.from('prayer_requests').update({ prayer_count: randomRequest.prayer_count + 1 }).eq('id', randomRequest.id);
        
        // Record intercession
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.from('prayer_intercessions').upsert({
            prayer_request_id: randomRequest.id,
            user_id: session.user.id,
          }, { onConflict: 'prayer_request_id,user_id' });
        }
        
        setSuggestedPrayer("");
        await addXp("pray");
        toast.success(`+${XP_REWARDS.pray} XP por orar!`);
        toast.success(`+${XP_REWARDS.pray} XP por orar!`);
      } else {
        toast.info("Não há causas disponíveis no momento");
      }
    } catch (error) {
      console.error('Error fetching prayer request:', error);
      toast.error("Erro ao buscar pedido de oração");
    } finally {
      setIsLoading(false);
    }
  };

  const generatePrayer = async () => {
    if (!prayerRequest) return;
    setIsGenerating(true);
    try {
      const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
      if (!GEMINI_API_KEY) {
        toast.error("Chave da API do Gemini ausente! Verifique o .env.");
        setIsGenerating(false);
        return;
      }
      
      const systemPrompt = `Você é um gerador de orações empáticas e acessíveis para a rede social de solidariedade "Améns".
REGRAS OBRIGATÓRIAS:
1. MÁXIMO 250 palavras, linguagem SIMPLES e ACESSÍVEL.
2. PRIMEIRA PESSOA.
3. NUNCA assuma parentesco com a pessoa do pedido.
4. É DE SUMA IMPORTÂNCIA que a oração faça o usuário sentir que a oração dele é um instrumento para ajudar o próximo. Exemplo de como construir: "Pai, fazei de mim um instrumento de sua bondade, faça das minhas preces a força que esta família está precisando..." 
5. TOM ACOLHEDOR e CARINHOSO. Crie a oração focada NESTA CAUSA agora: "${prayerRequest.content}"`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }]
        })
      });

      if (!response.ok) throw new Error('Falha na resposta do Gemini');
      
      const data = await response.json();
      const prayerText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      setSuggestedPrayer(prayerText || "Erro ao conectar com a IA da Graça.");
    } catch (error) {
      console.error('Error generating prayer:', error);
      toast.error("Erro ao gerar sugestão de oração");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background relative overflow-hidden">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="absolute top-4 left-4 z-20">
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="absolute top-[-6rem] left-[-4rem] w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-6rem] right-[-4rem] w-80 h-80 bg-accent/5 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 py-12 relative z-10">
          <motion.div className="max-w-2xl mx-auto text-center mb-10" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-sm uppercase tracking-[0.25em] text-primary mb-2">✦</p>
            <h1 className="text-5xl md:text-6xl font-bold mb-3 text-foreground">Orar por uma Causa</h1>
            <div className="divider-gold max-w-[10rem] mx-auto mb-3" />
            <p className="text-muted-foreground">Seja um instrumento da graça divina</p>
          </motion.div>

          <div className="max-w-2xl mx-auto space-y-6">
            <AnimatePresence mode="wait">
              {!prayerRequest ? (
                <motion.div key="empty" variants={fadeUp} initial="initial" animate="animate" exit="exit">
                  <Card className="p-12 text-center soft-shadow border-primary/10">
                    <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
                      <Sparkles className="w-14 h-14 mx-auto mb-5 text-primary" />
                    </motion.div>
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">Clique para receber uma causa</h2>
                    <Button onClick={fetchRandomPrayerRequest} disabled={isLoading} size="lg" className="gradient-divine text-primary-foreground hover:opacity-90">
                      {isLoading ? "Buscando..." : "Sortear Causa e Orar"}
                    </Button>
                  </Card>
                </motion.div>
              ) : (
                <motion.div key="prayer" variants={fadeUp} initial="initial" animate="animate" exit="exit" className="space-y-6">
                  <Card className="p-8 soft-shadow border-primary/10">
                    <div className="flex items-start gap-4 mb-6">
                      <Heart className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                      <div>
                        {prayerRequest.title && <h3 className="text-xl font-semibold mb-2 text-foreground">{prayerRequest.title}</h3>}
                        <p className="text-foreground/80 leading-relaxed">{prayerRequest.content}</p>
                        {prayerRequest.location && <p className="text-sm text-muted-foreground mt-3">📍 {prayerRequest.location}</p>}
                      </div>
                    </div>
                    <div className="divider-gold mb-5" />
                    <div className="flex gap-3 flex-wrap">
                      <Button onClick={generatePrayer} disabled={isGenerating} className="gradient-sacred text-foreground hover:opacity-90">
                        <Sparkles className="w-4 h-4 mr-2" />
                        {isGenerating ? "Gerando..." : "Sugestão de Oração"}
                      </Button>
                      
                      <Button 
                        onClick={async () => {
                          try {
                            const { data: { session } } = await supabase.auth.getSession();
                            if (!session) return;
                            
                            // Increase count and record intercession
                            await supabase.from('prayer_requests').update({ 
                              prayer_count: prayerRequest.prayer_count + 1 
                            }).eq('id', prayerRequest.id);
                            
                            await supabase.from('prayer_intercessions').upsert({
                              prayer_request_id: prayerRequest.id,
                              user_id: session.user.id,
                            }, { onConflict: 'prayer_request_id,user_id' });

                            await addXp("pray");
                            toast.success("Amém! Sua intercessão foi enviada. O autor sentirá sua paz. 🙏");
                            fetchRandomPrayerRequest(); // Carrega a próxima
                          } catch (err) {
                            toast.error("Erro ao registrar oração");
                          }
                        }}
                        className="gradient-divine text-primary-foreground hover:opacity-90 flex-1 min-w-[140px]"
                      >
                        <Heart className="w-4 h-4 mr-2 fill-current" />
                        Eu orei por isso
                      </Button>

                      <Button onClick={fetchRandomPrayerRequest} variant="outline" disabled={isLoading} className="border-primary/20">
                        Próxima Causa
                      </Button>
                    </div>
                  </Card>

                  <AnimatePresence>
                    {suggestedPrayer && (
                      <>
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.1 }}>
                          <Card className="p-8 soft-shadow border-primary/15">
                            <h3 className="text-xl font-semibold mb-4 text-primary">Sugestão de Oração</h3>
                            <p className="text-foreground/85 leading-relaxed italic whitespace-pre-wrap">{suggestedPrayer}</p>
                          </Card>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.25 }}>
                          <Card className="p-8 soft-shadow border-primary/15">
                            <h3 className="text-xl font-semibold mb-3 text-primary">Envie Energia e Solidariedade</h3>
                            <p className="text-sm text-muted-foreground mb-5">Reaja para mostrar seu apoio</p>
                            <div className="flex flex-wrap gap-3 justify-center">
                              {[
                                { type: "love", emoji: "❤️", label: "Compaixão" },
                                { type: "pray", emoji: "🙏", label: "Graça" },
                                { type: "patience", emoji: "⏳", label: "Paciência" },
                                { type: "strength", emoji: "💪", label: "Força" },
                                { type: "empathy", emoji: "🥺", label: "Empatia" },
                              ].map((reaction, i) => (
                                <motion.button
                                  key={reaction.type}
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 0.35 + i * 0.07 }}
                                  whileHover={{ scale: 1.15 }}
                                  whileTap={{ scale: 0.9 }}
                                  className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-primary/5 transition-colors"
                                  onClick={async () => {
                                    try {
                                      const { data: { session } } = await supabase.auth.getSession();
                                      if (!session) return;
                                      await supabase.from("prayer_reactions").insert({
                                        prayer_request_id: prayerRequest.id,
                                        reactor_user_id: session.user.id,
                                        reaction_type: reaction.type,
                                      });
                                      await addXp("react");
                                      toast.success(`Reação enviada! +${XP_REWARDS.react} XP`);
                                    } catch {
                                      toast.error("Erro ao enviar reação");
                                    }
                                  }}
                                >
                                  <span className="text-3xl">{reaction.emoji}</span>
                                  <span className="text-[11px] text-muted-foreground">{reaction.label}</span>
                                </motion.button>
                              ))}
                            </div>
                          </Card>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Pray;
