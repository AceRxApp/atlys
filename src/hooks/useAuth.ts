import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { authSignUp, authSignIn, authSignOut, authGetSession, authOnStateChange, authResetPassword, authResendVerification } from '../supabase';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

/** Map Supabase error messages to friendlier text */
function friendlyError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes('rate limit') || lower.includes('too many requests') || lower.includes('email rate limit'))
    return 'Too many attempts — please wait a few minutes and try again.';
  if (lower.includes('email not confirmed'))
    return 'Your email hasn\'t been verified yet. Check your inbox (and spam folder) for the confirmation link.';
  if (lower.includes('invalid login'))
    return 'Incorrect email or password. Please try again.';
  if (lower.includes('user already registered'))
    return 'An account with this email already exists. Try signing in instead.';
  if (lower.includes('signup is not allowed') || lower.includes('signups not allowed'))
    return 'Sign-ups are currently paused. Please try again later.';
  if (lower.includes('unable to validate email'))
    return 'We couldn\'t verify that email address. Please check it and try again.';
  if (lower.includes('password') && lower.includes('weak'))
    return 'Password is too weak. Use a mix of letters, numbers, and symbols.';
  if (lower.includes('network') || lower.includes('fetch'))
    return 'Network error — please check your connection and try again.';
  return msg;
}

export function useAuth(showToast: (msg: string) => void, onSignOut: () => void) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authScreen, setAuthScreen] = useState<'signin' | 'signup' | 'reset' | 'verify'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Check session on mount + subscribe to auth state changes
  useEffect(() => {
    authGetSession()
      .then(session => { setUser(session?.user ?? null); })
      .catch(() => { /* session check failed — continue without auth */ })
      .finally(() => setAuthLoading(false));
    const { data: { subscription } } = authOnStateChange(session => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async () => {
    if (!authEmail.trim() || !authPassword) {
      setAuthError('Please enter your email and password');
      return;
    }
    if (!EMAIL_REGEX.test(authEmail.trim())) {
      setAuthError('Please enter a valid email address');
      return;
    }
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      const { error } = await authSignIn(authEmail.trim(), authPassword);
      if (error) setAuthError(friendlyError(error.message));
    } catch {
      setAuthError('Network error — please check your connection');
    }
    setAuthSubmitting(false);
  };

  const handleSignUp = async () => {
    if (!acceptedTerms) {
      setAuthError('Please accept the Terms of Service and Privacy Policy');
      return;
    }
    if (!authEmail.trim() || !authPassword) {
      setAuthError('Please enter your email and password');
      return;
    }
    if (!EMAIL_REGEX.test(authEmail.trim())) {
      setAuthError('Please enter a valid email address');
      return;
    }
    if (authPassword.length < MIN_PASSWORD_LENGTH) {
      setAuthError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (authPassword !== authConfirmPassword) {
      setAuthError('Passwords do not match');
      return;
    }
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      const { data, error } = await authSignUp(authEmail.trim(), authPassword, authName.trim() || undefined);
      if (error) {
        setAuthError(friendlyError(error.message));
      } else if (data.session) {
        // Auto-signed in (email confirmation disabled in Supabase)
      } else {
        // Email confirmation required — show verification screen
        setAuthScreen('verify');
      }
    } catch {
      setAuthError('Network error — please check your connection');
    }
    setAuthSubmitting(false);
  };

  const handleResendVerification = async () => {
    if (!authEmail.trim()) {
      setAuthError('Please enter your email address');
      return;
    }
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      const { error } = await authResendVerification(authEmail.trim());
      if (error) {
        setAuthError(friendlyError(error.message));
      } else {
        showToast('Verification email sent! Check your inbox.');
      }
    } catch {
      setAuthError('Network error — please check your connection');
    }
    setAuthSubmitting(false);
  };

  const handleResetPassword = async () => {
    if (!authEmail.trim()) {
      setAuthError('Please enter your email address');
      return;
    }
    if (!EMAIL_REGEX.test(authEmail.trim())) {
      setAuthError('Please enter a valid email address');
      return;
    }
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      const { error } = await authResetPassword(authEmail.trim());
      if (error) {
        setAuthError(friendlyError(error.message));
      } else {
        showToast('Password reset email sent! Check your inbox.');
        setAuthScreen('signin');
      }
    } catch {
      setAuthError('Network error — please check your connection');
    }
    setAuthSubmitting(false);
  };

  const handleSignOut = async () => {
    try {
      await authSignOut();
    } catch { /* continue signing out locally */ }
    setUser(null);
    onSignOut();
  };

  return {
    user, authLoading,
    authScreen, setAuthScreen, authEmail, setAuthEmail,
    authPassword, setAuthPassword, authConfirmPassword, setAuthConfirmPassword, authName, setAuthName,
    authError, authSubmitting, acceptedTerms, setAcceptedTerms,
    handleSignIn, handleSignUp, handleSignOut, handleResetPassword,
    handleResendVerification,
  };
}
