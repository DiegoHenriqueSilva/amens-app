import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, User, Users, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useFriends } from "@/hooks/use-friends";

interface FriendSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (friendIds: string[]) => void;
  title?: string;
  excludedIds?: string[];
}

export const FriendSelector = ({ open, onOpenChange, onSelect, title = "Convidar Amigos", excludedIds = [] }: FriendSelectorProps) => {
  const { friends, loading } = useFriends();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Limpa a seleção e termo de busca ao fechar ou reabrir o diálogo
  useEffect(() => {
    if (!open) {
      setSelectedIds([]);
      setSearchTerm("");
    }
  }, [open]);

  const excluded = new Set(excludedIds.filter(Boolean));
  const filteredFriends = friends.filter(friend => !excluded.has(friend.id) && (
    (friend.display_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (friend.full_name?.toLowerCase().includes(searchTerm.toLowerCase()))
  ));

  const toggleFriend = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    const uniqueIds = Array.from(new Set(selectedIds));
    onSelect(uniqueIds);
    setSearchTerm("");
    setSelectedIds([]);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setSearchTerm("");
    setSelectedIds([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-md border-primary/20 soft-shadow rounded-[2rem]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2 font-serif text-foreground">
            <Users className="w-6 h-6 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Selecione os amigos que você deseja convidar para orar em união.
          </DialogDescription>
        </DialogHeader>

        <div className="relative my-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar amigo por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Buscar amigo na lista"
            className="pl-10 rounded-xl border-primary/15 bg-white/60 h-11 text-sm placeholder:text-muted-foreground/70"
          />
        </div>

        <ScrollArea className="h-[280px] pr-3">
          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-8 text-xs text-muted-foreground animate-pulse font-medium">
                Carregando amigos da fé...
              </div>
            ) : filteredFriends.length > 0 ? (
              filteredFriends.map((friend) => {
                const isSelected = selectedIds.includes(friend.id);
                const friendName = friend.display_name || friend.full_name?.split(" ")[0] || "Intercessor";
                const friendLocation = friend.city || "Lugar Sagrado";
                return (
                  <button
                    key={friend.id}
                    type="button"
                    onClick={() => toggleFriend(friend.id)}
                    aria-pressed={isSelected}
                    aria-label={`${friendName}, ${friendLocation}. ${isSelected ? "Selecionado para o convite" : "Não selecionado. Toque para selecionar"}`}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all border text-left ${
                      isSelected
                        ? "bg-primary/10 border-primary/30 shadow-sm"
                        : "bg-white/50 border-primary/5 hover:bg-white/80"
                    }`}
                  >
                    <Avatar className="w-10 h-10 border border-primary/10 shrink-0">
                      <AvatarImage src={friend.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.id}`} />
                      <AvatarFallback className="bg-secondary text-primary font-bold text-xs"><User className="w-5 h-5" /></AvatarFallback>
                    </Avatar>
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-sm font-bold truncate text-foreground">{friendName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{friendLocation}</p>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white shrink-0 shadow-sm animate-scale-in">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="text-center py-10 opacity-50 flex flex-col items-center">
                <Users className="w-10 h-10 mb-2 text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">Nenhum amigo encontrado.</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {searchTerm ? "Tente outro termo de busca." : "Adicione amigos pelo código na tela Amigos da Fé."}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4 gap-2 sm:gap-0 flex-row">
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="rounded-xl flex-1 font-semibold"
            aria-label="Cancelar seleção e fechar janela"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedIds.length === 0}
            className="rounded-xl gradient-divine flex-1 font-bold shadow-md hover:shadow-lg transition-all"
            aria-label={`Confirmar e convidar ${selectedIds.length} amigos`}
          >
            Convidar {selectedIds.length > 0 && `(${selectedIds.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
