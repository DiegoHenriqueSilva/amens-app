import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Users, Sparkles, ArrowLeft, Heart, Globe, Award, TrendingUp, MapPin, Church } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { formatTimeAgo } from "@/lib/utils";
import BrazilMap from "@/components/BrazilMap";
import { fetchCitiesByState, type IBGECity } from "@/lib/ibge";
import BottomNav from "@/components/BottomNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as UserIcon } from "lucide-react";

const Community = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<any[]>([]);
  const [totalPrayers, setTotalPrayers] = useState(0);
  const [loading, setLoading] = useState(true);

  // Map States
  const [selectedMapState, setSelectedMapState] = useState<string | null>(null);
  const [mapCities, setMapCities] = useState<IBGECity[]>([]);
  const [selectedMapCity, setSelectedMapCity] = useState<string>("");
  const [parishStats, setParishStats] = useState<any[]>([]);
  const [cityTotalUsers, setCityTotalUsers] = useState(0);
  const [mapLoading, setMapLoading] = useState(false);

  useEffect(() => {
    fetchGlobalStats();
    fetchRecentActivities();
    
    // Subscribe to new intercessions for real-time feel
    const channel = supabase
      .channel("public-activities")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "prayer_intercessions" },
        () => {
          fetchGlobalStats();
          fetchRecentActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchGlobalStats = async () => {
    const { count } = await supabase
      .from("prayer_intercessions")
      .select("*", { count: "exact", head: true });
    setTotalPrayers(count || 0);
  };

  const fetchRecentActivities = async () => {
    setLoading(true);
    // Fetch intercessions first
    const { data: intercessions } = await supabase
      .from("prayer_intercessions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15);

    if (intercessions && intercessions.length > 0) {
      const userIds = intercessions.map(i => i.user_id).filter(Boolean);
      const prayerRequestIds = intercessions.map(i => i.prayer_request_id).filter(Boolean);

      // Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles" as any)
        .select("id, full_name, city, show_real_name, display_name, avatar_url")
        .in("id", userIds);
      
      const profileMap = new Map(((profiles || []) as any[]).map(p => [p.id, p]));

      // Fetch prayer requests
      const { data: requests } = await supabase
        .from("prayer_requests")
        .select("id, location, author_name")
        .in("id", prayerRequestIds);
      
      const requestsMap = new Map((requests || []).map(r => [r.id, r]));

      const combined = intercessions.map(i => ({
        ...i,
        profiles: profileMap.get(i.user_id),
        prayer_requests: requestsMap.get(i.prayer_request_id)
      }));

      setActivities(combined);
    } else {
      setActivities([]);
    }
    setLoading(false);
  };

  const handleStateClick = async (stateUf: string) => {
    setSelectedMapState(stateUf);
    setSelectedMapCity("");
    setParishStats([]);
    
    const citiesData = await fetchCitiesByState(stateUf);
    setMapCities(citiesData);
  };

  const handleSearchCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMapState || !selectedMapCity) return;
    
    setMapLoading(true);
    const { data } = await (supabase
      .from('parish_stats' as any)
      .select('*') as any)
      .eq('state', selectedMapState)
      .ilike('city', `%${selectedMapCity}%`);

    if (data) {
      const total = data.reduce((acc, curr) => acc + Number(curr.total_users), 0);
      setCityTotalUsers(total);
      setParishStats(data.sort((a: any, b: any) => b.total_users - a.total_users));
    }
    setMapLoading(false);
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background relative overflow-hidden pb-12">
        <div className="absolute top-[-8rem] right-[-8rem] w-[25rem] h-[25rem] rounded-full bg-primary/10 blur-3xl opacity-50" />
        <div className="absolute bottom-[-8rem] left-[-8rem] w-[25rem] h-[25rem] rounded-full bg-accent/10 blur-3xl opacity-50" />

        <div className="container mx-auto px-6 py-8 relative z-10 max-w-lg">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="mb-6">
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <motion.div 
            className="text-center mb-10"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-2 text-glow">Comunidade</h1>
            <div className="divider-gold max-w-[8rem] mx-auto mb-4" />
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-[0.2em]">Unidos em Uma Só Fé</p>
          </motion.div>

          {/* Map Feature Section */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-8 space-y-4"
          >
            <div className="flex items-center gap-2 px-2">
              <MapPin className="w-4 h-4 text-primary" />
              <h2 className="text-xs uppercase font-bold tracking-widest text-foreground/70">Oração no Brasil</h2>
            </div>
            
            <BrazilMap onStateClick={handleStateClick} selectedState={selectedMapState} />
            
            <AnimatePresence>
              {selectedMapState && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  <Card className="p-5 soft-shadow border-primary/15 bg-gradient-to-br from-white/80 to-primary/5 backdrop-blur-md rounded-[2rem]">
                    <h3 className="text-sm font-bold text-primary mb-3">Pesquisar em {selectedMapState}</h3>
                    <form onSubmit={handleSearchCity} className="flex gap-2">
                      <Input 
                        type="text" 
                        list="map-cities-list" 
                        placeholder="Digite sua cidade..." 
                        value={selectedMapCity}
                        onChange={(e) => setSelectedMapCity(e.target.value)}
                        className="flex-1 rounded-2xl"
                      />
                      <datalist id="map-cities-list">
                        {mapCities.map(c => <option key={c.id} value={c.nome} />)}
                      </datalist>
                      <Button type="submit" disabled={!selectedMapCity || mapLoading} className="rounded-2xl gradient-divine px-6">
                        Buscar
                      </Button>
                    </form>
                  </Card>

                  {/* Resultados das Paróquias */}
                  {parishStats.length > 0 && (
                     <div className="space-y-3 pt-2">
                       <h4 className="text-xs font-bold uppercase tracking-widest px-2 text-primary/80">
                         Paróquias em {selectedMapCity}
                       </h4>
                       {parishStats.map((stat, idx) => {
                         const percentage = cityTotalUsers > 0 ? Math.round((Number(stat.total_users) / cityTotalUsers) * 100) : 0;
                         return (
                           <motion.div key={stat.parish} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
                             <Card className="p-4 border-primary/10 bg-white/70 rounded-[1.5rem] soft-shadow">
                               <div className="flex justify-between items-start mb-2">
                                 <div className="flex items-center gap-2">
                                   <Church className="w-4 h-4 text-primary/60" />
                                   <span className="font-semibold text-sm leading-tight text-foreground/90">{stat.parish}</span>
                                 </div>
                                 <span className="text-xs font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-full whitespace-nowrap ml-2">
                                   {stat.total_users} {stat.total_users === 1 ? 'membro' : 'membros'}
                                 </span>
                               </div>
                               <div className="flex items-center gap-3">
                                 <Progress value={percentage} className="h-1.5 flex-1 bg-primary/10" />
                                 <span className="text-[10px] font-bold text-muted-foreground w-8 text-right">{percentage}%</span>
                               </div>
                             </Card>
                           </motion.div>
                         );
                       })}
                     </div>
                  )}

                  {parishStats.length === 0 && selectedMapCity && !mapLoading && (
                    <p className="text-center text-xs text-muted-foreground py-4 italic opacity-70">
                      Nenhuma paróquia encontrada nesta cidade. Pesquise novamente.
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Global Impact Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-8 mb-8 soft-shadow border-primary/15 bg-gradient-to-br from-white/80 to-primary/5 backdrop-blur-md rounded-[2.5rem] border-2">
              <div className="flex flex-col items-center text-center">
                <Globe className="w-6 h-6 text-primary/70 mb-3 animate-pulse" />
                <h3 className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground mb-2">Impacto Global de Graça</h3>
                <div className="text-5xl font-black text-primary mb-1 tracking-tighter tabular-nums drop-shadow-sm">
                  {totalPrayers.toLocaleString()}
                </div>
                <p className="text-xs font-bold text-muted-foreground opacity-60">Orações Intercedidas no App</p>
              </div>
            </Card>
          </motion.div>

          {/* Faith Wall / Feed */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
               <div className="flex items-center gap-2">
                 <TrendingUp className="w-4 h-4 text-primary" />
                 <h2 className="text-xs uppercase font-bold tracking-widest text-foreground/70">Mural da Fé em Tempo Real</h2>
               </div>
               <span className="flex items-center gap-1.5">
                 <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                 <span className="text-[10px] font-bold text-green-600 uppercase">Ao Vivo</span>
               </span>
            </div>

            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {loading ? (
                  [1, 2, 3].map(i => (
                    <Card key={i} className="p-5 border-primary/5 bg-white/40 rounded-3xl animate-pulse h-20" />
                  ))
                ) : activities.length > 0 ? (
                  activities.map((activity, index) => {
                    const firstName = activity.profiles?.show_real_name 
                      ? (activity.profiles?.display_name || activity.profiles?.full_name?.split(" ")[0] || "Um intercessor")
                      : "Um intercessor";
                    const city = activity.profiles?.city || activity.prayer_requests?.location || "Lugar Sagrado";
                    
                    return (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className="p-5 flex items-center gap-4 border-primary/5 soft-shadow bg-white/60 rounded-[1.8rem] hover:bg-white transition-all transform hover:-translate-y-0.5">
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-primary/70 border border-primary/10 overflow-hidden">
                             <Avatar className="w-full h-full rounded-2xl">
                                <AvatarImage src={activity.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activity.user_id}`} className="object-cover" />
                                <AvatarFallback className="bg-secondary text-primary">
                                   <UserIcon className="w-6 h-6" />
                                </AvatarFallback>
                             </Avatar>
                          </div>
                          <div className="flex-1">
                            <p className="text-[13px] font-medium leading-tight text-foreground/90">
                              <span className="text-primary font-bold">{firstName}</span> de <span className="font-bold">{city}</span> acabou de interceder por uma causa.
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1 font-bold">{formatTimeAgo(activity.created_at)}</p>
                          </div>
                          <Heart className="w-4 h-4 text-primary/30 fill-primary/5" />
                        </Card>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="text-center py-10 opacity-40">
                    <p className="text-sm italic">O silêncio é prece, mas a comunidade logo se moverá... 🙏</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Top Intercessors - Teaser */}
          <motion.div 
             className="mt-12"
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ delay: 0.6 }}
          >
             <Card className="p-6 border-dashed border-primary/20 bg-primary/5 rounded-[2rem] text-center">
                <Award className="w-6 h-6 text-primary/60 mx-auto mb-2" />
                <h3 className="text-sm font-bold mb-1">Ranking de Intercessores</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">Mostre sua luz na comunidade. O ranking mensal chega na próxima versão! ✨</p>
             </Card>
          </motion.div>
        </div>
        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default Community;
