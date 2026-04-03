import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { fetchStates, fetchCitiesByState, IBGEState, IBGECity } from "@/lib/ibge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Auth = () => {
  // Common Form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Profile Info
  const [fullName, setFullName] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [parish, setParish] = useState("");
  
  // IBGE Data
  const [states, setStates] = useState<IBGEState[]>([]);
  const [cities, setCities] = useState<IBGECity[]>([]);
  const [existingParishes, setExistingParishes] = useState<string[]>([]);
  
  // State handling
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  
  // Google Incomplete Profile Dialog
  const [showIncompleteProfile, setShowIncompleteProfile] = useState(false);
  const [sessionUser, setSessionUser] = useState<any>(null);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const referrerId = searchParams.get("ref");

  useEffect(() => {
    fetchStates().then(setStates);
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && session.user) {
        // Checar se o perfil está completo em caso de OAuth (ex: Google)
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (!profile || !profile.state || !profile.city || !profile.parish) {
          setSessionUser(session.user);
          if (profile?.full_name) setFullName(profile.full_name);
          else if (session.user.user_metadata?.full_name) setFullName(session.user.user_metadata.full_name);
          setShowIncompleteProfile(true);
        } else {
          navigate("/");
        }
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session && session.user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (!profile || !profile.state || !profile.city || !profile.parish) {
          setSessionUser(session.user);
          if (profile?.full_name) setFullName(profile.full_name);
          else if (session.user.user_metadata?.full_name) setFullName(session.user.user_metadata.full_name);
          setShowIncompleteProfile(true);
        } else {
          navigate("/");
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (referrerId) {
      localStorage.setItem("fe_referrer", referrerId);
    }
  }, [referrerId]);

  // Load cities when state changes
  useEffect(() => {
    if (selectedState) {
      fetchCitiesByState(selectedState).then(setCities);
      setSelectedCity("");
      setParish("");
      setExistingParishes([]);
    }
  }, [selectedState]);

  // Load parishes when city changes
  useEffect(() => {
    if (selectedState && selectedCity) {
      supabase.from('parish_stats')
        .select('parish')
        .eq('state', selectedState)
        .eq('city', selectedCity)
        .then(({ data }) => {
          if (data) {
            setExistingParishes(data.map(p => p.parish).filter(Boolean));
          }
        });
    }
  }, [selectedState, selectedCity]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) {
        toast({ title: "Erro ao entrar com Google", description: error.message, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Erro ao entrar com Google", description: "Tente novamente mais tarde", variant: "destructive" });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName || !selectedState || !selectedCity || !parish) {
      toast({ title: "Erro", description: "Preencha todos os campos do seu perfil", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Erro", description: "A senha deve ter pelo menos 6 caracteres", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ 
      email, 
      password, 
      options: { 
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: fullName,
          state: selectedState,
          city: selectedCity,
          parish: parish
        }
      } 
    });
    setLoading(false);
    if (error) {
      toast({ title: "Erro ao criar conta", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Conta criada!", description: "Verifique seu email para confirmar ou já verifique se a tela pulou." });
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Erro", description: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({
        title: "Erro ao fazer login",
        description: error.message === "Invalid login credentials" ? "Email ou senha incorretos" : error.message,
        variant: "destructive",
      });
    }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionUser) return;
    if (!fullName || !selectedState || !selectedCity || !parish) {
      toast({ title: "Erro", description: "Preencha todos os campos para continuar", variant: "destructive" });
      return;
    }
    setLoading(true);

    // Save properly into our profiles table
    const { error } = await supabase.from('profiles').upsert({
      id: sessionUser.id,
      full_name: fullName,
      state: selectedState,
      city: selectedCity,
      parish: parish
    });

    // Also update auth user metadata gracefully
    await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        state: selectedState,
        city: selectedCity,
        parish: parish
      }
    });

    setLoading(false);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sucesso!", description: "Informações completadas. Bem-vindo!" });
      setShowIncompleteProfile(false);
      navigate("/");
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        
        {/* MODAL PARA GOOGLE LOGIN SEM PERFIL */}
        <Dialog open={showIncompleteProfile} onOpenChange={(val) => {
            if(!val && showIncompleteProfile) {
                // block closing
            }
        }}>
          <DialogContent className="max-w-md bg-card/95 backdrop-blur-md border-primary/20 soft-shadow rounded-[2rem]">
            <DialogHeader>
              <DialogTitle className="text-2xl text-center font-bold">Complete seu Perfil ✨</DialogTitle>
              <DialogDescription className="text-center">
                Para se conectar verdadeiramente à comunidade, preencha as informações da sua paróquia.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCompleteProfile} className="space-y-4 mt-2">
              <div className="space-y-2">
                 <Label>Nome Completo</Label>
                 <Input type="text" placeholder="Seu nome" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={selectedState} onValueChange={setSelectedState} required>
                    <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                    <SelectContent>
                      {states.map(st => (
                        <SelectItem key={st.sigla} value={st.sigla}>{st.sigla} - {st.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Select value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedState} required>
                    <SelectTrigger className="truncate"><SelectValue placeholder="Cidade" /></SelectTrigger>
                    <SelectContent>
                      {cities.map(ct => (
                        <SelectItem key={ct.id} value={ct.nome}>{ct.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                 <Label>Paróquia</Label>
                 <Input 
                   type="text" 
                   list="parishes-list" 
                   placeholder="Ex: Paróquia São José" 
                   value={parish} 
                   onChange={(e) => setParish(e.target.value)} 
                   disabled={!selectedCity}
                   required 
                 />
                 <datalist id="parishes-list">
                    {existingParishes.map(p => (
                      <option key={p} value={p} />
                    ))}
                 </datalist>
                 <p className="text-xs text-muted-foreground">Digite a sua ou escolha uma já listada na sua cidade.</p>
              </div>

              <Button type="submit" className="w-full gradient-divine" disabled={loading}>
                {loading ? "Salvando..." : "Entrar na Comunidade"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: showIncompleteProfile ? 0 : 1, scale: showIncompleteProfile ? 0.96 : 1 }} transition={{ duration: 0.45 }} className="w-full max-w-md">
          <Card className="w-full max-w-md p-8 soft-shadow border-primary/15 relative">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="absolute top-4 left-4">
              <ArrowLeft className="w-5 h-5" />
            </Button>

            <div className="text-center mb-6 pt-4">
              <p className="text-xs uppercase tracking-[0.25em] text-primary mb-2">✦</p>
              <h1 className="text-4xl font-bold text-foreground mb-1">Améns</h1>
              <div className="divider-gold max-w-[6rem] mx-auto my-3" />
              <p className="text-sm text-muted-foreground">Unidos pela oração</p>
              {referrerId && (
                <p className="text-xs text-primary mt-2">🎁 Você foi convidado! Crie sua conta e comece a orar.</p>
              )}
            </div>

            <Button variant="outline" className="w-full mb-5 border-primary/20" onClick={handleGoogleSignIn} disabled={googleLoading}>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {googleLoading ? "Entrando..." : "Continuar com Google"}
            </Button>

            <div className="relative mb-5">
              <div className="divider-gold" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">ou</span>
            </div>

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar Conta</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <form onSubmit={handleSignIn} className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input id="login-email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input id="login-password" type="password" placeholder="••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full gradient-divine text-primary-foreground hover:opacity-90" disabled={loading}>
                    {loading ? "Entrando..." : "Entrar"}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                {/* O container tem q ter overflow-y-auto e max-h para evitar de fugir da tela na versão mobile */}
                <div className="max-h-[50vh] overflow-y-auto px-1 pb-2 pt-2 -mx-1 hide-scrollbar">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nome Completo</Label>
                      <Input type="text" placeholder="Seu nome completo" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Estado</Label>
                        <Select value={selectedState} onValueChange={setSelectedState} required>
                          <SelectTrigger className="text-left bg-transparent border-input"><SelectValue placeholder="UF" /></SelectTrigger>
                          <SelectContent>
                            {states.map(st => (
                              <SelectItem key={st.sigla} value={st.sigla}>{st.sigla} - {st.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Cidade</Label>
                        <Select value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedState} required>
                          <SelectTrigger className="text-left bg-transparent border-input truncate"><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {cities.map(ct => (
                              <SelectItem key={ct.id} value={ct.nome}>{ct.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                       <Label>Paróquia / Igreja</Label>
                       <Input 
                         type="text" 
                         list="form-parishes-list" 
                         placeholder="Ex: Paróquia São José" 
                         value={parish} 
                         onChange={(e) => setParish(e.target.value)} 
                         disabled={!selectedCity}
                         required 
                       />
                       <datalist id="form-parishes-list">
                          {existingParishes.map(p => (
                            <option key={p} value={p} />
                          ))}
                       </datalist>
                       <p className="text-xs text-muted-foreground opacity-70">Encontre a sua ou digite uma nova.</p>
                    </div>

                    <div className="space-y-2 pt-2">
                      <Label>Email</Label>
                      <Input type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Senha</Label>
                      <Input type="password" placeholder="••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <Button type="submit" className="w-full gradient-divine text-primary-foreground hover:opacity-90" disabled={loading}>
                      {loading ? "Criando conta..." : "Criar Conta"}
                    </Button>
                  </form>
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default Auth;
