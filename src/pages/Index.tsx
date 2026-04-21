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
  const [showFriendPrompt, setShowFriendPrompt] = useState(false);
  const [referrerName, setReferrerName] = useState("");
  const [referrerIdToFriend, setReferrerIdToFriend] = useState<string | null>(null);

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
              const { data: refProfile } = await supabase.from('profiles').select('full_name').eq('id', storedRef).single();
              if (refProfile) {
                setReferrerName(refProfile.full_name || "Seu amigo");
                setReferrerIdToFriend(storedRef);
                setShowFriendPrompt(true);
              }
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
      <div className="min-h-screen">
        <CompleteProfileDialog />
        
        {/* Friendship Prompt Dialog */}
        <Dialog open={showFriendPrompt} onOpenChange={setShowFriendPrompt}>
          <DialogContent className="max-w-md bg-card/95 backdrop-blur-md border-primary/20 soft-shadow rounded-[2rem]">
            <DialogHeader className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <DialogTitle className="text-2xl font-bold">Nova Amizade? ✨</DialogTitle>
              <DialogDescription className="text-base pt-2">
                Você entrou pelo convite de <span className="font-bold text-primary">{referrerName}</span>. 
                Deseja enviar um pedido de amizade?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-3 mt-4 sm:justify-center">
              <Button variant="outline" className="flex-1 rounded-2xl h-12" onClick={() => setShowFriendPrompt(false)}>
                Agora não
              </Button>
              <Button 
                className="flex-1 gradient-divine rounded-2xl h-12 text-primary-foreground font-bold"
                onClick={async () => {
                  if (referrerIdToFriend && user) {
                    await supabase.from('friend_requests').insert({
                      sender_id: user.id,
                      receiver_id: referrerIdToFriend,
                      status: 'pending'
                    });
                    toast.success("Pedido enviado!");
                  }
                  setShowFriendPrompt(false);
                }}
              >
                Sim, claro!
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
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
                <Card className="p-6 h-full text-center flex flex-col items-center justify-between border-primary/5 soft-shadow hover:bg-white transition-colors rounded-[2rem]">
                  <div className="w-14 h-14 bg-transparent rounded-full flex items-center justify-center mb-4 overflow-hidden">
                    <img src="/oracao.jpg" alt="Orar por uma causa" className="w-full h-full object-cover rounded-full drop-shadow-md" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold mb-2">Orar por uma Causa</h2>
                    <p className="text-xs text-muted-foreground leading-tight mb-4 font-medium">Receba um pedido e seja um instrumento de graça</p>
                  </div>
                  <Button size="sm" className="w-full rounded-full text-xs py-5 font-bold shadow-sm" style={{background: 'linear-gradient(135deg, #c9a227, #e8c547)', color: '#3d2800'}}>
                    <Sparkles className="w-3 h-3 mr-2 text-[#3d2800]" />
                    Começar
                  </Button>
                </Card>
              </Link>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Link to="/submit">
                <Card className="p-6 h-full text-center flex flex-col items-center justify-between border-primary/5 soft-shadow hover:bg-white transition-colors rounded-[2rem]">
                  <div className="w-14 h-14 bg-transparent rounded-full flex items-center justify-center mb-4 overflow-hidden">
                    <img src="/enviaroracao.jpg" alt="Enviar Pedido" className="w-full h-full object-cover rounded-full drop-shadow-md" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold mb-2">Enviar Pedido</h2>
                    <p className="text-xs text-muted-foreground leading-tight mb-4 font-medium">Compartilhe sua necessidade e receba apoio</p>
                  </div>
                  <Button size="sm" className="w-full rounded-full text-xs py-5 font-bold shadow-sm border-0" style={{background: 'linear-gradient(135deg, #b8860b, #d4a017)', color: '#fff8e1'}}>
                    <Send className="w-3 h-3 mr-2" />
                    Enviar
                  </Button>
                </Card>
              </Link>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Link to="/daily-gospel">
                <Card className="p-6 h-full text-center flex flex-col items-center justify-between border-primary/5 soft-shadow hover:bg-white transition-colors rounded-[2rem]">
                  <div className="w-14 h-14 bg-transparent rounded-full flex items-center justify-center mb-4 overflow-hidden">
                    <img src="/evangelho.jpg" alt="Evangelho do Dia" className="w-full h-full object-cover rounded-full drop-shadow-md" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold mb-2">Evangelho do Dia</h2>
                    <p className="text-xs text-muted-foreground leading-tight mb-4 font-medium">A palavra sagrada com reflexões e orações</p>
                  </div>
                  <Button size="sm" className="w-full rounded-full text-xs py-5 font-bold shadow-sm border-0" style={{background: 'linear-gradient(135deg, #c8a830, #f0d060)', color: '#3d2800'}}>
                    <Sun className="w-3 h-3 mr-2" />
                    Ler
                  </Button>
                </Card>
              </Link>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Link to="/novenas">
                <Card className="p-6 h-full text-center flex flex-col items-center justify-between border-primary/5 soft-shadow hover:bg-white transition-colors rounded-[2rem]">
                  <div className="w-14 h-14 bg-transparent rounded-full flex items-center justify-center mb-4 overflow-hidden">
                    <img src="/backgrounds/bg-2.png" alt="Novenas" className="w-full h-full object-cover rounded-full drop-shadow-md" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold mb-2">Novenas</h2>
                    <p className="text-xs text-muted-foreground leading-tight mb-4 font-medium">Escolha uma novena para seguir com fé</p>
                  </div>
                  <Button size="sm" className="w-full rounded-full text-xs py-5 font-bold shadow-sm border-0" style={{background: 'linear-gradient(135deg, #9c6f1c, #b88a30)', color: '#fff8e1'}}>
                    <BookOpen className="w-3 h-3 mr-2" />
                    Iniciar
                  </Button>
                </Card>
              </Link>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Link to="/rosary-selection">
                <Card className="p-6 h-full text-center flex flex-col items-center justify-between border-primary/5 soft-shadow hover:bg-white transition-colors rounded-[2rem] border-dashed border-primary/20">
                  <div className="w-14 h-14 bg-transparent rounded-full flex items-center justify-center mb-4 overflow-hidden">
                    <img src="https://a-static.mlcdn.com.br/800x600/terco-sagrado-coracao-de-jesus-pai-nosso-8mm-principe-da-paz/shoppingdafe/16008667435/13f74b6e0e27b035b50fca5800bedd04.jpeg" alt="Sagrado Terço" className="w-full h-full object-cover rounded-full drop-shadow-md" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold mb-2">Sagrado Terço</h2>
                    <p className="text-xs text-muted-foreground leading-tight mb-4 font-medium">Reze seus mistérios com auxílio de voz</p>
                  </div>
                  <Button size="sm" className="w-full rounded-full text-xs py-5 font-bold shadow-sm border-0" style={{background: 'linear-gradient(135deg, #d4a017, #f0c040)', color: '#3d2800'}}>
                    <Sparkles className="w-3 h-3 mr-2" />
                    Iniciar
                  </Button>
                </Card>
              </Link>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Link to="/divine-promise">
                <Card className="p-6 h-full text-center flex flex-col items-center justify-between border-primary/5 soft-shadow hover:bg-white transition-colors rounded-[2rem] border-dashed">
                  <div className="w-14 h-14 bg-transparent rounded-full flex items-center justify-center mb-4 overflow-hidden">
                    <img src="/divinaspromessas.png" alt="Divina Promessa" className="w-full h-full object-cover rounded-full drop-shadow-md" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold mb-2">Divina Promessa</h2>
                    <p className="text-xs text-muted-foreground leading-tight mb-4 font-medium">Uma citação bíblica para seu coração</p>
                  </div>
                  <Button size="sm" className="w-full rounded-full text-xs py-5 font-bold shadow-sm border-0" style={{background: 'linear-gradient(135deg, #a0720a, #c9951f)', color: '#fff8e1'}}>
                    <Sparkles className="w-3 h-3 mr-2" />
                    Sortear
                  </Button>
                </Card>
              </Link>
            </motion.div>
          </motion.div>

          {!user && (
            <motion.div className="text-center mt-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
               <Button onClick={() => navigate("/auth")} className="gradient-divine rounded-full px-10 py-6">
                 Entrar na Comunidade
               </Button>
            </motion.div>
          )}

          {user && (
            <motion.div className="flex justify-center mt-12 opacity-80" initial={{ opacity: 0 }} animate={{ opacity: 0.8 }}>
               <Button onClick={handleSignOut} variant="ghost" size="sm" className="text-xs text-glow font-bold">
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
