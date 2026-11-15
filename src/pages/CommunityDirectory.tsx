import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Award, ChevronDown, ChevronRight, Church, Heart, Map as MapIcon, RotateCw, User as UserIcon, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NameWithInsignias, usePublicInsignias } from "@/features/insignias/Insignias";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import PageTransition from "@/components/PageTransition";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const STATE_NAMES: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará", DF: "Distrito Federal",
  ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais",
  PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe", TO: "Tocantins",
};

interface CitySummary { city: string; state: string; count: number }
interface UserProfile { city: string | null; state: string | null; parish: string | null }

const CommunityDirectory = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeCities, setActiveCities] = useState<CitySummary[]>([]);
  const [ownCityParishes, setOwnCityParishes] = useState<any[]>([]);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState("");
  const [parishStats, setParishStats] = useState<any[]>([]);
  const [selectedParish, setSelectedParish] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [directoryError, setDirectoryError] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const { data: insignias } = usePublicInsignias(members.map(member => member.id));

  const loadDirectory = async () => {
    setDirectoryLoading(true); setDirectoryError(false);
    try {
      const { data, error } = await supabase.from("profiles" as any).select("city,state")
        .eq("is_public_in_parish", true).not("city", "is", null).not("state", "is", null);
      if (error) throw error;
      const grouped = new Map<string, CitySummary>();
      for (const item of data || []) {
        const city = (item as any).city?.trim();
        const state = (item as any).state?.trim().toUpperCase();
        if (!city || !STATE_NAMES[state]) continue;
        const key = `${city.toLocaleLowerCase("pt-BR")}:${state}`;
        const current = grouped.get(key);
        if (current) current.count += 1; else grouped.set(key, { city, state, count: 1 });
      }
      setActiveCities(Array.from(grouped.values()));
    } catch (error) { console.error("Could not load the community directory.", error); setDirectoryError(true); }
    finally { setDirectoryLoading(false); }
  };

  useEffect(() => {
    let active = true;
    const loadIdentity = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active || !session) return;
      setCurrentUser(session.user);
      const [profileResult, friendsResult, pendingResult] = await Promise.all([
        supabase.from("profiles" as any).select("city,state,parish").eq("id", session.user.id).maybeSingle(),
        supabase.from("friendships").select("friend_id").eq("user_id", session.user.id),
        supabase.from("friend_requests").select("receiver_id").eq("sender_id", session.user.id).eq("status", "pending"),
      ]);
      if (!active) return;
      const ownProfile = (profileResult.data || null) as UserProfile | null;
      setProfile(ownProfile);
      setFriendIds(new Set((friendsResult.data || []).map(item => item.friend_id)));
      setPendingRequests(new Set((pendingResult.data || []).map(item => item.receiver_id)));
      if (ownProfile?.city && ownProfile?.state) {
        const { data } = await (supabase.from("parish_stats" as any).select("*") as any)
          .eq("state", ownProfile.state.toUpperCase()).ilike("city", ownProfile.city).gt("total_users", 0);
        if (active) setOwnCityParishes((data || []).sort((a: any, b: any) => Number(b.total_users) - Number(a.total_users)));
      }
    };
    void loadIdentity(); void loadDirectory();
    return () => { active = false; };
  }, []);

  const states = useMemo(() => {
    const grouped = new Map<string, CitySummary[]>();
    for (const city of activeCities) grouped.set(city.state, [...(grouped.get(city.state) || []), city]);
    const ownState = profile?.state?.toUpperCase();
    return Array.from(grouped.entries()).sort(([a], [b]) => {
      if (a === ownState) return -1; if (b === ownState) return 1;
      return (STATE_NAMES[a] || a).localeCompare(STATE_NAMES[b] || b, "pt-BR");
    });
  }, [activeCities, profile?.state]);
  const selectedStateCities = useMemo(() => (states.find(([state]) => state === selectedState)?.[1] || [])
    .slice().sort((a, b) => b.count - a.count || a.city.localeCompare(b.city, "pt-BR")), [selectedState, states]);
  const ownParish = ownCityParishes.find(item => item.parish?.toLocaleLowerCase("pt-BR") === profile?.parish?.toLocaleLowerCase("pt-BR"));
  const nearbyParishes = ownCityParishes.filter(item => item.parish?.toLocaleLowerCase("pt-BR") !== profile?.parish?.toLocaleLowerCase("pt-BR"));

  const loadParishes = async (state: string, city: string) => {
    setResultsLoading(true); setSelectedState(state); setSelectedCity(city); setSelectedParish(null); setMembers([]);
    const { data, error } = await (supabase.from("parish_stats" as any).select("*") as any)
      .eq("state", state).ilike("city", city).gt("total_users", 0);
    setResultsLoading(false);
    if (error) { toast.error("Não foi possível abrir as comunidades desta cidade."); return []; }
    const sorted = (data || []).sort((a: any, b: any) => Number(b.total_users) - Number(a.total_users));
    setParishStats(sorted); return sorted;
  };

  const openParish = async (parish: string, state = selectedState, city = selectedCity) => {
    if (!state || !city) return;
    setSelectedState(state); setSelectedCity(city); setSelectedParish(parish); setMembersLoading(true);
    const { data, error } = await supabase.from("profiles" as any)
      .select("id,full_name,display_name,show_real_name,avatar_url,city")
      .eq("state", state).ilike("city", city).eq("parish", parish).eq("is_public_in_parish", true);
    setMembersLoading(false);
    if (error) toast.error("Não foi possível carregar os membros desta comunidade."); else setMembers(data || []);
  };
  const openMyCommunity = async () => {
    const state = profile?.state?.toUpperCase();
    if (!state || !profile?.city || !profile?.parish) { navigate("/profile/edit"); return; }
    await loadParishes(state, profile.city); await openParish(profile.parish, state, profile.city);
  };
  const openNearbyParish = async (parish: string) => {
    const state = profile?.state?.toUpperCase(); if (!state || !profile?.city) return;
    await loadParishes(state, profile.city); await openParish(parish, state, profile.city);
  };
  const toggleState = (state: string) => {
    const next = selectedState === state && !selectedCity ? null : state;
    setSelectedState(next); setSelectedCity(""); setParishStats([]); setSelectedParish(null); setMembers([]);
  };
  const addFriend = async (targetUserId: string) => {
    if (!currentUser) { toast.error("Entre para adicionar amigos."); return; }
    const { error } = await supabase.from("friend_requests").insert({ sender_id: currentUser.id, receiver_id: targetUserId, status: "pending" });
    if (error) toast.error("Erro ao enviar pedido.");
    else { toast.success("Pedido de amizade enviado! 🙏"); setPendingRequests(previous => new Set([...previous, targetUserId])); }
  };

  const renderMember = (member: any) => {
    const isMe = currentUser?.id === member.id, isFriend = friendIds.has(member.id), isPending = pendingRequests.has(member.id);
    const name = member.full_name || member.display_name || "Membro da Fé";
    return <motion.div key={member.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
      <Card className={cn("p-3 sm:p-4 flex items-center justify-between border-primary/10 bg-white/85 rounded-2xl soft-shadow", isMe && "ring-2 ring-primary/20 bg-primary/5")}>
        <button className="flex items-center gap-3 min-w-0 text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" onClick={() => navigate(`/profile/${member.id}`)} aria-label={`Abrir perfil de ${name}`}>
          <Avatar className="w-11 h-11 border-2 border-background shadow-sm shrink-0"><AvatarImage src={member.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.id}`} /><AvatarFallback><UserIcon className="w-5 h-5" /></AvatarFallback></Avatar>
          <span className="min-w-0"><span className="text-sm font-bold leading-tight flex items-center gap-1.5 truncate"><NameWithInsignias selection={insignias?.[member.id]}>{name}</NameWithInsignias>{isMe && <small className="text-[8px] bg-primary text-white px-1.5 py-0.5 rounded-full uppercase">Você</small>}{isFriend && <small className="text-[8px] bg-green-600 text-white px-1.5 py-0.5 rounded-full uppercase">Amigo</small>}</span><span className="block text-[10px] font-semibold text-muted-foreground truncate mt-1">{selectedCity} • {selectedState}</span></span>
        </button>
        {!isMe && !isFriend && <Button variant="ghost" size="sm" disabled={isPending} onClick={() => addFriend(member.id)} className="rounded-full h-8 px-4 text-[10px] font-bold uppercase shrink-0 ml-2 bg-primary/10 text-primary">{isPending ? "Pendente" : "Adicionar"}</Button>}
        {isFriend && <div className="p-2 bg-green-50 text-green-600 rounded-full shrink-0 ml-2"><Heart className="w-4 h-4 fill-current" /></div>}
      </Card>
    </motion.div>;
  };

  return <PageTransition><div className="min-h-screen bg-transparent relative overflow-hidden pb-28">
    <div className="absolute top-[-8rem] right-[-8rem] w-[25rem] h-[25rem] rounded-full bg-primary/10 blur-3xl opacity-50 pointer-events-none" /><div className="absolute bottom-[-8rem] left-[-8rem] w-[25rem] h-[25rem] rounded-full bg-accent/10 blur-3xl opacity-50 pointer-events-none" />
    <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 relative z-10 max-w-lg pb-32">
      <div className="flex items-center justify-between mb-4"><Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-full hover:bg-primary/10"><ArrowLeft className="w-5 h-5" /></Button><span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/80">Comunidade Améns</span><div className="w-9" /></div>
      <motion.header className="text-center mb-7" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><div className="community-heading flex items-center justify-center gap-3 mb-2"><Users className="w-7 h-7 text-primary" /><h1 className="text-3xl sm:text-4xl font-bold text-foreground text-glow">Comunidade</h1></div><div className="divider-gold max-w-[6rem] mx-auto mb-2" /><p className="text-xs text-muted-foreground font-semibold uppercase tracking-[0.2em]">Encontre irmãos de fé</p></motion.header>
      <div className="space-y-6">
        <section aria-labelledby="my-community-title"><h2 id="my-community-title" className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground mb-3 px-1">Minha comunidade</h2><Card className="p-5 border-primary/20 bg-white/85 rounded-[2rem] soft-shadow"><div className="flex items-center gap-4"><div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0"><Church className="w-7 h-7 text-primary" /></div><div className="min-w-0"><h3 className="text-xl font-bold leading-tight truncate">{profile?.parish || "Complete seu perfil"}</h3><p className="text-xs text-muted-foreground mt-1">{profile?.city && profile?.state ? `${profile.city}, ${profile.state.toUpperCase()}${ownParish ? ` · ${ownParish.total_users} ${Number(ownParish.total_users) === 1 ? "membro" : "membros"}` : ""}` : "Informe sua cidade e paróquia"}</p></div></div><Button onClick={openMyCommunity} className="w-full mt-5 h-12 gradient-divine rounded-2xl text-primary-foreground font-bold">{profile?.parish ? "Abrir comunidade" : "Completar meu perfil"}</Button></Card></section>
        {nearbyParishes.length > 0 && <section aria-labelledby="nearby-title"><div className="flex items-center justify-between mb-3 px-1"><h2 id="nearby-title" className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Comunidades próximas</h2><span className="text-[10px] text-primary font-bold">Na sua cidade</span></div><div className="space-y-2.5">{nearbyParishes.slice(0, 3).map(item => <button key={item.parish} onClick={() => openNearbyParish(item.parish)} className="w-full p-4 flex items-center gap-3 text-left border border-primary/15 bg-white/80 rounded-2xl soft-shadow hover:border-primary/40 transition-colors"><span className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Church className="w-5 h-5 text-primary" /></span><span className="min-w-0 flex-1"><strong className="block text-sm truncate">{item.parish}</strong><small className="block text-muted-foreground mt-1">{profile?.city} · {item.total_users} {Number(item.total_users) === 1 ? "membro" : "membros"}</small></span><ChevronRight className="w-4 h-4 text-primary shrink-0" /></button>)}</div></section>}
        <section aria-labelledby="states-title"><div className="flex items-center justify-between mb-3 px-1"><h2 id="states-title" className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Explorar por estado</h2><MapIcon className="w-4 h-4 text-primary" /></div>
          {directoryLoading ? <div className="space-y-2">{[1,2,3].map(item => <Card key={item} className="h-14 animate-pulse bg-white/50 rounded-2xl" />)}</div> : directoryError ? <Card className="p-5 text-center rounded-2xl"><p className="text-sm text-muted-foreground">Não foi possível carregar as comunidades.</p><Button variant="outline" size="sm" className="mt-3 rounded-xl" onClick={loadDirectory}><RotateCw className="w-4 h-4 mr-2" />Tentar novamente</Button></Card> : states.length === 0 ? <Card className="p-5 text-center rounded-2xl text-sm text-muted-foreground">Ainda não há comunidades públicas para explorar.</Card> : <div className="space-y-2.5">{states.map(([state, cities]) => <div key={state}><button onClick={() => toggleState(state)} className={cn("w-full min-h-14 px-4 flex items-center justify-between text-left border bg-white/80 rounded-2xl transition-colors", selectedState === state ? "border-primary/50 bg-primary/5" : "border-primary/15 hover:border-primary/35")} aria-expanded={selectedState === state && !selectedCity}><span className="font-semibold">{STATE_NAMES[state] || state}</span><span className="flex items-center gap-2 text-xs text-muted-foreground">{cities.length} {cities.length === 1 ? "cidade" : "cidades"}<ChevronDown className={cn("w-4 h-4 transition-transform", selectedState === state && !selectedCity && "rotate-180")} /></span></button><AnimatePresence>{selectedState === state && !selectedCity && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden"><div className="grid grid-cols-2 gap-2.5 pt-2.5">{selectedStateCities.map(city => <button key={`${city.city}-${city.state}`} onClick={() => loadParishes(city.state, city.city)} className="min-h-20 p-3 text-left border border-primary/15 bg-white/75 rounded-2xl hover:border-primary/40"><strong className="block text-sm leading-tight">{city.city}</strong><span className="block mt-2 text-[10px] text-muted-foreground">{city.count} {city.count === 1 ? "fiel público" : "fiéis públicos"}</span></button>)}</div></motion.div>}</AnimatePresence></div>)}</div>}
        </section>
        {(selectedCity || resultsLoading) && <section aria-labelledby="city-results-title" className="pt-1"><div className="flex items-center justify-between mb-3 px-1"><div><h2 id="city-results-title" className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Comunidades em {selectedCity}</h2><p className="text-[10px] text-muted-foreground mt-1">{STATE_NAMES[selectedState || ""] || selectedState}</p></div><Button variant="ghost" size="sm" onClick={() => { setSelectedCity(""); setSelectedParish(null); setMembers([]); }} className="text-[10px] uppercase">Voltar</Button></div>
          {resultsLoading ? <Card className="h-20 animate-pulse bg-white/50 rounded-2xl" /> : !selectedParish ? <div className="space-y-2.5">{parishStats.length > 0 ? parishStats.map(item => <button key={item.parish} onClick={() => openParish(item.parish)} className="w-full p-4 flex items-center gap-3 text-left border border-primary/15 bg-white/85 rounded-2xl soft-shadow hover:border-primary/40"><span className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Church className="w-5 h-5 text-primary" /></span><span className="min-w-0 flex-1"><strong className="block text-sm truncate">{item.parish}</strong><small className="block text-muted-foreground mt-1">{item.total_users} {Number(item.total_users) === 1 ? "membro público" : "membros públicos"}</small></span><ChevronRight className="w-4 h-4 text-primary" /></button>) : <Card className="p-5 text-center rounded-2xl text-sm text-muted-foreground">Nenhuma paróquia pública encontrada nesta cidade.</Card>}</div> : <div className="space-y-4"><Card className="p-5 text-center rounded-[2rem] bg-white/85 border-primary/15"><div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3"><Church className="w-8 h-8 text-primary" /></div><h3 className="text-xl font-bold">{selectedParish}</h3><p className="text-[10px] uppercase tracking-[0.2em] text-primary mt-1">Comunidade paroquial</p></Card><div><h4 className="text-xs font-bold uppercase tracking-widest px-2 mb-2 text-primary/80">Irmãos de fé públicos</h4><div className="space-y-2.5">{membersLoading ? [1,2].map(item => <Card key={item} className="h-16 animate-pulse bg-white/50 rounded-2xl" />) : members.length > 0 ? members.map(renderMember) : <p className="text-center text-xs italic text-muted-foreground py-4">Ainda não há membros públicos nesta paróquia.</p>}</div></div></div>}
        </section>}
        <Card className="p-5 border-dashed border-primary/20 bg-primary/5 rounded-3xl text-center"><Award className="w-6 h-6 text-primary/70 mx-auto mb-2" /><h3 className="text-sm font-bold mb-1">Ranking de Intercessores</h3><p className="text-xs text-muted-foreground">Mostre sua luz na comunidade. O ranking mensal chega em breve! ✨</p></Card>
      </div>
    </main>
  </div></PageTransition>;
};

export default CommunityDirectory;
