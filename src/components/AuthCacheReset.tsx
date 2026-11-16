import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Limpa todo o cache do React Query quando a conta muda (logout, expiração
 * de sessão ou troca de usuário na mesma aba). Sem isso, consultas com
 * queryKey sem o id do usuário (ex.: ["admin-auth-users"], staleTime
 * Infinity) continuariam exibindo dados da conta anterior.
 */
export function AuthCacheReset() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // undefined = ainda não recebemos o primeiro evento (INITIAL_SESSION).
    let currentUserId: string | null | undefined;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user.id ?? null;
      if (currentUserId !== undefined && nextUserId !== currentUserId) {
        void queryClient.cancelQueries();
        queryClient.clear();
      }
      currentUserId = nextUserId;
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);

  return null;
}
