import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, ArrowLeft, Trophy, Heart, Send, Sparkles, User, MapPin, Pencil, Check, X } from "lucide-react";
import { useXp } from "@/hooks/use-xp";
import { getLevel, CELESTIAL_LEVELS, getLevelProgress } from "@/lib/xp";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const { totalXp, loading: xpLoading } = useXp();
  const [stats, setStats] = useState({ requests: 0, intercessions: 0 });
  const [editingCity, setEditingCity] = useState(false);
  const [cityInput, setCityInput] = useState("");
  const [savingCity, setSavingCity] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      setCityInput(session.user.user_metadata?.city || "");
      fetchStats(session.user.id);
    });
  }, [navigate]);

  const fetchStats = async (userId: string) => {
    const { count: requestsCount } = await supabase
      .from("prayer_requests")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    const { count: intercessionsCount } = await supabase
      .from("prayer_intercessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    setStats({
      requests: requestsCount || 0,
      intercessions: intercessionsCount || 0,
    });
  };

  const handleSaveCity = async () => {
    if (!cityInput.trim()) {
      toast.error("Digite uma cidade válida.");
      return;
    }
    setSavingCity(true);
    const { error } = await supabase.auth.updateUser({
      data: { city: cityInput.trim() },
    });
    setSavingCity(false);
    if (error) {
      toast.error("Erro ao salvar cidade.");
    } else {
      setUser((prev: any) => ({
        ...prev,
        user_metadata: { ...prev.user_metadata, city: cityInput.trim() },
      }));
      setEditingCity(false);
      toast.success("Cidade atualizada com sucesso! 📍");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Até logo! Que a paz esteja com você. 🙏");
    navigate("/auth");
  };

  if (!user || xpLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Sparkles className="w-8 h-8 animate-pulse text-primary" />
      </div>
    );
  }

  const level = getLevel(totalXp);
  const levelIndex = CELESTIAL_LEVELS.indexOf(level) + 1;
  const levelProgress = getLevelProgress(totalXp);
  const fullName = user.user_metadata?.full_name || "Usuário Améns";
  const currentCity = user.user_metadata?.city || "";

  return (
    <PageTransition>
      <div className="min-h-screen bg-background relative overflow-hidden pb-12">
        <div className="absolute top-[-10rem] left-[-10rem] w-[30rem] h-[30rem] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-[-10rem] right-[-10rem] w-[30rem] h-[30rem] rounded-full bg-accent/5 blur-3xl" />

        <div className="container mx-auto px-6 py-8 relative z-10 max-w-lg">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="mb-6">
            <ArrowLeft className="w-5 h-5" />
          </Button>

          {/* Profile Header */}
          <motion.div 
            className="flex flex-col items-center text-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="relative mb-6">
              <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-primary/40 to-accent/40 soft-shadow">
                <Avatar className="w-full h-full border-4 border-background">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} />
                  <AvatarFallback className="bg-secondary text-primary">
                    <User className="w-12 h-12" />
                  </AvatarFallback>
                </Avatar>
              </div>
              <motion.div 
                className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-full shadow-lg border-2 border-background"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Nível {levelIndex}
              </motion.div>
            </div>
            
            <h1 className="text-3xl font-bold text-foreground mb-1 text-soft-outline">{fullName}</h1>
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest mb-3">{level.name}</p>

            {/* City Display / Edit */}
            <AnimatePresence mode="wait">
              {editingCity ? (
                <motion.div
                  key="editing"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex items-center gap-2 w-full max-w-xs"
                >
                  <Input 
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    placeholder="Ex: São Paulo, SP"
                    className="text-center text-sm border-primary/20 rounded-full h-9"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveCity(); if (e.key === "Escape") setEditingCity(false); }}
                  />
                  <Button size="icon" className="h-9 w-9 rounded-full bg-primary/10 hover:bg-primary/20 text-primary flex-shrink-0" onClick={handleSaveCity} disabled={savingCity}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full flex-shrink-0" onClick={() => { setEditingCity(false); setCityInput(currentCity); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </motion.div>
              ) : (
                <motion.button
                  key="display"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
                  onClick={() => setEditingCity(true)}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{currentCity || "Adicionar cidade..."}</span>
                  <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>

          {/* XP Progress Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6 mb-8 soft-shadow border-primary/10 bg-white/70 backdrop-blur-md rounded-[2.5rem]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  <span className="text-sm font-bold">Progresso de Fé</span>
                </div>
                <span className="text-xs font-bold text-primary">{totalXp} XP Total</span>
              </div>
              
              <div className="w-full h-4 bg-secondary/30 rounded-full overflow-hidden mb-2 p-1 border border-primary/5">
                <motion.div 
                  className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(levelProgress, 100)}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
              <p className="text-[10px] text-center text-muted-foreground font-medium uppercase tracking-widest">
                Próximo nível em {1000 - (totalXp % 1000)} XP
              </p>
            </Card>
          </motion.div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 gap-4 mb-10">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <Card className="p-6 text-center border-primary/5 soft-shadow bg-white/50 rounded-[2rem]">
                <Send className="w-6 h-6 text-primary/60 mx-auto mb-3" />
                <h3 className="text-2xl font-bold text-foreground">{stats.requests}</h3>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Pedidos Enviados</p>
              </Card>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <Card className="p-6 text-center border-primary/5 soft-shadow bg-white/50 rounded-[2rem]">
                <Heart className="w-6 h-6 text-primary/60 mx-auto mb-3 fill-primary/5" />
                <h3 className="text-2xl font-bold text-foreground">{stats.intercessions}</h3>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Orações Feitas</p>
              </Card>
            </motion.div>
          </div>

          {/* Actions */}
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Button 
              variant="outline" 
              className="w-full py-7 rounded-[1.5rem] border-primary/10 hover:bg-primary/5 gap-3"
              onClick={() => navigate("/my-prayers")}
            >
              <Sparkles className="w-5 h-5 text-primary/70" />
              <span className="font-bold">Gerenciar Meus Pedidos</span>
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full py-6 rounded-[1.5rem] text-muted-foreground hover:text-destructive transition-colors gap-3"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-semibold">Sair da Conta</span>
            </Button>
          </motion.div>
          
          <div className="text-center mt-12 opacity-30">
            <p className="text-[10px] uppercase tracking-[0.3em] font-bold">Améns • Versão 1.0.0</p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Profile;
