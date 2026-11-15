import { useEffect, useRef, useState } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { createUnreadCountLoader } from "@/lib/unread-count-loader";

export function useUnreadNotifications(pathname: string) {
  const [userId, setUserId] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const refreshRef = useRef(() => {});

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const loader = createUnreadCountLoader(async id => {
      const { count, error } = await supabase.from("notifications")
        .select("id", { count: "exact", head: true }).eq("user_id", id).eq("is_read", false);
      return error ? null : count;
    }, setCount);
    loader.setUser(userId);
    if (!userId) { refreshRef.current = () => {}; return () => loader.dispose(); }

    const refresh = () => { void loader.refresh(); };
    const refreshWhenVisible = () => { if (document.visibilityState === "visible" && navigator.onLine) refresh(); };
    refreshRef.current = refresh;
    refresh();
    const channel = supabase.channel(`unread-notifications:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, refresh)
      .subscribe(status => { if (status === "SUBSCRIBED") refresh(); });
    window.addEventListener("notifications-read", refresh);
    window.addEventListener("notifications-received", refresh);
    window.addEventListener("focus", refreshWhenVisible);
    window.addEventListener("online", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    const nativeListener = Capacitor.isNativePlatform()
      ? App.addListener("appStateChange", ({ isActive }) => { if (isActive) refresh(); })
      : null;
    // Recover counts after missed events or a temporary Realtime disconnection.
    const interval = window.setInterval(refreshWhenVisible, 20000);
    return () => {
      loader.dispose();
      refreshRef.current = () => {};
      window.clearInterval(interval);
      window.removeEventListener("notifications-read", refresh);
      window.removeEventListener("notifications-received", refresh);
      window.removeEventListener("focus", refreshWhenVisible);
      window.removeEventListener("online", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      void nativeListener?.then(handle => handle.remove());
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => { refreshRef.current(); }, [pathname]);
  return count;
}
