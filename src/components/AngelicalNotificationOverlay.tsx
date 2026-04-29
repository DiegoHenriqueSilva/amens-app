import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sparkles, Heart, Church, Award, Calendar, X } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AngelicalNotificationOverlayProps {
  notificationId: string | null;
  onClose: () => void;
}

export const AngelicalNotificationOverlay = ({ notificationId, onClose }: AngelicalNotificationOverlayProps) => {
  const [intercessor, setIntercessor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [prayerRequestId, setPrayerRequestId] = useState<string | null>(null);

  useEffect(() => {
    if (notificationId) {
      fetchIntercessorDetails();
    }
  }, [notificationId]);

  const fetchIntercessorDetails = async () => {
    setLoading(true);
    try {
      // 1. Get notification details to find the intercessor (sender_id)
      const { data: notification, error: notifError } = await supabase
        .from("notifications")
        .select("sender_id, prayer_request_id")
        .eq("id", notificationId)
        .single();

      if (notifError || !notification?.sender_id) throw notifError;
      setPrayerRequestId(notification.prayer_request_id);

      // 2. Get intercessor profile and XP
      const { data: profile, error: profError } = await supabase
        .from("profiles")
        .select("*, user_xp(total_xp)")
        .eq("id", notification.sender_id)
        .single();

      if (profError) throw profError;

      setIntercessor(profile);
    } catch (error) {
      console.error("Error fetching intercessor details:", error);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleThank = async () => {
    if (!intercessor) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const myName = session.user.user_metadata?.display_name || session.user.user_metadata?.full_name?.split(" ")[0] || "Um fiel";

      // 1. Notify the intercessor
      await supabase.from("notifications").insert({
        user_id: intercessor.id,
        message: `✨ ${myName} agradeceu pela sua oração! "Deus te abençoe!"`,
      });

      // 2. Grant XP to the intercessor (10 XP)
      const { error: xpError } = await supabase.rpc('add_xp', {
        p_action: 'thank_intercessor_reward',
        p_user_id: intercessor.id,
        p_xp_amount: 10
      });

      if (xpError) {
        console.warn("Could not award XP automatically, but notification will be sent.", xpError);
      }

      // Mark this notification as read
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      toast.success("Gratidão enviada com sucesso! 🙏");
      onClose();
    } catch (error) {
      toast.error("Erro ao enviar agradecimento.");
    }
  };

  const calculateLevel = (xp: number = 0) => {
    return Math.floor(Math.sqrt(xp / 10)) + 1;
  };

  if (!notificationId || loading || !intercessor) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/40 backdrop-blur-xl"
      >
        {/* Divine Sparkles Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-primary/20 rounded-full"
              initial={{ 
                x: Math.random() * window.innerWidth, 
                y: Math.random() * window.innerHeight,
                scale: 0 
              }}
              animate={{ 
                y: [null, Math.random() * -200],
                scale: [0, 1, 0],
                opacity: [0, 1, 0]
              }}
              transition={{ 
                duration: 3 + Math.random() * 4, 
                repeat: Infinity,
                delay: Math.random() * 5
              }}
            />
          ))}
        </div>

        <motion.div
          initial={{ scale: 0.8, y: 40, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.8, y: 40, opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 100 }}
          className="relative w-full max-w-sm bg-gradient-to-b from-white to-primary/5 rounded-[3rem] shadow-2xl border border-primary/20 p-8 text-center overflow-hidden"
        >
          {/* Angelical Halo Effect */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-primary/10 rounded-full blur-3xl -z-10" />
          
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full bg-secondary/50 hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>

          <div className="flex flex-col items-center space-y-6">
            <div className="relative">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-4 border border-dashed border-primary/30 rounded-full"
              />
              <Avatar className="w-24 h-24 border-4 border-white shadow-xl">
                <AvatarImage src={intercessor.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${intercessor.id}`} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  <Heart className="w-8 h-8" />
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-lg border border-primary/10">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {intercessor.show_real_name ? (intercessor.display_name || intercessor.full_name?.split(' ')[0]) : "Um Intercessor"}
              </h2>
              <div className="flex items-center justify-center gap-2 text-primary/70 mt-1">
                <Church className="w-4 h-4" />
                <span className="text-sm font-medium">{intercessor.parish || "Comunidade Améns"}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full">
              <div className="bg-white/50 backdrop-blur-sm p-4 rounded-3xl border border-primary/10">
                <Award className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Nível</p>
                <p className="text-lg font-black text-primary">{calculateLevel(intercessor.user_xp?.[0]?.total_xp)}</p>
              </div>
              <div className="bg-white/50 backdrop-blur-sm p-4 rounded-3xl border border-primary/10">
                <Calendar className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Membro há</p>
                <p className="text-sm font-bold text-foreground">
                  {formatDistanceToNow(new Date(intercessor.created_at), { locale: ptBR })}
                </p>
              </div>
            </div>

            <div className="pt-4 w-full">
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Esta pessoa acaba de dedicar um momento sagrado para orar pela sua causa. Que tal retribuir com uma benção?
              </p>
              <Button 
                onClick={handleThank}
                className="w-full h-16 gradient-divine rounded-2xl text-lg font-bold shadow-lg hover:scale-[1.02] transition-transform active:scale-[0.98]"
              >
                Agradecer e Abençoar
              </Button>
              <p className="text-[10px] text-primary/60 font-bold mt-4 uppercase tracking-[0.2em]">
                "Obrigado pela oração. Deus te abençoe!"
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
