import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Users, Sparkles, ArrowLeft, Heart, Globe, Award, TrendingUp, MapPin, Church } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { formatTimeAgo } from "@/lib/utils";
import BrazilMap from "@/components/BrazilMap";
import { fetchCitiesByState, type IBGECity } from "@/lib/ibge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as UserIcon, LogOut, Mail, Home, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  }, []);

  const fetchGlobalStats = async () => {
    const { count } = await supabase
      .from("prayer_intercessions")
      .select("*", { count: "exact", head: true });
    setTotalPrayers(count || 0);
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
    
    if (data) {
      setPendingRequests(new Set(data.map(r => r.receiver_id)));
    }
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
      const total = data.reduce((acc, curr) => acc + Number(curr.total_users), 0);
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
    
    if (!error && data) {
      setSelectedParishMembers(data);
    }
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
      toast.success("Pedido de amizade enviado! 🙏");
      setPendingRequests(prev => new Set([...prev, targetUserId]));
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background relative overflow-hidden pb-28">
        <div className="absolute top-[-8rem] right-[-8rem] w-[25rem] h-[25rem] rounded-full bg-primary/10 blur-3xl opacity-50" />
        <div className="absolute bottom-[-8rem] left-[-8rem] w-[25rem] h-[25rem] rounded-full bg-accent/10 blur-3xl opacity-50" />

        <div className="container mx-auto px-6 py-8 relative z-10 max-w-lg pb-32">
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
            className="mb-6 space-y-2"
          >
            <div className="flex items-center gap-2 px-2">
              <MapPin className="w-4 h-4 text-primary" />
              <h2 className="text-xs uppercase font-bold tracking-widest text-foreground/70">Oração no Brasil</h2>
            </div>
            
            <BrazilMap onStateClick={handleStateClick} selectedState={selectedMapState} />
            
            <div className="px-1">
              <Select 
                value={selectedMapState || ""} 
                onValueChange={(val) => handleStateClick(val)}
              >
                <SelectTrigger className="w-full h-14 rounded-2xl border-primary/20 bg-white/50 backdrop-blur-sm soft-shadow text-foreground/80 font-medium">
                  <SelectValue placeholder="Selecione o estado por nome..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-primary/10 max-h-[300px]">
                  {[
                    { uf: "AC", name: "Acre" }, { uf: "AL", name: "Alagoas" }, { uf: "AP", name: "Amapá" },
                    { uf: "AM", name: "Amazonas" }, { uf: "BA", name: "Bahia" }, { uf: "CE", name: "Ceará" },
                    { uf: "DF", name: "Distrito Federal" }, { uf: "ES", name: "Espírito Santo" }, { uf: "GO", name: "Goiás" },
                    { uf: "MA", name: "Maranhão" }, { uf: "MT", name: "Mato Grosso" }, { uf: "MS", name: "Mato Grosso do Sul" },
                    { uf: "MG", name: "Minas Gerais" }, { uf: "PA", name: "Pará" }, { uf: "PB", name: "Paraíba" },
                    { uf: "PR", name: "Paraná" }, { uf: "PE", name: "Pernambuco" }, { uf: "PI", name: "Piauí" },
                    { uf: "RJ", name: "Rio de Janeiro" }, { uf: "RN", name: "Rio Grande do Norte" }, { uf: "RS", name: "Rio Grande do Sul" },
                    { uf: "RO", name: "Rondônia" }, { uf: "RR", name: "Roraima" }, { uf: "SC", name: "Santa Catarina" },
                    { uf: "SP", name: "São Paulo" }, { uf: "SE", name: "Sergipe" }, { uf: "TO", name: "Tocantins" }
                  ].map((state) => (
                    <SelectItem key={state.uf} value={state.uf} className="rounded-xl font-medium">
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
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
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
                       <div className="flex items-center justify-between px-2">
                         <h4 className="text-xs font-bold uppercase tracking-widest text-primary/80">
                           Paróquias em {selectedMapCity}
                         </h4>
                         {selectedParish && (
                           <Button 
                             variant="ghost" 
                             size="sm" 
                             onClick={() => setSelectedParish(null)}
                             className="h-6 text-[10px] uppercase font-bold text-muted-foreground"
                           >
                             Voltar à lista
                           </Button>
                         )}
                       </div>

                       {!selectedParish ? (
                         parishStats.map((stat, idx) => {
                           const percentage = cityTotalUsers > 0 ? Math.round((Number(stat.total_users) / cityTotalUsers) * 100) : 0;
                           return (
                             <motion.div key={stat.parish} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
                               <Card 
                                 className="p-4 border-primary/10 bg-white/70 rounded-[1.5rem] soft-shadow cursor-pointer hover:border-primary/30 transition-all group"
                                 onClick={() => handleParishClick(stat.parish)}
                               >
                                 <div className="flex justify-between items-start mb-2">
                                   <div className="flex items-center gap-2">
                                     <Church className="w-4 h-4 text-primary/60 group-hover:text-primary transition-colors" />
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
                         })
                       ) : (
                         <AnimatePresence mode="wait">
                           <motion.div 
                             key="parish-view"
                             initial={{ opacity: 0, y: 20 }}
                             animate={{ opacity: 1, y: 0 }}
                             exit={{ opacity: 0, y: 10 }}
                             className="space-y-6 pt-4"
                           >
                             <Card className="p-8 border-primary/10 bg-gradient-to-b from-white to-primary/5 rounded-[2.5rem] soft-shadow text-center relative overflow-hidden">
                               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                               
                               <motion.div 
                                 initial={{ scale: 0.8, opacity: 0 }}
                                 animate={{ scale: 1, opacity: 1 }}
                                 className="w-28 h-28 mx-auto bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-primary/5 relative mb-4"
                               >
                                 <img 
                                   src="/church.png" 
                                   alt="Igreja" 
                                   className="w-24 h-24 object-contain"
                                 />
                                 <div className="absolute -bottom-1 -right-1 bg-primary text-white p-2 rounded-full shadow-lg">
                                   <Church className="w-4 h-4" />
                                 </div>
                               </motion.div>
                               
                               <h3 className="text-2xl font-black text-foreground mb-1 leading-tight">{selectedParish}</h3>
                               <p className="text-[10px] uppercase tracking-[0.3em] text-primary font-black opacity-70">Perfil da Paróquia</p>
                             </Card>

                             <div className="space-y-3">
                               <h4 className="text-xs font-bold uppercase tracking-widest px-2 text-primary/70">Irmãos de Fé Públicos</h4>
                               <div className="grid gap-3">
                                 {loadingMembers ? (
                                   [1, 2].map(i => <Card key={i} className="h-20 animate-pulse bg-white/50 rounded-2xl" />)
                                 ) : selectedParishMembers.length > 0 ? (
                                   selectedParishMembers.map((member) => {
                                     const isMe = currentUser?.id === member.id;
                                     const isFriend = friendIds.has(member.id);
                                     const isPending = pendingRequests.has(member.id);

                                     return (
                                       <motion.div key={member.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                                         <Card className={cn(
                                           "p-4 flex items-center justify-between border-primary/5 bg-white/80 rounded-2xl soft-shadow transition-all",
                                           isMe && "ring-2 ring-primary/20 bg-primary/5 shadow-inner"
                                         )}>
                                           <div className="flex items-center gap-3">
                                             <Avatar className="w-12 h-12 border-2 border-background shadow-sm">
                                               <AvatarImage src={member.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.id}`} />
                                               <AvatarFallback className="bg-secondary text-primary">
                                                 <UserIcon className="w-6 h-6" />
                                               </AvatarFallback>
                                             </Avatar>
                                             <div>
                                               <p className="text-sm font-bold leading-tight flex items-center gap-2">
                                                 {member.show_real_name ? (member.display_name || member.full_name?.split(' ')[0]) : "Membro da Fé"}
                                                 {isMe && <span className="text-[9px] bg-primary text-white px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Você</span>}
                                                 {isFriend && <span className="text-[9px] bg-green-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Seu Amigo</span>}
                                               </p>
                                               <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                                                 {selectedMapCity} • {selectedMapState}
                                               </p>
                                             </div>
                                           </div>
                                           
                                           {!isMe && !isFriend && (
                                             <Button
                                               variant="ghost"
                                               size="sm"
                                               className={cn(
                                                 "rounded-full h-9 px-5 text-[10px] font-black uppercase tracking-widest transition-all",
                                                 isPending ? "text-muted-foreground bg-secondary/50" : "bg-primary/10 text-primary hover:bg-primary hover:text-white"
                                               )}
                                               disabled={isPending}
                                               onClick={() => handleAddFriend(member.id)}
                                             >
                                               {isPending ? "Pendente" : "Seguir"}
                                             </Button>
                                           )}
                                           
                                           {isFriend && (
                                             <div className="p-2.5 bg-green-50 text-green-600 rounded-full">
                                               <Heart className="w-4 h-4 fill-current" />
                                             </div>
                                           )}
                                         </Card>
                                       </motion.div>
                                     );
                                   })
                                 ) : (
                                   <p className="text-center text-xs italic text-muted-foreground py-6">Ainda não há outros membros públicos nesta paróquia. 🙏</p>
                                 )}
                               </div>
                             </div>
                           </motion.div>
                         </AnimatePresence>
                       )}
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
      </div>
    </PageTransition>
  );
};

export default Community;
