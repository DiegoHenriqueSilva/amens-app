import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Heart, ArrowLeft, Users, Share2, MessageCircle, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useXp } from "@/hooks/use-xp";
import { XP_REWARDS } from "@/lib/xp";
import PageTransition from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { FriendSelector } from "@/components/FriendSelector";
import { formatTimeAgo } from "@/lib/utils";

const FEEDBACK_OPTIONS: Record<string, { label: string; emoji: string }> = {
  success: { label: "Deu certo, obrigado pelas orações!", emoji: "🎉" },
  not_this_time: { label: "Não foi desta vez, mas obrigado pelas preces!", emoji: "🙏" },
  keep_trying: { label: "Não deu certo mas vou continuar tentando", emoji: "💪" },
  god_knows: { label: "Não deu certo mas Deus sabe o que faz, obrigado pelas orações", emoji: "✝️" },
  grace_received: { label: "Consegui a graça solicitada, obrigado!", emoji: "⭐" },
};

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
  const [intercessions, setIntercessions] = useState<any[]>([]);
  const [isIntercessionsLoading, setIsIntercessionsLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prayerIdParam = searchParams.get("id");
  const { addXp } = useXp();
  const [hasRequestedCause, setHasRequestedCause] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const fetchIntercessions = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    setIsIntercessionsLoading(true);
    try {
      const { data: intData, error } = await supabase
        .from("prayer_intercessions")
        .select("id, prayer_request_id, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(20); // Increased limit for integrated history
      
      if (error) throw error;
      if (!intData || intData.length === 0) {
        setIntercessions([]);
        return;
      }

      const prayerIds = intData.map(i => i.prayer_request_id);
      const { data: prayerData } = await supabase
        .from("prayer_requests")
        .select("id, title, content, location, feedback")
        .in("id", prayerIds);

      const prayerMap: Record<string, any> = {};
      prayerData?.forEach(p => { prayerMap[p.id] = p; });

      setIntercessions(intData.map(i => {
        const p = prayerMap[i.prayer_request_id] || {};
        return {
          id: i.id,
          prayer_request_id: i.prayer_request_id,
          created_at: i.created_at,
          prayer_title: p.title || null,
          prayer_content: p.content || "Pedido removido",
          prayer_location: p.location || null,
          prayer_feedback: p.feedback || null,
        };
      }));
    } catch (e) {
      console.error("Error loading intercessions history:", e);
    } finally {
      setIsIntercessionsLoading(false);
    }
  };

  useEffect(() => {
    fetchIntercessions();
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate(`/auth?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      }
    });
  }, [navigate]);

  useEffect(() => {
    if (prayerIdParam) {
      setHasRequestedCause(true);
      fetchPrayerById(prayerIdParam);
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
    setHasRequestedCause(true);
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
        setActiveReaction(null);
        setSuggestedPrayer("");

        await supabase.from('prayer_requests').update({ prayer_count: randomRequest.prayer_count + 1 }).eq('id', randomRequest.id);
        
        if (session) {
          await supabase.from('prayer_intercessions').upsert({
            prayer_request_id: randomRequest.id,
            user_id: session.user.id,
          }, { onConflict: 'prayer_request_id,user_id' });

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
        toast.success(`Ganhou +${XP_REWARDS.pray} pontos de fé por interceder!`);
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
      
      setSuggestedPrayer(prayerText || "Desculpe, não conseguimos gerar a sugestão agora.");
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
              {!hasRequestedCause ? (
                <motion.div key="initial" variants={fadeUp} initial="initial" animate="animate" exit="exit" className="space-y-4">
                  <Card className="p-10 text-center soft-shadow border-primary/10">
                    <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 4, repeat: Infinity }}>
                       <Sparkles className="w-12 h-12 text-primary mx-auto mb-6 opacity-30" />
                    </motion.div>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button onClick={fetchRandomPrayerRequest} disabled={isLoading} size="lg" className="flex-1 h-16 gradient-divine text-black font-bold text-lg rounded-2xl shadow-lg">
                        {isLoading ? "Buscando..." : "Receber uma Causa"}
                      </Button>
                      <Button onClick={() => setShowHistory(true)} variant="outline" size="lg" className="flex-1 h-16 border-primary/20 rounded-2xl transition-all">
                        <Clock className="w-5 h-5 mr-3" />
                        Histórico
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ) : isLoading || !prayerRequest ? (
                <motion.div key="empty" variants={fadeUp} initial="initial" animate="animate" exit="exit">
                  <Card className="p-12 text-center soft-shadow border-primary/10">
                    <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Buscando uma causa para você interceder...</p>
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
                      
                      <Button onClick={fetchRandomPrayerRequest} variant="outline" disabled={isLoading} className="border-primary/20 flex-1">
                        Próxima Causa
                      </Button>

                      <div className="flex gap-2 w-full mt-2">
                         <Button 
                           variant="outline" 
                           onClick={() => setFriendSelectorOpen(true)}
                           className="flex-1 rounded-xl border-primary/20 text-primary hover:bg-primary/5"
                         >
                           <Users className="w-4 h-4 mr-2" />
                           Enviar a um amigo
                         </Button>
                         
                         <Button 
                           variant="outline" 
                           onClick={handleShareWhatsApp}
                           className="flex-1 rounded-xl border-green-200 text-green-600 hover:bg-green-50"
                         >
                           <Share2 className="w-4 h-4 mr-2" />
                           WhatsApp
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

          {/* History Section Integrated above or hidden */}
          <div className="max-w-2xl mx-auto mt-8 pb-20 px-2">
             {showHistory && (
                <motion.div 
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   className="space-y-6"
                >
                   <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                         <Clock className="w-5 h-5 text-primary opacity-60" />
                         <h2 className="text-xl font-bold text-foreground opacity-80 uppercase tracking-widest text-[14px]">Intercessões Recentes</h2>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)} className="text-[10px] uppercase font-bold text-muted-foreground">Fechar</Button>
                   </div>

                   {isIntercessionsLoading ? (
                     <div className="text-center py-6 opacity-40">
                        <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                        <p className="text-xs">Carregando histórico...</p>
                     </div>
                   ) : intercessions.length === 0 ? (
                     <p className="text-center text-sm text-muted-foreground py-8 border border-dashed border-primary/10 rounded-3xl">
                       Você ainda não orou por nenhuma causa.
                     </p>
                   ) : (
                     <div className="space-y-4">
                        {intercessions.map((item, i) => (
                          <motion.div 
                            key={item.id} 
                            initial={{ opacity: 0, x: -10 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            transition={{ delay: i * 0.1 }}
                          >
                            <Card className="p-5 soft-shadow border-primary/5 rounded-3xl">
                              <div className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                  {item.prayer_title && <h4 className="text-sm font-bold mb-1 line-clamp-1">{item.prayer_title}</h4>}
                                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">{item.prayer_content}</p>
                                  <div className="flex items-center gap-2 text-[10px] text-primary/40 font-bold uppercase tracking-wider">
                                     <Clock className="w-3 h-3" />
                                     {formatTimeAgo(item.created_at)}
                                  </div>
                                </div>
                                
                                {item.prayer_feedback && (
                                  <div className="bg-primary/5 p-2 rounded-2xl flex flex-col items-center justify-center min-w-[60px] border border-primary/10">
                                     <span className="text-xl mb-1">{FEEDBACK_OPTIONS[item.prayer_feedback]?.emoji}</span>
                                     <span className="text-[8px] font-bold text-primary uppercase text-center leading-none">Graça!</span>
                                  </div>
                                )}
                              </div>
                            </Card>
                          </motion.div>
                        ))}
                     </div>
                   )}
                </motion.div>
             )}
          </div>
        </div>
      </div>
    </PageTransition>
  );

};

export default Pray;
