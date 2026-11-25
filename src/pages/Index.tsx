import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useFaithPoints } from "@/hooks/use-faith-points";
import { FaithPointsBadge } from "@/components/FaithPointsBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, Send, Sparkles, LogOut, User, BookOpen, Sun, Wind, Mail, Home, HandHeart, Cross } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PageTransition from "@/components/PageTransition";
import { NotificationBell } from "@/components/NotificationBell";
import { signOutWithPushCleanup } from "@/lib/push";
import { motion, AnimatePresence } from "framer-motion";
import { scheduleDailyPromiseNotification, syncActiveNovenaReminders } from "@/lib/notifications";
import { CompleteProfileDialog } from "@/components/CompleteProfileDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Check, X } from "lucide-react";
import { JornadaFe } from "@/components/JornadaFe";
import { AngelicalNotificationOverlay } from "@/components/AngelicalNotificationOverlay";
import { useLocation } from "react-router-dom";
import { useMyInsignias } from "@/features/insignias/Insignias";

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

type HomeProfile = { full_name?: string | null; avatar_url?: string | null };

const RosaryGlyph = () => (
  <svg viewBox="0 0 44 44" fill="none" aria-hidden="true" className="amens-home-icon">
    <circle cx="16" cy="14" r="10.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeDasharray="0.8 2.2" />
    <circle cx="16" cy="3.5" r="1.1" fill="currentColor" />
    <path d="M16 24.5v6.2m0 0-2.5 2.6m2.5-2.6 2.5 2.6m-2.5 0v6.5m-3-3.2h6" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M28.5 27.2c2.8-1.5 5.5-1.4 8.2.1v10.1c-2.7-1.5-5.4-1.5-8.2 0-2.7-1.5-5.4-1.5-8.1 0V27.3c2.7-1.5 5.4-1.6 8.1-.1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M28.5 27.2v10.2m-4.8-6.5c1.4-.5 2.4-.4 3.5.1m2.5 0c1.1-.5 2.1-.6 3.5-.1" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
  </svg>
);

const NovenaGlyph = () => (
  <svg viewBox="0 0 42 42" fill="none" aria-hidden="true" className="amens-home-icon">
    <rect x="3.5" y="7.5" width="25" height="27" rx="3.4" stroke="currentColor" strokeWidth="1.8" />
    <path d="M3.5 15h25M10.5 4v7M21.5 4v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <text x="11" y="29.5" fill="currentColor" fontSize="18" fontFamily="Georgia, serif" fontWeight="700">9</text>
    <circle cx="33.2" cy="20" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="0.8 1.8" />
    <path d="M33.2 25.5v7m-2.4-2.4h4.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const LegacyHomeActions = () => {
  const actions = [
    { to: "/pray", image: "/oracao_3d.png", title: "Orar por uma Causa", description: "Receba um pedido e seja um instrumento de graça", cta: "Começar", icon: Heart },
    { to: "/submit", image: "/enviaroracao_3d.png", title: "Enviar Pedido", description: "Compartilhe sua necessidade e receba apoio", cta: "Enviar", icon: Send },
    { to: "/daily-gospel", image: "/evangelho_3d.png", title: "Evangelho do Dia", description: "A palavra sagrada com reflexões da IA", cta: "Ler", icon: Sun },
    { to: "/novenas", image: "/novenas.png", title: "Novenas", description: "Escolha uma novena para seguir com fé", cta: "Iniciar", icon: BookOpen },
    { to: "/rosary-selection", image: "/sagrado_terco.png", title: "Sagrado Terço", description: "Reze seus mistérios com auxílio de voz", cta: "Iniciar", icon: Sparkles },
    { to: "/divine-promise", image: "/divinaspromessas_3d.png", title: "Divina Promessa", description: "Uma citação bíblica para seu coração", cta: "Sortear", icon: Wind },
  ];

  return (
    <motion.div className="grid grid-cols-2 gap-3 mb-5" variants={stagger} initial="initial" animate="animate">
      {actions.map((action) => {
        const Icon = action.icon;
        return <motion.div key={action.to} variants={fadeUp}>
          <Link to={action.to} className="block h-full">
            <Card className="p-3 sm:p-4 h-full text-center flex flex-col items-center justify-between border-primary/5 soft-shadow bg-[#FAFAFA] hover:-translate-y-1 hover:shadow-xl transition-all duration-300 rounded-[2rem]">
              <div className="w-11 h-11 bg-transparent rounded-full flex items-center justify-center mb-2 overflow-hidden"><img src={action.image} alt={action.title} className="w-full h-full object-cover rounded-full drop-shadow-md" /></div>
              <div><h2 className="text-sm sm:text-base font-bold mb-1">{action.title}</h2><p className="text-xs text-slate-700 leading-snug mb-2 font-semibold px-2">{action.description}</p></div>
              <span className="w-full rounded-full text-xs h-9 py-2 font-bold shadow-md bg-gradient-to-br from-[#d4a017] to-[#e8c547] text-[#3d2800] hover:opacity-90 transition-opacity border-0 inline-flex items-center justify-center">
                <Icon className="w-3.5 h-3.5 mr-2" />{action.cta}
              </span>
            </Card>
          </Link>
        </motion.div>;
      })}
    </motion.div>
  );
};

const Index = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const navigate = useNavigate();
  const { totalFaithPoints } = useFaithPoints();
  const [profile, setProfile] = useState<HomeProfile | null>(null);
  const location = useLocation();
  const [activeIntercessionNotifId, setActiveIntercessionNotifId] = useState<string | null>(null);
  const [isLegacyTheme, setIsLegacyTheme] = useState(() => localStorage.getItem("amens-theme") === "legacy");
  const myInsignias = useMyInsignias(user?.id);

  const toggleTheme = () => {
    const nextIsLegacy = !isLegacyTheme;
    localStorage.setItem("amens-theme", nextIsLegacy ? "legacy" : "refresh");
    setIsLegacyTheme(nextIsLegacy);
    window.location.reload();
  };

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
          syncActiveNovenaReminders();
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
      await signOutWithPushCleanup();
      toast.success("Até breve!");
    } catch (e) {
      console.error("Sign out error:", e);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen pb-[calc(7rem+env(safe-area-inset-bottom))]">
        <CompleteProfileDialog />
        <AngelicalNotificationOverlay 
          notificationId={activeIntercessionNotifId} 
          onClose={() => setActiveIntercessionNotifId(null)} 
        />
        
        <div className="container mx-auto px-4 pt-8 sm:pt-5 pb-8 relative z-10 max-w-lg">
          <div className={user ? "amens-home-header grid grid-cols-[minmax(0,1fr)_clamp(140px,44%,168px)] min-[520px]:grid-cols-[minmax(0,1fr)_210px] items-center gap-3 mb-3 sm:mb-16 min-h-[76px]" : "flex justify-center mb-5"}>
            <div className="min-w-0 text-center">
              <h1 className="home-brand-outline amens-wordmark text-[clamp(2.5rem,11vw,3rem)] font-bold text-foreground tracking-tight leading-tight">
                <img src="/amens-wordmark-gold.png" alt="Améns" className="amens-wordmark-image" />
              </h1>
              <div className="home-tagline-outline flex items-center justify-center gap-1 -mt-2 text-[#8b6508]">
                <Sparkles className="w-2.5 h-2.5" aria-hidden="true" />
                <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.14em] font-bold whitespace-nowrap">Unidos pela Fé</span>
                <Sparkles className="w-2.5 h-2.5" aria-hidden="true" />
              </div>
            </div>
            {user && (
              <div className="w-full min-w-0 flex items-center gap-2">
                <NotificationBell />
                <div className="min-w-0 flex-1">
                <FaithPointsBadge
                  compact
                  totalFaithPoints={totalFaithPoints}
                  userName={profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || ""}
                  avatarUrl={profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture}
                  isSupporter={myInsignias.data?.showSupporterCard === true}
                />
                </div>
              </div>
            )}
          </div>
            {user && <div className="amens-home-journey mb-3.5 sm:mb-7"><JornadaFe compact /></div>}

          {isLegacyTheme && <LegacyHomeActions />}
          {!isLegacyTheme && <motion.div className="amens-home-actions grid grid-cols-2 gap-3 mb-5" variants={stagger} initial="initial" animate="animate">
            <motion.div variants={fadeUp}>
                <Link to="/pray" className="block">
                  <Card className="amens-home-action amens-art-orar">
                    <img src="/cards/orar-por-causa.png" alt="Orar por uma Causa" className="amens-home-art-image" />
                  </Card>
              </Link>
            </motion.div>

            <motion.div variants={fadeUp}>
                <Link to="/submit" className="block">
                  <Card className="amens-home-action amens-art-enviar">
                    <img src="/cards/enviar-oracao.png" alt="Enviar pedido de oração" className="amens-home-art-image" />
                  </Card>
              </Link>
            </motion.div>

            <motion.div variants={fadeUp}>
                <Link to="/daily-gospel" className="block">
                  <Card className="amens-home-action amens-art-evangelho">
                    <img src="/cards/evangelho.png" alt="Evangelho do Dia" className="amens-home-art-image" />
                  </Card>
              </Link>
            </motion.div>

            <motion.div variants={fadeUp}>
                <Link to="/novenas" className="block">
                  <Card className="amens-home-action amens-art-novenas">
                    <img src="/cards/novenas.png" alt="Novenas" className="amens-home-art-image" />
                  </Card>
              </Link>
            </motion.div>

            <motion.div variants={fadeUp}>
                <Link to="/rosary-selection" className="block">
                  <Card className="amens-home-action amens-art-terco">
                    <img src="/cards/sagrado-terco.png" alt="Sagrado Terço" className="amens-home-art-image" />
                  </Card>
              </Link>
            </motion.div>

            <motion.div variants={fadeUp}>
                <Link to="/divine-promise" className="block">
                  <Card className="amens-home-action amens-art-promessas">
                    <img src="/cards/divinas-promessas.png" alt="Divinas Promessas" className="amens-home-art-image" />
                  </Card>
              </Link>
            </motion.div>
          </motion.div>}

          {!isLegacyTheme && (
            <div>
            <Link className="amens-donation-banner" to="/donate" aria-labelledby="amens-donation-title">
              <span className="amens-donation-banner__eyebrow">Faça parte desta missão</span>
              <h2 id="amens-donation-title">Apoie o Améns</h2>
              <p>Sua contribuição ajuda a manter o Améns gratuito, acolhedor e sempre disponível.</p>
              <p className="amens-donation-banner__callout">
                <HandHeart aria-hidden="true" />
                <span><strong>Faça uma doação.</strong> Metade do valor doado será revertido para instituições de caridade.</span>
              </p>
              <Sparkles className="amens-donation-banner__ornament" aria-hidden="true" />
            </Link>
            </div>
          )}

          {!user && (
            <motion.div className="text-center mt-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
               <Button onClick={() => navigate("/auth")} className="bg-gradient-to-br from-[#d4a017] to-[#e8c547] text-[#3d2800] border-0 shadow-md hover:opacity-90 transition-opacity font-bold rounded-full px-10 py-6 text-base">
                 <User className="w-5 h-5 mr-2" />
                 Entrar na Comunidade
               </Button>
            </motion.div>
          )}

          {user && (
            <motion.div className="flex justify-center mt-6 opacity-80" initial={{ opacity: 0 }} animate={{ opacity: 0.8 }}>
               <Button onClick={handleSignOut} variant="ghost" size="sm" className="text-xs font-bold">
                  Sair da Conta
               </Button>
            </motion.div>
          )}

          <div className="flex justify-center mb-4">
            <Button variant="ghost" size="sm" onClick={toggleTheme} className="text-[10px] text-foreground/60">
              {isLegacyTheme ? "Ver novo visual" : "Ver versão anterior"}
            </Button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Index;
