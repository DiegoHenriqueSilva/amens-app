import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Eye, Heart, Users, ChevronDown, ChevronUp, Check, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useXp } from "@/hooks/use-xp";
import { XP_REWARDS } from "@/lib/xp";
import PageTransition from "@/components/PageTransition";
import { usePushPrompt } from "@/contexts/PushPromptContext";
import { AnimatePresence, motion } from "framer-motion";
import { formatTimeAgo } from "@/lib/utils";
import { AnonymityToggle } from "@/components/ui/anonymity-toggle";
import { cn } from "@/lib/utils";

const THEMES = ["Família", "Saúde", "Trabalho", "Gratidão", "Luto", "Paz", "Cura", "Relacionamento"];

const FEEDBACK_OPTIONS = [
  { value: "success", label: "Deu certo, obrigado pelas orações!" },
  { value: "not_this_time", label: "Não foi desta vez, mas obrigado pelas preces!" },
  { value: "keep_trying", label: "Não deu certo mas vou continuar tentando" },
  { value: "god_knows", label: "Não deu certo mas Deus sabe o que faz, obrigado pelas orações" },
  { value: "grace_received", label: "Consegui a graça solicitada, obrigado!" },
];

const Submit = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addXp } = useXp();
  const { triggerPushPrompt } = usePushPrompt();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);

  const [prayers, setPrayers] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState<string | null>(null);
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [intercessorsOpen, setIntercessorsOpen] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth");
    });
    fetchHistory();
  }, [navigate]);

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
      if (!prayerData || prayerData.length === 0) { setPrayers([]); return; }

      const prayerIds = prayerData.map((p) => p.id);
      const { data: reactionData } = await supabase
        .from("prayer_reactions").select("prayer_request_id, reaction_type").in("prayer_request_id", prayerIds);
      const reactionsByPrayer: Record<string, Record<string, number>> = {};
      reactionData?.forEach((r) => {
        if (!reactionsByPrayer[r.prayer_request_id]) reactionsByPrayer[r.prayer_request_id] = {};
        reactionsByPrayer[r.prayer_request_id][r.reaction_type] = (reactionsByPrayer[r.prayer_request_id][r.reaction_type] || 0) + 1;
      });

      const { data: intercessionData } = await supabase
        .from("prayer_intercessions").select("prayer_request_id, user_id").in("prayer_request_id", prayerIds);
      const intercessorsByPrayer: Record<string, any[]> = {};
      if (intercessionData && intercessionData.length > 0) {
        const userIds = [...new Set(intercessionData.map((i) => i.user_id))];
        const { data: profileData } = await supabase
          .from("profiles" as any).select("id, full_name, display_name, show_real_name, city, state").in("id", userIds);
        const profileMap = new Map(((profileData || []) as any[]).map((p) => [p.id, p]));
        intercessionData.forEach((i) => {
          if (!intercessorsByPrayer[i.prayer_request_id]) intercessorsByPrayer[i.prayer_request_id] = [];
          const profile = profileMap.get(i.user_id);
          const name = profile?.show_real_name
            ? (profile.display_name || profile.full_name?.split(" ")[0] || "Intercessor") : "Um intercessor";
          intercessorsByPrayer[i.prayer_request_id].push({ name, city: profile?.city || "" });
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
      const feedbackLabel = FEEDBACK_OPTIONS.find((f) => f.value === feedbackValue)?.label || feedbackValue;
      if (intercessions && intercessions.length > 0) {
        const prayer = prayers.find((p) => p.id === prayerId);
        const notifications = intercessions.map((i) => ({
          user_id: i.user_id,
          prayer_request_id: prayerId,
          message: `Retorno sobre "${prayer?.title || "um pedido"}": ${feedbackLabel}`,
        }));
        await supabase.from("notifications").insert(notifications);
      }
      setPrayers((prev) => prev.map((p) => (p.id === prayerId ? { ...p, feedback: feedbackValue } : p)));
      setFeedbackOpen(null);
      toast.success("Feedback enviado! Os intercessores serão notificados.");
    } catch {
      toast.error("Erro ao enviar feedback");
    } finally {
      setSendingFeedback(false);
    }
  };

  const notifyFriends = async (prayerId: string, prayerTitle: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const firstName = (session.user.user_metadata?.full_name || "Um amigo").split(" ")[0];
      const { data: friendsData } = await supabase
        .from("friendships").select("friend_id").eq("user_id", session.user.id);
      if (!friendsData || friendsData.length === 0) return;
      await supabase.from("notifications").insert(
        friendsData.map((f) => ({
          user_id: f.friend_id,
          prayer_request_id: prayerId,
          message: `🙏 ${firstName} acabou de enviar um novo pedido de oração: "${prayerTitle}"`,
          is_read: false,
        })),
      );
    } catch (e) {
      console.error("Error notifying friends:", e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 5) { toast.error("O título deve ter pelo menos 5 caracteres"); return; }
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const fullName = session?.user?.user_metadata?.full_name || "Anônimo";
      const firstName = isAnonymous ? null : fullName.split(" ")[0];

      const { data, error } = await supabase.from("prayer_requests").insert([{
        title: title.trim(),
        content: content.trim() || null,
        prayer_count: 0,
        user_id: session?.user?.id,
        author_name: firstName,
      }]).select().single();

      if (error) throw error;
      if (data) await notifyFriends(data.id, data.title);

      const userId = session?.user?.id;
      const today = new Date().toISOString().split("T")[0];
      const submitXpKey = `amens_submit_xp_${userId}_${today}`;
      if (userId && !localStorage.getItem(submitXpKey)) {
        await addXp("submit");
        localStorage.setItem(submitXpKey, "1");
      }

      toast.success("Seu pedido foi enviado. A comunidade poderá rezar por essa intenção.");
      setTitle("");
      setContent("");
      setIsAnonymous(false);
      setSelectedTheme(null);
      fetchHistory();

      setTimeout(() => triggerPushPrompt("Saiba quando alguém orar por seu pedido, autorize as notificações"), 800);
      setTimeout(() => navigate("/"), 3000);
    } catch (error: any) {
      toast.error(`Erro ao enviar: ${error.message || "tente novamente"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen pb-28">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-safe pt-4 pb-2">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 -ml-2 rounded-full flex items-center justify-center active:bg-black/5"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="font-serif text-[17px] tracking-tight text-ink">Nova intenção</div>
          <div className="w-9" />
        </div>

        <div className="px-5 max-w-xl mx-auto">
          <p className="text-[13px] text-ink-soft mb-6 mt-1">
            Sua intenção poderá ser orada pela comunidade.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Anonymity toggle — first element */}
            <AnonymityToggle active={isAnonymous} onChange={setIsAnonymous} />

            {/* Title field — inline serif */}
            <div>
              <label className="text-[10px] uppercase tracking-[0.28em] text-ink-soft block mb-2">
                Em uma frase
              </label>
              <input
                className="w-full bg-transparent border-0 border-b border-hairline font-serif text-xl py-2 outline-none placeholder:text-ink-soft/50 focus:border-ink/40 transition-colors"
                placeholder="Pela saúde da minha mãe…"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
              />
              <div className="flex justify-between mt-1">
                <span className="text-[11px] text-ink-soft">mínimo 5 caracteres</span>
                <span className="text-[11px] text-ink-soft font-mono">{title.length}/80</span>
              </div>
            </div>

            {/* Description — optional */}
            <div>
              <label className="text-[10px] uppercase tracking-[0.28em] text-ink-soft block mb-2">
                Conte mais <span className="normal-case tracking-normal">(opcional)</span>
              </label>
              <Textarea
                placeholder="Descreva o que está em seu coração…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                maxLength={1000}
              />
              <div className="flex justify-end mt-1">
                <span className="text-[11px] text-ink-soft font-mono">{content.length}/1000</span>
              </div>
            </div>

            {/* Theme chips — optional */}
            <div>
              <label className="text-[10px] uppercase tracking-[0.28em] text-ink-soft block mb-2">
                Tema <span className="normal-case tracking-normal">(opcional)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {THEMES.map((theme) => (
                  <button
                    key={theme}
                    type="button"
                    onClick={() => setSelectedTheme(selectedTheme === theme ? null : theme)}
                    className={cn(
                      "px-3.5 py-2 rounded-full text-xs border transition-all",
                      selectedTheme === theme
                        ? "bg-ink text-paper border-ink"
                        : "bg-transparent text-ink border-hairline hover:bg-vellum",
                    )}
                  >
                    {theme}
                  </button>
                ))}
              </div>
            </div>

            {/* Moderation note */}
            <p className="text-[11px] text-ink-soft">
              <span className="text-gold">✦</span> Pedidos passam por moderação antes de aparecer na comunidade.
            </p>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || title.trim().length < 5}
              className="w-full h-12 rounded-full bg-ink text-paper text-sm font-medium transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-35 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Enviando…" : "Compartilhar com a comunidade"}
            </button>

            <p className="text-center text-[11px] text-ink-soft">
              Você ganha {XP_REWARDS.submit} pontos na sua caminhada ao enviar.
            </p>
          </form>

          {/* History */}
          <div className="mt-12 pb-4">
            <button
              onClick={() => { setShowHistory(!showHistory); if (!showHistory) fetchHistory(); }}
              className="w-full flex items-center justify-between py-3 border-t border-hairline text-[11px] uppercase tracking-[0.24em] text-ink-soft"
            >
              Meus pedidos anteriores
              {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  {isLoadingHistory ? (
                    <div className="py-8 text-center">
                      <div className="animate-spin w-4 h-4 border-2 border-marian border-t-transparent rounded-full mx-auto" />
                    </div>
                  ) : prayers.length === 0 ? (
                    <p className="py-6 text-sm text-ink-soft text-center">Você ainda não enviou nenhum pedido.</p>
                  ) : (
                    <div className="space-y-4 pt-2">
                      {prayers.map((prayer) => (
                        <div key={prayer.id} className="bg-vellum border border-hairline rounded-xl p-5">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="font-serif text-[15px] leading-snug text-ink">{prayer.title}</p>
                            <span className="text-[10px] text-ink-soft shrink-0">{formatTimeAgo(prayer.created_at)}</span>
                          </div>
                          {prayer.content && (
                            <p className="text-[12px] text-ink-soft leading-relaxed line-clamp-2 mb-3">{prayer.content}</p>
                          )}

                          <div className="flex items-center gap-4 text-[11px] text-ink-soft mb-3">
                            <span className="flex items-center gap-1"><Eye size={12} />{prayer.prayer_count}</span>
                            <span className="flex items-center gap-1">
                              <Heart size={12} />
                              {Object.values(prayer.reactions as object).reduce((a: any, b: any) => a + b, 0)}
                            </span>
                          </div>

                          {/* Intercessors */}
                          {prayer.intercessors.length > 0 && (
                            <div className="mb-3">
                              <button
                                onClick={() => setIntercessorsOpen(intercessorsOpen === prayer.id ? null : prayer.id)}
                                className="flex items-center gap-1.5 text-[11px] text-marian"
                              >
                                <Users size={12} />
                                {prayer.intercessors.length} {prayer.intercessors.length === 1 ? "pessoa orou" : "pessoas oraram"} por você
                                {intercessorsOpen === prayer.id ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                              </button>
                              <AnimatePresence>
                                {intercessorsOpen === prayer.id && (
                                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-2">
                                    <div className="flex flex-wrap gap-1.5">
                                      {prayer.intercessors.map((int: any, idx: number) => (
                                        <span key={idx} className="bg-hairline px-2.5 py-1 rounded-full text-[10px] text-ink-soft">
                                          {int.name}{int.city ? ` · ${int.city}` : ""}
                                        </span>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}

                          {/* Feedback */}
                          <div className="pt-3 border-t border-dashed border-hairline">
                            {prayer.feedback ? (
                              <div className="flex items-center gap-1.5 text-[11px] text-marian">
                                <Check size={11} />
                                {FEEDBACK_OPTIONS.find((f) => f.value === prayer.feedback)?.label}
                              </div>
                            ) : feedbackOpen === prayer.id ? (
                              <div className="space-y-2">
                                <p className="text-[10px] uppercase tracking-[0.24em] text-ink-soft mb-2">Dê um retorno aos intercessores:</p>
                                {FEEDBACK_OPTIONS.map((option) => (
                                  <button
                                    key={option.value}
                                    disabled={sendingFeedback}
                                    onClick={() => handleFeedback(prayer.id, option.value)}
                                    className="w-full text-left px-3 py-2.5 rounded-lg border border-hairline hover:bg-hairline/50 text-[12px] text-ink transition-colors"
                                  >
                                    {option.label}
                                  </button>
                                ))}
                                <button onClick={() => setFeedbackOpen(null)} className="text-[11px] text-ink-soft hover:text-ink mt-1">
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setFeedbackOpen(prayer.id)}
                                className="flex items-center gap-1.5 text-[11px] text-marian hover:underline underline-offset-4"
                              >
                                <MessageCircle size={11} /> Dar retorno
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Submit;
