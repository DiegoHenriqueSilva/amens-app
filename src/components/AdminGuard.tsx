import { Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/use-user-role";
import { Loader2 } from "lucide-react";

interface AdminGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function AdminGuard({ children, requireAdmin = false }: AdminGuardProps) {
  const { isModeratorOrAdmin, isAdmin, isLoading } = useUserRole();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const allowed = requireAdmin ? isAdmin : isModeratorOrAdmin;
  if (!allowed) return <Navigate to="/" replace />;

  return <>{children}</>;
}
