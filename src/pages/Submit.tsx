import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  Heart,
  Info,
  MessageCircle,
  Send,
  ShieldAlert,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import PageTransition from "@/components/PageTransition";
import { usePushPrompt } from "@/contexts/PushPromptContext";
import { supabase } from "@/integrations/supabase/client";
import { XP_REWARDS } from "@/lib/xp";
import { useXp } from "@/hooks/use-xp";
import { formatTimeAgo } from "@/lib/utils";

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

type ModerationPolicy = {
  code: string;
  label: string;
  severity: "low" | "medium" | "high";
};

type SubmitPrayerResponse = {
  status: "approved" | "needs_review" | "pending_review";
  prayer_request?: {
    id: string;
    title: string | null;
    status: string;
    is_anonymous: boolean;
  };
  policies?: ModerationPolicy[];
  risk_score?: number;
};

type IntercessorSummary = {
  name: string;
  city: string;
  state: string;
};

type ProfileSummary = {
  id: string;
  full_name: string | null;
  display_name: string | null;
  show_real_name: boolean;
  city: string | null;
  state: string | null;
};

type PrayerHistoryItem = {
  id: string;
  title: string | null;
  content: string;
  created_at: string;
  status: string;
  feedback: string | null;
  prayer_count: number;
  reactions: Record<string, number>;
  intercessors: IntercessorSummary[];
};

const isRestrictedPrayer = (status?: string | null) =>
  status === "pending_review" || status === "policy_violation" || status === "banned";

const getRestrictedMessage = (status?: string | null) => {
  if (status === "pending_review") {
    return "Este pedido está em revisão e ainda não está disponível para a comunidade.";
  }

  return "Este pedido não pode continuar público porque não está de acordo com as políticas do Améns.";
};

const Submit = () => {
  const navigate = useNavigate();
  const { addXp } = useXp();
  const { triggerPushPrompt } = usePushPrompt();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isAnonymousInfoOpen, setIsAnonymousInfoOpen] = useState(false);
  const [formData, setFormData] = useState({ title: "", content: "", location: "" });
  const [moderationReview, setModerationReview] = useState<{ policies: ModerationPolicy[]; riskScore: number } | null>(null);

  const [prayers, setPrayers] = useState<PrayerHistoryItem[]>([]);
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
        .limit(20);

      if (error) throw error;
      if (!prayerData || prayerData.length === 0) {
        setPrayers([]);
        return;
      }

      const prayerIds = prayerData.map((prayer) => prayer.id);
      const { data: reactionData } = await supabase
        .from("prayer_reactions")
        .select("prayer_request_id, reaction_type")
        .in("prayer_request_id", prayerIds);

      const reactionsByPrayer: Record<string, Record<string, number>> = {};
      reactionData?.forEach((reaction) => {
        if (!reactionsByPrayer[reaction.prayer_request_id]) reactionsByPrayer[reaction.prayer_request_id] = {};
        reactionsByPrayer[reaction.prayer_request_id][reaction.reaction_type] =
          (reactionsByPrayer[reaction.prayer_request_id][reaction.reaction_type] || 0) + 1;
      });

      const { data: intercessionData } = await supabase
        .from("prayer_intercessions")
        .select("prayer_request_id, user_id")
        .in("prayer_request_id", prayerIds);

      const intercessorsByPrayer: Record<string, IntercessorSummary[]> = {};
      if (intercessionData && intercessionData.length > 0) {
        const userIds = [...new Set(intercessionData.map((intercession) => intercession.user_id))];
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, full_name, display_name, show_real_name, city, state")
          .in("id", userIds);

        const profileMap = new Map(((profileData || []) as ProfileSummary[]).map((profile) => [profile.id, profile]));

        intercessionData.forEach((intercession) => {
          if (!intercessorsByPrayer[intercession.prayer_request_id]) intercessorsByPrayer[intercession.prayer_request_id] = [];
          const profile = profileMap.get(intercession.user_id);
          const name = profile?.show_real_name
            ? (profile.display_name || profile.full_name?.split(" ")[0] || "Intercessor")
            : "Um intercessor";
          intercessorsByPrayer[intercession.prayer_request_id].push({
            name,
            city: profile?.city || "",
            state: profile?.state || "",
          });
        });
      }

      setPrayers(prayerData.map((prayer) => ({
        ...prayer,
        reactions: reactionsByPrayer[prayer.id] || {},
        intercessors: intercessorsByPrayer[prayer.id] || [],
      })) as PrayerHistoryItem[]);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }

      const city = session.user.user_metadata?.city;
      const state = session.user.user_metadata?.state;
      if (city && state) {
        setFormData((current) => ({ ...current, location: `${city}, ${state}` }));
      } else if (city) {
        setFormData((current) => ({ ...current, location: city }));
      }
    });
  }, [navigate]);

  const notifyFriends = async (prayerId: string, title: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const userName = session.user.user_metadata?.full_name || "Um amigo";
      const userFirstName = userName.split(" ")[0];
      const { data: friendsData } = await supabase
        .from("friendships")
        .select("friend_id")
        .eq("user_id", session.user.id);

      if (!friendsData || friendsData.length === 0) return;

      const notifications = friendsData.map((friend) => ({
        user_id: friend.friend_id,
        prayer_request_id: prayerId,
        message: `🙏 ${userFirstName} acabou de enviar um novo pedido de oração: "${title}"`,
        is_read: false,
      }));

      await supabase.from("notifications").insert(notifications);
    } catch (error) {
      console.error("Error notifying friends:", error);
    }
  };

  const handleFeedback = async (prayerId: string, feedbackValue: string) => {
    const prayer = prayers.find((item) => item.id === prayerId);
    if (isRestrictedPrayer(prayer?.status)) {
      toast.error("Este pedido está com interações bloqueadas.");
      return;
    }

    setSendingFeedback(true);
    try {
      const { error } = await supabase.from("prayer_requests").update({ feedback: feedbackValue }).eq("id", prayerId);
      if (error) throw error;

      const { data: intercessions } = await supabase
        .from("prayer_intercessions")
        .select("user_id")
        .eq("prayer_request_id", prayerId);

      const feedbackLabel = FEEDBACK_OPTIONS.find((feedback) => feedback.value === feedbackValue)?.label || feedbackValue;

      if (intercessions && intercessions.length > 0) {
        const title = prayer?.title || "um pedido";
        const notifications = intercessions.map((intercession) => ({
          user_id: intercession.user_id,
          prayer_request_id: prayerId,
          message: `Retorno sobre "${title}": ${feedbackLabel}`,
        }));
        await supabase.from("notifications").insert(notifications);
      }

      setPrayers((current) => current.map((item) => item.id === prayerId ? { ...item, feedback: feedbackValue } : item));
      setFeedbackOpen(null);
      toast.success("Feedback enviado! Os intercessores serão notificados.");
    } catch (error) {
      console.error("Feedback error:", error);
      toast.error("Erro ao enviar feedback");
    } finally {
      setSendingFeedback(false);
    }
  };

  const submitPrayerRequest = async (confirmReview = false) => {
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
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke<SubmitPrayerResponse>("submit-prayer-request", {
        body: {
          title: formData.title.trim(),
          content: formData.content.trim(),
          location: formData.location.trim() || null,
          is_anonymous: isAnonymous,
          confirm_review: confirmReview,
        },
      });

      if (error) throw error;

      if (data?.status === "needs_review") {
        setModerationReview({
          policies: data.policies || [],
          riskScore: data.risk_score || 0,
        });
        toast.info("Revise o aviso antes de enviar seu pedido.");
        return;
      }

      if (data?.status === "pending_review") {
        toast.success("Seu pedido foi enviado para revisão. Avisaremos quando houver uma decisão.");
        setFormData({ title: "", content: "", location: "" });
        setIsAnonymous(false);
        setModerationReview(null);
        fetchHistory();
        return;
      }

      if (data?.prayer_request && !isAnonymous) {
        await notifyFriends(data.prayer_request.id, data.prayer_request.title || formData.title.trim());
      }

      const userId = session.user.id;
      const today = new Date().toISOString().split("T")[0];
      const submitXpKey = `amens_submit_xp_${userId}_${today}`;
      if (userId && !localStorage.getItem(submitXpKey)) {
        await addXp("submit");
        localStorage.setItem(submitXpKey, "1");
        toast.success(`Pedido enviado! Ganhou +${XP_REWARDS.submit} pontos de fé`);
      } else {
        toast.success("Pedido enviado com sucesso!");
      }

      setFormData({ title: "", content: "", location: "" });
      setIsAnonymous(false);
      setModerationReview(null);

      setTimeout(() => {
        triggerPushPrompt("Saiba quando alguém orar por seu pedido, autorize as notificações");
      }, 800);

      setTimeout(() => navigate("/"), 3000);
    } catch (error: unknown) {
      console.error("Error submitting prayer request:", error);
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      toast.error(`Erro técnico: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    submitPrayerRequest(false);
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
                    <Label htmlFor="title" className="text-base">Título *</Label>
                    <div className="w-10 h-10 overflow-visible relative flex-shrink-0">
                      <img
                        src="/enviar_pergaminho_3d.png"
                        alt="Pergaminho solitário"
                        className={`w-full h-full object-contain transition-all duration-500 ${isSubmitting ? "drop-shadow-[0_0_25px_rgba(255,215,0,1)] brightness-125 scale-110" : "drop-shadow-sm"}`}
                      />
                    </div>
                  </div>
                  <Input
                    id="title"
                    placeholder="Ex: Cura para meu filho Miguel"
                    value={formData.title}
                    onChange={(event) => {
                      setFormData({ ...formData, title: event.target.value });
                      setModerationReview(null);
                    }}
                    maxLength={100}
                  />
                </div>

                <div>
                  <Label htmlFor="content" className="text-base">Seu Pedido de Oração *</Label>
                  <Textarea
                    id="content"
                    placeholder="Descreva seu pedido de oração com detalhes..."
                    value={formData.content}
                    onChange={(event) => {
                      setFormData({ ...formData, content: event.target.value });
                      setModerationReview(null);
                    }}
                    className="mt-2 min-h-[180px]"
                    required
                    maxLength={1000}
                  />
                  <p className="text-sm text-muted-foreground mt-1">{formData.content.length}/1000 caracteres</p>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="is-anonymous"
                      checked={isAnonymous}
                      onCheckedChange={(checked) => setIsAnonymous(checked === true)}
                    />
                    <Label htmlFor="is-anonymous" className="text-sm font-semibold cursor-pointer">
                      Enviar como anônimo
                    </Label>
                  </div>
                  <Popover open={isAnonymousInfoOpen} onOpenChange={setIsAnonymousInfoOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="rounded-full p-1 text-primary hover:bg-primary/10"
                        aria-label="Entenda o envio anônimo"
                        onMouseEnter={() => setIsAnonymousInfoOpen(true)}
                        onFocus={() => setIsAnonymousInfoOpen(true)}
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="max-w-xs text-sm leading-relaxed">
                      Seu nome e foto não aparecerão para quem rezar por este pedido. Você ainda poderá receber reações e enviar retornos, mas sua identidade ficará preservada para a comunidade.
                    </PopoverContent>
                  </Popover>
                </div>

                {moderationReview && (
                  <Alert className="border-amber-300 bg-amber-50 text-amber-950">
                    <ShieldAlert className="w-4 h-4 text-amber-700" />
                    <AlertTitle>Seu pedido precisa de atenção</AlertTitle>
                    <AlertDescription className="space-y-3">
                      <p>
                        Encontramos possíveis informações sensíveis ou conteúdo que pode não estar de acordo com as políticas do Améns.
                        Você pode ajustar o texto antes de enviar ou encaminhar o pedido para revisão.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {moderationReview.policies.map((policy) => (
                          <span key={policy.code} className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-bold text-amber-800 border border-amber-200">
                            {policy.label}
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        <Button type="button" variant="outline" onClick={() => setModerationReview(null)} className="border-amber-300 text-amber-900 hover:bg-amber-100">
                          Editar pedido
                        </Button>
                        <Button type="button" onClick={() => submitPrayerRequest(true)} disabled={isSubmitting} className="bg-amber-600 text-white hover:bg-amber-700 border-0">
                          Enviar para revisão
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <Button type="submit" disabled={isSubmitting} size="lg" className="w-full gradient-divine text-black hover:opacity-90 font-bold">
                  <Send className="w-4 h-4 mr-2" />
                  {isSubmitting ? "Enviando..." : "Enviar Pedido"}
                </Button>
              </form>
            </Card>
          </motion.div>

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
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
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
                    {prayers.map((prayer, index) => {
                      const isRestricted = isRestrictedPrayer(prayer.status);
                      const reactionsCount = Object.values(prayer.reactions).reduce((total, value) => total + value, 0);

                      return (
                        <motion.div
                          key={prayer.id}
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Card className={`p-6 soft-shadow bg-white/70 backdrop-blur-sm rounded-[2rem] ${isRestricted ? "border-amber-200" : "border-primary/5"}`}>
                            <div className="mb-4">
                              <div className="flex justify-between items-start gap-3 mb-2">
                                {prayer.title && <h3 className="text-base font-bold text-foreground">{prayer.title}</h3>}
                                <span className="text-[10px] bg-primary/5 px-2 py-1 rounded-full text-primary font-bold">{formatTimeAgo(prayer.created_at)}</span>
                              </div>
                              {isRestricted ? (
                                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                                  <p className="font-bold mb-1">Conteúdo indisponível</p>
                                  <p>{getRestrictedMessage(prayer.status)}</p>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{prayer.content}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-4 text-[11px] text-muted-foreground mb-4">
                              <div className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> <span>{prayer.prayer_count}</span></div>
                              <div className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> <span>{reactionsCount}</span></div>
                            </div>

                            {!isRestricted && prayer.intercessors.length > 0 && (
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
                                        {prayer.intercessors.map((intercessor, intercessorIndex) => (
                                          <span key={intercessorIndex} className="bg-white/50 px-2 py-1 rounded-full text-[9px] font-bold text-stone-600 border border-primary/5">
                                            🙏 {intercessor.name}
                                          </span>
                                        ))}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )}

                            <div className="pt-3 border-t border-primary/5">
                              {isRestricted ? (
                                <div className="flex items-center gap-2 text-[11px] font-bold text-amber-700">
                                  <ShieldAlert className="w-3.5 h-3.5" />
                                  <span>Interações bloqueadas para este pedido.</span>
                                </div>
                              ) : prayer.feedback ? (
                                <div className="flex items-center gap-2 text-[11px] font-bold text-primary">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Seu retorno: {FEEDBACK_OPTIONS.find((feedback) => feedback.value === prayer.feedback)?.emoji} {FEEDBACK_OPTIONS.find((feedback) => feedback.value === prayer.feedback)?.label}</span>
                                </div>
                              ) : (
                                <div>
                                  {feedbackOpen === prayer.id ? (
                                    <div className="space-y-2 py-2">
                                      <p className="text-[10px] font-black text-muted-foreground uppercase mb-2 tracking-widest">Dê um retorno aos intercessores:</p>
                                      <div className="grid grid-cols-1 gap-2">
                                        {FEEDBACK_OPTIONS.map((option) => (
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
                      );
                    })}
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
