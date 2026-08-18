import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Eye, Heart, Clock, MessageCircle, Check, Users, ChevronDown, ChevronUp, Trash2, Edit2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { formatTimeAgo } from "@/lib/utils";
import PageTransition from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const REACTION_MAP: Record<string, { emoji: string; label: string }> = {
  love: { emoji: "❤️", label: "Compaixão" },
  pray: { emoji: "🙏", label: "Graça" },
  patience: { emoji: "⏳", label: "Paciência" },
  strength: { emoji: "💪", label: "Força" },
  empathy: { emoji: "🥺", label: "Empatia" },
};

const FEEDBACK_OPTIONS = [
  { value: "success", label: "Deu certo, obrigado pelas orações!", emoji: "🎉" },
  { value: "not_this_time", label: "Não foi desta vez, mas obrigado pelas preces!", emoji: "🙏" },
  { value: "keep_trying", label: "Não deu certo mas vou continuar tentando", emoji: "💪" },
  { value: "god_knows", label: "Não deu certo mas Deus sabe o que faz, obrigado pelas orações", emoji: "✝️" },
  { value: "grace_received", label: "Consegui a graça solicitada, obrigado!", emoji: "⭐" },
];

type Intercessor = {
  name: string;
  city: string;
  state: string;
};

type PrayerWithReactions = {
  id: string;
  title: string | null;
  content: string;
  location: string | null;
  prayer_count: number;
  created_at: string;
  feedback: string | null;
  reactions: Record<string, number>;
  intercessors: Intercessor[];
};

const MyPrayers = () => {
  const navigate = useNavigate();
  const [prayers, setPrayers] = useState<PrayerWithReactions[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackOpen, setFeedbackOpen] = useState<string | null>(null);
  const [customFeedbackText, setCustomFeedbackText] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [intercessorsOpen, setIntercessorsOpen] = useState<string | null>(null);
  const [deletingPrayerId, setDeletingPrayerId] = useState<string | null>(null);

  const loadPrayers = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }
    try {
      const { data: prayerData, error } = await supabase
        .from("prayer_requests")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!prayerData || prayerData.length === 0) { setPrayers([]); setIsLoading(false); return; }

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

      const intercessorsByPrayer: Record<string, Intercessor[]> = {};
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
    } catch (error) {
      console.error("Error loading prayers:", error);
      toast.error("Erro ao carregar seus pedidos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPrayers();
  }, [navigate]);

  const handleFeedback = async (prayerId: string, feedbackValue: string) => {
    setSendingFeedback(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.from("prayer_requests").update({ feedback: feedbackValue }).eq("id", prayerId);
      if (error) throw error;

      // Notify intercessors
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
      setCustomFeedbackText("");
      toast.success("Retorno enviado aos intercessores!");
    } catch (error) {
      console.error("Error sending feedback:", error);
      toast.error("Erro ao enviar retorno");
    } finally {
      setSendingFeedback(false);
    }
  };

  const handleDeletePrayer = async () => {
    if (!deletingPrayerId) return;
    try {
      const { error } = await supabase.from("prayer_requests").delete().eq("id", deletingPrayerId);
      if (error) throw error;
      setPrayers(prev => prev.filter(p => p.id !== deletingPrayerId));
      toast.success("Pedido removido com sucesso");
    } catch (err: any) {
      console.error("Error deleting prayer:", err);
      toast.error("Erro ao remover pedido");
    } finally {
      setDeletingPrayerId(null);
    }
  };

  const totalReactions = (reactions: Record<string, number>) => Object.values(reactions).reduce((a, b) => a + b, 0);

  const getFeedbackInfo = (value: string) => {
    const std = FEEDBACK_OPTIONS.find(f => f.value === value);
    if (std) return std;
    return { value, label: value, emoji: "💬" };
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background relative overflow-hidden pb-16">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="absolute top-4 left-4 z-20">
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="absolute top-[-6rem] right-[-4rem] w-80 h-80 bg-accent/5 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 py-12 relative z-10">
          <motion.div className="max-w-2xl mx-auto text-center mb-10" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-sm uppercase tracking-[0.25em] text-primary mb-2">✦</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-3 text-foreground">Minhas Preces</h1>
            <div className="divider-gold max-w-[10rem] mx-auto mb-3" />
            <p className="text-muted-foreground">Acompanhe seus pedidos e compartilhe um retorno com a comunidade</p>
          </motion.div>

          <div className="max-w-2xl mx-auto space-y-5">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-muted-foreground">Carregando seus pedidos...</p>
              </div>
            ) : prayers.length === 0 ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
                <Card className="p-12 text-center soft-shadow border-primary/10 rounded-[2rem]">
                  <Heart className="w-14 h-14 mx-auto mb-5 text-muted-foreground/30" />
                  <h2 className="text-2xl font-semibold mb-2 text-foreground">Nenhum pedido ainda</h2>
                  <p className="text-muted-foreground mb-5">Envie seu primeiro pedido de oração para a comunidade</p>
                  <Button onClick={() => navigate("/submit")} className="rounded-full bg-gradient-to-br from-[#d4a017] to-[#e8c547] text-[#3d2800] font-bold hover:opacity-90 border-0 shadow-md">
                    Enviar Pedido
                  </Button>
                </Card>
              </motion.div>
            ) : (
              prayers.map((prayer, i) => (
                <motion.div
                  key={prayer.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <Card className="p-6 soft-shadow border-primary/10 rounded-[2rem] relative">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        {prayer.title && <h3 className="text-lg font-semibold text-foreground">{prayer.title}</h3>}
                        <p className="text-foreground/80 leading-relaxed mt-1">{prayer.content}</p>
                      </div>
                      {/* Delete Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingPrayerId(prayer.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                        title="Remover Pedido"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {prayer.location && <p className="text-xs text-muted-foreground mb-3">📍 {prayer.location}</p>}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4 flex-wrap">
                      <div className="flex items-center gap-1.5"><Eye className="w-4 h-4" /><span>{prayer.prayer_count} orações</span></div>
                      <div className="flex items-center gap-1.5"><Heart className="w-4 h-4" /><span>{totalReactions(prayer.reactions)} reações</span></div>
                      <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" /><span>{formatTimeAgo(prayer.created_at)}</span></div>
                    </div>

                    {totalReactions(prayer.reactions) > 0 && (
                      <div className="flex flex-wrap gap-2 pt-3 border-t border-border mb-3">
                        {Object.entries(prayer.reactions).map(([type, count]) => {
                          const info = REACTION_MAP[type];
                          if (!info) return null;
                          return (
                            <span key={type} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/5 text-xs border border-primary/10">
                              {info.emoji} {count}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Intercessors List */}
                    {prayer.intercessors.length > 0 && (
                      <div className="mb-4">
                        <button
                          onClick={() => setIntercessorsOpen(intercessorsOpen === prayer.id ? null : prayer.id)}
                          className="flex items-center gap-2 text-xs font-bold text-primary/70 uppercase tracking-wider hover:text-primary transition-colors w-full text-left"
                        >
                          <Users className="w-3.5 h-3.5" />
                          {prayer.intercessors.length} {prayer.intercessors.length === 1 ? "pessoa orou" : "pessoas oraram"} por você
                          {intercessorsOpen === prayer.id
                            ? <ChevronUp className="w-3.5 h-3.5 ml-auto" />
                            : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
                        </button>

                        <AnimatePresence>
                          {intercessorsOpen === prayer.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 flex flex-wrap gap-2">
                                {prayer.intercessors.map((intercessor, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-xs font-medium text-foreground/80"
                                  >
                                    <span className="text-primary">🙏</span>
                                    <span className="font-semibold text-foreground">{intercessor.name}</span>
                                    {intercessor.city && (
                                      <span className="text-muted-foreground">
                                        , {intercessor.city}{intercessor.state ? ` - ${intercessor.state}` : ""}
                                      </span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Feedback Section (View & Edit) */}
                    <div className="pt-3 border-t border-border">
                      {prayer.feedback && feedbackOpen !== prayer.id ? (
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs">
                            <Check className="w-4 h-4 text-emerald-500" />
                            <span className="text-muted-foreground">Seu retorno:</span>
                            <span className="font-semibold text-foreground">
                              {getFeedbackInfo(prayer.feedback).emoji} {getFeedbackInfo(prayer.feedback).label}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setFeedbackOpen(prayer.id);
                              setCustomFeedbackText(prayer.feedback || "");
                            }}
                            className="text-xs text-primary hover:bg-primary/5 rounded-full"
                          >
                            <Edit2 className="w-3.5 h-3.5 mr-1" />
                            Alterar Retorno
                          </Button>
                        </div>
                      ) : feedbackOpen === prayer.id ? (
                        <AnimatePresence>
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-3">
                            <p className="text-xs font-bold text-foreground">Escolha ou escreva um retorno aos intercessores:</p>
                            
                            <div className="space-y-2">
                              {FEEDBACK_OPTIONS.map((option) => (
                                <motion.button
                                  key={option.value}
                                  whileHover={{ scale: 1.005 }}
                                  whileTap={{ scale: 0.99 }}
                                  disabled={sendingFeedback}
                                  onClick={() => handleFeedback(prayer.id, option.value)}
                                  className="w-full text-left px-3 py-2.5 rounded-xl border border-primary/10 hover:bg-primary/5 transition-colors text-xs flex items-center gap-2.5 disabled:opacity-50"
                                >
                                  <span className="text-lg">{option.emoji}</span>
                                  <span className="text-foreground font-medium">{option.label}</span>
                                </motion.button>
                              ))}
                            </div>

                            {/* Custom Message Input */}
                            <div className="pt-2">
                              <p className="text-xs text-muted-foreground mb-1.5 font-medium">Ou digite uma mensagem personalizada:</p>
                              <div className="flex gap-2">
                                <Input
                                  placeholder="Escreva um agradecimento pessoal..."
                                  value={customFeedbackText}
                                  onChange={(e) => setCustomFeedbackText(e.target.value)}
                                  className="text-xs rounded-xl"
                                  maxLength={200}
                                />
                                <Button
                                  size="sm"
                                  disabled={sendingFeedback || !customFeedbackText.trim()}
                                  onClick={() => handleFeedback(prayer.id, customFeedbackText.trim())}
                                  className="rounded-xl bg-gradient-to-br from-[#d4a017] to-[#e8c547] text-[#3d2800] font-bold border-0"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>

                            <div className="flex justify-end pt-1">
                              <Button variant="ghost" size="sm" onClick={() => setFeedbackOpen(null)} className="text-xs">
                                Cancelar
                              </Button>
                            </div>
                          </motion.div>
                        </AnimatePresence>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setFeedbackOpen(prayer.id)}
                          className="rounded-full border-primary/20 text-xs font-semibold hover:bg-primary/5"
                        >
                          <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                          Dar Retorno aos Intercessores
                        </Button>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Delete Confirmation Alert Dialog */}
        <AlertDialog open={!!deletingPrayerId} onOpenChange={(open) => { if (!open) setDeletingPrayerId(null); }}>
          <AlertDialogContent className="rounded-[2rem] p-6">
            <AlertDialogHeader>
              <AlertDialogTitle>Remover Pedido de Oração?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação removerá seu pedido da lista e do histórico de intercessões da comunidade.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeletePrayer} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full font-bold">
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageTransition>
  );
};

export default MyPrayers;

