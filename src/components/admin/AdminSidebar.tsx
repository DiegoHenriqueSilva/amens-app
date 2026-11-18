import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, BookOpen, Flag, Church, ScrollText, Heart,
  ChevronLeft, Settings, MessageSquare, Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/use-user-role";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

/**
 * Itens do portal. adminOnly precisa refletir exatamente o requireAdmin das
 * rotas em src/pages/Admin.tsx (e a matriz em docs/admin/ADM00-portal.md).
 */
export const ADMIN_NAV_ITEMS = [
  { path: "/admin", icon: LayoutDashboard, label: "Dashboard", adminOnly: true },
  { path: "/admin/users", icon: Users, label: "Usuários", adminOnly: true },
  { path: "/admin/donations", icon: Heart, label: "Doações", adminOnly: true },
  { path: "/admin/prayers", icon: BookOpen, label: "Pedidos de Oração", adminOnly: false },
  { path: "/admin/reports", icon: Flag, label: "Reports", adminOnly: false },
  { path: "/admin/churches", icon: Church, label: "Igrejas", adminOnly: false },
  { path: "/admin/feedback", icon: MessageSquare, label: "Feedback", adminOnly: false },
  { path: "/admin/settings", icon: Settings, label: "Configurações", adminOnly: true },
  { path: "/admin/logs", icon: ScrollText, label: "Logs de Moderação", adminOnly: true },
] as const;

function isItemActive(itemPath: string, pathname: string) {
  if (itemPath === "/admin") return pathname === "/admin" || pathname === "/admin/";
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

function useAdminNavItems() {
  const { isAdmin, isModeratorOrAdmin, userId } = useUserRole();

  const { data: unreadFeedback = 0 } = useQuery({
    queryKey: ["admin-feedback-unread", userId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("user_feedback" as any)
        .select("id", { count: "exact", head: true })
        .eq("status", "unread");
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 60000,
    enabled: isModeratorOrAdmin && !!userId,
  });

  const items = ADMIN_NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);
  return { items, unreadFeedback };
}

function AdminNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const { items, unreadFeedback } = useAdminNavItems();

  return (
    <nav aria-label="Menu administrativo" className="flex-1 overflow-y-auto p-3 space-y-0.5">
      {items.map((item) => {
        const isActive = isItemActive(item.path, location.pathname);
        const Icon = item.icon;
        const showBadge = item.path === "/admin/feedback" && unreadFeedback > 0;

        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              // Estado ativo marcado por cor, peso da fonte e barra lateral
              // (não depende só de cor).
              "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "bg-primary/10 text-primary font-semibold before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-full before:bg-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">{item.label}</span>
            {showBadge && (
              <Badge
                variant="destructive"
                className="text-[10px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center"
                aria-label={`${unreadFeedback} não lidos`}
              >
                {unreadFeedback > 99 ? "99+" : unreadFeedback}
              </Badge>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function BackToAppButton({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="p-3 border-t border-border">
      <Button variant="ghost" size="sm" className="w-full justify-start gap-3 text-muted-foreground" asChild>
        <Link to="/" onClick={onNavigate}>
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          Voltar ao App
        </Link>
      </Button>
    </div>
  );
}

function SidebarBrand() {
  return (
    <div className="flex items-center gap-2 px-5 py-5 border-b border-border">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center" aria-hidden="true">
        <span className="text-primary text-sm font-bold">A</span>
      </div>
      <span className="font-semibold text-sm">Painel Admin</span>
    </div>
  );
}

/** Menu lateral fixo — somente a partir de md (768px). */
export function AdminSidebar() {
  return (
    <aside className="hidden md:flex sticky top-0 h-screen flex-col w-60 bg-card border-r border-border shrink-0">
      <SidebarBrand />
      <AdminNavLinks />
      <BackToAppButton />
    </aside>
  );
}

/** Barra superior com menu em gaveta — somente abaixo de md. */
export function AdminMobileHeader() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const current = ADMIN_NAV_ITEMS.find((item) => isItemActive(item.path, location.pathname));

  // Fecha a gaveta ao trocar de rota (ex.: botão voltar do navegador).
  useEffect(() => { setOpen(false); }, [location.pathname]);

  return (
    <header className="md:hidden sticky top-0 z-40 flex items-center gap-2 h-14 px-4 bg-card/95 backdrop-blur border-b border-border">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Abrir menu administrativo"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Menu className="w-5 h-5" aria-hidden="true" />
      </Button>
      <span className="font-semibold text-sm truncate">{current?.label ?? "Painel Admin"}</span>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 max-w-[85vw] p-0 flex flex-col">
          <SheetTitle className="sr-only">Menu administrativo</SheetTitle>
          <SheetDescription className="sr-only">Navegue entre as seções do painel.</SheetDescription>
          <SidebarBrand />
          <AdminNavLinks onNavigate={() => setOpen(false)} />
          <BackToAppButton onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  );
}
