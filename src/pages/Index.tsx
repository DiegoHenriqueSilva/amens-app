import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useXp } from "@/hooks/use-xp";
import { XpBadge } from "@/components/XpBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, Send, Sparkles, LogOut, User, BookOpen, HandHeart, Sun, Users, Wind, Mail, Home } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PageTransition from "@/components/PageTransition";
import { NotificationBell } from "@/components/NotificationBell";
import { motion, AnimatePresence } from "framer-motion";
import { scheduleDailyPromiseNotification } from "@/lib/notifications";
import { CompleteProfileDialog } from "@/components/CompleteProfileDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Check, X } from "lucide-react";
import { JornadaFe } from "@/components/JornadaFe";
import { AngelicalNotificationOverlay } from "@/components/AngelicalNotificationOverlay";
import { useLocation } from "react-router-dom";

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const Index = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const navigate = useNavigate();
  const { totalXp, loading: xpLoading } = useXp();
  const [profile, setProfile] = useState<any>(null);
  const location = useLocation();
  const [activeIntercessionNotifId, setActiveIntercessionNotifId] = useState<string | null>(null);

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', userId).single();
      if (data) setProfile(data);
    } catch (e) {
      console.warn("Profile fetch error (Expected if disconnected or empty):", e);
    }
  };


  useEffect(() => {
    // Safety check for supabase connection
    if (!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL.includes("YOUR_")) {
      console.warn("Supabase keys missing. App in static mode.");
      return;
    }

    const initSesion = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        if (session) {
          fetchProfile(session.user.id);
          scheduleDailyPromiseNotification();
        }
      } catch (e) {
        console.error("Auth session check failed:", e);
      }
    };

    initSesion();

    // Realtime Presence
    const channel = supabase.channel('online-users', {
      config: { presence: { key: user?.id || 'anonymous' } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        try {
          const state = channel.presenceState();
          const count = Object.keys(state).length;
          setOnlineCount(count);
        } catch (e) {
          console.error("Presence sync error:", e);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try {
            await channel.track({ online_at: new Date().toISOString() });
          } catch (e) {
            console.warn("Presence track error:", e);
          }
        }
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);

      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
        const storedRef = localStorage.getItem("fe_referrer");
        if (storedRef && storedRef !== session.user.id) {
          supabase.functions.invoke("process-referral", {
            body: { referrer_user_id: storedRef, referred_user_id: session.user.id },
          }).then(async ({ error }) => {
            if (!error) {
              // Referral processed, but we no longer show the friend prompt
            }
          }).catch(e => console.error("Referral process error:", e));
          localStorage.removeItem("fe_referrer");
        }
      }
    });

    return () => {
      subscription?.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const notifId = params.get("intercession_id");
    if (notifId) {
      setActiveIntercessionNotifId(notifId);
      // Clean up URL without reload
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [location]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Até breve!");
    } catch (e) {
      console.error("Sign out error:", e);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen pb-28">
        <CompleteProfileDialog />
        <AngelicalNotificationOverlay
          notificationId={activeIntercessionNotifId}
          onClose={() => setActiveIntercessionNotifId(null)}
        />

        <div className="container mx-auto px-6 py-8 relative z-10 max-w-lg">

          <motion.div className="text-center mb-8 pt-4" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-5xl font-bold text-foreground mb-1 tracking-tight text-glow text-soft-outline">Améns</h1>
            <div className="flex items-center justify-center gap-2 text-[#8b6508] text-glow">
              <Sparkles className="w-3 h-3" />
              <span className="text-xs uppercase tracking-[0.2em] font-bold">Unidos pela Fé</span>
              <Sparkles className="w-3 h-3" />
            </div>
          </motion.div>

          {/* Jornada da Fé Diária */}
          {user && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-6 -mx-2">
              <JornadaFe />
            </motion.div>
          )}

          {/* User / Faith Points Card */}
          {user && !xpLoading && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
              <Card className="p-5 mb-8 soft-shadow border-primary/5 bg-white/70 backdrop-blur-sm rounded-[2rem]">
                <XpBadge totalXp={totalXp} userName={profile?.full_name || user.user_metadata?.full_name || ""} avatarUrl={profile?.avatar_url} />
              </Card>
            </motion.div>
          )}

          <motion.div className="grid grid-cols-2 gap-5 mb-8" variants={stagger} initial="initial" animate="animate">
            <motion.div variants={fadeUp}>
              <Link to="/pray">
                <Card className="p-6 h-full text-center flex flex-col items-center justify-between border-primary/5 soft-shadow bg-[#FAFAFA] hover:-translate-y-1 hover:shadow-xl transition-all duration-300 rounded-[2rem]">
                  <div className="w-14 h-14 bg-transparent rounded-full flex items-center justify-center mb-4 overflow-hidden">
                    <img src="/oracao_3d.png" alt="Orar por uma causa" className="w-full h-full object-cover rounded-full drop-shadow-md" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold mb-2">Orar por uma Causa</h2>
                    <p className="text-[13.5px] text-slate-700 leading-snug mb-4 font-semibold [text-shadow:_0_1px_2px_rgb(255_255_255_/_80%)] px-2">Receba um pedido e seja um instrumento de graça</p>
                  </div>
                  <Button size="sm" className="w-full rounded-full text-xs py-5 font-bold shadow-md bg-gradient-to-br from-[#d4a017] to-[#e8c547] text-[#3d2800] hover:opacity-90 transition-opacity border-0">
                    <Heart className="w-3.5 h-3.5 mr-2" />
                    Começar
                  </Button>
                </Card>
              </Link>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Link to="/submit">
                <Card className="p-6 h-full text-center flex flex-col items-center justify-between border-primary/5 soft-shadow bg-[#FAFAFA] hover:-translate-y-1 hover:shadow-xl transition-all duration-300 rounded-[2rem]">
                  <div className="w-14 h-14 bg-transparent rounded-full flex items-center justify-center mb-4 overflow-hidden">
                    <img src="/enviaroracao_3d.png" alt="Enviar Pedido" className="w-full h-full object-cover rounded-full drop-shadow-md" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold mb-2">Enviar Pedido</h2>
                    <p className="text-[13.5px] text-slate-700 leading-snug mb-4 font-semibold [text-shadow:_0_1px_2px_rgb(255_255_255_/_80%)] px-2">Compartilhe sua necessidade e receba apoio</p>
                  </div>
                  <Button size="sm" className="w-full rounded-full text-xs py-5 font-bold shadow-md bg-gradient-to-br from-[#d4a017] to-[#e8c547] text-[#3d2800] hover:opacity-90 transition-opacity border-0">
                    <Send className="w-3.5 h-3.5 mr-2" />
                    Enviar
                  </Button>
                </Card>
              </Link>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Link to="/daily-gospel">
                <Card className="p-6 h-full text-center flex flex-col items-center justify-between border-primary/5 soft-shadow bg-[#FAFAFA] hover:-translate-y-1 hover:shadow-xl transition-all duration-300 rounded-[2rem]">
                  <div className="w-14 h-14 bg-transparent rounded-full flex items-center justify-center mb-4 overflow-hidden">
                    <img src="/evangelho_3d.png" alt="Evangelho do Dia" className="w-full h-full object-cover rounded-full drop-shadow-md" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold mb-2">Evangelho do Dia</h2>
                    <p className="text-[13.5px] text-slate-700 leading-snug mb-4 font-semibold [text-shadow:_0_1px_2px_rgb(255_255_255_/_80%)] px-2">A palavra sagrada com reflexões da IA</p>
                  </div>
                  <Button size="sm" className="w-full rounded-full text-xs py-5 font-bold shadow-md bg-gradient-to-br from-[#d4a017] to-[#e8c547] text-[#3d2800] hover:opacity-90 transition-opacity border-0">
                    <Sun className="w-3.5 h-3.5 mr-2" />
                    Ler
                  </Button>
                </Card>
              </Link>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Link to="/novenas">
                <Card className="p-6 h-full text-center flex flex-col items-center justify-between border-primary/5 soft-shadow bg-[#FAFAFA] hover:-translate-y-1 hover:shadow-xl transition-all duration-300 rounded-[2rem]">
                  <div className="w-14 h-14 bg-transparent rounded-full flex items-center justify-center mb-4 overflow-hidden">
                    <img src="/novenas.png" alt="Novenas" className="w-full h-full object-cover rounded-full drop-shadow-md" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold mb-2">Novenas</h2>
                    <p className="text-xs text-muted-foreground leading-tight mb-4 font-medium">Escolha uma novena para seguir com fé</p>
                  </div>
                  <Button size="sm" className="w-full rounded-full text-xs py-5 font-bold shadow-md bg-gradient-to-br from-[#d4a017] to-[#e8c547] text-[#3d2800] hover:opacity-90 transition-opacity border-0">
                    <BookOpen className="w-3.5 h-3.5 mr-2" />
                    Iniciar
                  </Button>
                </Card>
              </Link>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Link to="/rosary-selection">
                <Card className="p-6 h-full text-center flex flex-col items-center justify-between border-primary/5 soft-shadow bg-[#FAFAFA] hover:-translate-y-1 hover:shadow-xl transition-all duration-300 rounded-[2rem] border-dashed border-primary/20">
                  <div className="w-14 h-14 bg-transparent rounded-full flex items-center justify-center mb-4 overflow-hidden">
                    <img src="/sagrado_terco.png" alt="Sagrado Terço" className="w-full h-full object-cover rounded-full drop-shadow-md" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold mb-2">Sagrado Terço</h2>
                    <p className="text-xs text-muted-foreground leading-tight mb-4 font-medium">Reze seus mistérios com auxílio de voz</p>
                  </div>
                  <Button size="sm" className="w-full rounded-full text-xs py-5 font-bold shadow-md bg-gradient-to-br from-[#d4a017] to-[#e8c547] text-[#3d2800] hover:opacity-90 transition-opacity border-0">
                    <Sparkles className="w-3.5 h-3.5 mr-2" />
                    Iniciar
                  </Button>
                </Card>
              </Link>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Link to="/divine-promise">
                <Card className="p-6 h-full text-center flex flex-col items-center justify-between border-primary/5 soft-shadow bg-[#FAFAFA] hover:-translate-y-1 hover:shadow-xl transition-all duration-300 rounded-[2rem] border-dashed">
                  <div className="w-14 h-14 bg-transparent rounded-full flex items-center justify-center mb-4 overflow-hidden">
                    <img src="/divinaspromessas_3d.png" alt="Divina Promessa" className="w-full h-full object-cover rounded-full drop-shadow-md" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold mb-2">Divina Promessa</h2>
                    <p className="text-[13.5px] text-slate-700 leading-snug mb-4 font-semibold [text-shadow:_0_1px_2px_rgb(255_255_255_/_80%)] px-2">Uma citação bíblica para seu coração</p>
                  </div>
                  <Button size="sm" className="w-full rounded-full text-xs py-5 font-bold shadow-md bg-gradient-to-br from-[#d4a017] to-[#e8c547] text-[#3d2800] hover:opacity-90 transition-opacity border-0">
                    <Wind className="w-3.5 h-3.5 mr-2" />
                    Sortear
                  </Button>
                </Card>
              </Link>
            </motion.div>
          </motion.div>

          {/* Secondary Actions List */}
          <motion.div className="space-y-4 mb-10" variants={stagger} initial="initial" animate="animate">
            <motion.div variants={fadeUp}>
              <Link to="/terco">
                <Card className="p-4 flex items-center gap-4 border-primary/5 soft-shadow bg-gradient-to-r from-primary/10 to-primary/5 rounded-3xl hover:bg-white transition-colors relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="w-10 h-10 bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="flex-1 relative z-10">
                    <h3 className="text-sm font-bold text-foreground">Terço Guiado</h3>
                    <p className="text-[11px] text-muted-foreground font-medium w-full truncate">Reze acompanhando visualmente por voz</p>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-full text-[10px] h-8 px-4 border-primary/20 text-primary bg-background/50 hover:bg-primary hover:text-white">Iniciar</Button>
                </Card>
              </Link>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Link to="/my-prayers">
                <Card className="p-4 flex items-center gap-4 border-primary/5 soft-shadow bg-white/60 rounded-3xl hover:bg-white transition-colors">
                  <div className="w-10 h-10 bg-secondary/50 rounded-2xl flex items-center justify-center text-primary/60">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold">Minhas Preces</h3>
                    <p className="text-[11px] text-muted-foreground font-medium">Veja quem orou por você</p>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-full text-[10px] h-8 px-4 border-primary/20 text-primary">Ver Histórico</Button>
                </Card>
              </Link>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Link to="/my-intercessions">
                <Card className="p-4 flex items-center gap-4 border-primary/5 soft-shadow bg-white/60 rounded-3xl hover:bg-white transition-colors">
                  <div className="w-10 h-10 bg-secondary/50 rounded-2xl flex items-center justify-center text-primary/60">
                    <HandHeart className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold">Minhas Intercessões</h3>
                    <p className="text-[11px] text-muted-foreground font-medium">Causas que você apoiou</p>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-full text-[10px] h-8 px-4 border-primary/20 text-primary">Ver Lista</Button>
                </Card>
              </Link>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Link to='/friends'>
                <Card className='p-4 flex items-center gap-4 border-primary/5 soft-shadow bg-white/60 rounded-3xl hover:bg-white transition-colors'>
                  <div className='w-10 h-10 bg-secondary/50 rounded-2xl flex items-center justify-center text-primary/60'>
                    <Users className='w-5 h-5' />
                  </div>
                  <div className='flex-1'>
                    <h3 className='text-sm font-bold'>Amigos da Fé</h3>
                    <p className='text-[11px] text-muted-foreground font-medium'>Conecte-se com outros intercessores</p>
                  </div>
                  <Button variant='outline' size='sm' className='rounded-full text-[10px] h-8 px-4 border-primary/20 text-primary'>Conectar</Button>
                </Card>
              </Link>
            </motion.div>
          </motion.div>

          {!user && (
            <motion.div className="text-center mt-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Button onClick={() => navigate("/auth")} className="bg-gradient-to-br from-[#d4a017] to-[#e8c547] text-[#3d2800] border-0 shadow-md hover:opacity-90 transition-opacity font-bold rounded-full px-10 py-6 text-base">
                <User className="w-5 h-5 mr-2" />
                Entrar na Comunidade
              </Button>
            </motion.div>
          )}

          {user && (
            <motion.div className="flex justify-center mt-12 opacity-80" initial={{ opacity: 0 }} animate={{ opacity: 0.8 }}>
              <Button onClick={handleSignOut} variant="ghost" size="sm" className="text-xs font-bold">
                Sair da Conta
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default Index;
