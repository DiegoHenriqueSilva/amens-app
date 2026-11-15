import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { supabase } from "@/integrations/supabase/client";
import { NATIVE_AUTH_REDIRECT } from "./native-auth-callback";

export async function signInWithGoogle() {
  const native = Capacitor.getPlatform() === "android";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: native ? NATIVE_AUTH_REDIRECT : window.location.origin,
      skipBrowserRedirect: native,
    },
  });
  if (error) throw error;
  if (native) {
    if (!data.url) throw new Error("No Google authentication URL was returned.");
    await Browser.open({ url: data.url });
  }
}
