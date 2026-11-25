import { Link, useLocation } from "react-router-dom";
import { Home, Users, Link as LinkIcon, User, Mail, Globe, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFriends } from "@/hooks/use-friends";
import { useUnreadNotifications } from "@/hooks/use-unread-notifications";
import { useUserRole } from "@/hooks/use-user-role";

const BottomNav = ({ inline = false }: { inline?: boolean }) => {
  const location = useLocation();
  const { requests, friends, loading } = useFriends();
  const unreadCount = useUnreadNotifications(location.pathname);
  const { isModeratorOrAdmin } = useUserRole();

  // Guided rosaries have their own previous/next controls at the bottom.
  // Keeping the global navigation there covers the bead controls on phones.
  const isGuidedRosary = /^\/rosary\/[^/]+/.test(location.pathname);
  if (location.pathname === "/auth" || location.pathname.startsWith("/admin") || isGuidedRosary) return null;
  
  const navItems = [
    { path: "/", icon: Home, label: "Início" },
    { path: "/messages", icon: Mail, label: "Mensagens", badge: unreadCount },
    { path: "/prayer-chain", icon: LinkIcon, label: "Orar ao vivo" },
    { path: "/friends", icon: Users, label: "Amigos", badge: requests?.length || 0 },
    { path: "/community", icon: Globe, label: "Comunidade" },
    { path: "/profile", icon: User, label: "Perfil" },
    ...(isModeratorOrAdmin ? [{ path: "/admin", icon: ShieldCheck, label: "Admin" }] : []),
  ];

  return (
    <nav aria-label="Menu principal" className={cn("nav-blur bottom-nav-devotional bottom-0 left-0 right-0 h-20 flex items-center justify-around px-2 pb-2 z-50", inline ? "bottom-nav-devotional--inline" : "fixed")}>
      {navItems.map((item) => {
        const isActive = location.pathname === item.path || (item.path === "/admin" && location.pathname.startsWith("/admin"));
        const Icon = item.icon;
        
        return (
          <Link 
            key={item.path} 
            to={item.path} 
            aria-label={item.badge > 0 ? `${item.label}, ${item.badge} novos avisos` : item.label}
            className={cn(
              "bottom-nav-devotional__item flex flex-col items-center gap-1 group relative",
              isActive && "bottom-nav-devotional__item--active"
            )}
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
              {/* Badge (Notifications or Requests) */}
              {item.badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-0.5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center border border-background font-bold animate-pulse">
                  {item.badge > 99 ? "99+" : item.badge}
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
