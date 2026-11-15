import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { parseNativeAuthCallback } from "@/lib/native-auth-callback";

// The OS may deliver the same callback through both launch URL and appUrlOpen.
const handledCodes = new Set<string>();

export function NativeAuthListener() {
  const navigate = useNavigate();

  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") return;
    let disposed = false;
    const handleUrl = async (value: string) => {
      if (disposed) return;
      try {
        const paymentUrl = new URL(value);
        const payment = paymentUrl.searchParams.get("payment");
        if (paymentUrl.protocol === "com.amens.app:" && paymentUrl.hostname === "auth"
          && paymentUrl.pathname === "/callback" && ["approved", "pending", "failure"].includes(payment || "")) {
          await Browser.close().catch(() => undefined);
          if (!disposed) navigate(`/donate?result=${payment}`, { replace: true });
          return;
        }
      } catch { /* Ignore unrelated app links. */ }
      const callback = parseNativeAuthCallback(value);
      if (!callback) return;
      if (callback.error || !callback.code) {
        toast.error("O login não foi concluído. Tente entrar com Google novamente.");
        return;
      }
      if (handledCodes.has(callback.code)) return;
      handledCodes.add(callback.code);
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(callback.code);
        if (error) throw error;
        if (!disposed) navigate("/auth", { replace: true });
      } catch {
        if (!disposed) toast.error("Não foi possível concluir o login. Abra o Google novamente pelo Amens.");
      } finally {
        // Android closes its custom tab when the callback brings the app forward.
        await Browser.close().catch(() => undefined);
      }
    };
    const listener = App.addListener("appUrlOpen", ({ url }) => { void handleUrl(url); });
    void App.getLaunchUrl().then(result => {
      if (result?.url) void handleUrl(result.url);
    }).catch(() => {
      if (!disposed) toast.error("Não foi possível verificar o retorno do login.");
    });
    return () => {
      disposed = true;
      void listener.then(handle => handle.remove());
    };
  }, [navigate]);

  return null;
}
