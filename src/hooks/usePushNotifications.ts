import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Registers for push notifications on native platforms (iOS/Android).
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

        // Listen for registration success
        PushNotifications.addListener('registration', (token) => {
          console.log('[Push] Registered with token:', token.value);
          // TODO: Send token to your backend for server-side push
        });

        // Listen for registration errors
        PushNotifications.addListener('registrationError', (error) => {
          console.error('[Push] Registration error:', error);
        });

        // Listen for incoming notifications while app is open
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('[Push] Notification received:', notification);
        });

        // Listen for notification tap (app was in background)
        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          console.log('[Push] Notification tapped:', action);
          // Navigate based on action.notification.data if needed
        });
      } catch (err) {
        console.error('[Push] Setup error:', err);
      }
    })();
  }, []);
}
