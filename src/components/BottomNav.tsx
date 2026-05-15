import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Globe, Plus, Link as ChainIcon, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type NavItem = {
  path: string;
  icon: React.ElementType;
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  { path: "/", icon: Home, label: "Hoje" },
  { path: "/community", icon: Globe, label: "Comunidade" },
];

const NAV_ITEMS_RIGHT: NavItem[] = [
  { path: "/prayer-chain", icon: ChainIcon, label: "Corrente" },
  { path: "/profile", icon: User, label: "Perfil" },
];

const HIDDEN_PATHS = ["/auth"];

const BottomNav = () => {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", session.user.id)
      .eq("is_read", false);

    if (!error && count !== null) {
      setUnreadCount(count);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    const channel = supabase
      .channel("bottomnav-notifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, fetchUnreadCount)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (HIDDEN_PATHS.includes(location.pathname)) return null;

  return (
    <nav
      className={cn(
        "md:hidden fixed bottom-4 left-4 right-4 z-50",
        "rounded-2xl bg-vellum border border-hairline shadow-nav",
        "flex items-end justify-around px-2 py-2",
      )}
    >
      {NAV_ITEMS.map((item) => (
        <NavTab key={item.path} item={item} active={location.pathname === item.path} />
      ))}

      {/* FAB — always points to /submit */}
      <Link
        to="/submit"
        className={cn(
          "-mt-7 w-14 h-14 rounded-full bg-ink text-paper shadow-fab",
          "flex items-center justify-center",
          "transition-transform active:scale-95",
        )}
        aria-label="Enviar intenção"
      >
        <Plus size={22} strokeWidth={2} />
      </Link>

      {NAV_ITEMS_RIGHT.map((item) => {
        const showBadge = item.path === "/profile" && unreadCount > 0;
        return (
          <NavTab key={item.path} item={item} active={location.pathname === item.path} badge={showBadge ? unreadCount : undefined} />
        );
      })}
    </nav>
  );
};

interface NavTabProps {
  item: NavItem;
  active: boolean;
  badge?: number;
}

function NavTab({ item, active, badge }: NavTabProps) {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      className="flex flex-col items-center gap-0.5 px-2 py-1 min-w-[44px]"
    >
      <div className="relative">
        <Icon
          size={22}
          strokeWidth={active ? 1.9 : 1.5}
          className={cn("transition-colors", active ? "text-ink" : "text-ink-soft")}
        />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 bg-marian text-paper text-[8px] rounded-full flex items-center justify-center font-medium">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </div>
      <span
        className={cn(
          "text-[9.5px] transition-colors",
          active ? "text-ink font-medium" : "text-ink-soft",
        )}
      >
        {item.label}
      </span>
      {/* Active dot */}
      <div
        className={cn(
          "w-1 h-1 rounded-full bg-gold transition-opacity",
          active ? "opacity-100" : "opacity-0",
        )}
      />
    </Link>
  );
}

export default BottomNav;
