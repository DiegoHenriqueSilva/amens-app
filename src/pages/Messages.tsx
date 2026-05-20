import { useState, useEffect } from "react";
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
import { ReportMessageDialog } from "@/components/ReportMessageDialog";

const Messages = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportMsg, setReportMsg] = useState<{ userId: string } | null>(null);

  const { triggerPushPrompt } = usePushPrompt();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      fetchNotifications(session.user.id);
      
      // Delay push prompt slightly to not conflict with page animate-in
      setTimeout(() => {
         triggerPushPrompt("Fique sabendo quando te enviarem mensagens, autorize as notificações");
      }, 1500);
    });
  }, [navigate]);

  const fetchNotifications = async (userId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) setNotifications(data);
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (!error) {
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    }
  };

  const markAllAsRead = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", session.user.id)
      .eq("is_read", false);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success("Todas as graças lidas! 🙏");
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background relative overflow-hidden pb-28">
        <div className="absolute top-[-5rem] left-[-5rem] w-[20rem] h-[20rem] rounded-full bg-primary/5 blur-3xl opacity-50" />
        <div className="absolute bottom-[-5rem] right-[-5rem] w-[20rem] h-[20rem] rounded-full bg-accent/5 blur-3xl opacity-50" />

        <div className="container mx-auto px-6 py-8 relative z-10 max-w-lg">
          <div className="flex items-center justify-between mb-8">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Button 
               variant="ghost" 
               size="sm" 
               onClick={markAllAsRead}
               className="text-[10px] uppercase tracking-widest font-bold text-primary hover:bg-primary/5"
            >
               Limpar Tudo
            </Button>
          </div>

          <motion.div 
            className="text-center mb-10"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-1 text-glow">Mensagens</h1>
            <p className="text-[11px] uppercase tracking-[0.25em] font-bold text-muted-foreground opacity-60">Sua Caixa de Graças</p>
          </motion.div>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {loading ? (
                [1, 2, 3].map(i => (
                  <Card key={i} className="p-5 border-primary/5 rounded-3xl animate-pulse h-24" />
                ))
              ) : notifications.length > 0 ? (
                notifications.map((notif, index) => (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => {
                      markAsRead(notif.id);
                      if (notif.prayer_request_id) {
                        navigate(`/pray?id=${notif.prayer_request_id}`);
                      } else if (notif.message.toLowerCase().includes('interceder')) {
                        navigate('/pray');
                      }
                    }}
                    className="cursor-pointer active:scale-95 transition-transform"
                  >
                    <Card className={`p-6 border-primary/5 soft-shadow transition-all rounded-[1.8rem] relative overflow-hidden ${notif.is_read ? 'bg-white/40' : 'bg-white/80 border-primary/15 shadow-md scale-[1.01]'}`}>
                       {!notif.is_read && (
                         <div className="absolute top-0 right-0 w-8 h-8 bg-primary/10 rounded-bl-3xl flex items-center justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                         </div>
                       )}
                       
                       <div className="flex gap-4">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${notif.message.includes('reagiu') ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'}`}>
                             {notif.message.includes('reagiu') ? <Heart className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                          </div>

                          <div className="flex-1">
                             <p className={`text-[14px] leading-tight mb-2 ${notif.is_read ? 'text-foreground/70' : 'font-bold text-foreground'}`}>
                                {notif.message}
                             </p>
                             <div className="flex items-center justify-between">
                               <p className="text-[10px] text-muted-foreground font-medium">
                                 {formatTimeAgo(notif.created_at)}
                               </p>
                               <div className="flex items-center gap-2">
                                 {notif.is_read && <CheckCircle2 className="w-3 h-3 text-primary/40" />}
                                 {notif.sender_id && (
                                   <button
                                     onClick={(e) => { e.stopPropagation(); setReportMsg({ userId: notif.sender_id }); }}
                                     className="p-1 rounded-full hover:bg-red-50 text-muted-foreground/40 hover:text-red-400 transition-colors"
                                     title="Reportar remetente"
                                   >
                                     <Flag className="w-3 h-3" />
                                   </button>
                                 )}
                               </div>
                             </div>
                          </div>
                       </div>
                    </Card>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-20 opacity-30">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="text-sm font-medium italic">Sua caixa de graças está pronta para receber améns. 🙏</p>
                </div>
              )}
            </AnimatePresence>
          </div>

          <motion.div 
             className="text-center mt-12 mb-8"
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ delay: 0.8 }}
          >
             <p className="text-[10px] text-muted-foreground/60 leading-relaxed max-w-[200px] mx-auto uppercase tracking-widest font-bold">
                As notificações são arquivadas após 30 dias de luz.
             </p>
          </motion.div>
        </div>
      </div>

      <ReportMessageDialog
        open={!!reportMsg}
        targetUserId={reportMsg?.userId ?? null}
        onClose={() => setReportMsg(null)}
        onConfirmed={() => setReportMsg(null)}
      />
    </PageTransition>
  );
};

export default Messages;
