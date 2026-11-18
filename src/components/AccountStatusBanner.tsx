import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { adminRpc } from "@/lib/admin-rpc";

type AccountStatus = { removed: boolean; suspended_until: string | null; restricted: boolean } | null;

/**
 * Aviso para quem está suspenso ou teve a conta removida (ADM02-F02).
 * O bloqueio real é feito no banco (trigger enforce_account_not_restricted);
 * este aviso só explica por que as ações vão falhar e até quando.
 */
export function AccountStatusBanner() {
  const location = useLocation();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setUserId(session?.user.id ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const { data } = useQuery({
    queryKey: ["my-account-status", userId],
    queryFn: () => adminRpc<AccountStatus>("my_account_status", {}),
    enabled: !!userId,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: true,
  });

  if (!data?.restricted || location.pathname.startsWith("/admin") || location.pathname === "/auth") return null;

  return (
    <div role="status" className="sticky top-0 z-[60] flex items-start gap-2 bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100 px-4 py-2 text-sm shadow">
      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
      <p>
        {data.removed
          ? "Sua conta foi desativada pela moderação. Você ainda pode ler os pedidos e acompanhar a comunidade, mas não é possível publicar, registrar orações, reagir ou convidar amigos."
          : `Sua conta está com as interações pausadas até ${format(new Date(data.suspended_until!), "dd/MM/yyyy 'às' HH:mm")}. Até lá, você ainda pode ler os pedidos e acompanhar a comunidade.`}
      </p>
    </div>
  );
}
