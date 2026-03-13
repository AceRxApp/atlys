import { useState, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

const STORAGE_KEY = 'nxstops_notification_ids';

function getStoredIds(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function storeIds(ids: number[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
}

function appendId(id: number) {
  const ids = getStoredIds();
  ids.push(id);
  storeIds(ids);
}

function clearStoredIds() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

function hashStringToId(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// Access Capacitor LocalNotifications plugin via the global registry
// This avoids a direct import that would fail if the package isn't installed
function getLocalNotificationsPlugin(): any | null {
  try {
    if (!Capacitor.isNativePlatform()) return null;
    // Capacitor plugins register on (Capacitor as any).Plugins
    const plugins = (Capacitor as any).Plugins;
    return plugins?.LocalNotifications || null;
  } catch { return null; }
}

export function useTripNotifications() {
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const plugin = getLocalNotificationsPlugin();
        if (plugin) {
          const result = await plugin.checkPermissions();
          setHasPermission(result.display === 'granted');
        } else if (typeof Notification !== 'undefined') {
          setHasPermission(Notification.permission === 'granted');
        }
      } catch { /* ignore */ }
    })();
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const plugin = getLocalNotificationsPlugin();
      if (plugin) {
        const result = await plugin.requestPermissions();
        const granted = result.display === 'granted';
        setHasPermission(granted);
        return granted;
      }
      if (typeof Notification !== 'undefined') {
        const result = await Notification.requestPermission();
        const granted = result === 'granted';
        setHasPermission(granted);
        return granted;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const scheduleTripReminder = useCallback(
    async (tripDate: string, cityName: string, stopsCount: number) => {
      const scheduleAt = new Date(`${tripDate}T08:00:00`);
      if (scheduleAt.getTime() <= Date.now()) return;

      const notificationId = hashStringToId(`nxstops_trip_morning_${tripDate}_${cityName}`);
      const title = `Trip day: ${cityName}`;
      const body = `You have ${stopsCount} stop${stopsCount === 1 ? '' : 's'} planned today. Have a great trip!`;

      try {
        const plugin = getLocalNotificationsPlugin();
        if (plugin) {
          await plugin.schedule({
            notifications: [{ id: notificationId, title, body, schedule: { at: scheduleAt } }],
          });
          appendId(notificationId);
        } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          const delay = scheduleAt.getTime() - Date.now();
          if (delay > 0) {
            const timerId = window.setTimeout(() => { new Notification(title, { body }); }, delay);
            appendId(timerId);
          }
        }
      } catch { /* ignore */ }
    },
    [],
  );

  const scheduleEveningReminder = useCallback(
    async (tripDate: string, cityName: string) => {
      const tripDateObj = new Date(`${tripDate}T00:00:00`);
      const eveningBefore = new Date(tripDateObj);
      eveningBefore.setDate(eveningBefore.getDate() - 1);
      eveningBefore.setHours(19, 0, 0, 0);

      if (eveningBefore.getTime() <= Date.now()) return;

      const notificationId = hashStringToId(`nxstops_trip_evening_${tripDate}_${cityName}`);
      const title = 'Trip starts tomorrow!';
      const body = `Get ready for ${cityName}. Check your itinerary and pack your bags!`;

      try {
        const plugin = getLocalNotificationsPlugin();
        if (plugin) {
          await plugin.schedule({
            notifications: [{ id: notificationId, title, body, schedule: { at: eveningBefore } }],
          });
          appendId(notificationId);
        } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          const delay = eveningBefore.getTime() - Date.now();
          if (delay > 0) {
            const timerId = window.setTimeout(() => { new Notification(title, { body }); }, delay);
            appendId(timerId);
          }
        }
      } catch { /* ignore */ }
    },
    [],
  );

  const cancelAllReminders = useCallback(async () => {
    const ids = getStoredIds();
    try {
      const plugin = getLocalNotificationsPlugin();
      if (plugin && ids.length > 0) {
        await plugin.cancel({ notifications: ids.map((id: number) => ({ id })) });
      } else {
        for (const id of ids) window.clearTimeout(id);
      }
    } catch { /* ignore */ }
    clearStoredIds();
  }, []);

  return { scheduleTripReminder, scheduleEveningReminder, cancelAllReminders, requestPermission, hasPermission };
}
