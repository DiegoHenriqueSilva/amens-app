import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, Heart, Users, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useFriends } from "@/hooks/use-friends";
import { supabase } from "@/integrations/supabase/client";

interface FriendSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (friendIds: string[]) => void;
  title?: string;
  prayerRequestId?: string;
  /** IDs de amigos já convidados nesta sessão (fallback para RLS do Supabase) */
  alreadySharedFriendIds?: string[];
}

export const FriendSelector = ({ open, onOpenChange, onSelect, title = "Convidar Amigos", prayerRequestId, alreadySharedFriendIds = [] }: FriendSelectorProps) => {
  const { friends, loading } = useFriends();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [invitedTodayIds, setInvitedTodayIds] = useState<string[]>([]);

  useEffect(() => {
    if (open && prayerRequestId) {
      const fetchInvited = async () => {
        // Usa meia-noite local para evitar problema de timezone (UTC vs UTC-3)
        const now = new Date();
        const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const localMidnightISO = localMidnight.toISOString();

        const { data } = await supabase
          .from("notifications")
          .select("user_id")
          .eq("prayer_request_id", prayerRequestId)
          .gte("created_at", localMidnightISO);
        
        if (data) {
          setInvitedTodayIds(data.map(d => d.user_id));
        }
      };
      fetchInvited();
    } else {
      setInvitedTodayIds([]);
    }
  }, [open, prayerRequestId]);

  const filteredFriends = friends.filter(friend => 
    friend.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleFriend = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    onSelect(selectedIds);
    setSearchTerm("");
    setSelectedIds([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border border-hairline rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Selecione os amigos que você deseja convidar para orar.
          </DialogDescription>
        </DialogHeader>

        <div className="relative my-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar amigo..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl border-primary/10 bg-white/50"
          />
        </div>

        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground animate-pulse">Carregando amigos...</div>
            ) : filteredFriends.length > 0 ? (
              filteredFriends.map((friend) => {
                const isSelected = selectedIds.includes(friend.id);
                // Bloqueado se convidado via DB (query) OU via rastreamento client-side da sessão
                const isInvitedToday = invitedTodayIds.includes(friend.id) || alreadySharedFriendIds.includes(friend.id);
                return (
                  <button
                    key={friend.id}
                    disabled={isInvitedToday}
                    onClick={() => !isInvitedToday && toggleFriend(friend.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all border ${
                      isSelected 
                        ? "bg-primary/10 border-primary/20 shadow-sm" 
                        : isInvitedToday
                        ? "bg-stone-50 border-stone-200 opacity-60 cursor-not-allowed"
                        : "bg-white/40 border-transparent hover:bg-white/60"
                    }`}
                  >
                    <Avatar className="w-10 h-10 border-2 border-primary/20 bg-primary/10 flex items-center justify-center">
                      <AvatarImage src={friend.avatar_url || undefined} />
                      <AvatarFallback className="bg-transparent"><Heart className="w-4 h-4 text-primary/50" /></AvatarFallback>
                    </Avatar>
                    <div className="text-left flex-1">
                      <p className="text-sm font-bold">{friend.display_name || friend.full_name?.split(" ")[0]}</p>
                      <p className="text-[10px] text-muted-foreground">{friend.city || "Lugar Sagrado"}</p>
                      {isInvitedToday && <p className="text-[10px] text-orange-600 font-semibold mt-0.5">Já convidado hoje para esta causa</p>}
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="text-center py-12 opacity-40 italic flex flex-col items-center">
                <Users className="w-12 h-12 mb-3 text-muted-foreground" />
                <p className="text-sm">Nenhum amigo encontrado.</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={selectedIds.length === 0}
            className="rounded-full bg-ink text-paper hover:opacity-90 flex-1"
          >
            Convidar {selectedIds.length > 0 && `(${selectedIds.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
