import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { MapPin, Church, Users, Heart, ArrowRight } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { formatTimeAgo } from "@/lib/utils";
import BrazilMap from "@/components/BrazilMap";
import { fetchCitiesByState, type IBGECity } from "@/lib/ibge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LivePulse } from "@/components/ui/live-pulse";
import { FeedCard } from "@/components/ui/feed-card";
import { HairlineDivider } from "@/components/ui/hairline-divider";

const GRATITUDE_KEYWORDS = ["gratidão", "obrigad", "graça", "bênção", "celebr"];

const isGratitude = (title: string) =>
  GRATITUDE_KEYWORDS.some(k => title.toLowerCase().includes(k));

const STATE_LIST = [
  { uf: "AC", name: "Acre" }, { uf: "AL", name: "Alagoas" }, { uf: "AP", name: "Amapá" },
  { uf: "AM", name: "Amazonas" }, { uf: "BA", name: "Bahia" }, { uf: "CE", name: "Ceará" },
  { uf: "DF", name: "Distrito Federal" }, { uf: "ES", name: "Espírito Santo" }, { uf: "GO", name: "Goiás" },
  { uf: "MA", name: "Maranhão" }, { uf: "MT", name: "Mato Grosso" }, { uf: "MS", name: "Mato Grosso do Sul" },
  { uf: "MG", name: "Minas Gerais" }, { uf: "PA", name: "Pará" }, { uf: "PB", name: "Paraíba" },
  { uf: "PR", name: "Paraná" }, { uf: "PE", name: "Pernambuco" }, { uf: "PI", name: "Piauí" },
  { uf: "RJ", name: "Rio de Janeiro" }, { uf: "RN", name: "Rio Grande do Norte" }, { uf: "RS", name: "Rio Grande do Sul" },
  { uf: "RO", name: "Rondônia" }, { uf: "RR", name: "Roraima" }, { uf: "SC", name: "Santa Catarina" },
  { uf: "SP", name: "São Paulo" }, { uf: "SE", name: "Sergipe" }, { uf: "TO", name: "Tocantins" }
];

const Community = () => {
  const navigate = useNavigate();
  const [totalPrayers, setTotalPrayers] = useState(0);
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  // Map States
  const [selectedMapState, setSelectedMapState] = useState<string | null>(null);
  const [mapCities, setMapCities] = useState<IBGECity[]>([]);
  const [selectedMapCity, setSelectedMapCity] = useState<string>("");
  const [parishStats, setParishStats] = useState<any[]>([]);
  const [cityTotalUsers, setCityTotalUsers] = useState(0);
  const [mapLoading, setMapLoading] = useState(false);
  const [selectedParishMembers, setSelectedParishMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [selectedParish, setSelectedParish] = useState<string | null>(null);

  useEffect(() => {
    fetchGlobalStats();
    fetchCurrentUser();
    fetchFriends();
    fetchRecentFeed();
  }, []);

  const fetchGlobalStats = async () => {
    const { count } = await supabase
      .from("prayer_intercessions")
      .select("*", { count: "exact", head: true });
    setTotalPrayers(count || 0);
  };

  const fetchRecentFeed = async () => {
    setFeedLoading(true);
    try {
      const { data: requests } = await supabase
        .from("prayer_requests")
        .select("id, title, created_at, prayer_count, is_anonymous, author_name, user_id")
        .eq("status", "active")
        .is("feedback", null)
        .order("created_at", { ascending: false })
        .limit(9);

      if (!requests) return;

      const userIds = requests.filter(r => !r.is_anonymous && r.user_id).map(r => r.user_id);
      let profilesMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, avatar_url, city")
          .in("id", userIds);
        profiles?.forEach(p => { profilesMap[p.id] = p; });
      }

      setFeedItems(requests.map(r => ({
        ...r,
        profile: profilesMap[r.user_id] || null,
      })));
    } catch (e) {
      // non-critical
    } finally {
      setFeedLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setCurrentUser(session.user);
      fetchPendingRequests(session.user.id);
    }
  };

  const fetchFriends = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('friendships').select('friend_id').eq('user_id', user.id);
    if (data) setFriendIds(new Set(data.map(f => f.friend_id)));
  };

  const fetchPendingRequests = async (userId: string) => {
    const { data } = await supabase
      .from('friend_requests')
      .select('receiver_id')
      .eq('sender_id', userId)
      .eq('status', 'pending');
    if (data) setPendingRequests(new Set(data.map(r => r.receiver_id)));
  };

  const handleStateClick = async (stateUf: string) => {
    setSelectedMapState(stateUf);
    setSelectedMapCity("");
    setParishStats([]);
    setSelectedParish(null);
    setSelectedParishMembers([]);
    const citiesData = await fetchCitiesByState(stateUf);
    setMapCities(citiesData);
  };

  const handleSearchCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMapState || !selectedMapCity) return;
    setSelectedParish(null);
    setSelectedParishMembers([]);
    setMapLoading(true);
    const { data } = await (supabase
      .from('parish_stats' as any)
      .select('*') as any)
      .eq('state', selectedMapState)
      .ilike('city', `%${selectedMapCity}%`);

    if (data) {
      const total = data.reduce((acc: number, curr: any) => acc + Number(curr.total_users), 0);
      setCityTotalUsers(total);
      setParishStats(data.sort((a: any, b: any) => b.total_users - a.total_users));
    }
    setMapLoading(false);
  };

  const handleParishClick = async (parishName: string) => {
    setSelectedParish(parishName);
    setLoadingMembers(true);
    const { data, error } = await supabase
      .from('profiles' as any)
      .select('id, full_name, display_name, show_real_name, avatar_url, city')
      .eq('state', selectedMapState)
      .eq('city', selectedMapCity)
      .eq('parish', parishName)
      .eq('is_public_in_parish', true);
    if (!error && data) setSelectedParishMembers(data);
    setLoadingMembers(false);
  };

  const handleAddFriend = async (targetUserId: string) => {
    if (!currentUser) {
      toast.error("Entre para adicionar amigos.");
      return;
    }
    const { error } = await supabase.from('friend_requests').insert({
      sender_id: currentUser.id,
      receiver_id: targetUserId,
      status: 'pending'
    });
    if (error) {
      toast.error("Erro ao enviar pedido.");
    } else {
      toast.success("Pedido de amizade enviado.");
      setPendingRequests(prev => new Set([...prev, targetUserId]));
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen pb-28 md:pb-12">

        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-5 pt-safe pt-4 pb-2">
          <h1 className="font-serif text-[22px] text-ink">Comunidade</h1>
        </header>

        <main className="px-5 md:px-12 max-w-6xl mx-auto">

          {/* Desktop heading */}
          <div className="hidden md:block pt-8 pb-6">
            <h1 className="font-serif text-[34px] text-ink">Comunidade</h1>
          </div>

          {/* Live chain banner */}
          <Link
            to="/prayer-chain"
            className="flex items-start gap-4 rounded-xl bg-ink text-paper px-5 py-4 mb-8 group"
          >
            <LivePulse className="w-5 h-5 shrink-0 mt-0.5 [--pulse-color:theme(colors.paper)]" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.24em] text-paper/60 mb-1">Ao vivo</p>
              <p className="text-[15px] font-medium text-paper leading-snug">Corrente de oração</p>
              <p className="text-[12px] text-paper/60 mt-0.5">
                {totalPrayers.toLocaleString("pt-BR")} orações intercedidas
              </p>
            </div>
            <ArrowRight size={18} strokeWidth={1.5} className="text-paper/40 mt-1 group-hover:text-paper/70 transition-colors shrink-0" />
          </Link>

          {/* Recent intentions section */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-[10px] uppercase tracking-[0.28em] text-ink-soft">Intenções recentes</span>
              <div className="flex-1 h-px bg-hairline" />
            </div>

            {feedLoading ? (
              <div className="grid md:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-40 rounded-xl bg-vellum border border-hairline animate-pulse" />
                ))}
              </div>
            ) : feedItems.length === 0 ? (
              <p className="text-[13px] text-ink-soft text-center py-8">Nenhuma intenção recente.</p>
            ) : (
              <div className="grid md:grid-cols-3 gap-4">
                {feedItems.map((item) => {
                  const gratitude = isGratitude(item.title);
                  const name = item.is_anonymous ? undefined : (item.author_name || item.profile?.first_name);
                  const city = item.profile?.city;
                  const time = formatTimeAgo(item.created_at);

                  return (
                    <FeedCard
                      key={item.id}
                      name={name}
                      city={city}
                      time={time}
                      tag={gratitude ? "Gratidão" : "Intenção"}
                      text={item.title}
                      praying={item.prayer_count || 0}
                      anonymous={item.is_anonymous || !name}
                      gratitude={gratitude}
                      avatarUrl={item.profile?.avatar_url}
                      onPray={() => navigate(`/pray?id=${item.id}`)}
                    />
                  );
                })}
              </div>
            )}
          </div>

          <HairlineDivider className="mb-8" />

          {/* Map section */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <MapPin size={14} strokeWidth={1.5} className="text-ink-soft shrink-0" />
              <span className="text-[10px] uppercase tracking-[0.28em] text-ink-soft">Oração no Brasil</span>
              <div className="flex-1 h-px bg-hairline" />
            </div>

            <BrazilMap onStateClick={handleStateClick} selectedState={selectedMapState} />

            <div className="mt-3">
              <Select
                value={selectedMapState || ""}
                onValueChange={(val) => handleStateClick(val)}
              >
                <SelectTrigger className="w-full h-11">
                  <SelectValue placeholder="Selecione o estado..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {STATE_LIST.map((state) => (
                    <SelectItem key={state.uf} value={state.uf}>
                      {state.name} ({state.uf})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <AnimatePresence>
              {selectedMapState && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 rounded-xl border border-hairline bg-vellum p-4">
                    <p className="text-[11px] text-ink-soft mb-3">Pesquisar em {selectedMapState}</p>
                    <form onSubmit={handleSearchCity} className="flex gap-2">
                      <Input
                        type="text"
                        list="map-cities-list"
                        placeholder="Digite sua cidade..."
                        value={selectedMapCity}
                        onChange={(e) => setSelectedMapCity(e.target.value)}
                        className="flex-1"
                      />
                      <datalist id="map-cities-list">
                        {mapCities.map(c => <option key={c.id} value={c.nome} />)}
                      </datalist>
                      <button
                        type="submit"
                        disabled={!selectedMapCity || mapLoading}
                        className="h-10 px-4 rounded-full bg-ink text-paper text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                      >
                        {mapLoading ? "..." : "Buscar"}
                      </button>
                    </form>
                  </div>

                  {parishStats.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] uppercase tracking-[0.24em] text-ink-soft">
                          Paróquias em {selectedMapCity}
                        </p>
                        {selectedParish && (
                          <button
                            onClick={() => setSelectedParish(null)}
                            className="text-[11px] text-marian hover:underline underline-offset-4"
                          >
                            ← Voltar
                          </button>
                        )}
                      </div>

                      {!selectedParish ? (
                        parishStats.map((stat, idx) => {
                          const percentage = cityTotalUsers > 0
                            ? Math.round((Number(stat.total_users) / cityTotalUsers) * 100)
                            : 0;
                          return (
                            <div
                              key={stat.parish}
                              className="rounded-xl border border-hairline bg-vellum p-4 cursor-pointer hover:border-marian/30 transition-colors"
                              onClick={() => handleParishClick(stat.parish)}
                            >
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <div className="flex items-center gap-2">
                                  <Church size={14} strokeWidth={1.5} className="text-ink-soft shrink-0" />
                                  <span className="text-[13px] text-ink leading-snug">{stat.parish}</span>
                                </div>
                                <span className="text-[11px] text-ink-soft shrink-0">
                                  {stat.total_users} {stat.total_users === 1 ? "membro" : "membros"}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-1 bg-hairline rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-marian rounded-full"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-ink-soft w-8 text-right">{percentage}%</span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <AnimatePresence mode="wait">
                          <motion.div
                            key="parish-members"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="space-y-2"
                          >
                            <p className="text-[13px] font-serif italic text-ink mb-4">"{selectedParish}"</p>

                            {loadingMembers ? (
                              [1, 2].map(i => (
                                <div key={i} className="h-16 rounded-xl bg-vellum border border-hairline animate-pulse" />
                              ))
                            ) : selectedParishMembers.length > 0 ? (
                              selectedParishMembers.map((member) => {
                                const isMe = currentUser?.id === member.id;
                                const isFriend = friendIds.has(member.id);
                                const isPending = pendingRequests.has(member.id);
                                const name = member.show_real_name
                                  ? (member.display_name || member.full_name?.split(' ')[0])
                                  : "Membro da Fé";

                                return (
                                  <div
                                    key={member.id}
                                    className={cn(
                                      "flex items-center gap-3 p-3 rounded-xl border border-hairline bg-vellum",
                                      isMe && "border-marian/30"
                                    )}
                                  >
                                    <Avatar className="w-9 h-9 border border-hairline">
                                      <AvatarImage src={member.avatar_url} />
                                      <AvatarFallback className="bg-hairline text-ink-soft text-xs">
                                        <UserIcon size={14} strokeWidth={1.5} />
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[13px] text-ink truncate flex items-center gap-1.5">
                                        {name}
                                        {isMe && <span className="text-[9px] uppercase tracking-wider text-marian">você</span>}
                                        {isFriend && <span className="text-[9px] uppercase tracking-wider text-marian">amigo</span>}
                                      </p>
                                      <p className="text-[11px] text-ink-soft">{selectedMapCity} · {selectedMapState}</p>
                                    </div>

                                    {!isMe && !isFriend && (
                                      <button
                                        disabled={isPending}
                                        onClick={() => handleAddFriend(member.id)}
                                        className={cn(
                                          "text-[11px] rounded-full px-3 py-1 transition-colors",
                                          isPending
                                            ? "text-ink-soft border border-hairline cursor-not-allowed"
                                            : "text-marian border border-marian/30 hover:bg-marian/5"
                                        )}
                                      >
                                        {isPending ? "Pendente" : "Seguir"}
                                      </button>
                                    )}

                                    {isFriend && (
                                      <Heart size={14} strokeWidth={1.5} className="text-marian shrink-0" />
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-center text-[12px] italic text-ink-soft py-6">
                                Ainda não há membros públicos nesta paróquia.
                              </p>
                            )}
                          </motion.div>
                        </AnimatePresence>
                      )}

                      {parishStats.length === 0 && selectedMapCity && !mapLoading && (
                        <p className="text-center text-[12px] text-ink-soft py-4 italic">
                          Nenhuma paróquia encontrada em {selectedMapCity}.
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </main>
      </div>
    </PageTransition>
  );
};

export default Community;
