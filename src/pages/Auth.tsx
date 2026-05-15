import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Lock } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { fetchStates, fetchCitiesByState, IBGEState, IBGECity } from "@/lib/ibge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [showRealName, setShowRealName] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [isPublicInParish, setIsPublicInParish] = useState(false);
  
  // State handling
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  
  // Google Incomplete Profile Dialog
  const [showIncompleteProfile, setShowIncompleteProfile] = useState(false);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [popoverOpenIncomplete, setPopoverOpenIncomplete] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const referrerId = searchParams.get("ref");

  useEffect(() => {
    fetchStates().then(setStates);
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && session.user) {
        // Checar se o perfil está completo em caso de OAuth (ex: Google)
        const { data: profile } = await supabase.from('profiles' as any).select('*').eq('id', session.user.id).single() as any;
        if (!profile || !profile.state || !profile.city || !profile.parish) {
          setSessionUser(session.user);
          if (profile?.full_name) setFullName(profile.full_name);
          else if (session.user.user_metadata?.full_name) setFullName(session.user.user_metadata.full_name);
          setShowIncompleteProfile(true);
        } else {
          const redirect = searchParams.get("redirect");
          navigate(redirect || "/");
        }
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session && session.user) {
        const { data: profile } = await supabase.from('profiles' as any).select('*').eq('id', session.user.id).single() as any;
        if (!profile || !profile.state || !profile.city || !profile.parish) {
          setSessionUser(session.user);
          if (profile?.full_name) setFullName(profile.full_name);
          else if (session.user.user_metadata?.full_name) setFullName(session.user.user_metadata.full_name);
          setShowIncompleteProfile(true);
        } else {
          const redirect = searchParams.get("redirect");
          navigate(redirect || "/");
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
      supabase.from('profiles' as any)
        .select('parish')
        .eq('state', selectedState)
        .eq('city', selectedCity)
        .not('parish', 'is', null)
        .then(({ data }) => {
          if (data) {
            const castedData = data as any[];
            const unique = Array.from(new Set(castedData.map(p => p.parish)));
            setExistingParishes(unique);
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
          parish: parish,
          show_real_name: showRealName,
          display_name: showRealName ? displayName : null,
          is_public_in_parish: isPublicInParish
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
    const { error } = await (supabase.from('profiles' as any) as any).upsert({
      id: sessionUser.id,
      full_name: fullName,
      state: selectedState,
      city: selectedCity,
      parish: parish,
      show_real_name: showRealName,
      display_name: showRealName ? displayName : null,
      is_public_in_parish: isPublicInParish
    });

    // Also update auth user metadata gracefully
    await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        state: selectedState,
        city: selectedCity,
        parish: parish,
        show_real_name: showRealName,
        display_name: showRealName ? displayName : null,
        is_public_in_parish: isPublicInParish
      }
    });

    setLoading(false);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sucesso!", description: "Informações completadas. Bem-vindo!" });
      setShowIncompleteProfile(false);
      const redirect = searchParams.get("redirect");
      navigate(redirect || "/");
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
          <DialogContent className="max-w-md border border-hairline rounded-xl">
            <DialogHeader>
              <DialogTitle className="font-serif text-[22px] text-center text-ink">Complete seu perfil</DialogTitle>
              <DialogDescription className="text-center text-ink-soft text-[13px]">
                Para se conectar à comunidade, preencha as informações da sua paróquia.
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
              
              <div className="space-y-2 flex flex-col">
                 <Label>Paróquia</Label>
                 <Popover open={popoverOpenIncomplete} onOpenChange={setPopoverOpenIncomplete}>
                   <PopoverTrigger asChild>
                     <Button
                       variant="outline"
                       role="combobox"
                       aria-expanded={popoverOpenIncomplete}
                       className={cn(
                         "w-full justify-between font-normal",
                         !parish && "text-muted-foreground"
                       )}
                       disabled={!selectedCity}
                     >
                       <span className="truncate">{parish || "Buscar ou digitar..."}</span>
                       <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                     </Button>
                   </PopoverTrigger>
                   <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                     <Command>
                       <CommandInput 
                         placeholder="Nome da paróquia..." 
                         value={parish}
                         onValueChange={(val) => setParish(val)}
                       />
                       <CommandList>
                         <CommandEmpty className="py-2 px-4 text-xs italic">Nenhuma paróquia sugerida.</CommandEmpty>
                         <CommandGroup heading="Sugeridas">
                           {existingParishes.map((p) => (
                             <CommandItem
                               key={p}
                               value={p}
                               onSelect={(currentValue) => {
                                 setParish(currentValue);
                                 setPopoverOpenIncomplete(false);
                               }}
                             >
                               <Check
                                 className={cn(
                                   "mr-2 h-4 w-4",
                                   parish === p ? "opacity-100" : "opacity-0"
                                 )}
                               />
                               {p}
                             </CommandItem>
                           ))}
                         </CommandGroup>
                       </CommandList>
                     </Command>
                   </PopoverContent>
                 </Popover>
                 <p className="text-[10px] text-muted-foreground">Digite a sua ou escolha uma já listada na sua cidade.</p>
              </div>
              
              <div className="space-y-4 pt-2 border-t border-primary/5">
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="show-real-name-incomplete" 
                    className="w-4 h-4 rounded border-primary/20 text-primary focus:ring-primary"
                    checked={showRealName}
                    onChange={(e) => setShowRealName(e.target.checked)}
                  />
                  <Label htmlFor="show-real-name-incomplete" className="text-xs font-medium cursor-pointer">
                    Desejo usar um nome público ao invés de anônimo
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="is-public-parish-incomplete" 
                    className="w-4 h-4 rounded border-primary/20 text-primary focus:ring-primary"
                    checked={isPublicInParish}
                    onChange={(e) => setIsPublicInParish(e.target.checked)}
                  />
                  <Label htmlFor="is-public-parish-incomplete" className="text-xs font-medium cursor-pointer">
                    Desejo que minha foto e nome de usuário fique disponível na lista da minha paróquia.
                  </Label>
                </div>

                <AnimatePresence>
                  {showRealName && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 overflow-hidden"
                    >
                      <Label className="text-xs">Qual nome você deseja utilizar no aplicativo?</Label>
                      <Input 
                        placeholder="Ex: João, Maria..." 
                        value={displayName} 
                        onChange={(e) => setDisplayName(e.target.value)}
                        required={showRealName}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button type="submit" className="w-full h-11 rounded-full bg-ink text-paper text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50" disabled={loading}>
                {loading ? "Salvando..." : "Entrar na comunidade"}
              </button>
            </form>
          </DialogContent>
        </Dialog>

        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: showIncompleteProfile ? 0 : 1, scale: showIncompleteProfile ? 0.96 : 1 }} transition={{ duration: 0.45 }} className="w-full max-w-md">
          <Card className="w-full max-w-md p-8 border border-hairline relative">
            <button onClick={() => navigate("/")} className="absolute top-4 left-4 p-1 text-ink-soft hover:text-ink transition-colors">
              <ArrowLeft size={20} strokeWidth={1.5} />
            </button>

            <div className="text-center mb-6 pt-4">
              <p className="text-[9px] uppercase tracking-[0.28em] text-gold mb-2">✦</p>
              <h1 className="font-serif text-[34px] text-ink mb-1">Améns</h1>
              <div className="w-8 h-px bg-hairline mx-auto my-3" />
              <p className="text-[12px] text-ink-soft">Unidos pela oração</p>
              {referrerId && (
                <p className="text-[12px] text-marian mt-2">Você foi convidado! Crie sua conta e comece a orar.</p>
              )}
            </div>

            <button className="w-full h-11 mb-5 border border-hairline rounded-full flex items-center justify-center gap-2 text-sm text-ink hover:bg-vellum transition-colors disabled:opacity-50" onClick={handleGoogleSignIn} disabled={googleLoading}>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {googleLoading ? "Entrando..." : "Continuar com Google"}
            </button>

            <div className="relative mb-5">
              <div className="w-full border-t border-hairline" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-paper px-3 text-[11px] text-ink-soft">ou</span>
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
                  <Button type="submit" className="w-full h-11 rounded-full bg-ink text-paper text-sm font-medium hover:opacity-90 transition-opacity" disabled={loading}>
                    {loading ? "Entrando..." : "Entrar"}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
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

                    <div className="space-y-2 flex flex-col">
                       <Label>Paróquia / Igreja</Label>
                       <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                         <PopoverTrigger asChild>
                           <Button
                             variant="outline"
                             role="combobox"
                             aria-expanded={popoverOpen}
                             className={cn(
                               "w-full justify-between font-normal",
                               !parish && "text-muted-foreground"
                             )}
                             disabled={!selectedCity}
                           >
                             <span className="truncate">{parish || "Buscar ou digitar..."}</span>
                             <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                           </Button>
                         </PopoverTrigger>
                         <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                           <Command>
                             <CommandInput 
                               placeholder="Nome da paróquia..." 
                               value={parish}
                               onValueChange={(val) => setParish(val)}
                             />
                             <CommandList>
                               <CommandEmpty className="py-2 px-4 text-xs italic">Nenhuma paróquia sugerida.</CommandEmpty>
                               <CommandGroup heading="Sugeridas">
                                 {existingParishes.map((p) => (
                                   <CommandItem
                                     key={p}
                                     value={p}
                                     onSelect={(currentValue) => {
                                       setParish(currentValue);
                                       setPopoverOpen(false);
                                     }}
                                   >
                                     <Check
                                       className={cn(
                                         "mr-2 h-4 w-4",
                                         parish === p ? "opacity-100" : "opacity-0"
                                       )}
                                     />
                                     {p}
                                   </CommandItem>
                                 ))}
                               </CommandGroup>
                             </CommandList>
                           </Command>
                         </PopoverContent>
                       </Popover>
                       <p className="text-[10px] text-muted-foreground opacity-70">Encontre a sua ou digite uma nova.</p>
                    </div>

                    <div className="space-y-4 py-2 border-y border-primary/5">
                      <div className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          id="show-real-name-signup" 
                          className="w-4 h-4 rounded border-primary/20 text-primary focus:ring-primary"
                          checked={showRealName}
                          onChange={(e) => setShowRealName(e.target.checked)}
                        />
                        <Label htmlFor="show-real-name-signup" className="text-xs font-medium cursor-pointer">
                          Desejo usar um nome público ao invés de anônimo
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          id="is-public-parish-signup" 
                          className="w-4 h-4 rounded border-primary/20 text-primary focus:ring-primary"
                          checked={isPublicInParish}
                          onChange={(e) => setIsPublicInParish(e.target.checked)}
                        />
                        <Label htmlFor="is-public-parish-signup" className="text-xs font-medium cursor-pointer">
                          Desejo que minha foto e nome de usuário fique disponível na lista da minha paróquia.
                        </Label>
                      </div>

                      <AnimatePresence>
                        {showRealName && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-2 overflow-hidden"
                          >
                            <Label className="text-xs">Nome para exibição no aplicativo</Label>
                            <Input 
                              placeholder="Ex: Pedro, Ana..." 
                              value={displayName} 
                              onChange={(e) => setDisplayName(e.target.value)}
                              required={showRealName}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="space-y-2 pt-2">
                      <Label>Email</Label>
                      <Input type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Senha</Label>
                      <Input type="password" placeholder="••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <Button type="submit" className="w-full h-11 rounded-full bg-ink text-paper text-sm font-medium hover:opacity-90 transition-opacity" disabled={loading}>
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
