import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { authSignUp, authSignIn, authSignOut, authGetSession, authOnStateChange } from '../supabase';

export function useAuth(showToast: (msg: string) => void, onSignOut: () => void) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authScreen, setAuthScreen] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Check session on mount + subscribe to auth state changes
  useEffect(() => {
    authGetSession().then(session => { setUser(session?.user ?? null); setAuthLoading(false); });
    const { data: { subscription } } = authOnStateChange(session => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setAuthError(null);
    setAuthSubmitting(true);
    const { error } = await authSignIn(authEmail, authPassword);
    if (error) setAuthError(error.message);
    setAuthSubmitting(false);
  };

  const handleSignUp = async () => {
    setAuthError(null);
    setAuthSubmitting(true);
    const { data, error } = await authSignUp(authEmail, authPassword, authName || undefined);
    if (error) {
      setAuthError(error.message);
    } else if (data.session) {
      // Auto-signed in
    } else {
      showToast('Check your email to confirm your account');
      setAuthScreen('signin');
    }
    setAuthSubmitting(false);
  };

  const handleSignOut = async () => {
    await authSignOut();
    setUser(null);
    onSignOut();
  };

  return {
    user, authLoading,
    authScreen, setAuthScreen, authEmail, setAuthEmail,
    authPassword, setAuthPassword, authName, setAuthName,
    authError, authSubmitting,
    handleSignIn, handleSignUp, handleSignOut,
  };
}
