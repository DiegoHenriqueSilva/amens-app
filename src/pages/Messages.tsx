import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mail, Sparkles, ArrowLeft, Heart, CheckCircle2, MessageCircle, Flag } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { formatTimeAgo } from "@/lib/utils";
import { usePushPrompt } from "@/contexts/PushPromptContext";
import "./messages.css";
import { ReportUserDialog } from "@/components/ReportUserDialog";

interface NotificationRecord {
  id: string;
  message: string;
  type?: string | null;
  is_read: boolean;
  created_at: string;
  prayer_request_id?: string | null;
  sender_id?: string | null;
}

const PAGE_SIZE = 20;

const renderNotificationMessage = (message: string) => {
  const match = message.match(/^(\P{L}*?)(\p{L}[^\n]*?)(?= (?:acabou de enviar|reagiu com|te convidou)\b)([\s\S]*)$/u);
  if (!match) return message;
  return <>{match[1]}<span className="text-blue-600 underline underline-offset-2 font-semibold">{match[2]}</span>{match[3]}</>;
};

const Messages = () => {
  const navigate = useNavigate();
  const { triggerPushPrompt } = usePushPrompt();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reportedSender, setReportedSender] = useState<{ id: string; name?: string } | null>(null);
  const requestRef = useRef(0);
  const currentUserIdRef = useRef<string | null>(null);

  const fetchNotifications = async (userId: string, from = 0, append = false) => {
    const requestId = ++requestRef.current;
    if (append) setLoadingMore(true); else setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).range(from, from + PAGE_SIZE - 1);
    if (requestId !== requestRef.current || currentUserIdRef.current !== userId) return;
    if (error) {
      setLoadError("Não foi possível carregar suas mensagens. Tente novamente.");
    } else {
      const page = (data ?? []) as NotificationRecord[];
      setNotifications(previous => append ? [...previous, ...page] : page);
      setHasMore(page.length === PAGE_SIZE);
    }
    if (append) setLoadingMore(false); else setLoading(false);
  };

  useEffect(() => {
    let disposed = false;
    let promptTimer: number | undefined;
    const initialRequestVersion = requestRef.current;
    const applySession = (session: { user: { id: string } } | null) => {
      if (disposed) return;
      requestRef.current++;
      currentUserIdRef.current = session?.user.id ?? null;
      setNotifications([]);
      setHasMore(false);
      setLoadError(null);
      if (!session) {
        setLoading(false);
        navigate("/auth");
        return;
      }
      void fetchNotifications(session.user.id);
      promptTimer = window.setTimeout(() => triggerPushPrompt("Fique sabendo quando te enviarem mensagens, autorize as notificações"), 1500);
    };
    void supabase.auth.getSession().then(({ data: { session } }) => applySession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => applySession(session));
    return () => { disposed = true; requestRef.current = initialRequestVersion + 1; subscription.unsubscribe(); if (promptTimer) window.clearTimeout(promptTimer); };
  }, [navigate, triggerPushPrompt]);

  const markAsRead = async (id: string) => {
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    if (error) { toast.error("Não foi possível marcar esta mensagem como lida."); return; }
    window.dispatchEvent(new Event("notifications-read"));
    setNotifications(previous => previous.map(notification => notification.id === id ? { ...notification, is_read: true } : notification));
  };

  const openNotification = (notification: NotificationRecord) => {
    void markAsRead(notification.id);
    if (notification.type === "daily_gospel") navigate("/daily-gospel");
    else if (notification.prayer_request_id) navigate(`/pray?id=${notification.prayer_request_id}`);
    else if (notification.message.toLowerCase().includes("interceder")) navigate("/pray");
  };

  const markAllAsRead = async () => {
    const userId = currentUserIdRef.current;
    if (!userId) return;
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
    if (error) { toast.error("Não foi possível marcar todas as mensagens como lidas."); return; }
    window.dispatchEvent(new Event("notifications-read"));
    setNotifications(previous => previous.map(notification => ({ ...notification, is_read: true })));
    toast.success("Todas as graças lidas! 🙏");
  };

  return (
    <PageTransition>
      <div className="messages-page min-h-screen relative overflow-hidden pb-28">
        <div className="absolute top-[-5rem] left-[-5rem] w-[20rem] h-[20rem] rounded-full bg-primary/5 blur-3xl opacity-50" />
        <div className="absolute bottom-[-5rem] right-[-5rem] w-[20rem] h-[20rem] rounded-full bg-accent/5 blur-3xl opacity-50" />
        <div className="container mx-auto px-6 py-8 relative z-10 max-w-lg">
          <div className="flex items-center justify-between mb-8">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} aria-label="Voltar ao início"><ArrowLeft className="w-5 h-5" aria-hidden="true" /></Button>
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-[10px] uppercase tracking-widest font-bold text-primary hover:bg-primary/5 whitespace-nowrap">Marcar todas como lidas</Button>
          </div>
          <motion.div className="text-center mb-10" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20"><Mail className="w-8 h-8 text-primary" aria-hidden="true" /></div>
            <h1 className="text-4xl font-bold text-foreground mb-1 text-glow">Mensagens</h1>
            <p className="text-[11px] uppercase tracking-[0.25em] font-bold text-muted-foreground opacity-60">Sua Caixa de Graças</p>
          </motion.div>
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {loading ? [1, 2, 3].map(i => <Card key={i} className="px-4 py-3 border-primary/5 rounded-2xl animate-pulse h-16" />) : loadError ? (
                <div className="text-center py-16 space-y-4"><p className="text-sm text-muted-foreground">{loadError}</p><Button variant="outline" onClick={() => currentUserIdRef.current && void fetchNotifications(currentUserIdRef.current)}>Tentar novamente</Button></div>
              ) : notifications.length > 0 ? notifications.map((notification, index) => (
                <motion.div key={notification.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} onClick={() => openNotification(notification)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openNotification(notification); } }} role="button" tabIndex={0} aria-label={`Abrir mensagem: ${notification.message}`} className="cursor-pointer active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-2xl">
                  <Card className={`px-4 py-3 border-primary/5 soft-shadow transition-all rounded-2xl relative overflow-hidden ${notification.is_read ? "bg-white/40" : "bg-white/80 border-primary/15 shadow-md"}`}>
                    {!notification.is_read && <div className="absolute top-0 right-0 w-8 h-8 bg-primary/10 rounded-bl-3xl flex items-center justify-center"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /></div>}
                    <div className="flex gap-3"><div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${notification.message.includes("reagiu") ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"}`}>{notification.message.includes("reagiu") ? <Heart className="w-5 h-5" aria-hidden="true" /> : <Sparkles className="w-5 h-5" aria-hidden="true" />}</div><div className="flex-1 min-w-0"><p className={`text-[14px] leading-tight mb-1 break-words ${notification.is_read ? "text-foreground/70" : "font-bold text-foreground"}`}>{renderNotificationMessage(notification.message)}</p><div className="flex items-center justify-between"><p className="text-[10px] text-muted-foreground font-medium">{formatTimeAgo(notification.created_at)}</p>{notification.is_read && <CheckCircle2 className="w-3 h-3 text-primary/40" aria-label="Mensagem lida" />}{notification.sender_id && <button type="button" aria-label="Denunciar remetente" title="Denunciar remetente" className="ml-auto mr-2 rounded-full p-1 text-muted-foreground hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400" onClick={event => { event.stopPropagation(); setReportedSender({ id: notification.sender_id! }); }}><Flag className="h-3 w-3" aria-hidden="true" /></button>}</div></div></div>
                  </Card>
                </motion.div>
              )) : <div className="text-center py-20 opacity-30"><MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-20" aria-hidden="true" /><p className="text-sm font-medium italic">Sua caixa de graças está pronta para receber améns. 🙏</p></div>}
            </AnimatePresence>
            {!loading && !loadError && hasMore && <Button variant="outline" className="w-full mt-4" onClick={() => currentUserIdRef.current && void fetchNotifications(currentUserIdRef.current, notifications.length, true)} disabled={loadingMore}>{loadingMore ? "Carregando…" : "Carregar mensagens antigas"}</Button>}
          </div>
          <motion.div className="text-center mt-12 mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}><p className="text-[10px] text-muted-foreground/60 leading-relaxed max-w-[200px] mx-auto uppercase tracking-widest font-bold">As notificações são arquivadas após 30 dias de luz.</p></motion.div>
          <ReportUserDialog open={Boolean(reportedSender)} targetUserId={reportedSender?.id ?? null} targetName={reportedSender?.name} onClose={() => setReportedSender(null)} onConfirmed={() => setReportedSender(null)} />
        </div>
      </div>
    </PageTransition>
  );
};

export default Messages;
