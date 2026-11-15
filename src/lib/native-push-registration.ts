type Listener = { remove: () => Promise<void> };
type Events = { registration: { value: string }; registrationError: { error: string } };
export interface NativePushRegistrar {
  addListener<K extends keyof Events>(event: K, callback: (event: Events[K]) => void): Promise<Listener>;
  register: () => Promise<void>;
}

export async function registerNativePush(plugin: NativePushRegistrar, saveToken: (token: string) => Promise<void>, timeoutMs = 20000): Promise<void> {
  const listeners: Listener[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  let settled = false;
  let finish: () => void;
  let fail: (error: Error) => void;
  const result = new Promise<void>((resolve, reject) => { finish = resolve; fail = reject; });
  void result.catch(() => undefined);
  try {
    listeners.push(await plugin.addListener("registration", event => {
      if (settled) return;
      settled = true;
      if (!event.value.trim()) { fail(new Error("Empty push token.")); return; }
      void saveToken(event.value).then(finish, fail);
    }));
    listeners.push(await plugin.addListener("registrationError", () => {
      if (settled) return;
      settled = true;
      fail(new Error("Push registration failed."));
    }));
    timer = setTimeout(() => {
      settled = true;
      fail(new Error("Push registration timed out."));
    }, timeoutMs);
    await Promise.race([plugin.register(), result]);
    await result;
  } finally {
    settled = true;
    if (timer) clearTimeout(timer);
    await Promise.allSettled(listeners.map(listener => listener.remove()));
  }
}
