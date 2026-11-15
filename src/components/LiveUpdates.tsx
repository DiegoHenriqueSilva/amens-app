import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { LiveUpdate } from "@capawesome/capacitor-live-update";
import { toast } from "sonner";
import ota from "../../ota.config.json";
import runtime from "../../ota.runtime.json";
import { shouldDownloadRelease, verifyOtaManifest } from "@/lib/ota-manifest";

const builtinRelease = import.meta.env.VITE_APP_RELEASE_ID || "builtin";
const builtinSequence = Number(import.meta.env.VITE_APP_RELEASE_SEQUENCE || 0);
const STORAGE_KEY = `amens_ota_highest_${ota.compatibilityId}`;

export function LiveUpdates() {
  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") return;
    let stopped = false, busy = false, backgrounded = false;
    const reportFailure = () => console.warn("Automatic update check is temporarily unavailable; keeping the installed version.");
    const highest = () => {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
        if (saved && Number.isSafeInteger(saved.sequence) && saved.sequence >= builtinSequence && typeof saved.releaseId === "string") return saved;
      } catch { /* Ignore damaged metadata; native signature checks still apply. */ }
      return { sequence: builtinSequence, releaseId: builtinRelease };
    };
    const check = async () => {
      if (stopped || busy || !navigator.onLine || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const native = await LiveUpdate.getVersionCode();
        if (Number(native.versionCode) !== ota.nativeVersionCode) return;
        const response = await fetch(`${ota.origin}/app-updates/${ota.compatibilityId}/latest.json`, {
          cache: "no-store", credentials: "omit", signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) return;
        const text = await response.text();
        if (text.length > 16384) throw new Error("OTA manifest is too large.");
        const release = await verifyOtaManifest(JSON.parse(text), { ...ota, fingerprint: runtime.fingerprint });
        const [current, next, blocked] = await Promise.all([LiveUpdate.getCurrentBundle(), LiveUpdate.getNextBundle(), LiveUpdate.getBlockedBundles()]);
        const saved = highest();
        if (stopped || !shouldDownloadRelease(release, { current: current.bundleId || builtinRelease, next: next.bundleId,
          blocked: blocked.bundleIds, highestSequence: saved.sequence, highestRelease: saved.releaseId })) return;
        const downloaded = await LiveUpdate.getDownloadedBundles();
        if (!downloaded.bundleIds.includes(release.releaseId)) {
          await LiveUpdate.downloadBundle({ bundleId: release.releaseId, url: release.url,
            checksum: release.checksum, signature: release.zipSignature });
        }
        if (stopped) return;
        await LiveUpdate.setNextBundle({ bundleId: release.releaseId });
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ sequence: release.sequence, releaseId: release.releaseId }));
        toast("Atualização pronta. Ela será aplicada ao reabrir o Amens.");
      } catch { reportFailure(); } finally { busy = false; }
    };
    const resume = async () => {
      // Only reload a warm app on its home screen, with no form/dialog in progress.
      if (backgrounded && !busy && window.location.pathname === "/" && !document.querySelector('input:focus, textarea:focus, [role="dialog"], [contenteditable="true"]:focus')) {
        const [current, next] = await Promise.all([LiveUpdate.getCurrentBundle(), LiveUpdate.getNextBundle()]);
        if (!stopped && next.bundleId && next.bundleId !== current.bundleId) { await LiveUpdate.reload(); return; }
      }
      backgrounded = false;
      await check();
    };
    // Confirm React mounted before any network download can consume the rollback timeout.
    const initialized = LiveUpdate.ready().then(() => check()).catch(reportFailure);
    const listener = App.addListener("appStateChange", ({ isActive }) => {
      if (!isActive) { backgrounded = true; return; }
      void initialized.then(resume).catch(reportFailure);
    });
    const online = () => { void initialized.then(check); };
    window.addEventListener("online", online);
    const interval = window.setInterval(online, 15 * 60 * 1000);
    return () => {
      stopped = true;
      window.clearInterval(interval);
      window.removeEventListener("online", online);
      void listener.then(handle => handle.remove());
    };
  }, []);
  return null;
}
