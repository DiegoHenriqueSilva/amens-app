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
import { fetchStates, fetchCitiesByState, type IBGEState, type IBGECity } from "@/lib/ibge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Camera } from "lucide-react";

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const { totalXp, loading: xpLoading } = useXp();
  const [stats, setStats] = useState({ requests: 0, intercessions: 0 });
  const [savingCity, setSavingCity] = useState(false);
  
  // Advanced Editing
  const [isEditing, setIsEditing] = useState(false);
  const [states, setStates] = useState<IBGEState[]>([]);
  const [cities, setCities] = useState<IBGECity[]>([]);
  const [existingParishes, setExistingParishes] = useState<string[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Form State
  const [editData, setEditData] = useState({
    fullName: "",
    state: "",
    city: "",
    parish: "",
    showRealName: false,
    displayName: "",
    avatarUrl: ""
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      fetchProfile(session.user.id);
      fetchStats(session.user.id);
    });
    fetchStates().then(setStates);
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profile) {
      setEditData({
        fullName: profile.full_name || "",
        state: profile.state || "",
        city: profile.city || "",
        parish: profile.parish || "",
        showRealName: profile.show_real_name || false,
        displayName: profile.display_name || "",
        avatarUrl: profile.avatar_url || ""
      });
    }
  };

  useEffect(() => {
    if (editData.state) {
      fetchCitiesByState(editData.state).then(setCities);
    }
  }, [editData.state]);

  useEffect(() => {
    if (editData.state && editData.city) {
      supabase.from('profiles' as any)
        .select('parish')
        .eq('state', editData.state)
        .eq('city', editData.city)
        .not('parish', 'is', null)
        .then(({ data }) => {
          if (data) {
            const castedData = data as any[];
            const unique = Array.from(new Set(castedData.map(p => p.parish)));
            setExistingParishes(unique);
          }
        });
    }
  }, [editData.state, editData.city]);

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

  const handleSaveProfile = async () => {
    if (!editData.fullName || !editData.state || !editData.city || !editData.parish) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    setSavingCity(true);
    
    // Update Profile Table
    const { error: profileError } = await (supabase.from('profiles' as any) as any).upsert({
      id: user.id,
      full_name: editData.fullName,
      state: editData.state,
      city: editData.city,
      parish: editData.parish,
      show_real_name: editData.showRealName,
      display_name: editData.showRealName ? editData.displayName : null
    });

    // Update Auth User Metadata
    const { error: authError } = await supabase.auth.updateUser({
      data: { 
        full_name: editData.fullName,
        state: editData.state,
        city: editData.city, 
        parish: editData.parish,
        show_real_name: editData.showRealName,
        display_name: editData.showRealName ? editData.displayName : null
      },
    });

    setSavingCity(false);
    if (profileError || authError) {
      toast.error("Erro ao salvar perfil.");
    } else {
      setIsEditing(false);
      toast.success("Perfil atualizado com sucesso! 🙏");
      fetchProfile(user.id);
    }
  };

  const handleUploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("Você deve selecionar uma imagem para o upload.");
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${Math.random()}.${fileExt}`;

      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // 3. Update Database
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setEditData(prev => ({ ...prev, avatarUrl: publicUrl }));
      toast.success("Foto de perfil atualizada! 🙏");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
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
  const levelIndex = CELESTIAL_LEVELS.indexOf(level);
  const levelProgress = getLevelProgress(totalXp);
  const fullName = editData.showRealName 
    ? (editData.displayName || editData.fullName.split(' ')[0]) 
    : (editData.fullName || "Usuário Améns");
  const currentCity = user.user_metadata?.city || "";

  return (
    <PageTransition>
      <div className="min-h-screen bg-background relative overflow-hidden">
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
            <div className="relative mb-6 group">
              <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-primary/40 to-accent/40 soft-shadow relative overflow-hidden">
                <Avatar className="w-full h-full border-4 border-background">
                  <AvatarImage src={editData.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} className="object-cover" />
                  <AvatarFallback className="bg-secondary text-primary">
                    <User className="w-12 h-12" />
                  </AvatarFallback>
                </Avatar>
                
                <label 
                  htmlFor="avatar-upload" 
                  className={cn(
                    "absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white",
                    uploading && "opacity-100"
                  )}
                >
                  {uploading ? (
                    <Sparkles className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <Camera className="w-6 h-6 mb-1" />
                      <span className="text-[8px] font-bold uppercase">Alterar</span>
                    </>
                  )}
                </label>
                <input 
                  type="file" 
                  id="avatar-upload" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleUploadAvatar}
                  disabled={uploading}
                />
              </div>
              <motion.div 
                className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-full shadow-lg border-2 border-background"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Nível {levelIndex}
              </motion.div>
            </div>
            
            <div className="flex items-center justify-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-foreground text-soft-outline">{fullName}</h1>
              <span className="text-xs font-bold text-primary/70 bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full tracking-wide whitespace-nowrap">
                Nível {levelIndex}
              </span>
            </div>
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest mb-3">Nível {levelIndex} "{level.name}"</p>

            <div className="flex items-center gap-2 text-sm text-muted-foreground opacity-80">
              <MapPin className="w-3.5 h-3.5" />
              <span>{user.user_metadata?.city}, {user.user_metadata?.state}</span>
            </div>
            <p className="text-[11px] text-primary/70 font-bold mt-1 uppercase tracking-wider">{user.user_metadata?.parish}</p>
            
            <Button 
                variant="outline" 
                size="sm" 
                className="mt-4 rounded-full border-primary/20 text-[10px] uppercase font-bold tracking-widest h-8 px-4"
                onClick={() => setIsEditing(true)}
            >
                <Pencil className="w-3 h-3 mr-2" />
                Editar Perfil
            </Button>
          </motion.div>

          {/* EDIT PROFILE DIALOG CLONE (INLINE OR MODAL) */}
          <AnimatePresence>
            {isEditing && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
              >
                <motion.div 
                   initial={{ scale: 0.9, y: 20 }}
                   animate={{ scale: 1, y: 0 }}
                   exit={{ scale: 0.9, y: 20 }}
                   className="bg-card w-full max-w-md p-8 rounded-[2.5rem] soft-shadow border-primary/10 relative my-auto"
                >
                    <Button variant="ghost" size="icon" className="absolute top-4 right-4" onClick={() => setIsEditing(false)}>
                        <X className="w-5 h-5" />
                    </Button>
                    
                    <h2 className="text-2xl font-bold mb-6 text-center">Configurações</h2>
                    
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nome Completo</Label>
                            <Input 
                                value={editData.fullName} 
                                onChange={(e) => setEditData({...editData, fullName: e.target.value})} 
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Estado</Label>
                                <Select value={editData.state} onValueChange={(val) => setEditData({...editData, state: val, city: "", parish: ""})}>
                                    <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                                    <SelectContent>
                                        {states.map(s => <SelectItem key={s.sigla} value={s.sigla}>{s.sigla}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Cidade</Label>
                                <Select value={editData.city} onValueChange={(val) => setEditData({...editData, city: val, parish: ""})} disabled={!editData.state}>
                                    <SelectTrigger className="truncate"><SelectValue placeholder="Cidade" /></SelectTrigger>
                                    <SelectContent>
                                        {cities.map(c => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2 flex flex-col">
                            <Label>Paróquia</Label>
                            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" className={cn("w-full justify-between font-normal", !editData.parish && "text-muted-foreground")} disabled={!editData.city}>
                                        <span className="truncate">{editData.parish || "Buscar ou digitar..."}</span>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Nome da paróquia..." value={editData.parish} onValueChange={(val) => setEditData({...editData, parish: val})} />
                                        <CommandList>
                                            <CommandEmpty className="py-2 px-4 text-xs italic">Nenhuma paróquia sugerida.</CommandEmpty>
                                            <CommandGroup heading="Sugeridas">
                                                {existingParishes.map((p) => (
                                                    <CommandItem key={p} value={p} onSelect={(val) => { setEditData({...editData, parish: val}); setPopoverOpen(false); }}>
                                                        <Check className={cn("mr-2 h-4 w-4", editData.parish === p ? "opacity-100" : "opacity-0")} />
                                                        {p}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-primary/5">
                            <div className="flex items-center space-x-2">
                                <input 
                                    type="checkbox" 
                                    id="show-real-name-profile" 
                                    className="w-4 h-4 rounded border-primary/20 text-primary focus:ring-primary"
                                    checked={editData.showRealName}
                                    onChange={(e) => setEditData({...editData, showRealName: e.target.checked})}
                                />
                                <Label htmlFor="show-real-name-profile" className="text-xs font-medium cursor-pointer">
                                    Desejo utilizar um apelido ou outro nome para manter o anonimato.
                                </Label>
                            </div>

                            <AnimatePresence>
                                {editData.showRealName && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-2 overflow-hidden px-1 py-2 bg-primary/5 rounded-xl border border-primary/10"
                                    >
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Qual apelido você gostaria de usar?</Label>
                                        <Input 
                                            placeholder="Ex: Pedro, Ana..." 
                                            value={editData.displayName} 
                                            onChange={(e) => setEditData({...editData, displayName: e.target.value})}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        
                        <Button className="w-full gradient-divine h-12 rounded-2xl font-bold mt-4" onClick={handleSaveProfile} disabled={savingCity}>
                            {savingCity ? "Salvando..." : "Salvar Alterações"}
                        </Button>
                    </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Faith Points Progress Card */}
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
                <span className="text-xs font-bold text-primary">{totalXp} Pontos de Fé</span>
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
                Próximo nível em {1000 - (totalXp % 1000)} pontos
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
