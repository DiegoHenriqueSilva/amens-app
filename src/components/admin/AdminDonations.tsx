import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AdminSupporter } from '@/features/insignias/AdminSupporter';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type UserRow = { id: string; full_name: string | null; display_name: string | null };
export default function AdminDonations() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const { data: users = [], isLoading } = useQuery<UserRow[]>({
    queryKey: ['admin-donation-users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id,full_name,display_name').order('created_at', { ascending: false }).limit(500);
      if (error) throw error;
      return data ?? [];
    }, staleTime: 60_000,
  });
  const term = search.trim().toLowerCase();
  const filtered = users.filter(user => !term || [user.full_name, user.display_name].some(value => value?.toLowerCase().includes(term)));
  return <div className="p-6 space-y-5">
    <div><h1 className="text-2xl font-bold flex items-center gap-2"><Heart className="w-6 h-6 text-primary" /> Doações e apoiadores</h1><p className="text-muted-foreground text-sm mt-1">Confirme ou remova manualmente o privilégio de apoiador.</p></div>
    <Card className="p-4 bg-primary/5 border-primary/15"><p className="text-sm">Use esta seção quando a doação for recebida fora da integração automática. O usuário poderá escolher se deseja exibir a insígnia no próprio perfil.</p></Card>
    <div className="relative max-w-lg"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar por nome..." value={search} onChange={event => setSearch(event.target.value)} /></div>
    <div className="rounded-lg border divide-y">
      {isLoading && <p className="p-6 text-center text-muted-foreground">Carregando usuários...</p>}
      {!isLoading && filtered.length === 0 && <p className="p-6 text-center text-muted-foreground">Nenhum usuário encontrado.</p>}
      {filtered.map(user => { const name = user.full_name || user.display_name || 'Usuário'; return <div key={user.id} className="p-3 flex items-center justify-between gap-3"><div className="min-w-0"><p className="font-medium truncate">{name}</p><p className="text-xs text-muted-foreground truncate">{user.display_name || user.id}</p></div><Button size="sm" variant="outline" onClick={() => setSelected({ id: user.id, name })}>Gerenciar apoiador</Button></div>; })}
    </div>
    {selected && <AdminSupporter user={selected} onClose={() => setSelected(null)} />}
  </div>;
}
