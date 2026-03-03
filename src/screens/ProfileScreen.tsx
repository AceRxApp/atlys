import { useCallback, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useModalA11y } from '../hooks/useModalA11y';
import { useBiometricAuth } from '../hooks/useBiometricAuth';
import { uploadAvatar, deleteAccount, authSignInWithGoogle } from '../supabase';
import { useSubscription } from '../hooks/useSubscription';
import { API_URL } from '../utils/api';

/** Ensure photo URLs are absolute (fixes relative URLs on native/iOS) */
const fixPhotoUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('/api/')) return `${API_URL}${url}`;
  return url;
};

export default function ProfileScreen() {
  const {
    user,
    setShowProfile,
    savedPlaces,
    setSelectedPlace,
    setScreen,
    tripDays,
    showToast,
    useCelsius, setUseCelsius,
    tripHistory, clearTripHistory,
    // Auth
    authScreen, setAuthScreen,
    authEmail, setAuthEmail,
    authPassword, setAuthPassword, authConfirmPassword, setAuthConfirmPassword,
    authName, setAuthName,
    authError, authSubmitting,
    acceptedTerms, setAcceptedTerms,
    handleSignIn, handleSignUp, handleSignOut, handleResetPassword, handleResendVerification,
    avatarUrl, setAvatarUrl,
  } = useApp();
  const { theme, themePreference, setThemePreference } = useTheme();
  const closeProfile = useCallback(() => setShowProfile(false), [setShowProfile]);
  const modalRef = useModalA11y(true, closeProfile);
  const { isAvailable: biometricAvailable, isEnabled: biometricEnabled, biometricType, enableBiometric, authenticateWithBiometric, disableBiometric } = useBiometricAuth();

  const fullName = (user?.user_metadata?.full_name as string) || user?.email || 'Traveler';
  const profileTotalStops = Object.values(tripDays).reduce((sum, stops) => sum + stops.length, 0);
  const profileDayCount = Object.keys(tripDays).length;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [showBiometricPasswordPrompt, setShowBiometricPasswordPrompt] = useState(false);
  const [biometricPassword, setBiometricPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const subscription = useSubscription(user);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingPlan, setBillingPlan] = useState<'monthly' | 'yearly'>('monthly');

  const handleAvatarChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5MB');
      return;
    }

    setAvatarUploading(true);
    const { url, error } = await uploadAvatar(user.id, file);
    setAvatarUploading(false);

    if (error || !url) {
      showToast('Failed to upload photo — try again');
    } else {
      setAvatarUrl(url);
      showToast('Profile photo updated!');
    }

    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [user, showToast, setAvatarUrl]);

  const removeAvatar = useCallback(() => {
    try { localStorage.removeItem('nxstops_avatar_url'); } catch { /* ignore */ }
    // Also clear from Supabase so it doesn't restore on reinstall
    import('../supabase').then(({ supabase }) => {
      supabase.auth.updateUser({ data: { avatar_url: null } }).catch(() => {});
    });
    setAvatarUrl(null);
    showToast('Profile photo removed');
  }, [showToast, setAvatarUrl]);

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      className="modal-backdrop fixed inset-0 bg-bg-modal-overlay-deep z-[1000] flex items-end justify-center outline-none"
      role="dialog"
      aria-label="Profile"
      onClick={closeProfile}
    >
      <div
        className="modal-sheet bg-bg-surface rounded-t-3xl max-w-[430px] md:max-w-[600px] lg:max-w-[700px] w-full max-h-[92vh] overflow-auto border border-border-subtle border-b-0"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-6 pb-10">
          {/* Header with close button */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Profile</h2>
            <button
              onClick={() => setShowProfile(false)}
              aria-label="Close profile"
              className="bg-bg-subtle-strong border-none rounded-full w-[44px] h-[44px] flex items-center justify-center cursor-pointer text-text-secondary text-lg"
            >
              ✕
            </button>
          </div>

          {/* ================================================================ */}
          {/* AUTH FORMS — shown when not logged in                            */}
          {/* ================================================================ */}
          {!user && (
            <div>
              {/* Sign In */}
              {authScreen === 'signin' && (
                <div>
                  <div className="text-center mb-5">
                    <div className="text-[28px] mb-2">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <div className="text-base font-semibold text-text-primary">Welcome back</div>
                    <div className="text-[13px] text-text-secondary">Sign in to sync your saved places and trips</div>
                  </div>
                  {/* SSO Buttons */}
                  <div className="flex flex-col gap-2 mb-4">
                    <button
                      onClick={() => authSignInWithGoogle()}
                      className="w-full py-3.5 rounded-xl cursor-pointer bg-white border border-[#dadce0] text-[#3c4043] text-sm font-medium flex items-center justify-center gap-2.5"
                    >
                      <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.08 24.08 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                      Continue with Google
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px bg-border-subtle" />
                    <span className="text-xs text-text-tertiary">or use email</span>
                    <div className="flex-1 h-px bg-border-subtle" />
                  </div>
                  {biometricEnabled && (
                    <div className="mb-4">
                      <button
                        onClick={async () => {
                          setBiometricLoading(true);
                          const creds = await authenticateWithBiometric();
                          if (creds) {
                            setAuthEmail(creds.email);
                            setAuthPassword(creds.password);
                            // Small delay so state updates before handleSignIn reads them
                            setTimeout(() => handleSignIn(), 50);
                          }
                          setBiometricLoading(false);
                        }}
                        disabled={biometricLoading}
                        className="w-full py-4 rounded-xl cursor-pointer bg-amber-tint-bg10 border border-amber-tint-border20 text-accent-amber text-sm font-semibold flex items-center justify-center gap-2.5"
                        style={{ opacity: biometricLoading ? 0.6 : 1 }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        {biometricLoading ? 'Authenticating...' : `Sign in with ${biometricType}`}
                      </button>
                      <div className="flex items-center gap-3 my-3">
                        <div className="flex-1 h-px bg-border-subtle" />
                        <span className="text-xs text-text-tertiary">or use email</span>
                        <div className="flex-1 h-px bg-border-subtle" />
                      </div>
                    </div>
                  )}
                  {authError && (
                    <div className="px-3.5 py-2.5 rounded-[10px] bg-red-tint-bg border border-red-tint-border text-status-red text-[13px] mb-3">
                      {authError}
                    </div>
                  )}
                  <div className="flex flex-col gap-2.5">
                    <input type="email" placeholder="Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="input-field" autoComplete="email" />
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="input-field w-full pr-12" autoComplete="current-password"
                        onKeyDown={e => { if (e.key === 'Enter') handleSignIn(); }} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-0 top-0 h-full px-3.5 bg-transparent border-none cursor-pointer text-text-tertiary flex items-center">
                        {showPassword ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <button onClick={handleSignIn} disabled={authSubmitting}
                      className="btn-primary w-full py-3.5 text-[15px]"
                      style={{ opacity: authSubmitting ? 0.7 : 1, cursor: authSubmitting ? 'wait' : 'pointer' }}>
                      {authSubmitting ? 'Signing in...' : 'Sign In'}
                    </button>
                  </div>
                  <div className="flex justify-between mt-3">
                    <button onClick={() => { setAuthScreen('reset'); }}
                      className="bg-none border-none text-accent-amber text-[13px] cursor-pointer py-1 px-0">
                      Forgot password?
                    </button>
                    <button onClick={() => setAuthScreen('signup')}
                      className="bg-none border-none text-accent-amber text-[13px] cursor-pointer py-1 px-0">
                      Create account
                    </button>
                  </div>
                  <div className="text-center mt-2">
                    <button onClick={() => setAuthScreen('verify')}
                      className="bg-none border-none text-text-tertiary text-xs cursor-pointer py-1 px-0">
                      Didn't get a verification email?
                    </button>
                  </div>
                </div>
              )}

              {/* Sign Up */}
              {authScreen === 'signup' && (
                <div>
                  <div className="text-center mb-5">
                    <div className="text-base font-semibold text-text-primary">Create your account</div>
                    <div className="text-[13px] text-text-secondary">Start saving places and building trips</div>
                  </div>
                  {/* SSO Buttons */}
                  <div className="flex flex-col gap-2 mb-4">
                    <button
                      onClick={() => authSignInWithGoogle()}
                      className="w-full py-3.5 rounded-xl cursor-pointer bg-white border border-[#dadce0] text-[#3c4043] text-sm font-medium flex items-center justify-center gap-2.5"
                    >
                      <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.08 24.08 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                      Continue with Google
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px bg-border-subtle" />
                    <span className="text-xs text-text-tertiary">or use email</span>
                    <div className="flex-1 h-px bg-border-subtle" />
                  </div>
                  {authError && (
                    <div className="px-3.5 py-2.5 rounded-[10px] bg-red-tint-bg border border-red-tint-border text-status-red text-[13px] mb-3">
                      {authError}
                    </div>
                  )}
                  <div className="flex flex-col gap-2.5">
                    <input type="text" placeholder="Name (optional)" value={authName} onChange={e => setAuthName(e.target.value)} className="input-field" autoComplete="name" />
                    <input type="email" placeholder="Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="input-field" autoComplete="email" />
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} placeholder="Password (min 6 characters)" value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="input-field w-full pr-12" autoComplete="new-password" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-0 top-0 h-full px-3.5 bg-transparent border-none cursor-pointer text-text-tertiary flex items-center">
                        {showPassword ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <div className="relative">
                      <input type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm password" value={authConfirmPassword} onChange={e => setAuthConfirmPassword(e.target.value)} className="input-field w-full pr-12" autoComplete="new-password"
                        onKeyDown={e => { if (e.key === 'Enter') handleSignUp(); }} />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-0 top-0 h-full px-3.5 bg-transparent border-none cursor-pointer text-text-tertiary flex items-center">
                        {showConfirmPassword ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {/* Terms acceptance */}
                    <label className="flex items-start gap-2.5 cursor-pointer py-1">
                      <input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)}
                        className="w-[18px] h-[18px] mt-0.5 shrink-0" style={{ accentColor: '#E8940A' }} />
                      <span className="text-xs text-text-secondary leading-[1.4]">
                        I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-accent-amber underline">Terms of Service</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-accent-amber underline">Privacy Policy</a>
                      </span>
                    </label>
                    <button onClick={handleSignUp} disabled={authSubmitting}
                      className="btn-primary w-full py-3.5 text-[15px]"
                      style={{ opacity: authSubmitting ? 0.7 : 1, cursor: authSubmitting ? 'wait' : 'pointer' }}>
                      {authSubmitting ? 'Creating account...' : 'Sign Up'}
                    </button>
                  </div>
                  <div className="text-center mt-3">
                    <button onClick={() => setAuthScreen('signin')}
                      className="bg-none border-none text-accent-amber text-[13px] cursor-pointer py-1 px-0">
                      Already have an account? Sign in
                    </button>
                  </div>
                </div>
              )}

              {/* Email Verification */}
              {authScreen === 'verify' && (
                <div>
                  <div className="text-center mb-5">
                    <div className="text-[48px] mb-3">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </div>
                    <div className="text-lg font-bold text-text-primary mb-2">
                      Check your email
                    </div>
                    <div className="text-sm text-text-secondary leading-[1.5]">
                      We sent a verification link to
                    </div>
                    <div className="text-sm font-semibold text-accent-amber mt-1">
                      {authEmail}
                    </div>
                  </div>

                  <div className="px-4 py-3.5 rounded-xl mb-4 bg-amber-tint-bg10 border border-amber-tint-border20">
                    <div className="text-[13px] text-text-secondary leading-[1.6]">
                      <div className="mb-2 font-semibold text-text-primary">
                        Next steps:
                      </div>
                      <div className="flex gap-2 mb-1.5">
                        <span>1.</span>
                        <span>Open your email app (Gmail, Outlook, etc.)</span>
                      </div>
                      <div className="flex gap-2 mb-1.5">
                        <span>2.</span>
                        <span>Look for an email from NxStops</span>
                      </div>
                      <div className="flex gap-2 mb-1.5">
                        <span>3.</span>
                        <span>Click the verification link inside</span>
                      </div>
                      <div className="flex gap-2">
                        <span>4.</span>
                        <span>Come back here and sign in</span>
                      </div>
                    </div>
                  </div>

                  <div className="px-3.5 py-2.5 rounded-[10px] mb-4 bg-bg-subtle border border-border-subtle text-xs text-text-tertiary leading-[1.5]">
                    Don't see it? Check your <strong className="text-text-secondary">spam</strong> or <strong className="text-text-secondary">promotions</strong> folder. The email may take a minute to arrive.
                  </div>

                  {authError && (
                    <div className="px-3.5 py-2.5 rounded-[10px] bg-red-tint-bg border border-red-tint-border text-status-red text-[13px] mb-3">
                      {authError}
                    </div>
                  )}

                  <div className="flex flex-col gap-2.5">
                    <button onClick={handleResendVerification} disabled={authSubmitting}
                      className="w-full py-3.5 rounded-xl border border-accent-amber bg-transparent text-accent-amber text-sm font-semibold"
                      style={{ opacity: authSubmitting ? 0.7 : 1, cursor: authSubmitting ? 'wait' : 'pointer' }}>
                      {authSubmitting ? 'Sending...' : 'Resend verification email'}
                    </button>
                    <button onClick={() => { setAuthScreen('signin'); }}
                      className="btn-primary w-full py-3.5 text-[15px]">
                      Go to Sign In
                    </button>
                  </div>
                </div>
              )}

              {/* Password Reset */}
              {authScreen === 'reset' && (
                <div>
                  <div className="text-center mb-5">
                    <div className="text-base font-semibold text-text-primary">Reset your password</div>
                    <div className="text-[13px] text-text-secondary">We'll send you an email with a reset link</div>
                  </div>
                  {authError && (
                    <div className="px-3.5 py-2.5 rounded-[10px] bg-red-tint-bg border border-red-tint-border text-status-red text-[13px] mb-3">
                      {authError}
                    </div>
                  )}
                  <div className="flex flex-col gap-2.5">
                    <input type="email" placeholder="Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="input-field" autoComplete="email"
                      onKeyDown={e => { if (e.key === 'Enter') handleResetPassword(); }} />
                    <button onClick={handleResetPassword} disabled={authSubmitting}
                      className="btn-primary w-full py-3.5 text-[15px]"
                      style={{ opacity: authSubmitting ? 0.7 : 1, cursor: authSubmitting ? 'wait' : 'pointer' }}>
                      {authSubmitting ? 'Sending...' : 'Send Reset Link'}
                    </button>
                  </div>
                  <div className="text-center mt-3">
                    <button onClick={() => setAuthScreen('signin')}
                      className="bg-none border-none text-accent-amber text-[13px] cursor-pointer py-1 px-0">
                      Back to sign in
                    </button>
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-border-subtle" />
                <span className="text-xs text-text-tertiary">or continue without account</span>
                <div className="flex-1 h-px bg-border-subtle" />
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* LOGGED IN — profile info                                        */}
          {/* ================================================================ */}
          {user && (
            <div>
              {/* Avatar & Name */}
              <div className="flex flex-col items-center mb-6">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ position: 'absolute', width: 0, height: 0, opacity: 0, overflow: 'hidden', pointerEvents: 'none' }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  aria-label="Change profile photo"
                  className="relative w-20 h-20 rounded-full mb-2 border-[3px] border-amber-tint-border30 overflow-hidden flex items-center justify-center p-0 bg-bg-subtle"
                  style={{
                    cursor: avatarUploading ? 'wait' : 'pointer',
                    opacity: avatarUploading ? 0.6 : 1,
                  }}
                >
                  {avatarUrl && (
                    <img
                      key={avatarUrl.slice(-20)}
                      src={avatarUrl}
                      alt="Profile"
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  )}
                  {!avatarUrl && !avatarUploading && (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  )}
                  {avatarUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <div className="text-[11px] text-white font-semibold">Saving...</div>
                    </div>
                  )}
                  {/* Camera badge */}
                  <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-accent-amber flex items-center justify-center border-2 border-bg-surface">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                </button>
                {avatarUrl && (
                  <button
                    onClick={removeAvatar}
                    className="text-[11px] text-status-red bg-transparent border-none cursor-pointer mb-1 py-1 px-2"
                  >
                    Remove photo
                  </button>
                )}
                <div className="text-lg font-bold text-text-primary mb-1">
                  {fullName}
                </div>
                {user.email && (
                  <div className="text-xs text-text-tertiary">{user.email}</div>
                )}
              </div>

              {/* Stats Row */}
              <div className="flex justify-center bg-bg-subtle rounded-2xl border border-border-subtle mb-6 overflow-hidden">
                {[
                  { value: savedPlaces.length, label: 'Saved' },
                  { value: profileTotalStops, label: 'Planned' },
                  { value: profileDayCount, label: 'Days' },
                ].map((stat, i) => (
                  <div key={stat.label} className={`flex-1 text-center py-4 px-3 ${i < 2 ? 'border-r border-border-subtle' : ''}`}>
                    <div className="text-[22px] font-bold bg-accent-text-gradient">
                      {stat.value}
                    </div>
                    <div className="text-xs text-text-tertiary uppercase tracking-[0.06em] mt-1">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* SUBSCRIPTION                                                    */}
          {/* ================================================================ */}
          {user && (
            <div className="mb-6">
              <div className="section-label">Subscription</div>
              <div className="p-4 rounded-xl border border-border-subtle bg-bg-subtle">
                {subscription.isPro ? (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="px-2 py-0.5 rounded-full bg-accent-amber text-[10px] font-bold text-text-on-accent">PRO</div>
                      <span className="text-sm font-semibold text-text-primary">
                        {subscription.plan === 'pro_yearly' ? 'Yearly Plan' : 'Monthly Plan'}
                      </span>
                    </div>
                    {subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd && (
                      <div className="text-xs text-text-tertiary mb-2">
                        Cancels {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                      </div>
                    )}
                    <button
                      onClick={async () => {
                        setBillingLoading(true);
                        try { await subscription.manageBilling(); }
                        catch { showToast('Failed to open billing portal'); }
                        setBillingLoading(false);
                      }}
                      disabled={billingLoading}
                      className="w-full py-2.5 rounded-[10px] border border-border-medium bg-transparent text-text-secondary text-sm cursor-pointer"
                      style={{ opacity: billingLoading ? 0.6 : 1 }}
                    >
                      {billingLoading ? 'Opening...' : 'Manage Subscription'}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-text-primary">Free Plan</span>
                    </div>
                    <div className="text-xs text-text-tertiary mb-3">
                      {subscription.getRemainingUses('plan_my_day')}/{subscription.getLimit('plan_my_day')} AI plans
                      {' \u00B7 '}
                      {subscription.getRemainingUses('tastelens')}/{subscription.getLimit('tastelens')} TasteLens scans left this month
                    </div>
                    {billingError && (
                      <div className="px-3 py-2 rounded-lg bg-red-tint-bg border border-red-tint-border text-status-red text-xs mb-2">
                        {billingError}
                      </div>
                    )}
                    <div className="flex gap-2 mb-2">
                      <button
                        onClick={() => setBillingPlan('monthly')}
                        className={`flex-1 py-2 px-2 rounded-[10px] text-left cursor-pointer ${billingPlan === 'monthly' ? 'bg-amber-tint-bg15 border-[2px] border-accent-amber' : 'bg-bg-subtle border-[2px] border-border-subtle'}`}
                      >
                        <div className="text-xs font-bold text-text-primary">Monthly</div>
                        <div className="text-sm font-bold text-accent-amber">$4.99<span className="text-xs font-normal text-text-tertiary">/mo</span></div>
                      </button>
                      <button
                        onClick={() => setBillingPlan('yearly')}
                        className={`flex-1 py-2 px-2 rounded-[10px] text-left cursor-pointer relative ${billingPlan === 'yearly' ? 'bg-amber-tint-bg15 border-[2px] border-accent-amber' : 'bg-bg-subtle border-[2px] border-border-subtle'}`}
                      >
                        <div className="absolute -top-2 right-1.5 px-1.5 py-0.5 rounded-full bg-accent-amber text-[9px] font-bold text-text-on-accent">SAVE 50%</div>
                        <div className="text-xs font-bold text-text-primary">Yearly</div>
                        <div className="text-sm font-bold text-accent-amber">$29.99<span className="text-xs font-normal text-text-tertiary">/yr</span></div>
                      </button>
                    </div>
                    <button
                      onClick={async () => {
                        setBillingLoading(true);
                        setBillingError(null);
                        try { await subscription.startCheckout(billingPlan); }
                        catch (err) {
                          const msg = err instanceof Error ? err.message : 'Failed to start checkout';
                          setBillingError(msg);
                          showToast(msg);
                        }
                        setBillingLoading(false);
                      }}
                      disabled={billingLoading}
                      className="w-full py-2.5 rounded-[10px] border-none text-sm font-semibold cursor-pointer bg-accent-gradient text-text-on-accent"
                      style={{ opacity: billingLoading ? 0.6 : 1 }}
                    >
                      {billingLoading ? 'Opening checkout...' : `Upgrade to Pro \u2014 ${billingPlan === 'yearly' ? '$29.99/yr' : '$4.99/mo'}`}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* COMMON — Theme, Saved, Trips, Sign Out (all users see theme)    */}
          {/* ================================================================ */}

          {/* Theme Section */}
          <div className="mb-6">
            <div className="section-label">
              Theme
            </div>
            <div className="flex gap-2 mb-2.5">
              {([
                { key: 'light' as const, label: 'Light', icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                )},
                { key: 'sunset' as const, label: 'Sunset', icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 18a5 5 0 0 0-10 0" />
                    <line x1="12" y1="9" x2="12" y2="2" />
                    <line x1="4.22" y1="10.22" x2="5.64" y2="11.64" />
                    <line x1="1" y1="18" x2="3" y2="18" />
                    <line x1="21" y1="18" x2="23" y2="18" />
                    <line x1="18.36" y1="11.64" x2="19.78" y2="10.22" />
                    <line x1="23" y1="22" x2="1" y2="22" />
                    <polyline points="8 6 12 2 16 6" />
                  </svg>
                )},
                { key: 'dark' as const, label: 'Dark', icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )},
              ]).map(({ key, label, icon }) => {
                const isActive = themePreference === key;
                return (
                  <button
                    key={key}
                    onClick={() => setThemePreference(key)}
                    aria-label={`Set theme to ${label}`}
                    aria-pressed={isActive}
                    className={`flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl cursor-pointer ${
                      isActive
                        ? 'bg-amber-tint-bg15 border-[1.5px] border-accent-amber text-accent-amber'
                        : 'bg-bg-subtle border-[1.5px] border-border-subtle text-text-secondary'
                    }`}
                  >
                    <span className="flex stroke-current">{icon}</span>
                    <span className={`text-xs ${isActive ? 'font-semibold' : 'font-medium'}`}>{label}</span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setThemePreference('auto')}
              aria-label="Set theme to auto, changes with time of day"
              aria-pressed={themePreference === 'auto'}
              className={`w-full py-2.5 rounded-[10px] cursor-pointer text-xs flex items-center justify-center gap-1.5 ${
                themePreference === 'auto'
                  ? 'bg-amber-tint-bg15 border-[1.5px] border-accent-amber text-accent-amber font-semibold'
                  : 'bg-bg-subtle border-[1.5px] border-border-subtle text-text-secondary font-medium'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Auto (changes with time of day)
            </button>
          </div>

          {/* Temperature Unit */}
          <div className="mb-6">
            <div className="section-label">Temperature</div>
            <div className="flex gap-2">
              {([
                { key: false, label: '°F', desc: 'Fahrenheit' },
                { key: true, label: '°C', desc: 'Celsius' },
              ] as const).map(({ key, label, desc }) => {
                const isActive = useCelsius === key;
                return (
                  <button
                    key={label}
                    onClick={() => setUseCelsius(key)}
                    aria-label={`Use ${desc}`}
                    aria-pressed={isActive}
                    className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl cursor-pointer ${
                      isActive
                        ? 'bg-amber-tint-bg15 border-[1.5px] border-accent-amber text-accent-amber'
                        : 'bg-bg-subtle border-[1.5px] border-border-subtle text-text-secondary'
                    }`}
                  >
                    <span className={`text-lg font-bold ${isActive ? '' : ''}`}>{label}</span>
                    <span className={`text-xs ${isActive ? 'font-semibold' : 'font-medium'}`}>{desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Security Section — Biometric */}
          {user && biometricAvailable && (
            <div className="mb-6">
              <div className="section-label">
                Security
              </div>
              {!showBiometricPasswordPrompt ? (
                <button
                  onClick={() => {
                    if (biometricEnabled) {
                      disableBiometric();
                      showToast(`${biometricType} login disabled`);
                    } else {
                      setShowBiometricPasswordPrompt(true);
                      setBiometricPassword('');
                    }
                  }}
                  className="w-full flex items-center justify-between py-3.5 px-4 rounded-xl bg-bg-subtle border border-border-subtle cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <div className="text-left">
                      <div className="text-sm font-medium text-text-primary">{biometricType} Login</div>
                      <div className="text-xs text-text-tertiary">Sign in without typing your password</div>
                    </div>
                  </div>
                  <div className={`w-[42px] h-[24px] rounded-full relative transition-colors ${
                    biometricEnabled ? 'bg-accent-amber' : 'bg-bg-subtle-strong'
                  }`}>
                    <div className={`absolute top-[2px] w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                      biometricEnabled ? 'left-[20px]' : 'left-[2px]'
                    }`} />
                  </div>
                </button>
              ) : (
                <div className="card !border-amber-tint-border20">
                  <div className="text-[13px] text-text-secondary mb-3">
                    Confirm your password to enable {biometricType}:
                  </div>
                  <input
                    type="password"
                    placeholder="Your password"
                    value={biometricPassword}
                    onChange={e => setBiometricPassword(e.target.value)}
                    className="input-field mb-3"
                    autoComplete="current-password"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && biometricPassword && user?.email) {
                        setBiometricLoading(true);
                        enableBiometric(user.email, biometricPassword).then(ok => {
                          setBiometricLoading(false);
                          setShowBiometricPasswordPrompt(false);
                          setBiometricPassword('');
                          showToast(ok ? `${biometricType} login enabled!` : 'Failed — try again');
                        });
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        if (!biometricPassword || !user?.email) return;
                        setBiometricLoading(true);
                        const ok = await enableBiometric(user.email, biometricPassword);
                        setBiometricLoading(false);
                        setShowBiometricPasswordPrompt(false);
                        setBiometricPassword('');
                        showToast(ok ? `${biometricType} login enabled!` : 'Failed — try again');
                      }}
                      disabled={!biometricPassword || biometricLoading}
                      className="flex-1 py-2.5 rounded-[10px] border-none text-[13px] font-semibold cursor-pointer bg-accent-gradient text-text-on-accent"
                      style={{ opacity: (!biometricPassword || biometricLoading) ? 0.5 : 1 }}
                    >
                      {biometricLoading ? 'Verifying...' : `Enable ${biometricType}`}
                    </button>
                    <button
                      onClick={() => { setShowBiometricPasswordPrompt(false); setBiometricPassword(''); }}
                      className="px-4 py-2.5 rounded-[10px] border border-border-medium bg-transparent text-text-tertiary text-[13px] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Travel Tools Section */}
          <div className="mb-6">
            <div className="section-label">
              Travel Tools
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setShowProfile(false); setScreen('currency'); }}
                className="flex items-center gap-3 w-full p-3.5 rounded-xl bg-bg-subtle border border-border-subtle cursor-pointer text-left"
              >
                <div className="w-[40px] h-[40px] rounded-[10px] bg-amber-tint-bg10 flex items-center justify-center text-lg shrink-0">
                  💱
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-text-primary">Currency Converter</div>
                  <div className="text-xs text-text-tertiary">Live exchange rates & quick converter</div>
                </div>
                <span className="text-text-tertiary text-sm shrink-0">›</span>
              </button>
              <button
                onClick={() => { setShowProfile(false); setScreen('tastelens'); }}
                className="flex items-center gap-3 w-full p-3.5 rounded-xl bg-bg-subtle border border-border-subtle cursor-pointer text-left"
              >
                <div className="w-[40px] h-[40px] rounded-[10px] bg-amber-tint-bg10 flex items-center justify-center text-lg shrink-0">
                  🍽️
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-text-primary">TasteLens</div>
                  <div className="text-xs text-text-tertiary">AI-powered dish analyzer & menu scanner</div>
                </div>
                <span className="text-text-tertiary text-sm shrink-0">›</span>
              </button>
            </div>
          </div>

          {/* Legal & Safety */}
          <div className="mb-6">
            <div className="section-label">Legal</div>
            <div className="p-3.5 rounded-xl bg-bg-subtle border border-border-subtle">
              <div className="flex items-start gap-2.5">
                <span className="text-base mt-0.5">{'\u26A0\uFE0F'}</span>
                <div>
                  <div className="text-[13px] font-semibold text-text-primary mb-1">Safety Disclaimer</div>
                  <p className="text-[12px] text-text-secondary leading-[1.5]">
                    NxStops provides recommendations for informational purposes only.
                    Place data, safety indicators, hours, and travel advisories may not always be accurate or up to date.
                    Always use your own judgment when visiting unfamiliar places, verify hours directly with venues,
                    and check official government travel advisories before traveling internationally.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Saved Places Section */}
          {savedPlaces.length > 0 && (
            <div className="mb-6">
              <div className="section-label">
                Saved Places
              </div>
              <div className="flex flex-col gap-2">
                {savedPlaces.map(place => (
                  <button
                    key={place.placeId}
                    onClick={() => { setSelectedPlace(place); setShowProfile(false); }}
                    className="flex items-center gap-3 w-full p-3 rounded-xl border border-border-subtle bg-bg-subtle cursor-pointer text-left"
                  >
                    <div
                      className="w-[44px] h-[44px] rounded-[10px] shrink-0 overflow-hidden flex items-center justify-center"
                      style={{
                        background: fixPhotoUrl(place.photoUrl)
                          ? `url(${fixPhotoUrl(place.photoUrl)}) center/cover no-repeat`
                          : undefined,
                      }}
                    >
                      {!place.photoUrl && (
                        <div className="w-full h-full bg-amber-tint-bg10 flex items-center justify-center">
                          <span className="text-lg">📍</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-text-primary whitespace-nowrap overflow-hidden text-ellipsis">
                        {place.name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {place.rating > 0 && (
                          <span className="text-[11px] text-accent-amber">★ {place.rating.toFixed(1)}</span>
                        )}
                        {place.address && (
                          <span className="text-xs text-text-tertiary whitespace-nowrap overflow-hidden text-ellipsis">
                            {place.address.split(',')[0]}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-text-tertiary text-sm shrink-0">›</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* My Trips Section */}
          {profileTotalStops > 0 && (
            <div className="mb-6">
              <div className="section-label">
                My Trips
              </div>
              <div className="flex flex-col gap-2">
                {Object.entries(tripDays).map(([day, stops]) => (
                  <div
                    key={day}
                    className="flex items-center justify-between py-3 px-3.5 rounded-xl bg-bg-subtle border border-border-subtle"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-[10px] bg-amber-tint-bg10 flex items-center justify-center text-sm font-bold text-accent-amber">
                        {day}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-text-primary">Day {day}</div>
                        <div className="text-xs text-text-tertiary">
                          {stops.length} {stops.length === 1 ? 'stop' : 'stops'}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {stops.slice(0, 3).map((stop, i) => (
                        <div key={i}
                          className="w-6 h-6 rounded-md overflow-hidden border border-border-subtle"
                          style={{
                            background: fixPhotoUrl(stop.place?.photoUrl)
                              ? `url(${fixPhotoUrl(stop.place?.photoUrl)}) center/cover no-repeat`
                              : undefined,
                          }}
                        >
                          {!stop.place?.photoUrl && (
                            <div className="w-full h-full bg-amber-tint-bg15" />
                          )}
                        </div>
                      ))}
                      {stops.length > 3 && (
                        <div className="w-6 h-6 rounded-md bg-bg-subtle-strong flex items-center justify-center text-xs text-text-tertiary font-semibold">
                          +{stops.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past Trips */}
          {tripHistory.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="section-label mb-0">Past Trips</div>
                <button
                  onClick={clearTripHistory}
                  className="text-[11px] text-text-tertiary bg-transparent border-none cursor-pointer py-1 px-1"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {tripHistory.map(trip => (
                  <div
                    key={trip.id}
                    className="flex items-center justify-between py-3 px-3.5 rounded-xl bg-bg-subtle border border-border-subtle"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-[10px] bg-purple-tint-bg12 flex items-center justify-center text-base shrink-0">
                        {'\u{1F4CD}'}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-text-primary truncate">
                          {trip.title || trip.city || 'Trip'}
                        </div>
                        <div className="text-xs text-text-tertiary">
                          {trip.city} · {trip.totalStops} {trip.totalStops === 1 ? 'stop' : 'stops'} · {trip.dayCount} {trip.dayCount === 1 ? 'day' : 'days'}
                        </div>
                        <div className="text-[11px] text-text-muted mt-0.5">
                          {new Date(trip.savedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {trip.stops.slice(0, 3).map((s, i) => (
                        <div key={i}
                          className="w-6 h-6 rounded-md overflow-hidden border border-border-subtle"
                          style={{
                            background: fixPhotoUrl(s.photoUrl)
                              ? `url(${fixPhotoUrl(s.photoUrl)}) center/cover no-repeat`
                              : undefined,
                          }}
                        >
                          {!s.photoUrl && (
                            <div className="w-full h-full bg-purple-tint-bg15" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sign Out Button & Danger Zone */}
          {user && (
            <>
              <button
                onClick={() => { handleSignOut(); setShowProfile(false); }}
                className="w-full py-3.5 rounded-xl cursor-pointer bg-none border border-red-tint-border text-status-red text-sm font-medium"
              >
                Sign Out
              </button>

              {/* Danger Zone */}
              <div className="mt-8 pt-6 border-t border-border-subtle">
                <div className="section-label text-status-red">Danger Zone</div>
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-3 rounded-xl cursor-pointer bg-transparent border border-border-subtle text-text-tertiary text-sm"
                  >
                    Delete My Account
                  </button>
                ) : (
                  <div className="card !border-red-tint-border-strong">
                    <p className="text-[13px] text-text-secondary mb-3 leading-relaxed">
                      This will permanently delete your account, saved places, reviews, trip plans, and all associated data. This action cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          setDeleting(true);
                          const result = await deleteAccount();
                          setDeleting(false);
                          if (result.success) {
                            showToast('Account deleted successfully');
                            setShowProfile(false);
                          } else {
                            showToast(result.error || 'Failed to delete account');
                          }
                        }}
                        disabled={deleting}
                        className="flex-1 py-3 rounded-xl border-none cursor-pointer bg-status-red text-white text-sm font-semibold"
                        style={{ opacity: deleting ? 0.6 : 1 }}
                      >
                        {deleting ? 'Deleting...' : 'Yes, Delete Everything'}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-4 py-3 rounded-xl bg-transparent border border-border-medium text-text-secondary text-[13px] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
