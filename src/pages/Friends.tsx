import { useState } from "react";
import { NameWithInsignias, usePublicInsignias } from '@/features/insignias/Insignias';
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserPlus, Check, X, Copy, ArrowLeft, Sparkles, Heart, User, ChevronLeft, ChevronRight, Globe, LogIn } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { useFriends } from "@/hooks/use-friends";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import "./friends.css";

const Friends = () => {
  const navigate = useNavigate();
  const { friends, requests, loading, myCode, isAuthenticated, sendRequestByCode, updateRequestStatus } = useFriends();
  const [friendCodeInput, setFriendCodeInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(friends.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedFriends = friends.slice(startIndex, startIndex + itemsPerPage);
  const { data: insignias } = usePublicInsignias(paginatedFriends.map(friend => friend.id));

  const handleCopyCode = async () => {
    if (!myCode) return;
    try {
      await navigator.clipboard.writeText(myCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Código copiado! Compartilhe com seus amigos. 🙏");
    } catch {
      toast.error("Não foi possível copiar o código automaticamente.");
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
    } else if (result.error) {
      toast.error(result.error);
    }
  };

  return (
    <PageTransition>
      <div className="friends-page min-h-screen relative overflow-hidden pb-28">
        {/* Ambient background glows */}
        <div className="absolute top-[-8rem] right-[-8rem] w-[25rem] h-[25rem] rounded-full bg-primary/10 blur-3xl opacity-50 pointer-events-none" />
        <div className="absolute bottom-[-8rem] left-[-8rem] w-[25rem] h-[25rem] rounded-full bg-accent/10 blur-3xl opacity-50 pointer-events-none" />

        <div className="container mx-auto px-4 sm:px-6 py-4 relative z-10 max-w-lg">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="mb-4 rounded-full hover:bg-primary/10"
            aria-label="Voltar para a página inicial"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <motion.div
            className="text-center mb-6"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-primary/20">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2 text-glow font-serif">Amigos da Fé</h1>
            <div className="divider-gold max-w-[8rem] mx-auto mb-3" />
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-[0.2em]">Conectados em Intercessão</p>
          </motion.div>

          {/* Estado de Visitante desautenticado */}
          {!loading && !isAuthenticated ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <Card className="p-6 text-center bg-white/80 backdrop-blur-md border-primary/20 soft-shadow rounded-[2rem] border">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                  <LogIn className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-foreground mb-2">Conecte-se com sua Conta</h2>
                <p className="text-xs text-muted-foreground mb-6 leading-relaxed max-w-xs mx-auto">
                  Entre ou cadastre-se no Améns para compartilhar seu código pessoal, adicionar amigos e convidar pessoas para orar com você.
                </p>
                <Button
                  onClick={() => navigate("/auth")}
                  className="rounded-2xl gradient-divine w-full py-6 font-bold shadow-md hover:shadow-lg transition-all"
                  aria-label="Fazer login ou criar conta"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Entrar ou Criar Conta
                </Button>
              </Card>
            </motion.div>
          ) : (
            <>
              {/* My Code Section */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="mb-5"
              >
                <Card className="p-4 sm:p-5 bg-gradient-to-br from-white/90 to-primary/5 backdrop-blur-md border-primary/15 soft-shadow rounded-[2rem] border">
                  <div className="flex flex-col items-center text-center">
                    <span className="text-[11px] font-bold text-primary uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Seu Código de Amigo <Sparkles className="w-3.5 h-3.5" />
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      disabled={loading || !myCode}
                      aria-label={myCode ? `Copiar meu código de amigo: ${myCode}` : "Carregando código de amigo"}
                      className="flex items-center gap-3 bg-white/70 hover:bg-white px-5 sm:px-6 py-3 rounded-2xl border border-primary/15 mb-3 w-full justify-between group active:scale-95 transition-all cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <code className="text-xl sm:text-2xl font-black text-primary tracking-tighter tabular-nums drop-shadow-sm">
                        {loading ? "CARREGANDO..." : (myCode || "---")}
                      </code>
                      <div className="flex items-center gap-1 text-xs font-semibold text-primary">
                        {copied ? (
                          <>
                            <Check className="w-4 h-4 text-green-600" />
                            <span className="text-green-600 text-[11px]">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 text-primary/60 group-hover:text-primary transition-colors" />
                            <span className="text-[11px] text-muted-foreground hidden sm:inline">Copiar</span>
                          </>
                        )}
                      </div>
                    </button>
                    <p className="text-[11px] text-muted-foreground font-medium max-w-[240px]">
                      Compartilhe este código para que outros fiéis possam te encontrar
                    </p>
                  </div>
                </Card>
              </motion.div>

              {/* Add Friend Form */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-5"
              >
                <p id="friend-code-instruction" className="mb-2 px-1 text-xs font-semibold text-foreground/80">
                  Adicionar amigo pelo código:
                </p>
                <form onSubmit={handleSendRequest} className="flex gap-2" aria-labelledby="friend-code-instruction">
                  <Input
                    placeholder="Código (AMEN-XXXXXX)"
                    value={friendCodeInput}
                    onChange={(e) => setFriendCodeInput(e.target.value)}
                    aria-label="Código do amigo a ser adicionado"
                    className="rounded-2xl border-primary/20 bg-white/80 h-12 text-sm font-bold uppercase tracking-widest placeholder:tracking-normal placeholder:font-medium placeholder:normal-case flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={!friendCodeInput.trim() || isSending}
                    className="rounded-2xl gradient-divine h-12 px-5 flex items-center gap-2 font-bold shadow-md hover:shadow-lg transition-all"
                    aria-label="Adicionar amigo pelo código digitado"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Adicionar</span>
                  </Button>
                </form>
              </motion.div>
            </>
          )}

          {/* Atalho para Comunidade Paroquial e Mapa (Responsivo e acessível) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mb-6"
          >
            <Button
              variant="outline"
              onClick={() => navigate("/community")}
              className="w-full min-h-[3rem] py-2.5 rounded-2xl border-primary/20 bg-primary/5 hover:bg-primary/10 flex items-center justify-between px-3.5 sm:px-4 text-xs font-bold text-foreground transition-all gap-2"
              aria-label="Explorar Comunidades e Paróquias do Brasil no mapa"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
                <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Globe className="w-4 h-4" />
                </div>
                <span className="truncate leading-tight">Explorar Paróquias e Comunidades</span>
              </div>
              <span className="text-primary text-[11px] sm:text-xs font-bold shrink-0">Ver Mapa →</span>
            </Button>
          </motion.div>

          {/* Friend List / Tabs */}
          <Tabs defaultValue="friends" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-white/50 p-1 mb-5 border border-primary/10">
              <TabsTrigger value="friends" className="rounded-xl font-bold text-xs uppercase tracking-wider">
                Amigos ({friends.length})
              </TabsTrigger>
              <TabsTrigger value="requests" className="rounded-xl font-bold text-xs uppercase tracking-wider relative">
                Pedidos
                {requests.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 bg-red-500 text-white text-[10px] font-bold rounded-full">
                    {requests.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="friends" className="space-y-2">
              <AnimatePresence mode="popLayout">
                {loading ? (
                  [1, 2, 3].map(i => (
                    <Card key={i} className="p-4 rounded-2xl animate-pulse h-16 bg-white/40 border-none" />
                  ))
                ) : paginatedFriends.length > 0 ? (
                  paginatedFriends.map((friend, idx) => {
                    const friendName = friend.display_name || friend.full_name?.split(" ")[0] || "Intercessor";
                    return (
                      <motion.div
                        key={friend.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Card className="p-2.5 flex items-center gap-3 border-primary/10 bg-white/70 rounded-2xl hover:bg-white transition-all soft-shadow group">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-primary/70 border border-primary/10 overflow-hidden shrink-0">
                            <Avatar className="w-full h-full rounded-xl">
                              <AvatarImage src={friend.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.id}`} className="object-cover" />
                              <AvatarFallback className="bg-secondary text-primary font-bold text-xs">
                                <User className="w-5 h-5" />
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <h3
                              className="text-sm font-bold text-foreground cursor-pointer hover:text-primary transition-colors truncate"
                              role="link"
                              tabIndex={0}
                              onClick={() => navigate("/profile/" + friend.id)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  navigate("/profile/" + friend.id);
                                }
                              }}
                              aria-label={`Ver perfil de ${friendName}`}
                            >
                              <NameWithInsignias selection={insignias?.[friend.id]}>{friendName}</NameWithInsignias>
                            </h3>
                            <p className="text-[10px] text-muted-foreground font-medium truncate">
                              {friend.city || "Lugar Sagrado"}{friend.state ? ` - ${friend.state}` : ""}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-primary/30 hover:text-primary transition-colors rounded-xl shrink-0"
                            aria-label={`Interceder por ${friendName}`}
                            onClick={() => toast.success(`Oração enviada por ${friendName}! 🙏`)}
                          >
                            <Heart className="w-4 h-4 fill-current" />
                          </Button>
                        </Card>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 opacity-50 flex flex-col items-center">
                    <Users className="w-12 h-12 mb-3 text-muted-foreground" />
                    <p className="text-sm font-semibold text-foreground">Você ainda não possui Amigos da Fé.</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isAuthenticated ? "Envie seu código para começar sua rede de oração!" : "Entre na sua conta para conectar-se."}
                    </p>
                  </div>
                )}
              </AnimatePresence>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 pt-4 pb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="rounded-xl border border-primary/10 bg-white/40 font-bold text-[10px] uppercase tracking-widest px-4 h-8"
                    aria-label="Página anterior de amigos"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Anterior
                  </Button>
                  <span className="text-[10px] font-black text-primary/70 uppercase tracking-widest">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded-xl border border-primary/10 bg-white/40 font-bold text-[10px] uppercase tracking-widest px-4 h-8"
                    aria-label="Próxima página de amigos"
                  >
                    Próxima <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="requests" className="space-y-3">
              <AnimatePresence mode="popLayout">
                {requests.length > 0 ? (
                  requests.map((request, idx) => {
                    const senderName = request.profiles?.display_name || request.profiles?.full_name?.split(" ")[0] || "Intercessor";
                    return (
                      <motion.div
                        key={request.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Card className="p-3.5 flex items-center gap-3 border-primary/10 bg-white/80 rounded-2xl soft-shadow border-l-4 border-l-primary">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-primary/60 border border-primary/5 overflow-hidden shrink-0">
                            <Avatar className="w-full h-full rounded-xl">
                              <AvatarImage src={request.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${request.sender_id}`} className="object-cover" />
                              <AvatarFallback className="bg-secondary text-primary font-bold text-xs">
                                <User className="w-5 h-5" />
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <h3 className="text-xs sm:text-sm font-bold truncate">
                              {senderName}
                            </h3>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {request.profiles?.city
                                ? `${request.profiles.city}${request.profiles.state ? ` - ${request.profiles.state}` : ""}`
                                : "Quer se conectar com você em oração"}
                            </p>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="w-9 h-9 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
                              onClick={() => updateRequestStatus(request.id, "accepted")}
                              aria-label={`Aceitar solicitação de amizade de ${senderName}`}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="w-9 h-9 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                              onClick={() => updateRequestStatus(request.id, "rejected")}
                              aria-label={`Recusar solicitação de amizade de ${senderName}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 opacity-50 flex flex-col items-center">
                    <Sparkles className="w-12 h-12 mb-3 text-muted-foreground" />
                    <p className="text-sm font-semibold text-foreground">Nenhuma solicitação pendente.</p>
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
