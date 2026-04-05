import { Link, useLocation } from "react-router-dom";
import { Home, Users, Wind, Mail, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFriends } from "@/hooks/use-friends";

const BottomNav = () => {
  const location = useLocation();
  const { requests } = useFriends();
  
  const navItems = [
    { path: "/", icon: Home, label: "Início" },
    { path: "/community", icon: Users, label: "Comunidade" },
    { path: "/tree", icon: Wind, label: "Fluxo" },
    { path: "/friends", icon: Users, label: "Amigos", badge: requests.length },
    { path: "/profile", icon: User, label: "Perfil" },
  ];

  return (
    <nav className="nav-blur fixed bottom-0 left-0 right-0 h-20 flex items-center justify-around px-4 pb-2 z-50">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
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
              {item.badge && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center border border-background font-bold animate-pulse">
                  {item.badge}
                </span>
              )}
            </div>
            <span className={cn(
              "text-[10px] font-bold transition-all",
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
