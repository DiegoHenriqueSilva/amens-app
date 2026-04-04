import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchStates, fetchCitiesByState, IBGEState, IBGECity } from "@/lib/ibge";
import { toast } from "sonner";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function CompleteProfileDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Form State
  const [fullName, setFullName] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [parish, setParish] = useState("");
  
  // IBGE & Data
  const [states, setStates] = useState<IBGEState[]>([]);
  const [cities, setCities] = useState<IBGECity[]>([]);
  const [existingParishes, setExistingParishes] = useState<string[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    const checkProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      
      setUserId(session.user.id);
      
      const { data: profile } = await supabase
        .from('profiles' as any)
        .select('*')
        .eq('id', session.user.id)
        .single() as any;
        
      if (!profile || !profile.parish || !profile.city || !profile.state) {
        setIsOpen(true);
        if (profile?.full_name) setFullName(profile.full_name);
        else if (session.user.user_metadata?.full_name) setFullName(session.user.user_metadata.full_name);
        
        // Pre-fill if some data already exists
        if (profile?.state) setSelectedState(profile.state);
        if (profile?.city) setSelectedCity(profile.city);
      }
    };

    checkProfile();
    fetchStates().then(setStates);
  }, []);

  useEffect(() => {
    if (selectedState) {
      fetchCitiesByState(selectedState).then(setCities);
      // Only clear city if state actually changed and it's not the initial load
      // But for simplicity in this flow, we clear to ensure consistency
    }
  }, [selectedState]);

  useEffect(() => {
    if (selectedState && selectedCity) {
      // In a real app, this table 'parish_stats' should be indexed by state/city
      supabase.from('profiles' as any)
        .select('parish')
        .eq('state', selectedState)
        .eq('city', selectedCity)
        .not('parish', 'is', null)
        .then(({ data }) => {
          if (data) {
            // Unique parishes
            const castedData = data as any[];
            const unique = Array.from(new Set(castedData.map(p => p.parish)));
            setExistingParishes(unique);
          }
        });
    }
  }, [selectedState, selectedCity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (!fullName || !selectedState || !selectedCity || !parish) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }

    setLoading(true);
    const { error } = await (supabase.from('profiles' as any) as any).upsert({
      id: userId,
      full_name: fullName,
      state: selectedState,
      city: selectedCity,
      parish: parish
    });

    if (!error) {
      // Also update auth metadata for faster access
      await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          state: selectedState,
          city: selectedCity,
          parish: parish
        }
      });
      
      toast.success("Perfil completado! Bem-vindo(a) à comunidade. 🙏");
      setIsOpen(false);
    } else {
      toast.error("Erro ao salvar perfil: " + error.message);
    }
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => {
      // Prevent closing if incomplete
      if (!val && isOpen) return;
      setIsOpen(val);
    }}>
      <DialogContent className="max-w-md bg-card/95 backdrop-blur-md border-primary/20 soft-shadow rounded-[2rem]">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center font-bold flex items-center justify-center gap-2">
            Complete seu Perfil <Sparkles className="w-5 h-5 text-primary" />
          </DialogTitle>
          <DialogDescription className="text-center">
            Para participar da nossa rede de oração, precisamos saber de qual comunidade você faz parte.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Nome Completo</Label>
            <Input 
              placeholder="Seu nome" 
              value={fullName} 
              onChange={(e) => setFullName(e.target.value)} 
              required 
              className="rounded-xl border-primary/10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Estado (UF)</Label>
              <Select value={selectedState} onValueChange={(val) => {
                setSelectedState(val);
                setSelectedCity("");
                setParish("");
              }} required>
                <SelectTrigger className="rounded-xl border-primary/10">
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  {states.map(st => (
                    <SelectItem key={st.sigla} value={st.sigla}>{st.sigla}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Select 
                value={selectedCity} 
                onValueChange={(val) => {
                  setSelectedCity(val);
                  setParish("");
                }} 
                disabled={!selectedState} 
                required
              >
                <SelectTrigger className="rounded-xl border-primary/10 truncate">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {cities.map(ct => (
                    <SelectItem key={ct.id} value={ct.nome}>{ct.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2 flex flex-col">
            <Label>Paróquia / Comunidade / Igreja</Label>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={popoverOpen}
                  className={cn(
                    "w-full justify-between rounded-xl border-primary/10 font-normal",
                    !parish && "text-muted-foreground"
                  )}
                  disabled={!selectedCity}
                >
                  <span className="truncate">{parish || "Buscar ou digitar paróquia..."}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Digite o nome da paróquia..." 
                    value={parish}
                    onValueChange={(val) => setParish(val)}
                  />
                  <CommandList>
                    <CommandEmpty className="py-2 px-4 text-xs italic">
                      Nenhuma paróquia encontrada. Você pode continuar digitando a sua acima.
                    </CommandEmpty>
                    <CommandGroup heading="Paróquias Sugeridas">
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
            <p className="text-[10px] text-muted-foreground px-1">
              Dica: Se sua paróquia já foi cadastrada por outro fiel, ela aparecerá na lista.
            </p>
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 rounded-2xl gradient-divine font-bold shadow-lg mt-2" 
            disabled={loading}
          >
            {loading ? "Salvando informações..." : "Entrar na Comunidade 🙏"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
