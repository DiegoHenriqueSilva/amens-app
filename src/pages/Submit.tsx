import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send, ArrowLeft, Eye, Heart, Clock, MessageCircle, Check, Users, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useFaithPoints } from "@/hooks/use-faith-points";
import { FAITH_POINTS_REWARDS } from "@/lib/faith-points";
import PageTransition from "@/components/PageTransition";
import { usePushPrompt } from "@/contexts/PushPromptContext";
import { motion, AnimatePresence } from "framer-motion";
import { formatTimeAgo } from "@/lib/utils";

const REACTION_MAP: Record<string, { emoji: string; label: string }> = {
  love: { emoji: "❤️", label: "Compaixão" },
  pray: { emoji: "🙏", label: "Graça" },
  patience: { emoji: "⏳", label: "Paciência" },
  strength: { emoji: "💪", label: "Força" },
  empathy: { emoji: "🥺", label: "Empatía" },
};

const FEEDBACK_OPTIONS = [
  { value: "success", label: "Deu certo, obrigado pelas orações!", emoji: "🎉" },
  { value: "not_this_time", label: "Não foi desta vez, mas obrigado pelas preces!", emoji: "🙏" },
  { value: "keep_trying", label: "Não deu certo mas vou continuar tentando", emoji: "💪" },
  { value: "god_knows", label: "Não deu certo mas Deus sabe o que faz, obrigado pelas orações", emoji: "✝️" },
  { value: "grace_received", label: "Consegui a graça solicitada, obrigado!", emoji: "⭐" },
];

const Submit = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addFaithPoints } = useFaithPoints();
  const { triggerPushPrompt } = usePushPrompt();
  
  // History states
  const [prayers, setPrayers] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState<string | null>(null);
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [intercessorsOpen, setIntercessorsOpen] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const fetchHistory = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    setIsLoadingHistory(true);
    try {
      const { data: prayerData, error } = await supabase
        .from("prayer_requests")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(20); // Increased limit for integrated history
        
      if (error) throw error;
      if (!prayerData || prayerData.length === 0) {
        setPrayers([]);
        return;
      }

      const prayerIds = prayerData.map((p) => p.id);

      // Reactions
      const { data: reactionData } = await supabase
        .from("prayer_reactions").select("prayer_request_id, reaction_type").in("prayer_request_id", prayerIds);

      const reactionsByPrayer: Record<string, Record<string, number>> = {};
      reactionData?.forEach((r) => {
        if (!reactionsByPrayer[r.prayer_request_id]) reactionsByPrayer[r.prayer_request_id] = {};
        reactionsByPrayer[r.prayer_request_id][r.reaction_type] = (reactionsByPrayer[r.prayer_request_id][r.reaction_type] || 0) + 1;
      });

      // Intercessors
      const { data: intercessionData } = await supabase
        .from("prayer_intercessions")
        .select("prayer_request_id, user_id")
        .in("prayer_request_id", prayerIds);

      const intercessorsByPrayer: Record<string, any[]> = {};
      if (intercessionData && intercessionData.length > 0) {
        const userIds = [...new Set(intercessionData.map((i) => i.user_id))];
        const { data: profileData } = await supabase
          .from("profiles" as any)
          .select("id, full_name, display_name, show_real_name, city, state")
          .in("id", userIds);

        const profileMap = new Map(((profileData || []) as any[]).map((p) => [p.id, p]));

        intercessionData.forEach((i) => {
          if (!intercessorsByPrayer[i.prayer_request_id]) intercessorsByPrayer[i.prayer_request_id] = [];
          const profile = profileMap.get(i.user_id);
          const name = profile?.show_real_name
            ? (profile.display_name || profile.full_name?.split(" ")[0] || "Intercessor")
            : "Um intercessor";
          intercessorsByPrayer[i.prayer_request_id].push({
            name,
            city: profile?.city || "",
            state: profile?.state || "",
          });
        });
      }

      setPrayers(prayerData.map((p: any) => ({
        ...p,
        reactions: reactionsByPrayer[p.id] || {},
        intercessors: intercessorsByPrayer[p.id] || [],
      })));
    } catch (e) {
      console.error("Error loading history:", e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleFeedback = async (prayerId: string, feedbackValue: string) => {
    setSendingFeedback(true);
    try {
      const { error } = await supabase.from("prayer_requests").update({ feedback: feedbackValue }).eq("id", prayerId);
      if (error) throw error;

      const { data: intercessions } = await supabase
        .from("prayer_intercessions").select("user_id").eq("prayer_request_id", prayerId);

      const feedbackLabel = FEEDBACK_OPTIONS.find(f => f.value === feedbackValue)?.label || feedbackValue;

      if (intercessions && intercessions.length > 0) {
        const prayer = prayers.find(p => p.id === prayerId);
        const title = prayer?.title || "um pedido";
        const notifications = intercessions.map(i => ({
          user_id: i.user_id,
          prayer_request_id: prayerId,
          message: `Retorno sobre "${title}": ${feedbackLabel}`,
        }));
        await supabase.from("notifications").insert(notifications);
      }

      setPrayers(prev => prev.map(p => p.id === prayerId ? { ...p, feedback: feedbackValue } : p));
      setFeedbackOpen(null);
      toast.success("Feedback enviado! Os intercessores serão notificados.");
    } catch (e) {
      toast.error("Erro ao enviar feedback");
    } finally {
      setSendingFeedback(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        const city = session.user.user_metadata?.city;
        const state = session.user.user_metadata?.state;
        if (city && state) {
          setFormData(prev => ({ ...prev, location: `${city}, ${state}` }));
        } else if (city) {
          setFormData(prev => ({ ...prev, location: city }));
        }
      }
    });
  }, [navigate]);

  const [formData, setFormData] = useState({ title: "", content: "", location: "" });

  const notifyFriends = async (prayerId: string, title: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const userName = session.user.user_metadata?.full_name || "Um amigo";
      const userFirstName = userName.split(" ")[0];

      // Fetch all friends
      const { data: friendsData } = await supabase
        .from("friendships")
        .select("friend_id")
        .eq("user_id", session.user.id);

      if (!friendsData || friendsData.length === 0) return;

      const notifications = friendsData.map(f => ({
        user_id: f.friend_id,
        prayer_request_id: prayerId,
        message: `🙏 ${userFirstName} acabou de enviar um novo pedido de oração: "${title}"`,
        is_read: false
      }));

      await supabase.from("notifications").insert(notifications);
    } catch (err) {
      console.error("Error notifying friends:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.content.trim()) {
      toast.error("Por favor, descreva seu pedido de oração");
      return;
    }
    if (formData.title.trim().length < 5) {
      toast.error("O título do pedido deve ter pelo menos 5 letras");
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const fullName = session?.user?.user_metadata?.full_name || "Anônimo";
      const firstName = fullName.split(' ')[0];
      
      const { data, error } = await supabase.from('prayer_requests').insert([{
        title: formData.title.trim(),
        content: formData.content.trim(),
        location: formData.location.trim() || null,
        prayer_count: 0,
        user_id: session?.user?.id,
        author_name: firstName,
      }]).select().single();

      if (error) throw error;
      
      if (data) {
        await notifyFriends(data.id, data.title);
      }

      // Daily XP gate — award submit XP only once per day
      const userId = session?.user?.id;
      const today = new Date().toISOString().split("T")[0];
      const submitFaithPointsKey = `amens_submit_faith_points_${userId}_${today}`;
      if (userId && !localStorage.getItem(submitFaithPointsKey)) {
        await addFaithPoints("submit");
        localStorage.setItem(submitFaithPointsKey, "1");
        toast.success(`Pedido enviado! Ganhou +${FAITH_POINTS_REWARDS.submit} pontos de fé`);
      } else {
        toast.success("Pedido enviado com sucesso!");
      }
      setFormData({ title: "", content: "", location: "" });
      
      // Trigger push prompt
      setTimeout(() => {
         triggerPushPrompt("Saiba quando alguém orar por seu pedido, autorize as notificações");
      }, 800);

      setTimeout(() => navigate("/"), 3000);
    } catch (error: any) {
      console.error('Error submitting prayer request:', error);
      toast.error(`Erro técnico: ${error.message || JSON.stringify(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background relative overflow-hidden pb-28">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="absolute top-4 left-4 z-20">
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="absolute top-[-6rem] right-[-4rem] w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-6rem] left-[-4rem] w-80 h-80 bg-primary/5 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 py-12 relative z-10">
          <motion.div className="max-w-2xl mx-auto text-center mb-10" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-sm uppercase tracking-[0.25em] text-primary mb-2">✦</p>
            <h1 className="text-5xl md:text-6xl font-bold mb-3 text-foreground">Enviar Pedido de Oração</h1>
            <div className="divider-gold max-w-[10rem] mx-auto mb-3" />
            <p className="text-muted-foreground">Compartilhe sua necessidade com a comunidade</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.15 }}>
            <Card className="max-w-2xl mx-auto p-8 soft-shadow border-primary/10">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="title" className="text-base">Título (Opcional)</Label>
                    <div className="w-10 h-10 overflow-visible relative flex-shrink-0">
                      <img 
                        src="/enviar_pergaminho_3d.png" 
                        alt="Pergaminho solitário" 
                        className={`w-full h-full object-contain transition-all duration-500 ${isSubmitting ? 'drop-shadow-[0_0_25px_rgba(255,215,0,1)] brightness-125 scale-110' : 'drop-shadow-sm'}`} 
                      />
                    </div>
                  </div>
                  <Input id="title" placeholder="Ex: Cura para meu filho Miguel" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} maxLength={100} />
                </div>
                <div>
                  <Label htmlFor="content" className="text-base">Seu Pedido de Oração *</Label>
                  <Textarea id="content" placeholder="Descreva seu pedido de oração com detalhes..." value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className="mt-2 min-h-[180px]" required maxLength={1000} />
                  <p className="text-sm text-muted-foreground mt-1">{formData.content.length}/1000 caracteres</p>
                </div>
                <Button type="submit" disabled={isSubmitting} size="lg" className="w-full gradient-divine text-black hover:opacity-90 font-bold">
                  <Send className="w-4 h-4 mr-2" />
                  {isSubmitting ? "Enviando..." : "Enviar Pedido"}
                </Button>
              </form>
            </Card>
          </motion.div>

          {/* History Section */}
          <div className="max-w-2xl mx-auto mt-16 pb-20 px-2">
             {!showHistory ? (
                <div className="text-center">
                   <Button 
                     variant="ghost" 
                     onClick={() => setShowHistory(true)}
                     className="text-black hover:text-primary text-[11px] uppercase tracking-widest font-black py-8 bg-primary/5 rounded-[2rem] border border-dashed border-primary/20 w-full hover:bg-primary/10 transition-all font-serif italic"
                   >
                     <Clock className="w-4 h-4 mr-2" />
                     Ver meus pedidos anteriores
                   </Button>
                </div>
             ) : (
                <motion.div 
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   className="space-y-6"
                >
                   <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                         <Clock className="w-5 h-5 text-primary opacity-60" />
                         <h2 className="text-xl font-bold text-foreground opacity-80 uppercase tracking-widest text-[14px]">Pedidos Recentes</h2>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)} className="text-[10px] uppercase font-bold text-muted-foreground">Ocultar</Button>
                   </div>

                   {isLoadingHistory ? (
                     <div className="text-center py-6 opacity-40">
                        <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                        <p className="text-xs">Carregando histórico...</p>
                     </div>
                   ) : prayers.length === 0 ? (
                     <p className="text-center text-sm text-muted-foreground py-8 border border-dashed border-primary/10 rounded-3xl">
                       Você ainda não enviou nenhum pedido.
                     </p>
                   ) : (
                     <div className="space-y-6">
                        {prayers.map((prayer, i) => (
                          <motion.div 
                            key={prayer.id} 
                            initial={{ opacity: 0, scale: 0.98 }} 
                            animate={{ opacity: 1, scale: 1 }} 
                            transition={{ delay: i * 0.1 }}
                          >
                            <Card className="p-6 soft-shadow border-primary/5 bg-white/70 backdrop-blur-sm rounded-[2rem]">
                              <div className="mb-4">
                                <div className="flex justify-between items-start mb-2">
                                  {prayer.title && <h3 className="text-base font-bold text-foreground">{prayer.title}</h3>}
                                  <span className="text-[10px] bg-primary/5 px-2 py-1 rounded-full text-primary font-bold">{formatTimeAgo(prayer.created_at)}</span>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{prayer.content}</p>
                              </div>
                              
                              <div className="flex items-center gap-4 text-[11px] text-muted-foreground mb-4">
                                 <div className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> <span>{prayer.prayer_count}</span></div>
                                 <div className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> <span>{Object.values(prayer.reactions as object).reduce((a: any, b: any) => a + b, 0)}</span></div>
                              </div>

                              {/* Intercessors List */}
                              {prayer.intercessors.length > 0 && (
                                <div className="mb-4 bg-primary/5 rounded-2xl p-3">
                                  <button
                                    onClick={() => setIntercessorsOpen(intercessorsOpen === prayer.id ? null : prayer.id)}
                                    className="flex items-center gap-2 text-[10px] font-black text-primary/70 uppercase tracking-wider w-full text-left"
                                  >
                                    <Users className="w-3.5 h-3.5" />
                                    {prayer.intercessors.length} {prayer.intercessors.length === 1 ? "pessoa orou" : "pessoas oraram"} por você
                                    {intercessorsOpen === prayer.id ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
                                  </button>

                                  <AnimatePresence>
                                    {intercessorsOpen === prayer.id && (
                                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                          {prayer.intercessors.map((int: any, idx: number) => (
                                            <span key={idx} className="bg-white/50 px-2 py-1 rounded-full text-[9px] font-bold text-stone-600 border border-primary/5">
                                              🙏 {int.name}
                                            </span>
                                          ))}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              )}

                              {/* Feedback Section */}
                              <div className="pt-3 border-t border-primary/5">
                                {prayer.feedback ? (
                                  <div className="flex items-center gap-2 text-[11px] font-bold text-primary">
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Seu retorno: {FEEDBACK_OPTIONS.find(f => f.value === prayer.feedback)?.emoji} {FEEDBACK_OPTIONS.find(f => f.value === prayer.feedback)?.label}</span>
                                  </div>
                                ) : (
                                  <div>
                                     {feedbackOpen === prayer.id ? (
                                       <div className="space-y-2 py-2">
                                          <p className="text-[10px] font-black text-muted-foreground uppercase mb-2 tracking-widest">Dê um retorno aos intercessores:</p>
                                          <div className="grid grid-cols-1 gap-2">
                                             {FEEDBACK_OPTIONS.map(option => (
                                               <button 
                                                 key={option.value} 
                                                 disabled={sendingFeedback}
                                                 onClick={() => handleFeedback(prayer.id, option.value)}
                                                 className="text-left px-3 py-2 rounded-xl border border-primary/10 hover:bg-primary/5 text-xs flex items-center gap-2 transition-all"
                                               >
                                                 <span>{option.emoji}</span>
                                                 <span className="text-stone-700">{option.label}</span>
                                               </button>
                                             ))}
                                          </div>
                                          <Button variant="ghost" size="sm" onClick={() => setFeedbackOpen(null)} className="h-7 text-[10px] mt-1">Cancelar</Button>
                                       </div>
                                     ) : (
                                       <Button variant="outline" size="sm" onClick={() => setFeedbackOpen(prayer.id)} className="h-8 rounded-full text-[10px] font-bold border-primary/10 text-primary">
                                          <MessageCircle className="w-3 h-3 mr-1.5" /> Dar Retorno
                                       </Button>
                                     )}
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

export default Submit;
