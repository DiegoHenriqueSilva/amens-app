import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Settings, User, Check, X, ChevronsUpDown, Camera, Users, Lock, Ticket } from "lucide-react";
import { useXp } from "@/hooks/use-xp";
import { getLevel, getNextLevel, CELESTIAL_LEVELS, getLevelProgress } from "@/lib/xp";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { fetchStates, fetchCitiesByState, type IBGEState, type IBGECity } from "@/lib/ibge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDailyTasks } from "@/hooks/use-daily-tasks";
import { HairlineDivider } from "@/components/ui/hairline-divider";
import { Button } from "@/components/ui/button";

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const { totalXp, loading: xpLoading } = useXp();
  const [stats, setStats] = useState({ requests: 0, intercessions: 0 });
  const [savingCity, setSavingCity] = useState(false);
  const { completeTask } = useDailyTasks();
  const [daysJoined, setDaysJoined] = useState(0);
  const [recentIntercessions, setRecentIntercessions] = useState<any[]>([]);

  // Editing
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
    avatarUrl: "",
    isPublicInParish: false
  });
  const [uploading, setUploading] = useState(false);
  const [invitedUsers, setInvitedUsers] = useState<any[]>([]);
  const [loadingInvited, setLoadingInvited] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      fetchProfile(session.user.id);
      fetchStats(session.user.id);
      fetchReferrals(session.user.id);
      fetchRecentIntercessions(session.user.id);

      const joinedAt = new Date(session.user.created_at);
      const now = new Date();
      const days = Math.max(1, Math.floor((now.getTime() - joinedAt.getTime()) / (1000 * 60 * 60 * 24)));
      setDaysJoined(days);
    });
    fetchStates().then(setStates);
  }, [navigate]);

  const fetchReferrals = async (userId: string) => {
    setLoadingInvited(true);
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select(`
          referred_user_id,
          created_at,
          profiles:referred_user_id (
            full_name,
            avatar_url
          ),
          user_xp:referred_user_id (
            total_xp
          )
        `)
        .eq('referrer_user_id', userId);

      if (error) throw error;
      if (data) setInvitedUsers(data);
    } catch (err) {
      console.error("Error fetching referrals:", err);
    } finally {
      setLoadingInvited(false);
    }
  };

  const fetchRecentIntercessions = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("prayer_intercessions")
        .select("id, created_at, prayer_request_id, prayer_requests(title, user_id)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (data) setRecentIntercessions(data as any[]);
    } catch (e) {
      // non-critical
    }
  };

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
        avatarUrl: profile.avatar_url || "",
        isPublicInParish: profile.is_public_in_parish || false
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

    const { error: profileError } = await (supabase.from('profiles' as any) as any).upsert({
      id: user.id,
      full_name: editData.fullName,
      state: editData.state,
      city: editData.city,
      parish: editData.parish,
      show_real_name: editData.showRealName,
      display_name: editData.showRealName ? editData.displayName : null,
      is_public_in_parish: editData.isPublicInParish
    });

    const { error: authError } = await supabase.auth.updateUser({
      data: {
        full_name: editData.fullName,
        state: editData.state,
        city: editData.city,
        parish: editData.parish,
        show_real_name: editData.showRealName,
        display_name: editData.showRealName ? editData.displayName : null,
        is_public_in_parish: editData.isPublicInParish
      },
    });

    setSavingCity(false);
    if (profileError || authError) {
      toast.error("Erro ao salvar perfil.");
    } else {
      setIsEditing(false);
      toast.success("Perfil atualizado.");
      fetchProfile(user.id);
    }
  };

  const handleUploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setEditData(prev => ({ ...prev, avatarUrl: publicUrl }));
      toast.success("Foto atualizada.");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (!user || xpLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="w-5 h-5 rounded-full border-2 border-marian border-t-transparent animate-spin" />
      </div>
    );
  }

  const level = getLevel(totalXp);
  const nextLevel = getNextLevel(totalXp);
  const levelIndex = CELESTIAL_LEVELS.indexOf(level);
  const levelProgress = getLevelProgress(totalXp);
  const pointsToNext = nextLevel ? nextLevel.minXp - totalXp : 0;
  const displayName = editData.showRealName
    ? (editData.displayName || editData.fullName.split(' ')[0])
    : (editData.fullName.split(' ')[0] || "Fiel");
  const availableInvites = Math.max(0, 3 - invitedUsers.length);

  return (
    <PageTransition>
      <div className="min-h-screen pb-28 md:pb-12">

        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-5 pt-safe pt-4 pb-2">
          <button onClick={() => navigate("/")} className="p-1 -ml-1 text-ink-soft hover:text-ink transition-colors">
            <ArrowLeft size={20} strokeWidth={1.5} />
          </button>
          <button onClick={() => setIsEditing(true)} className="p-1 -mr-1 text-ink-soft hover:text-ink transition-colors">
            <Settings size={18} strokeWidth={1.5} />
          </button>
        </header>

        <main className="px-5 md:px-12 max-w-2xl mx-auto">

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="flex w-full gap-0 mb-6 mt-4 bg-transparent border-b border-hairline rounded-none h-auto p-0">
              <TabsTrigger
                value="profile"
                className="flex-1 pb-3 text-[11px] uppercase tracking-[0.2em] text-ink-soft data-[state=active]:text-ink data-[state=active]:border-b-2 data-[state=active]:border-ink rounded-none bg-transparent shadow-none"
              >
                Perfil
              </TabsTrigger>
              <TabsTrigger
                value="invited"
                className="flex-1 pb-3 text-[11px] uppercase tracking-[0.2em] text-ink-soft data-[state=active]:text-ink data-[state=active]:border-b-2 data-[state=active]:border-ink rounded-none bg-transparent shadow-none"
              >
                Indicações
              </TabsTrigger>
            </TabsList>

            {/* PROFILE TAB */}
            <TabsContent value="profile" className="outline-none space-y-8">

              {/* Avatar + name */}
              <div className="flex flex-col items-center text-center pt-2">
                <div className="relative mb-4 group">
                  <div className="w-24 h-24 rounded-full overflow-hidden border border-hairline">
                    <Avatar className="w-full h-full">
                      <AvatarImage src={editData.avatarUrl || undefined} className="object-cover" />
                      <AvatarFallback className="bg-vellum text-ink-soft text-xl font-serif">
                        {displayName[0] || <User size={28} strokeWidth={1.5} />}
                      </AvatarFallback>
                    </Avatar>
                    <label
                      htmlFor="avatar-upload"
                      className={cn(
                        "absolute inset-0 bg-ink/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-paper",
                        uploading && "opacity-100"
                      )}
                    >
                      {uploading
                        ? <div className="w-4 h-4 border-2 border-paper border-t-transparent rounded-full animate-spin" />
                        : <><Camera size={16} strokeWidth={1.5} className="mb-0.5" /><span className="text-[8px] uppercase tracking-wider">Alterar</span></>
                      }
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
                </div>

                <h1 className="font-serif text-[28px] leading-tight text-ink">{displayName}</h1>
                <p className="text-[12px] text-ink-soft mt-1">Caminhando há {daysJoined} {daysJoined === 1 ? "dia" : "dias"}</p>

                <button
                  onClick={() => setIsEditing(true)}
                  className="hidden md:inline-flex items-center gap-1.5 mt-4 text-xs text-ink-soft hover:text-ink transition-colors border border-hairline rounded-full px-4 py-1.5"
                >
                  <Settings size={12} strokeWidth={1.5} />
                  Editar perfil
                </button>
              </div>

              {/* Journey card */}
              <div className="rounded-xl border border-hairline bg-vellum px-6 py-5">
                <p className="text-[9px] uppercase tracking-[0.28em] text-ink-soft mb-3">✦ Sua Caminhada</p>
                <p className="font-serif text-[42px] leading-none text-ink">{totalXp}</p>
                <p className="text-[11px] text-ink-soft mt-1 mb-4">pontos de fé</p>
                <p className="text-[13px] text-ink font-medium">{level.name} · nv {levelIndex + 1}</p>
                <div className="w-full h-1.5 bg-hairline rounded-full overflow-hidden mt-3 mb-2">
                  <motion.div
                    className="h-full bg-marian rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(levelProgress, 100)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
                {nextLevel && (
                  <p className="text-[11px] text-ink-soft">{pointsToNext} pontos para {nextLevel.name}</p>
                )}
              </div>

              {/* 3-col stat mosaic */}
              <div className="grid grid-cols-3 gap-0 text-center">
                <div className="flex flex-col items-center py-3 border-r border-hairline">
                  <span className="font-serif text-[32px] leading-none text-ink">{stats.intercessions}</span>
                  <span className="text-[9px] uppercase tracking-[0.2em] text-ink-soft mt-2">Intercessões</span>
                </div>
                <div className="flex flex-col items-center py-3 border-r border-hairline">
                  <span className="font-serif text-[32px] leading-none text-ink">{stats.requests}</span>
                  <span className="text-[9px] uppercase tracking-[0.2em] text-ink-soft mt-2">Pedidos</span>
                </div>
                <div className="flex flex-col items-center py-3">
                  <span className="font-serif text-[32px] leading-none text-ink">{daysJoined}</span>
                  <span className="text-[9px] uppercase tracking-[0.2em] text-ink-soft mt-2">Dias</span>
                </div>
              </div>

              <HairlineDivider />

              {/* Recent intercessions */}
              {recentIntercessions.length > 0 && (
                <div>
                  <p className="text-[9px] uppercase tracking-[0.28em] text-ink-soft mb-4">Intercessões Recentes</p>
                  <div className="space-y-4">
                    {recentIntercessions.map((item: any) => {
                      const req = item.prayer_requests;
                      const title = req?.title || "Intenção";
                      const ago = (() => {
                        const diff = Date.now() - new Date(item.created_at).getTime();
                        const h = Math.floor(diff / 3600000);
                        if (h < 1) return "agora";
                        if (h < 24) return `há ${h}h`;
                        return `há ${Math.floor(h / 24)}d`;
                      })();

                      return (
                        <div key={item.id} className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] text-ink truncate italic font-serif leading-snug">
                              "{title}"
                            </p>
                            <p className="text-[11px] text-ink-soft mt-0.5">{ago}</p>
                          </div>
                          <button
                            onClick={() => navigate(`/pray?id=${item.prayer_request_id}`)}
                            className="text-[11px] text-marian hover:underline underline-offset-4 shrink-0 whitespace-nowrap"
                          >
                            Rezar de novo
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <HairlineDivider />

              {/* Sign out */}
              <div className="text-center pb-4">
                <button
                  onClick={handleSignOut}
                  className="text-sm text-ink-soft hover:text-ink transition-colors border border-hairline rounded-full px-6 py-2"
                >
                  Sair
                </button>
              </div>

            </TabsContent>

            {/* INVITED TAB */}
            <TabsContent value="invited" className="outline-none">
              <div className="space-y-6 pt-2">

                {loadingInvited ? (
                  <div className="py-16 flex justify-center">
                    <div className="w-5 h-5 rounded-full border-2 border-marian border-t-transparent animate-spin" />
                  </div>
                ) : invitedUsers.length === 0 ? (
                  <div className="py-12 text-center">
                    <Users size={32} strokeWidth={1} className="text-hairline mx-auto mb-4" />
                    <p className="text-[13px] text-ink-soft">Você ainda não indicou novos membros.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {invitedUsers.map((item) => {
                      const invitedProfile = item.profiles;
                      const invitedXp = item.user_xp?.total_xp || 0;
                      const invitedLevel = getLevel(invitedXp);

                      return (
                        <div
                          key={item.referred_user_id}
                          className="flex items-center gap-3 py-3 border-b border-hairline"
                        >
                          <Avatar className="w-9 h-9 border border-hairline">
                            <AvatarImage src={invitedProfile?.avatar_url} />
                            <AvatarFallback className="bg-vellum text-ink-soft text-xs">
                              <User size={14} strokeWidth={1.5} />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] text-ink truncate">{invitedProfile?.full_name || "Membro"}</p>
                            <p className="text-[11px] text-ink-soft">{invitedLevel.name}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {availableInvites > 0 ? (
                  <div className="rounded-xl border border-hairline bg-vellum p-5 text-center">
                    <p className="text-[12px] text-ink-soft mb-4">Compartilhe o Améns e ajude nossa comunidade a crescer.</p>
                    <button
                      className="h-11 px-6 rounded-full bg-ink text-paper text-sm font-medium hover:opacity-90 transition-opacity"
                      onClick={() => {
                        const link = `${window.location.origin}/auth?ref=${user?.id}`;
                        navigator.clipboard.writeText(link);
                        toast.success("Link copiado.");
                        completeTask("send_invite");
                      }}
                    >
                      Copiar link de indicação
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-hairline bg-vellum p-5 text-center">
                    <Lock size={20} strokeWidth={1.5} className="text-ink-soft mx-auto mb-2" />
                    <p className="text-[12px] text-ink-soft">Você esgotou seus convites por agora.</p>
                    <p className="text-[11px] text-ink-soft/60 mt-1">Suba de nível para ganhar mais convites.</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </main>

        {/* Edit profile modal */}
        <AnimatePresence>
          {isEditing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-ink/40 backdrop-blur-sm flex items-end md:items-center justify-center"
              onClick={(e) => { if (e.target === e.currentTarget) setIsEditing(false); }}
            >
              <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 60, opacity: 0 }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="bg-paper w-full max-w-md rounded-t-[28px] md:rounded-[22px] p-6 md:p-8 overflow-y-auto max-h-[90vh]"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-serif text-[22px] text-ink">Configurações</h2>
                  <button onClick={() => setIsEditing(false)} className="p-1 text-ink-soft hover:text-ink transition-colors">
                    <X size={20} strokeWidth={1.5} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-[0.15em] text-ink-soft">Nome completo</Label>
                    <Input
                      value={editData.fullName}
                      onChange={(e) => setEditData({ ...editData, fullName: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] uppercase tracking-[0.15em] text-ink-soft">Estado</Label>
                      <Select value={editData.state} onValueChange={(val) => setEditData({ ...editData, state: val, city: "", parish: "" })}>
                        <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                        <SelectContent>
                          {states.map(s => <SelectItem key={s.sigla} value={s.sigla}>{s.sigla}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] uppercase tracking-[0.15em] text-ink-soft">Cidade</Label>
                      <Select value={editData.city} onValueChange={(val) => setEditData({ ...editData, city: val, parish: "" })} disabled={!editData.state}>
                        <SelectTrigger className="truncate"><SelectValue placeholder="Cidade" /></SelectTrigger>
                        <SelectContent>
                          {cities.map(c => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-[0.15em] text-ink-soft">Paróquia</Label>
                    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                      <PopoverTrigger asChild>
                        <button
                          role="combobox"
                          disabled={!editData.city}
                          className={cn(
                            "w-full flex items-center justify-between h-10 px-3 rounded-md border border-hairline bg-vellum text-[13px] text-left",
                            !editData.parish && "text-ink-soft/60",
                            !editData.city && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <span className="truncate">{editData.parish || "Buscar ou digitar..."}</span>
                          <ChevronsUpDown size={14} strokeWidth={1.5} className="shrink-0 text-ink-soft ml-2" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Nome da paróquia..." value={editData.parish} onValueChange={(val) => setEditData({ ...editData, parish: val })} />
                          <CommandList>
                            <CommandEmpty className="py-2 px-4 text-xs italic text-ink-soft">Nenhuma sugestão.</CommandEmpty>
                            <CommandGroup heading="Sugeridas">
                              {existingParishes.map((p) => (
                                <CommandItem key={p} value={p} onSelect={(val) => { setEditData({ ...editData, parish: val }); setPopoverOpen(false); }}>
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

                  <div className="space-y-3 pt-3 border-t border-hairline">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-0.5 w-4 h-4 rounded border-hairline text-marian focus:ring-marian/30"
                        checked={editData.showRealName}
                        onChange={(e) => setEditData({ ...editData, showRealName: e.target.checked })}
                      />
                      <span className="text-[12px] text-ink-soft leading-snug">Usar apelido ou nome diferente para manter o anonimato.</span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-0.5 w-4 h-4 rounded border-hairline text-marian focus:ring-marian/30"
                        checked={editData.isPublicInParish}
                        onChange={(e) => setEditData({ ...editData, isPublicInParish: e.target.checked })}
                      />
                      <span className="text-[12px] text-ink-soft leading-snug">Aparecer na lista da minha paróquia.</span>
                    </label>

                    <AnimatePresence>
                      {editData.showRealName && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-1.5 pt-1">
                            <Label className="text-[11px] uppercase tracking-[0.15em] text-ink-soft">Apelido</Label>
                            <Input
                              placeholder="Ex: Pedro, Ana..."
                              value={editData.displayName}
                              onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button
                    className="w-full h-12 rounded-full bg-ink text-paper text-sm font-medium hover:opacity-90 transition-opacity mt-2 disabled:opacity-50"
                    onClick={handleSaveProfile}
                    disabled={savingCity}
                  >
                    {savingCity ? "Salvando..." : "Salvar alterações"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </PageTransition>
  );
};

export default Profile;
