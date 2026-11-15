import type { CapacitorConfig } from '@capacitor/cli';
import { readFileSync } from 'node:fs';
const ota = JSON.parse(readFileSync('ota.config.json', 'utf8'));

const config: CapacitorConfig = {
  appId: 'com.amens.app',
  appName: 'Amens',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_notification',
    },
    LiveUpdate: {
      publicKey: ota.publicKey,
      readyTimeout: 15000,
      autoBlockRolledBackBundles: true,
      autoDeleteBundles: true,
      autoUpdateStrategy: 'none',
    },
    PushNotifications: {
      // Foreground notifications use the in-app toast and unread badge.
      // FCM still presents system notifications when Android backgrounds the app.
      presentationOptions: [],
    },
  },
};

export default config;
