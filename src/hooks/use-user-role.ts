import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "moderator" | "user" | null;

async function fetchUserRole(): Promise<UserRole> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", session.user.id);

  if (error || !data || data.length === 0) return "user";

  const names = data.map((r: any) => r.roles?.name).filter(Boolean) as string[];

  if (names.includes("admin")) return "admin";
  if (names.includes("moderator")) return "moderator";
  return "user";
}

export function useUserRole() {
  const { data: role, isLoading } = useQuery({
    queryKey: ["user-role"],
    queryFn: fetchUserRole,
    staleTime: 5 * 60 * 1000,
  });

  return {
    role: role ?? null,
    isAdmin: role === "admin",
    isModerator: role === "moderator",
    isModeratorOrAdmin: role === "admin" || role === "moderator",
    isLoading,
  };
}
