import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Heart, ArrowLeft, Users, Share2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useXp } from "@/hooks/use-xp";
import { XP_REWARDS } from "@/lib/xp";
import PageTransition from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { FriendSelector } from "@/components/FriendSelector";

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
  const [activeReaction, setActiveReaction] = useState<string | null>(null);
  const [friendSelectorOpen, setFriendSelectorOpen] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prayerIdParam = searchParams.get("id");
  const { addXp } = useXp();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate(`/auth?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      }
    });
  }, [navigate]);

  useEffect(() => {
    if (prayerIdParam) {
      fetchPrayerById(prayerIdParam);
    } else {
      fetchRandomPrayerRequest();
    }
  }, [prayerIdParam]);

  const fetchPrayerById = async (id: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('prayer_requests')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setPrayerRequest(data);
        setActiveReaction(null);
        setSuggestedPrayer("");

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: existingReaction } = await supabase
            .from('prayer_reactions')
            .select('reaction_type')
            .eq('prayer_request_id', data.id)
            .eq('reactor_user_id', session.user.id)
            .maybeSingle();

          if (existingReaction) {
            setActiveReaction(existingReaction.reaction_type);
          }
        }
      } else {
        toast.error("Causa não encontrada.");
        fetchRandomPrayerRequest();
      }
    } catch (error) {
      console.error('Error fetching prayer by id:', error);
      toast.error("Erro ao buscar pedido de oração");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRandomPrayerRequest = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase
        .from('prayer_requests')
        .select('*')
        .lt('prayer_count', 5)
        .neq('user_id', session?.user.id)
        .limit(10);
      if (error) throw error;
      if (data && data.length > 0) {
        const randomRequest = data[Math.floor(Math.random() * data.length)];
        setPrayerRequest(randomRequest);
        setActiveReaction(null); // Reset reação ao trocar de causa
        setSuggestedPrayer("");

        await supabase.from('prayer_requests').update({ prayer_count: randomRequest.prayer_count + 1 }).eq('id', randomRequest.id);
        
        // Record intercession
        if (session) {
          await supabase.from('prayer_intercessions').upsert({
            prayer_request_id: randomRequest.id,
            user_id: session.user.id,
          }, { onConflict: 'prayer_request_id,user_id' });

          // Check if user already reacted to this prayer
          const { data: existingReaction } = await supabase
            .from('prayer_reactions')
            .select('reaction_type')
            .eq('prayer_request_id', randomRequest.id)
            .eq('reactor_user_id', session.user.id)
            .maybeSingle();

          if (existingReaction) {
            setActiveReaction(existingReaction.reaction_type);
          }
        }
        
        await addXp("pray");
        toast.success(`Ganhou +${XP_REWARDS.pray} pontos de fé por orar!`);
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

  const handleInviteFriends = async (selectedIds: string[]) => {
    if (!prayerRequest || selectedIds.length === 0) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const profile = session.user.user_metadata;
      const inviterName = profile.display_name || profile.full_name?.split(" ")[0] || "Um amigo";

      const notifications = selectedIds.map(friendId => ({
        user_id: friendId,
        message: `🙏 ${inviterName} te convidou para interceder por uma causa!`,
        prayer_request_id: prayerRequest.id,
        is_read: false
      }));

      const { error } = await supabase.from("notifications").insert(notifications);
      if (error) throw error;

      toast.success(`Convite enviado para ${selectedIds.length} ${selectedIds.length === 1 ? 'amigo' : 'amigos'}! 🙏`);
      setFriendSelectorOpen(false);
    } catch (error) {
      console.error("Error sending invites:", error);
      toast.error("Erro ao enviar convites.");
    }
  };

  const handleShareWhatsApp = () => {
    if (!prayerRequest) return;

    const APP_URL = window.location.origin;
    const shareUrl = `${APP_URL}/auth?redirect=${encodeURIComponent(`/pray?id=${prayerRequest.id}`)}`;
    const text = `✦ Preciso da sua intercessão ✦\n\n"${prayerRequest.content}"\n\n🙏 Una-se a mim em oração através do Améns:\n${shareUrl}`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
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
      
      const systemPrompt = `Você é um gerador de orações empáticas e poderosas para a rede social "Améns".
REGRA DE OURO: A oração DEVE OBRIGATORIAMENTE começar com: "Que faça de minha oração uma ferramenta para a bencao dessa causa..." ou algo muito similar que use a palavra "ferramenta".
REGRAS ADICIONAIS:
1. Seja ACOLHEDOR, HUMILDE e CARINHOSO.
2. Use PRIMEIRA PESSOA (Eu).
3. Máximo de 150 palavras.
4. Foco total em interceder por esta causa: "${prayerRequest.content}"`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
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
                        {prayerRequest.title && <h3 className="text-xl font-semibold mb-1 text-foreground">{prayerRequest.title}</h3>}
                        {prayerRequest.author_name && (
                          <p className="text-xs text-primary font-bold uppercase tracking-widest mb-3 opacity-80">
                            Enviado por {prayerRequest.author_name}
                          </p>
                        )}
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

                            // Resolve sender info for personalized notification
                            const senderFullName = session.user.user_metadata?.full_name || "";
                            const senderFirstName = senderFullName.split(" ")[0] || "Um irmão";
                            const senderCity = session.user.user_metadata?.city || "";
                            
                            // Increase count and record intercession
                            await supabase.from('prayer_requests').update({ 
                              prayer_count: prayerRequest.prayer_count + 1 
                            }).eq('id', prayerRequest.id);
                            
                            await supabase.from('prayer_intercessions').upsert({
                              prayer_request_id: prayerRequest.id,
                              user_id: session.user.id,
                            }, { onConflict: 'prayer_request_id,user_id' });

                            // Notify the author with personalized info
                            if (prayerRequest.user_id) {
                              await supabase.from('notifications').insert({
                                user_id: prayerRequest.user_id,
                                prayer_request_id: prayerRequest.id,
                                message: `🙏 ${senderFirstName}${senderCity ? ` (${senderCity})` : ""} acabou de interceder pela sua causa!`,
                              });
                            }

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

                      <div className="flex gap-2 w-full mt-2">
                         <Button 
                           variant="outline" 
                           onClick={() => setFriendSelectorOpen(true)}
                           className="flex-1 rounded-xl border-primary/20 text-primary hover:bg-primary/5"
                         >
                           <Users className="w-4 h-4 mr-2" />
                           Convidar Amigo
                         </Button>
                         
                         <Button 
                           variant="outline" 
                           onClick={handleShareWhatsApp}
                           className="flex-1 rounded-xl border-green-200 text-green-600 hover:bg-green-50"
                         >
                           <Share2 className="w-4 h-4 mr-2" />
                           Compartilhar
                         </Button>
                      </div>
                    </div>
                  </Card>

                  <FriendSelector 
                    open={friendSelectorOpen}
                    onOpenChange={setFriendSelectorOpen}
                    onSelect={handleInviteFriends}
                  />

                  <AnimatePresence>
                    {suggestedPrayer && (
                      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.1 }}>
                        <Card className="p-8 soft-shadow border-primary/15">
                          <h3 className="text-xl font-semibold mb-4 text-primary">Sugestão de Oração</h3>
                          <p className="text-foreground/85 leading-relaxed italic whitespace-pre-wrap">{suggestedPrayer}</p>
                        </Card>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.1 }}>
                    <Card className="p-8 soft-shadow border-primary/15">
                      <h3 className="text-xl font-semibold mb-3 text-primary">Envie Energia e Solidariedade</h3>
                      <p className="text-sm text-muted-foreground mb-5">
                        {activeReaction
                          ? "Você já enviou sua reação — clique em outro para trocar"
                          : "Mostre seu apoio à causa"}
                      </p>
                      <div className="flex flex-wrap gap-3 justify-center">
                        {[
                          { type: "love", emoji: "❤️", label: "Compaixão" },
                          { type: "pray", emoji: "🙏", label: "Graça" },
                          { type: "patience", emoji: "⏳", label: "Paciência" },
                          { type: "strength", emoji: "💪", label: "Força" },
                          { type: "empathy", emoji: "🥺", label: "Empatia" },
                        ].map((reaction, i) => {
                          const isActive = activeReaction === reaction.type;
                          const isOtherActive = activeReaction !== null && !isActive;
                          return (
                            <motion.button
                              key={reaction.type}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.1 + i * 0.05 }}
                              whileHover={{ scale: 1.15 }}
                              whileTap={{ scale: 0.9 }}
                              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-200 ${
                                isActive
                                  ? "bg-primary/15 ring-2 ring-primary/40 shadow-sm"
                                  : isOtherActive
                                  ? "opacity-35 hover:opacity-60 hover:bg-primary/5"
                                  : "hover:bg-primary/5"
                              }`}
                              onClick={async () => {
                                try {
                                  const { data: { session } } = await supabase.auth.getSession();
                                  if (!session) return;

                                  if (isActive) {
                                    // Toggle off — remove reaction
                                    await supabase
                                      .from("prayer_reactions")
                                      .delete()
                                      .eq("prayer_request_id", prayerRequest.id)
                                      .eq("reactor_user_id", session.user.id);
                                    setActiveReaction(null);
                                    toast.success("Reação removida.");
                                    return;
                                  }

                                  // Resolve sender info for personalized notification
                                  const senderFullName = session.user.user_metadata?.full_name || "";
                                  const senderFirstName = senderFullName.split(" ")[0] || "Um irmão";
                                  const senderCity = session.user.user_metadata?.city || "";

                                  // Upsert — replace any previous reaction
                                  await supabase.from("prayer_reactions").upsert({
                                    prayer_request_id: prayerRequest.id,
                                    reactor_user_id: session.user.id,
                                    reaction_type: reaction.type,
                                  }, { onConflict: "prayer_request_id,reactor_user_id" });

                                  setActiveReaction(reaction.type);

                                  // Notify the author only on first reaction or when changing
                                  if (prayerRequest.user_id && !activeReaction) {
                                    const emoji = reaction.emoji;
                                    await supabase.from("notifications").insert({
                                      user_id: prayerRequest.user_id,
                                      prayer_request_id: prayerRequest.id,
                                      message: `${emoji} ${senderFirstName}${senderCity ? ` (${senderCity})` : ""} reagiu com ${reaction.label} ao seu pedido!`,
                                    });
                                  }

                                  if (!activeReaction) await addXp("react");
                                  toast.success(`${reaction.emoji} Reação enviada!`);
                                } catch {
                                  toast.error("Erro ao enviar reação");
                                }
                              }}
                            >
                              <span className={`text-3xl transition-transform duration-150 ${isActive ? "scale-110" : ""}`}>
                                {reaction.emoji}
                              </span>
                              <span className={`text-[11px] font-medium transition-colors duration-150 ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                                {reaction.label}
                              </span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </Card>
                  </motion.div>
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
