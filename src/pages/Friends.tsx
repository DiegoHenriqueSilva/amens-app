import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserPlus, Check, X, Copy, ArrowLeft,     Sparkles, Heart, User } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { useFriends } from "@/hooks/use-friends";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Friends = () => {
  const navigate = useNavigate();
  const { friends, requests, loading, myCode, sendRequestByCode, updateRequestStatus } = useFriends();
  const [friendCodeInput, setFriendCodeInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleCopyCode = () => {
    if (myCode) {
      navigator.clipboard.writeText(myCode);
      toast.success("Código copiado! Compartilhe com seus amigos. ðŸ™");
    }
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendCodeInput) return;

    setIsSending(true);
    const result = await sendRequestByCode(friendCodeInput);
    setIsSending(false);

    if (result.success) {
      setFriendCodeInput("");
    } else {
      toast.error(result.error);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background relative overflow-hidden pb-12">
        {/* Ambient background glows */}
        <div className="absolute top-[-8rem] right-[-8rem] w-[25rem] h-[25rem] rounded-full bg-primary/10 blur-3xl opacity-50" />
        <div className="absolute bottom-[-8rem] left-[-8rem] w-[25rem] h-[25rem] rounded-full bg-accent/10 blur-3xl opacity-50" />

        <div className="container mx-auto px-6 py-8 relative z-10 max-w-lg">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="mb-6">
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <motion.div 
            className="text-center mb-8"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-2 text-glow">Amigos da Fé</h1>
            <div className="divider-gold max-w-[8rem] mx-auto mb-4" />
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-[0.2em]">Conectados em Intercessào</p>
          </motion.div>

          {/* My Code Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <Card className="p-6 bg-gradient-to-br from-white/80 to-primary/5 backdrop-blur-md border-primary/15 soft-shadow rounded-[2.5rem] border-2">
              <div className="flex flex-col items-center text-center">
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Sparkles className="w-3 h-3" /> Seu Código de Amigo <Sparkles className="w-3 h-3" />
                </span>
                <div className="flex items-center gap-3 bg-white/50 px-6 py-3 rounded-2xl border border-primary/10 mb-4 w-full justify-between group cursor-pointer active:scale-95 transition-transform" onClick={handleCopyCode}>
                  <code className="text-2xl font-black text-primary tracking-tighter tabular-nums drop-shadow-sm">
                    {loading ? "CARREGANDO..." : (myCode || "---")}
                  </code>
                  <Copy className="w-5 h-5 text-primary/40 group-hover:text-primary transition-colors" />
                </div>
                <p className="text-[11px] text-muted-foreground font-medium max-w-[200px]">
                  Compartilhe este código para que outros possam te encontrar
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Add Friend Form */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <form onSubmit={handleSendRequest} className="flex gap-2">
              <Input 
                placeholder="Código (AMEN-XXXXXX)"
                value={friendCodeInput}
                onChange={(e) => setFriendCodeInput(e.target.value)}
                className="rounded-2xl border-primary/20 bg-white/70 h-12 text-sm font-bold uppercase tracking-widest placeholder:tracking-normal placeholder:font-medium placeholder:uppercase-0"
              />
              <Button type="submit" disabled={!friendCodeInput || isSending} className="rounded-2xl gradient-divine h-12 px-6 flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Adicionar</span>
              </Button>
            </form>
          </motion.div>

          {/* Friend List / Tabs */}
          <Tabs defaultValue="friends" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-white/40 p-1 mb-6 border border-primary/5">
              <TabsTrigger value="friends" className="rounded-xl font-bold text-xs uppercase tracking-widest">
                Amigos ({friends.length})
              </TabsTrigger>
              <TabsTrigger value="requests" className="rounded-xl font-bold text-xs uppercase tracking-widest relative">
                Pedidos
                {requests.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center border-2 border-background animate-pulse">
                    {requests.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="friends" className="space-y-4">
              <AnimatePresence mode="popLayout">
                {loading ? (
                  [1, 2, 3].map(i => (
                    <Card key={i} className="p-4 rounded-3xl animate-pulse h-16 bg-white/40 border-none" />
                  ))
                ) : friends.length > 0 ? (
                  friends.map((friend, idx) => (
                    <motion.div
                      key={friend.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Card className="p-4 flex items-center gap-4 border-primary/5 bg-white/60 rounded-3xl hover:bg-white transition-all soft-shadow group">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-primary/70 border border-primary/10 overflow-hidden">
                          <Avatar className="w-full h-full rounded-2xl">
                             <AvatarImage src={friend.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.id}`} className="object-cover" />
                             <AvatarFallback className="bg-secondary text-primary">
                                <User className="w-6 h-6" />
                             </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-bold text-foreground">
                            {friend.show_real_name ? (friend.display_name || friend.full_name?.split(" ")[0]) : "Um intercessor"}
                          </h3>
                          <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                             {friend.city || "Lugar Sagrado"} â€¢ {friend.state || "Brasil"}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" className="text-primary/20 hover:text-primary transition-colors">
                           <Heart className="w-4 h-4 fill-current" />
                        </Button>
                      </Card>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12 opacity-40 italic flex flex-col items-center">
                    <Users className="w-12 h-12 mb-3 text-muted-foreground" />
                    <p className="text-sm">Você ainda nào possui Amigos da Fé.</p>
                    <p className="text-[11px] mt-1">Envie seu código para começar!</p>
                  </div>
                )}
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="requests" className="space-y-4">
              <AnimatePresence mode="popLayout">
                {requests.length > 0 ? (
                  requests.map((request, idx) => (
                    <motion.div
                      key={request.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Card className="p-4 flex items-center gap-4 border-primary/10 bg-white/80 rounded-3xl soft-shadow border-l-4 border-l-primary">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-primary/60 border border-primary/5 overflow-hidden">
                           <Avatar className="w-full h-full rounded-xl">
                              <AvatarImage src={request.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${request.sender_id}`} className="object-cover" />
                              <AvatarFallback className="bg-secondary text-primary">
                                 <User className="w-5 h-5" />
                              </AvatarFallback>
                           </Avatar>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-[13px] font-bold">
                            {request.profiles?.show_real_name ? (request.profiles?.display_name || request.profiles?.full_name?.split(" ")[0]) : "Alguém"}
                          </h3>
                          <p className="text-[10px] text-muted-foreground">Quer se conectar com você</p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="w-10 h-10 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white"
                            onClick={() => updateRequestStatus(request.id, "accepted")}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="w-10 h-10 rounded-xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white"
                            onClick={() => updateRequestStatus(request.id, "rejected")}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12 opacity-40 italic flex flex-col items-center">
                    <Sparkles className="w-12 h-12 mb-3 text-muted-foreground" />
                    <p className="text-sm">Nenhuma solicitaçào pendente.</p>
                  </div>
                )}
              </AnimatePresence>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PageTransition>
  );
};

export default Friends;
