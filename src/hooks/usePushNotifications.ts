import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { savePushSubscription } from '../supabase';

/**
 * Registers for push notifications on native platforms (iOS/Android).
 * Saves the device token to the backend for server-side push.
 * No-op on web — the service worker handles web push separately.
 */
export function usePushNotifications() {
  const registered = useRef(false);

  useEffect(() => {
    if (registered.current) return;
    if (!Capacitor.isNativePlatform()) return;

    registered.current = true;

    (async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');

        // Request permission
        const permResult = await PushNotifications.requestPermissions();
        if (permResult.receive !== 'granted') return;

        // Register with APNS/FCM
        await PushNotifications.register();

        // Listen for registration success — save token to backend
        PushNotifications.addListener('registration', async (token) => {
          try {
            const sub = { endpoint: token.value, toJSON: () => ({ keys: { p256dh: '', auth: '' } }) } as unknown as PushSubscription;
            await savePushSubscription(sub);
          } catch { /* best effort */ }
        });

        // Listen for registration errors
        PushNotifications.addListener('registrationError', () => {
          // Registration failed — user may not have granted permission
        });

        // Listen for incoming notifications while app is open
        PushNotifications.addListener('pushNotificationReceived', () => {
          // Notification received in foreground — handled by OS
        });

        // Listen for notification tap (app was in background)
        PushNotifications.addListener('pushNotificationActionPerformed', () => {
          // User tapped notification — can navigate based on data if needed
        });
      } catch {
        // Push setup failed — not critical
      }
    })();
  }, []);
}
