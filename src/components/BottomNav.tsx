import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Users, Link as LinkIcon, User, Mail, Globe, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFriends } from "@/hooks/use-friends";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";

const BottomNav = () => {
  const location = useLocation();
  const { requests } = useFriends();
  const [unreadCount, setUnreadCount] = useState(0);
  const { isModeratorOrAdmin } = useUserRole();

  const fetchUnreadCount = async () => {
    const { data: { session } } = await supabase.auth.getSession();
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
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => fetchUnreadCount()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (location.pathname === "/auth") return null;
  if (location.pathname.startsWith("/admin")) return null;

  const navItems = [
    { path: "/", icon: Home, label: "Início" },
    { path: "/messages", icon: Mail, label: "Mensagens", badge: unreadCount },
    { path: "/prayer-chain", icon: LinkIcon, label: "Oração ao vivo" },
    { path: "/friends", icon: Users, label: "Amigos", badge: requests?.length || 0 },
    { path: "/community", icon: Globe, label: "Comunidade" },
    { path: "/profile", icon: User, label: "Perfil" },
    ...(isModeratorOrAdmin
      ? [{ path: "/admin", icon: ShieldCheck, label: "Admin", badge: 0 }]
      : []),
  ];

  return (
    <nav className="nav-blur fixed bottom-0 left-0 right-0 h-20 flex items-center justify-around px-2 pb-2 z-50">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path || (item.path === "/admin" && location.pathname.startsWith("/admin"));
        const Icon = item.icon;

        return (
          <Link
            key={item.path}
            to={item.path}
            className="flex flex-col items-center gap-1 group relative"
          >
            <div className={cn(
              "w-12 h-1 bg-primary rounded-full mb-1 transition-opacity",
              isActive ? "opacity-100" : "opacity-0 group-hover:opacity-50"
            )} />
            <div className="relative">
              <Icon className={cn(
                "w-6 h-6 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
              )} />
              {item.badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center border border-background font-bold animate-pulse">
                  {item.badge}
                </span>
              )}
            </div>
            <span className={cn(
              "text-[9px] font-bold transition-all truncate max-w-[60px]",
              isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary font-medium"
            )}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNav;
