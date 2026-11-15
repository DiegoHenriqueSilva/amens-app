import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";
import { registerNativePush } from "./native-push-registration";
import { toast } from "sonner";
import { refreshAltar } from '@/features/altar/events';

export type NotificationPermissionStatus = "granted" | "denied" | "prompt" | "unsupported" | "unavailable";
const DEVICE_KEY = "amens_push_device_id";
let registration: Promise<void> | undefined;
let registrationUserId: string | undefined;
let actionListener: Promise<unknown> | undefined;

export function isPushConfigured() {
  return Capacitor.isNativePlatform()
    ? Capacitor.getPlatform() === "android" && import.meta.env.VITE_ANDROID_PUSH_ENABLED === "true"
    : Boolean(import.meta.env.VITE_VAPID_PUBLIC_KEY);
}

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, id); }
  return id;
}

export async function getNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (!isPushConfigured()) return "unavailable";
  if (Capacitor.isNativePlatform()) {
    const result = await PushNotifications.checkPermissions();
    return result.receive === "prompt-with-rationale" ? "prompt" : result.receive;
  }
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  return Notification.permission === "default" ? "prompt" : Notification.permission;
}

function ensureActionListener() {
  actionListener ??= (async () => {
    await PushNotifications.createChannel({ id: "amens-notifications", name: "Avisos do Amens", importance: 4, visibility: 0, sound: "default" });
    return Promise.all([PushNotifications.addListener("pushNotificationActionPerformed", async action => {
      const path = action.notification.data?.url;
      const notificationId = action.notification.data?.notification_id;
      if (action.notification.data?.notification_type === "daily_gospel"
          && typeof notificationId === "string"
          && /^[0-9a-f-]{36}$/i.test(notificationId)) {
        await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId);
        window.dispatchEvent(new Event("notifications-read"));
      }
      if (typeof path === "string" && path.startsWith("/") && !path.startsWith("//") && !path.includes("\\")) window.location.assign(path);
    }), PushNotifications.addListener("pushNotificationReceived", notification => {
      const path = typeof notification.data?.url === "string" && notification.data.url.startsWith("/")
        ? notification.data.url
        : "/messages";
      window.dispatchEvent(new Event("notifications-received"));
      if (path !== "/messages") {
        toast(notification.body || "Você tem uma nova notificação no Améns.", {
          action: { label: "Abrir", onClick: () => window.location.assign(path) },
        });
        return;
      }
      toast("Você tem uma nova notificação no Amens.", { action: { label: "Abrir", onClick: () => window.location.assign("/messages") } });
    })]);
  })().catch(error => { actionListener = undefined; throw error; });
  return actionListener;
}

async function registerCurrentDevice() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Sign in before enabling push notifications.");
  if (registration) {
    if (registrationUserId === session.user.id) return registration;
    await registration.catch(() => undefined);
    return registerCurrentDevice();
  }
  registrationUserId = session.user.id;
  registration = (async () => {
    if (Capacitor.isNativePlatform()) {
      await ensureActionListener();
      await registerNativePush(PushNotifications, async token => {
        const { error } = await supabase.from("push_devices" as never).upsert({
          user_id: session.user.id, device_id: getDeviceId(), platform: "android", token,
          updated_at: new Date().toISOString(),
        } as never, { onConflict: "user_id,device_id,platform" });
        if (error) throw error;
      });
    } else {
      const worker = await navigator.serviceWorker.register("/push-sw.js");
      await navigator.serviceWorker.ready;
      const existing = await worker.pushManager.getSubscription();
      const subscription = existing ?? await worker.pushManager.subscribe({
        userVisibleOnly: true, applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
      });
      const { error } = await supabase.from("push_subscriptions" as never).upsert({
        user_id: session.user.id, platform: "web", subscription: subscription.toJSON(), updated_at: new Date().toISOString(),
      } as never, { onConflict: "user_id,platform" });
      if (error) throw error;
    }
  })();
  try { await registration; } finally { registration = undefined; registrationUserId = undefined; }
}

export async function requestAndRegisterPush(): Promise<NotificationPermissionStatus> {
  const permission = await getNotificationPermission();
  if (permission === "unavailable" || permission === "unsupported") return permission;
  const result = Capacitor.isNativePlatform()
    ? (await PushNotifications.requestPermissions()).receive
    : await Notification.requestPermission();
    if (result === "granted") { await registerCurrentDevice(); refreshAltar(); return "granted"; }
  return result === "denied" ? "denied" : "prompt";
}

export async function initializePush() {
  if (Capacitor.isNativePlatform() && isPushConfigured()) await ensureActionListener();
  if (await getNotificationPermission() === "granted") await registerCurrentDevice();
}

export async function getPushRegistrationStatus(): Promise<NotificationPermissionStatus> {
  const permission = await getNotificationPermission();
  if (permission !== "granted") return permission;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return "prompt";
  if (!Capacitor.isNativePlatform()) return permission;
  const { data, error } = await supabase.from("push_devices" as never).select("id")
    .eq("user_id", session.user.id).eq("device_id", getDeviceId()).eq("platform", "android").maybeSingle();
  if (error) throw error;
  return data ? "granted" : "prompt";
}

export async function unregisterCurrentPushDevice() {
  await registration?.catch(() => undefined);
  if (!Capacitor.isNativePlatform()) return;
  const id = localStorage.getItem(DEVICE_KEY);
  if (!id) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  const { error } = await supabase.from("push_devices" as never).delete().eq("user_id", session.user.id).eq("device_id", id);
  if (error) throw error;
}

export async function signOutWithPushCleanup() {
  try { await unregisterCurrentPushDevice(); } catch { console.warn("Push device cleanup will need retrying."); }
  return supabase.auth.signOut();
}
