import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Trash2, Undo2, Search } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Tab = "all" | "active" | "deleted";

const TAB_TOOLTIPS: Record<Tab, string> = {
  all: "Todas as contribuições, incluindo as removidas",
  active: "Apenas contribuições visíveis na corrente ao vivo",
  deleted: "Contribuições removidas pela moderação",
};

async function fetchContributions(tab: Tab) {
  let q = supabase
    .from("prayer_contributions")
    .select("id, author_name, author_city, user_id, created_at, deleted_at, deleted_by")
    .order("created_at", { ascending: false })
    .limit(300);

  if (tab === "active") q = q.is("deleted_at", null);
  else if (tab === "deleted") q = q.not("deleted_at", "is", null);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export default function AdminPrayerChain() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");

  const { data: contributions = [], isLoading } = useQuery({
    queryKey: ["admin-prayer-chain", tab],
    queryFn: () => fetchContributions(tab),
  });

  const { data: authUsers = [] } = useQuery({
    queryKey: ["admin-auth-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_users_admin" as any);
      if (error) return [];
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const authMap = useMemo(() => {
    const map: Record<string, { email: string; last_sign_in_at: string | null }> = {};
    (authUsers as any[]).forEach((u) => { map[u.id] = u; });
    return map;
  }, [authUsers]);

  const { data: sessionData } = useQuery({
    queryKey: ["session"],
    queryFn: () => supabase.auth.getSession().then((r) => r.data),
    staleTime: Infinity,
  });
  const currentUserId = sessionData?.session?.user?.id;

  const filtered = contributions.filter((c: any) => {
    const q = search.toLowerCase();
    return !q
      || c.author_name?.toLowerCase().includes(q)
      || c.author_city?.toLowerCase().includes(q)
      || authMap[c.user_id]?.email?.toLowerCase().includes(q);
  });

  async function log(targetId: string, action: string) {
    const { error } = await supabase.from("moderation_logs").insert({
      moderator_id: currentUserId,
      target_type: "contribution",
      target_id: targetId,
      action,
    });
    if (error) console.warn("log insert failed:", error.message);
  }

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prayer_contributions").update({ deleted_at: new Date().toISOString(), deleted_by: currentUserId }).eq("id", id);
      if (error) throw error;
      await log(id, "soft_delete");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-prayer-chain"] }); toast.success("Contribuição removida."); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const restore = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prayer_contributions").update({ deleted_at: null, deleted_by: null }).eq("id", id);
      if (error) throw error;
      await log(id, "restore");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-prayer-chain"] }); toast.success("Contribuição restaurada."); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Corrente de Oração</h1>
        <p className="text-muted-foreground text-sm">Modere contribuições da corrente ao vivo</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          {(["all", "active", "deleted"] as Tab[]).map((t) => (
            <Tooltip key={t}>
              <TooltipTrigger asChild>
                <span>
                  <TabsTrigger value={t}>
                    {{ all: "Todas", active: "Ativas", deleted: "Removidas" }[t]}
                  </TabsTrigger>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p className="text-xs">{TAB_TOOLTIPS[t]}</p></TooltipContent>
            </Tooltip>
          ))}
        </TabsList>
      </Tabs>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por autor, cidade ou email..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Autor</TableHead>
              <TableHead>Email / Login</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma contribuição encontrada.</TableCell></TableRow>
            ) : filtered.map((c: any) => (
              <TableRow key={c.id} className={c.deleted_at ? "opacity-50" : ""}>
                <TableCell className="font-medium">{c.author_name}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{authMap[c.user_id]?.email || "—"}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{c.author_city || "—"}</TableCell>
                <TableCell>
                  {c.deleted_at
                    ? <Badge variant="destructive">Removida</Badge>
                    : <Badge variant="outline">Ativa</Badge>}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {formatDistanceToNow(new Date(c.created_at), { locale: ptBR, addSuffix: true })}
                </TableCell>
                <TableCell>
                  {!c.deleted_at ? (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => softDelete.mutate(c.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => restore.mutate(c.id)}>
                      <Undo2 className="w-4 h-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
