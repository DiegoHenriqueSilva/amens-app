import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

type DonationNotification = {
  id: string;
  message: string;
  type: string | null;
};

const seenKey = (id: string) => `amens:donation-confirmation:${id}`;

export function DonationConfirmationToast() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const show = (notification: DonationNotification) => {
      if (notification.type !== "donation_confirmed") return;
      try {
        if (sessionStorage.getItem(seenKey(notification.id))) return;
        sessionStorage.setItem(seenKey(notification.id), "1");
      } catch { /* The toast can still be shown when storage is unavailable. */ }
      toast.success(notification.message, {
        duration: 9000,
        action: { label: "Ver mensagens", onClick: () => navigate("/messages") },
      });
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["my-insignias"] }),
        queryClient.invalidateQueries({ queryKey: ["public-insignias"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-supporter"] }),
      ]);
      window.dispatchEvent(new Event("notifications-received"));
    };

    const channel = supabase.channel(`donation-confirmation:${userId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      }, payload => show(payload.new as DonationNotification))
      .subscribe(status => {
        if (status !== "SUBSCRIBED") return;
        void supabase.from("notifications")
          .select("id,message,type")
          .eq("user_id", userId)
          .eq("type", "donation_confirmed")
          .eq("is_read", false)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
          .then(({ data }) => { if (data) show(data as DonationNotification); });
      });

    return () => { void supabase.removeChannel(channel); };
  }, [navigate, queryClient, userId]);

  return null;
}
