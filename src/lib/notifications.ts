import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export const scheduleDailyPromiseNotification = async () => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }

    await LocalNotifications.cancel({ notifications: [{ id: 1 }] });

    await LocalNotifications.schedule({
      notifications: [
        {
          title: "Sua Divina Promessa de Hoje ✦",
          body: "Deus tem uma palavra especial para o seu coração. Clique para abrir seu Amém.",
          id: 1,
          schedule: {
            at: new Date(new Date().setHours(8, 0, 0, 0) + 24 * 60 * 60 * 1000),
            allowWhileIdle: true,
            every: 'day'
          },
          sound: undefined,
          attachments: undefined,
          actionTypeId: "",
          extra: null
        }
      ]
    });
  } catch (err) {
    console.warn("Local notifications not available or denied", err);
  }
};
