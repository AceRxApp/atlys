import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

const BIOMETRIC_ENABLED_KEY = 'nxstops_biometric_enabled';
const CREDENTIALS_SERVER = 'com.nave.nxstops';

interface BiometricState {
  /** Whether the device supports biometrics (Face ID / Touch ID / Fingerprint) */
  isAvailable: boolean;
  /** Whether the user has opted in to biometric login */
  isEnabled: boolean;
  /** The type of biometric available (e.g. "Face ID", "Touch ID", "Fingerprint") */
  biometricType: string;
}

/**
 * Hook for biometric authentication (Face ID / Touch ID).
 * Stores credentials securely in the device keychain.
 */
export function useBiometricAuth() {
  const [state, setState] = useState<BiometricState>({
    isAvailable: false,
    isEnabled: false,
    biometricType: '',
  });

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    checkAvailability();
  }, []);

  async function checkAvailability() {
    try {
      const { NativeBiometric } = await import('capacitor-native-biometric');
      const result = await NativeBiometric.isAvailable();

      const typeNames: Record<number, string> = {
        1: 'Touch ID',
        2: 'Face ID',
        3: 'Fingerprint',
        4: 'Face Authentication',
        5: 'Iris Authentication',
      };

      setState({
        isAvailable: result.isAvailable,
        isEnabled: localStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true',
        biometricType: typeNames[result.biometryType] || 'Biometric',
      });
    } catch {
      // Plugin not available or device doesn't support biometrics
    }
  }

  /** Save credentials to keychain and enable biometric login */
  const enableBiometric = useCallback(async (email: string, password: string): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return false;

    try {
      const { NativeBiometric } = await import('capacitor-native-biometric');

      // Verify the user can authenticate first
      await NativeBiometric.verifyIdentity({
        reason: 'Enable biometric login for NxStops',
        title: 'Enable Biometric Login',
      });

      // Store credentials securely in the device keychain
      await NativeBiometric.setCredentials({
        username: email,
        password,
        server: CREDENTIALS_SERVER,
      });

      localStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
      setState(prev => ({ ...prev, isEnabled: true }));
      return true;
    } catch {
      return false;
    }
  }, []);

  /** Authenticate with biometrics and retrieve stored credentials */
  const authenticateWithBiometric = useCallback(async (): Promise<{ email: string; password: string } | null> => {
    if (!Capacitor.isNativePlatform()) return null;

    try {
      const { NativeBiometric } = await import('capacitor-native-biometric');

      await NativeBiometric.verifyIdentity({
        reason: 'Log in to NxStops',
        title: 'Login',
      });

      const credentials = await NativeBiometric.getCredentials({
        server: CREDENTIALS_SERVER,
      });

      return { email: credentials.username, password: credentials.password };
    } catch {
      return null;
    }
  }, []);

  /** Disable biometric login and remove stored credentials */
  const disableBiometric = useCallback(async (): Promise<void> => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const { NativeBiometric } = await import('capacitor-native-biometric');
      await NativeBiometric.deleteCredentials({ server: CREDENTIALS_SERVER });
    } catch {
      // Credentials may not exist, that's fine
    }

    localStorage.removeItem(BIOMETRIC_ENABLED_KEY);
    setState(prev => ({ ...prev, isEnabled: false }));
  }, []);

  return {
    ...state,
    enableBiometric,
    authenticateWithBiometric,
    disableBiometric,
  };
}
