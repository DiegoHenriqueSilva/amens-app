import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { formatTimeAgo } from "@/lib/utils";
import { toast } from "sonner";

type Notification = { id: string; message: string; is_read: boolean; created_at: string; type?: string | null; prayer_request_id?: string | null };

export const NotificationBell = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data, error } = await supabase.from("notifications").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(20);
    if (error) { toast.error("Não foi possível carregar as notificações."); return; }
    setNotifications((data ?? []) as Notification[]);
  };

  useEffect(() => {
    void fetchNotifications();
    const channel = supabase.channel("notification-bell").on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (session && payload.new.user_id === session.user.id) setNotifications((previous) => [payload.new as Notification, ...previous].slice(0, 20));
      });
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, []);

  const openNotification = async (notification: Notification) => {
    if (!notification.is_read) {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", notification.id);
      if (error) toast.error("Não foi possível marcar a notificação como lida.");
      else { setNotifications((previous) => previous.map((item) => item.id === notification.id ? { ...item, is_read: true } : item)); window.dispatchEvent(new Event("notifications-read")); }
    }
    setOpen(false);
    if (notification.type === "daily_gospel") navigate("/daily-gospel");
    else if (notification.prayer_request_id) navigate(`/pray?id=${notification.prayer_request_id}`);
    else if (notification.message.toLowerCase().includes("interceder")) navigate("/pray");
  };

  const unreadCount = notifications.filter((notification) => !notification.is_read).length;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><Button variant="ghost" size="icon" className="relative shrink-0" aria-label="Abrir notificações" title="Abrir notificações"><Bell className="w-5 h-5" aria-hidden="true" />{unreadCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">{unreadCount > 9 ? "9+" : unreadCount}</span>}</Button></PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border"><div className="flex items-center justify-between gap-2"><h4 className="font-semibold text-sm text-foreground">Notificações</h4><button type="button" className="text-xs text-primary hover:underline" onClick={() => { setOpen(false); navigate("/messages"); }}>Ver todas</button></div></div>
        <div className="max-h-80 overflow-y-auto">{notifications.length === 0 ? <p className="p-4 text-sm text-muted-foreground text-center">Nenhuma notificação</p> : notifications.map((notification) => <button type="button" key={notification.id} onClick={() => void openNotification(notification)} className={`w-full text-left p-3 border-b border-border last:border-0 ${!notification.is_read ? "bg-primary/5" : ""}`}><p className="text-sm text-foreground">{notification.message}</p><p className="text-xs text-muted-foreground mt-1">{formatTimeAgo(notification.created_at)}</p></button>)}</div>
      </PopoverContent>
    </Popover>
  );
};
