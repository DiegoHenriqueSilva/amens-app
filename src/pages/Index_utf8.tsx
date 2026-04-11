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
    const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', userId).single();
    if (data) setProfile(data);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session) fetchProfile(session.user.id);
      if (session) {
        scheduleDailyPromiseNotification();
      }
    });

    // Realtime Presence
    const channel = supabase.channel('online-users', {
      config: { presence: { key: user?.id || 'anonymous' } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length;
        setOnlineCount(count);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      
      // Process referral if applicable
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
        const storedRef = localStorage.getItem("fe_referrer");
        if (storedRef && storedRef !== session.user.id) {
          console.log("Processing referral:", storedRef);
          supabase.functions.invoke("process-referral", {
            body: { referrer_user_id: storedRef, referred_user_id: session.user.id },
          }).then(async ({ error }) => {
            if (!error) {
              toast.success("Refer├¬ncia processada! Que bom ter voc├¬ aqui. ≡ƒÖÅ");
              
              const { data: refProfile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', storedRef)
                .single();
              
              if (refProfile) {
                setReferrerName(refProfile.full_name || "Seu amigo");
                setReferrerIdToFriend(storedRef);
                setShowFriendPrompt(true);
              }
            }
          }).catch(e => console.error("Referral processing error:", e));
          localStorage.removeItem("fe_referrer");
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("At├⌐ breve! Que a paz esteja com voc├¬. ≡ƒÖÅ");
  };

  return (
    <PageTransition>
      <div className="min-h-screen"> {/* Espa├ºo para a bottom nav agora via App.tsx */}
        <CompleteProfileDialog />
        
        {/* Friendship Prompt Dialog */}
        <Dialog open={showFriendPrompt} onOpenChange={setShowFriendPrompt}>
          <DialogContent className="max-w-md bg-card/95 backdrop-blur-md border-primary/20 soft-shadow rounded-[2rem]">
            <DialogHeader className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <DialogTitle className="text-2xl font-bold">Nova Amizade? Γ£¿</DialogTitle>
              <DialogDescription className="text-base pt-2">
                Voc├¬ entrou pelo convite de <span className="font-bold text-primary">{referrerName}</span>. 
                Deseja enviar um pedido de amizade para ele(a)?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-3 mt-4 sm:justify-center">
              <Button 
                variant="outline" 
                className="flex-1 rounded-2xl h-12" 
                onClick={() => setShowFriendPrompt(false)}
              >
                <X className="w-4 h-4 mr-2" />
                Agora n├úo
              </Button>
              <Button 
                className="flex-1 gradient-divine rounded-2xl h-12 text-primary-foreground font-bold"
                onClick={async () => {
                  if (referrerIdToFriend && user) {
                    try {
                      const { error } = await supabase
                        .from('friend_requests')
                        .insert({
                          sender_id: user.id,
                          receiver_id: referrerIdToFriend,
                          status: 'pending'
                        });
                      
                      if (error) {
                        if (error.code === '23505') {
                          toast.info("Pedido de amizade j├í enviado!");
                        } else {
                          throw error;
                        }
                      } else {
                        toast.success("Pedido de amizade enviado! ≡ƒÖÅ");
                      }
                    } catch (err) {
                      console.error("Error sending friend request:", err);
                      toast.error("Erro ao enviar pedido de amizade.");
                    }
                  }
                  setShowFriendPrompt(false);
                }}
              >
                <Check className="w-4 h-4 mr-2" />
                Sim, claro!
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <div className="container mx-auto px-6 py-8 relative z-10 max-w-lg">
          
          {/* Header Mobile Style */}
          <motion.div className="text-center mb-8 pt-4" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
             <h1 className="text-5xl font-bold text-foreground mb-1 tracking-tight text-glow text-soft-outline">Am├⌐ns</h1>
             <div className="flex items-center justify-center gap-2 text-[#8b6508] text-glow">
                <Sparkles className="w-3 h-3" />
                <span className="text-xs uppercase tracking-[0.2em] font-bold">Unidos pela F├⌐</span>
                <Sparkles className="w-3 h-3" />
             </div>
          </motion.div>

          {/* Global Counter Banner - Only shows if > 2 */}
          <AnimatePresence>
            {onlineCount > 2 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: -10 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                className="mb-8 px-4 py-3 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center gap-3 text-center"
              >
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-6 h-6 rounded-full border-2 border-background bg-secondary flex items-center justify-center overflow-hidden">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + onlineCount}`} alt="User" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                <p className="text-[13px] text-foreground font-semibold text-glow">
                  Voc├¬ faz parte dessa corrente. <span className="text-primary font-bold">{onlineCount} pessoas</span> est├áo conectadas agora.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* User / Faith Points Card */}
          {user && !xpLoading && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
              <Card className="p-5 mb-8 soft-shadow border-primary/5 bg-white/70 backdrop-blur-sm rounded-[2rem]">
                 <XpBadge totalXp={totalXp} userName={profile?.full_name || user.user_metadata?.full_name || ""} avatarUrl={profile?.avatar_url} />
              </Card>
            </motion.div>
          )}

          {/* Main Action Grid - 2x2 */}
          <motion.div className="grid grid-cols-2 gap-5 mb-8" variants={stagger} initial="initial" animate="animate">
            <motion.div variants={fadeUp}>
              <Link to="/pray">
                <Card className="p-6 h-full text-center flex flex-col items-center justify-between border-primary/5 soft-shadow hover:bg-white transition-colors rounded-[2rem]">
                  <div className="w-14 h-14 bg-transparent rounded-full flex items-center justify-center mb-4 overflow-hidden">
                    <img src="/oracao.jpg" alt="Orar por uma causa" className="w-full h-full object-cover drop-shadow-md rounded-full" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold mb-2">Orar por uma Causa</h2>
                    <p className="text-xs text-muted-foreground leading-tight mb-4 font-medium">Receba um pedido e seja um instrumento de gra├ºa</p>
                  </div>
                  <Button size="sm" className="w-full rounded-full text-xs py-5 font-bold shadow-sm" style={{background: 'linear-gradient(135deg, #c9a227, #e8c547)', color: '#3d2800'}}>
                    <Sparkles className="w-3 h-3 mr-2" />
                    Come├ºar
                  </Button>
                </Card>
              </Link>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Link to="/submit">
                <Card className="p-6 h-full text-center flex flex-col items-center justify-between border-primary/5 soft-shadow hover:bg-white transition-colors rounded-[2rem]">
                  <div className="w-14 h-14 bg-transparent rounded-full flex items-center justify-center mb-4 overflow-hidden">
                    <img src="/enviaroracao.jpg" alt="Enviar Pedido" className="w-full h-full object-cover drop-shadow-md rounded-full" />
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
                    <img src="/evangelho.jpg" alt="Evangelho do Dia" className="w-full h-full object-cover drop-shadow-md rounded-full" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold mb-2">Evangelho do Dia</h2>
                    <p className="text-xs text-muted-foreground leading-tight mb-4 font-medium">A palavra sagrada com reflex├╡es da IA</p>
                  </div>
                  <Button size="sm" className="w-full rounded-full text-xs py-5 font-bold shadow-sm border-0" style={{background: 'linear-gradient(135deg, #c8a830, #f0d060)', color: '#3d2800'}}>
                    <Sun className="w-3 h-3 mr-2" />
                    Ler
                  </Button>
                </Card>
              </Link>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Link to="/divine-promise">
                <Card className="p-6 h-full text-center flex flex-col items-center justify-between border-primary/5 soft-shadow hover:bg-white transition-colors rounded-[2rem] border-dashed">
                  <div className="w-14 h-14 bg-transparent rounded-full flex items-center justify-center mb-4 overflow-hidden">
                    <img src="/divinaspromessas.png" alt="Divina Promessa" className="w-full h-full object-cover drop-shadow-md rounded-full" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold mb-2">Divina Promessa</h2>
                    <p className="text-xs text-muted-foreground leading-tight mb-4 font-medium">Uma cita├º├áo b├¡blica para seu cora├º├áo</p>
                  </div>
                  <Button size="sm" className="w-full rounded-full text-xs py-5 font-bold shadow-sm border-0" style={{background: 'linear-gradient(135deg, #a0720a, #c9951f)', color: '#fff8e1'}}>
                    <Sparkles className="w-3 h-3 mr-2" />
                    Sortear
                  </Button>
                </Card>
              </Link>
            </motion.div>
          </motion.div>

          {/* Secondary Actions List */}
          <motion.div className="space-y-4 mb-10" variants={stagger} initial="initial" animate="animate">
             <motion.div variants={fadeUp}>
               <Link to="/my-prayers">
                 <Card className="p-4 flex items-center gap-4 border-primary/5 soft-shadow bg-white/60 rounded-3xl hover:bg-white transition-colors">
                    <div className="w-10 h-10 bg-secondary/50 rounded-2xl flex items-center justify-center text-primary/60">
                       <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                       <h3 className="text-sm font-bold">Minhas Preces</h3>
                       <p className="text-[11px] text-muted-foreground font-medium">Veja quem orou por voc├¬</p>
                    </div>
                    <Button variant="outline" size="sm" className="rounded-full text-[10px] h-8 px-4 border-primary/20 text-primary">Ver Hist├│rico</Button>
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
                       <h3 className="text-sm font-bold">Minhas Intercess├╡es</h3>
                       <p className="text-[11px] text-muted-foreground font-medium">Causas que voc├¬ apoiou</p>
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
                        <h3 className='text-sm font-bold'>Amigos da F├⌐</h3>
                        <p className='text-[11px] text-muted-foreground font-medium'>Conecte-se com outros intercessores</p>
                     </div>
                     <Button variant='outline' size='sm' className='rounded-full text-[10px] h-8 px-4 border-primary/20 text-primary'>Conectar</Button>
                  </Card>
                </Link>
              </motion.div>
          </motion.div>

          {!user && (
            <motion.div className="text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
               <Button onClick={() => navigate("/auth")} className="gradient-divine rounded-full px-10 py-6">
                 Entrar na Comunidade
               </Button>
            </motion.div>
          )}

          {user && (
            <motion.div className="flex justify-center mt-12 opacity-80" initial={{ opacity: 0 }} animate={{ opacity: 0.8 }}>
               <Button onClick={handleSignOut} variant="ghost" size="sm" className="text-xs text-glow font-bold">
                  <LogOut className="w-3 h-3 mr-2" /> Sair da Conta
               </Button>
            </motion.div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default Index;
