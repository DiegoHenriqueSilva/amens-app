import { Link, Navigate, useLocation } from "react-router-dom";
import { useUserRole } from "@/hooks/use-user-role";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

/**
 * Proteção de navegação do portal administrativo.
 *
 * Importante: este guard apenas controla o que a interface mostra. A
 * autorização real precisa existir no banco (RLS / RPC com is_admin() ou
 * is_moderator_or_admin()); nunca dependa somente deste componente.
 *
 * Matriz de acesso (ver docs/admin/ADM00-portal.md):
 *  - visitante  -> /auth?redirect=<rota atual>
 *  - usuário    -> /
 *  - moderador  -> só rotas sem requireAdmin; demais caem em /admin/prayers
 *  - admin      -> todas
 */
export function AdminGuard({ children, requireAdmin = false }: AdminGuardProps) {
  const { isModeratorOrAdmin, isAdmin, isLoading, isAuthenticated, isError, refetch } = useUserRole();
  const location = useLocation();

  if (isLoading) {
    return (
      <div role="status" aria-live="polite" className="min-h-[50vh] flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" />
        <span className="text-sm">Verificando permissões…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Visitante ou sessão expirada: leva ao login e volta para a mesma tela.
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?redirect=${redirect}`} replace />;
  }

  if (isError) {
    // Falha de rede/servidor ao consultar o papel: não expulsa o usuário
    // nem libera acesso; mostra o erro com opção de tentar de novo.
    return (
      <div role="alert" className="min-h-[50vh] flex flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">Não foi possível verificar suas permissões.</p>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => void refetch()}>Tentar novamente</Button>
          <Button size="sm" variant="ghost" asChild><Link to="/">Voltar ao App</Link></Button>
        </div>
      </div>
    );
  }

  const allowed = requireAdmin ? isAdmin : isModeratorOrAdmin;
  if (!allowed) {
    if (requireAdmin && isModeratorOrAdmin) return <Navigate to="/admin/prayers" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
