import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Plus, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Wordmark } from "@/components/ui/wordmark";
import { Button } from "@/components/ui/button";

type NavLink = {
  path: string;
  label: string;
};

const NAV_LINKS: NavLink[] = [
  { path: "/", label: "Hoje" },
  { path: "/community", label: "Comunidade" },
  { path: "/prayer-chain", label: "Corrente" },
  { path: "/submit", label: "Pedidos" },
  { path: "/profile", label: "Perfil" },
];

const HIDDEN_PATHS = ["/auth"];

export function TopBar() {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initials, setInitials] = useState("?");

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from("profiles")
        .select("avatar_url, first_name, last_name")
        .eq("id", session.user.id)
        .maybeSingle();

      if (data) {
        setAvatarUrl(data.avatar_url ?? null);
        const first = data.first_name?.[0] ?? "";
        const last = data.last_name?.[0] ?? "";
        setInitials((first + last).toUpperCase() || "?");
      }

      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id)
        .eq("is_read", false);

      if (count !== null) setUnreadCount(count);
    };

    loadUser();

    const channel = supabase
      .channel("topbar-notifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, loadUser)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (HIDDEN_PATHS.includes(location.pathname)) return null;

  return (
    <header className="hidden md:flex items-center justify-between px-12 py-5 border-b border-hairline bg-paper/80 backdrop-blur-sm sticky top-0 z-50">
      <Wordmark />

      <nav className="flex items-center gap-9">
        {NAV_LINKS.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={cn(
                "text-sm transition-colors pb-0.5",
                isActive
                  ? "text-ink font-medium border-b-2 border-ink"
                  : "text-ink-soft hover:text-ink",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3">
        <Button variant="ink" size="sm" className="h-9 px-4 text-xs gap-1.5" asChild>
          <Link to="/submit">
            <Plus size={14} strokeWidth={2} />
            Enviar intenção
          </Link>
        </Button>

        <Link to="/profile" className="relative">
          <Bell size={20} strokeWidth={1.5} className="text-ink-soft hover:text-ink transition-colors" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-marian text-paper text-[8px] rounded-full flex items-center justify-center font-medium">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        <Link to="/profile">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Perfil"
              className="w-8 h-8 rounded-full object-cover border border-hairline"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-hairline border border-hairline flex items-center justify-center text-xs font-medium text-ink-soft">
              {initials}
            </div>
          )}
        </Link>
      </div>
    </header>
  );
}
