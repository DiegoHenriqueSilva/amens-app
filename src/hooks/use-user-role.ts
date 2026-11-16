import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "moderator" | "user" | null;

async function fetchUserRole(userId: string): Promise<UserRole> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", userId);

  if (error) throw error;
  if (!data || data.length === 0) return "user";

  const names = data.map((r: any) => r.roles?.name).filter(Boolean) as string[];

  if (names.includes("admin")) return "admin";
  if (names.includes("moderator")) return "moderator";
  return "user";
}

export function useUserRole() {
  const [identity, setIdentity] = useState<{id: string | null; ready: boolean}>({id:null,ready:false});
  useEffect(() => {
    let active = true;
    let receivedEvent = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      receivedEvent = true;
      if (active) setIdentity({id:session?.user.id ?? null,ready:true});
    });
    void supabase.auth.getSession().then(({data:{session}}) => {
      if (active && !receivedEvent) setIdentity({id:session?.user.id ?? null,ready:true});
    });
    return () => { active=false; subscription.unsubscribe(); };
  }, []);
  const { data: role, isLoading, isError, refetch } = useQuery({
    queryKey: ["user-role", identity.id],
    queryFn: () => fetchUserRole(identity.id!),
    enabled: !!identity.id,
    staleTime: 0,
    refetchInterval: 60 * 1000,
  });

  return {
    role: role ?? null,
    userId: identity.id,
    isAuthenticated: !!identity.id,
    isAdmin: role === "admin",
    isModerator: role === "moderator",
    isModeratorOrAdmin: role === "admin" || role === "moderator",
    isLoading: !identity.ready || (!!identity.id && isLoading),
    // Falha ao consultar o papel (rede/servidor) sem nenhum valor conhecido.
    isError: !!identity.id && isError && role === undefined,
    refetch,
  };
}

