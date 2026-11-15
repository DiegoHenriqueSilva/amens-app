import { useEffect } from "react";

declare global {
  interface Window {
    __amensWelcome?: boolean;
  }
}

/** Hides the critical HTML welcome splash after seven seconds, without allowing the app page to flash first. */
export function AppWelcomeSplash() {
  useEffect(() => {
    if (!window.__amensWelcome) return;
    const startedAt = Number(document.documentElement.dataset.amensWelcomeStartedAt) || Date.now();
    const remaining = Math.max(0, 7000 - (Date.now() - startedAt));
    const timer = window.setTimeout(() => {
      document.documentElement.classList.remove("amens-welcome");
    }, remaining);
    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
