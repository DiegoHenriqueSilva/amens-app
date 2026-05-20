import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, BookOpen, Flag, Church, ScrollText,
  Link as LinkIcon, LogOut, ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/use-user-role";
import { Button } from "@/components/ui/button";

const allItems = [
  { path: "/admin", icon: LayoutDashboard, label: "Dashboard", adminOnly: false },
  { path: "/admin/users", icon: Users, label: "Usuários", adminOnly: false },
  { path: "/admin/prayers", icon: BookOpen, label: "Pedidos de Oração", adminOnly: false },
  { path: "/admin/reports", icon: Flag, label: "Reports", adminOnly: false },
  { path: "/admin/churches", icon: Church, label: "Igrejas", adminOnly: true },
  { path: "/admin/prayer-chain", icon: LinkIcon, label: "Corrente de Oração", adminOnly: false },
  { path: "/admin/logs", icon: ScrollText, label: "Logs de Moderação", adminOnly: true },
];

export function AdminSidebar() {
  const location = useLocation();
  const { isAdmin } = useUserRole();

  const items = allItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-card border-r border-border shrink-0">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <span className="text-primary text-sm font-bold">A</span>
        </div>
        <span className="font-semibold text-sm">Painel Admin</span>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {items.map((item) => {
          const isActive =
            item.path === "/admin"
              ? location.pathname === "/admin"
              : location.pathname.startsWith(item.path);
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <Button variant="ghost" size="sm" className="w-full justify-start gap-3 text-muted-foreground" asChild>
          <Link to="/">
            <ChevronLeft className="w-4 h-4" />
            Voltar ao App
          </Link>
        </Button>
      </div>
    </aside>
  );
}
