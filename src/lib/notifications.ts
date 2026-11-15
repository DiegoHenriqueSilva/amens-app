import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { NOVENAS } from '@/data/novenas';

const NOVENA_NOTIFICATION_OFFSET = 10_000;

type SavedNovenaState = {
  reminderTime: string | null;
  isCompleted: boolean;
  currentDay: number;
};

export const getNovenaReminderId = (novenaId: string) => {
  let hash = 0;
  for (const character of novenaId) hash = ((hash * 31) + character.charCodeAt(0)) >>> 0;
  return NOVENA_NOTIFICATION_OFFSET + (hash % 900_000);
};

const tomorrowAt = (time: string) => {
  const [hour, minute] = time.split(':').map(Number);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error('Invalid novena reminder time.');
  }
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(hour, minute, 0, 0);
  return date;
};

export const scheduleNovenaReminder = async ({ novenaId, novenaName, time, nextDay }: {
  novenaId: string;
  novenaName: string;
  time: string;
  nextDay: number;
}) => {
  if (!Capacitor.isNativePlatform()) return false;
  const permission = await LocalNotifications.checkPermissions();
  if (permission.display !== 'granted') return false;

  const id = getNovenaReminderId(novenaId);
  await LocalNotifications.cancel({ notifications: [{ id }] });
  await LocalNotifications.schedule({
    notifications: [{
      id,
      title: `Sua novena continua: ${novenaName}`,
      body: `Está na hora de rezar o Dia ${nextDay} da sua novena. 🙏`,
      smallIcon: 'ic_notification',
      largeIcon: 'ic_amens_large',
      schedule: { at: tomorrowAt(time), every: 'day', allowWhileIdle: true },
      extra: { url: `/novena/${novenaId}` },
    }],
  });
  return true;
};

export const cancelNovenaReminder = async (novenaId: string) => {
  if (!Capacitor.isNativePlatform()) return;
  await LocalNotifications.cancel({ notifications: [{ id: getNovenaReminderId(novenaId) }] });
};

/** Restores reminders that were saved before notification permission was granted. */
export const syncActiveNovenaReminders = async () => {
  if (!Capacitor.isNativePlatform()) return;
  const permission = await LocalNotifications.checkPermissions();
  if (permission.display !== 'granted') return;

  await Promise.all(NOVENAS.map(async novena => {
    try {
      const saved = localStorage.getItem(`novena_state_${novena.id}`);
      if (!saved) return;
      const state = JSON.parse(saved) as SavedNovenaState;
      if (!state.reminderTime || state.isCompleted) return;
      await scheduleNovenaReminder({
        novenaId: novena.id,
        novenaName: novena.name,
        time: state.reminderTime,
        nextDay: Math.min(9, Math.max(1, state.currentDay)),
      });
    } catch (error) {
      console.warn('Could not restore novena reminder.', error);
    }
  }));
};

/** Removes the legacy 08:00 local promise reminder to prevent a duplicate morning alert. */
export const scheduleDailyPromiseNotification = async () => {
  try {
    if (!Capacitor.isNativePlatform()) return;
    const permission = await LocalNotifications.checkPermissions();
    if (permission.display !== 'granted') return;
    await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
  } catch (error) {
    console.warn('Could not remove the legacy daily notification.', error);
  }
};
