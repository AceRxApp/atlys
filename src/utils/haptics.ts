import { Capacitor } from '@capacitor/core';

/**
 * Fire-and-forget haptic feedback utilities.
 * Dynamically imports @capacitor/haptics so it tree-shakes on web.
 * All calls are no-ops when not running on a native platform.
 */

export function hapticImpact(style: 'Light' | 'Medium' | 'Heavy' = 'Medium') {
  if (!Capacitor.isNativePlatform()) return;
  import('@capacitor/haptics').then(({ Haptics, ImpactStyle }) =>
    Haptics.impact({ style: ImpactStyle[style] })
  ).catch(() => {});
}

export function hapticNotification(type: 'Success' | 'Warning' | 'Error' = 'Success') {
  if (!Capacitor.isNativePlatform()) return;
  import('@capacitor/haptics').then(({ Haptics, NotificationType }) =>
    Haptics.notification({ type: NotificationType[type] })
  ).catch(() => {});
}

export function hapticSelection() {
  if (!Capacitor.isNativePlatform()) return;
  import('@capacitor/haptics').then(({ Haptics }) =>
    Haptics.selectionChanged()
  ).catch(() => {});
}
