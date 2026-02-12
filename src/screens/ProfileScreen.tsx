import { useCallback, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useModalA11y } from '../hooks/useModalA11y';
import { getCardStyle } from '../styles/shared';
import { uploadAvatar } from '../supabase';

export default function ProfileScreen() {
  const {
    user,
    setShowProfile,
    savedPlaces,
    setSelectedPlace,
    tripDays,
    showToast,
    // Auth
    authScreen, setAuthScreen,
    authEmail, setAuthEmail,
    authPassword, setAuthPassword,
    authName, setAuthName,
    authError, authSubmitting,
    acceptedTerms, setAcceptedTerms,
    handleSignIn, handleSignUp, handleSignOut, handleResetPassword, handleResendVerification,
  } = useApp();
  const { theme, themePreference, setThemePreference } = useTheme();
  const cardStyle = getCardStyle(theme);
  const closeProfile = useCallback(() => setShowProfile(false), [setShowProfile]);
  const modalRef = useModalA11y(true, closeProfile);

  const fullName = (user?.user_metadata?.full_name as string) || user?.email || 'Traveler';
  const avatarUrl = (user?.user_metadata?.avatar_url as string) || null;
  const profileTotalStops = Object.values(tripDays).reduce((sum, stops) => sum + stops.length, 0);
  const profileDayCount = Object.keys(tripDays).length;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const handleAvatarChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5MB');
      return;
    }

    setAvatarUploading(true);
    const { error } = await uploadAvatar(user.id, file);
    setAvatarUploading(false);

    if (error) {
      showToast('Failed to upload photo — try again');
    } else {
      showToast('Profile photo updated!');
    }

    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [user, showToast]);

  const inputStyle = {
    width: '100%', padding: '14px 16px', borderRadius: '12px',
    border: `1px solid ${theme.border.strong}`, background: theme.bg.input,
    color: theme.text.primary, fontSize: '15px', outline: 'none',
  };

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      className="modal-backdrop"
      role="dialog"
      aria-label="Profile"
      style={{
        position: 'fixed', inset: 0, background: theme.bg.modalOverlayDeep, zIndex: 1000,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center', outline: 'none',
      }}
      onClick={closeProfile}
    >
      <div
        className="modal-sheet"
        style={{
          background: theme.bg.surface, borderRadius: '24px 24px 0 0',
          maxWidth: '430px', width: '100%', maxHeight: '92vh', overflow: 'auto',
          border: `1px solid ${theme.border.subtle}`, borderBottom: 'none',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '24px 20px 40px' }}>
          {/* Header with close button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Profile</h2>
            <button
              onClick={() => setShowProfile(false)}
              aria-label="Close profile"
              style={{
                background: theme.bg.subtleStrong, border: 'none', borderRadius: '50%',
                width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: theme.text.secondary, fontSize: '18px',
              }}
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
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={theme.accent.amber} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: theme.text.primary }}>Welcome back</div>
                    <div style={{ fontSize: '13px', color: theme.text.secondary }}>Sign in to sync your saved places and trips</div>
                  </div>
                  {authError && (
                    <div style={{ padding: '10px 14px', borderRadius: '10px', background: theme.redTint.bg, border: `1px solid ${theme.redTint.border}`, color: theme.status.red, fontSize: '13px', marginBottom: '12px' }}>
                      {authError}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input type="email" placeholder="Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} style={inputStyle} autoComplete="email" />
                    <input type="password" placeholder="Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} style={inputStyle} autoComplete="current-password"
                      onKeyDown={e => { if (e.key === 'Enter') handleSignIn(); }} />
                    <button onClick={handleSignIn} disabled={authSubmitting}
                      style={{
                        width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                        background: theme.accent.amberGradient, color: theme.text.onAccent,
                        fontSize: '15px', fontWeight: 600, cursor: authSubmitting ? 'wait' : 'pointer',
                        opacity: authSubmitting ? 0.7 : 1,
                      }}>
                      {authSubmitting ? 'Signing in...' : 'Sign In'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                    <button onClick={() => { setAuthScreen('reset'); }}
                      style={{ background: 'none', border: 'none', color: theme.accent.amber, fontSize: '13px', cursor: 'pointer', padding: '4px 0' }}>
                      Forgot password?
                    </button>
                    <button onClick={() => setAuthScreen('signup')}
                      style={{ background: 'none', border: 'none', color: theme.accent.amber, fontSize: '13px', cursor: 'pointer', padding: '4px 0' }}>
                      Create account
                    </button>
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '8px' }}>
                    <button onClick={() => setAuthScreen('verify')}
                      style={{ background: 'none', border: 'none', color: theme.text.tertiary, fontSize: '12px', cursor: 'pointer', padding: '4px 0' }}>
                      Didn't get a verification email?
                    </button>
                  </div>
                </div>
              )}

              {/* Sign Up */}
              {authScreen === 'signup' && (
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: theme.text.primary }}>Create your account</div>
                    <div style={{ fontSize: '13px', color: theme.text.secondary }}>Start saving places and building trips</div>
                  </div>
                  {authError && (
                    <div style={{ padding: '10px 14px', borderRadius: '10px', background: theme.redTint.bg, border: `1px solid ${theme.redTint.border}`, color: theme.status.red, fontSize: '13px', marginBottom: '12px' }}>
                      {authError}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input type="text" placeholder="Name (optional)" value={authName} onChange={e => setAuthName(e.target.value)} style={inputStyle} autoComplete="name" />
                    <input type="email" placeholder="Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} style={inputStyle} autoComplete="email" />
                    <input type="password" placeholder="Password (min 6 characters)" value={authPassword} onChange={e => setAuthPassword(e.target.value)} style={inputStyle} autoComplete="new-password" />
                    {/* Terms acceptance */}
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', padding: '4px 0' }}>
                      <input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)}
                        style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: '#F59E0B', flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', color: theme.text.secondary, lineHeight: 1.4 }}>
                        I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: theme.accent.amber, textDecoration: 'underline' }}>Terms of Service</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: theme.accent.amber, textDecoration: 'underline' }}>Privacy Policy</a>
                      </span>
                    </label>
                    <button onClick={handleSignUp} disabled={authSubmitting}
                      style={{
                        width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                        background: theme.accent.amberGradient, color: theme.text.onAccent,
                        fontSize: '15px', fontWeight: 600, cursor: authSubmitting ? 'wait' : 'pointer',
                        opacity: authSubmitting ? 0.7 : 1,
                      }}>
                      {authSubmitting ? 'Creating account...' : 'Sign Up'}
                    </button>
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '12px' }}>
                    <button onClick={() => setAuthScreen('signin')}
                      style={{ background: 'none', border: 'none', color: theme.accent.amber, fontSize: '13px', cursor: 'pointer', padding: '4px 0' }}>
                      Already have an account? Sign in
                    </button>
                  </div>
                </div>
              )}

              {/* Email Verification */}
              {authScreen === 'verify' && (
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={theme.accent.amber} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: theme.text.primary, marginBottom: '8px' }}>
                      Check your email
                    </div>
                    <div style={{ fontSize: '14px', color: theme.text.secondary, lineHeight: 1.5 }}>
                      We sent a verification link to
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: theme.accent.amber, marginTop: '4px' }}>
                      {authEmail}
                    </div>
                  </div>

                  <div style={{
                    padding: '14px 16px', borderRadius: '12px', marginBottom: '16px',
                    background: theme.amberTint.bg10, border: `1px solid ${theme.amberTint.border20}`,
                  }}>
                    <div style={{ fontSize: '13px', color: theme.text.secondary, lineHeight: 1.6 }}>
                      <div style={{ marginBottom: '8px', fontWeight: 600, color: theme.text.primary }}>
                        Next steps:
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                        <span>1.</span>
                        <span>Open your email app (Gmail, Outlook, etc.)</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                        <span>2.</span>
                        <span>Look for an email from NxStops</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                        <span>3.</span>
                        <span>Click the verification link inside</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span>4.</span>
                        <span>Come back here and sign in</span>
                      </div>
                    </div>
                  </div>

                  <div style={{
                    padding: '10px 14px', borderRadius: '10px', marginBottom: '16px',
                    background: theme.bg.subtle, border: `1px solid ${theme.border.subtle}`,
                    fontSize: '12px', color: theme.text.tertiary, lineHeight: 1.5,
                  }}>
                    Don't see it? Check your <strong style={{ color: theme.text.secondary }}>spam</strong> or <strong style={{ color: theme.text.secondary }}>promotions</strong> folder. The email may take a minute to arrive.
                  </div>

                  {authError && (
                    <div style={{ padding: '10px 14px', borderRadius: '10px', background: theme.redTint.bg, border: `1px solid ${theme.redTint.border}`, color: theme.status.red, fontSize: '13px', marginBottom: '12px' }}>
                      {authError}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button onClick={handleResendVerification} disabled={authSubmitting}
                      style={{
                        width: '100%', padding: '14px', borderRadius: '12px', cursor: authSubmitting ? 'wait' : 'pointer',
                        border: `1px solid ${theme.accent.amber}`,
                        background: 'transparent', color: theme.accent.amber,
                        fontSize: '14px', fontWeight: 600, opacity: authSubmitting ? 0.7 : 1,
                      }}>
                      {authSubmitting ? 'Sending...' : 'Resend verification email'}
                    </button>
                    <button onClick={() => { setAuthScreen('signin'); }}
                      style={{
                        width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                        background: theme.accent.amberGradient, color: theme.text.onAccent,
                        fontSize: '15px', fontWeight: 600, cursor: 'pointer',
                      }}>
                      Go to Sign In
                    </button>
                  </div>
                </div>
              )}

              {/* Password Reset */}
              {authScreen === 'reset' && (
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: theme.text.primary }}>Reset your password</div>
                    <div style={{ fontSize: '13px', color: theme.text.secondary }}>We'll send you an email with a reset link</div>
                  </div>
                  {authError && (
                    <div style={{ padding: '10px 14px', borderRadius: '10px', background: theme.redTint.bg, border: `1px solid ${theme.redTint.border}`, color: theme.status.red, fontSize: '13px', marginBottom: '12px' }}>
                      {authError}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input type="email" placeholder="Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} style={inputStyle} autoComplete="email"
                      onKeyDown={e => { if (e.key === 'Enter') handleResetPassword(); }} />
                    <button onClick={handleResetPassword} disabled={authSubmitting}
                      style={{
                        width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                        background: theme.accent.amberGradient, color: theme.text.onAccent,
                        fontSize: '15px', fontWeight: 600, cursor: authSubmitting ? 'wait' : 'pointer',
                        opacity: authSubmitting ? 0.7 : 1,
                      }}>
                      {authSubmitting ? 'Sending...' : 'Send Reset Link'}
                    </button>
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '12px' }}>
                    <button onClick={() => setAuthScreen('signin')}
                      style={{ background: 'none', border: 'none', color: theme.accent.amber, fontSize: '13px', cursor: 'pointer', padding: '4px 0' }}>
                      Back to sign in
                    </button>
                  </div>
                </div>
              )}

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0' }}>
                <div style={{ flex: 1, height: '1px', background: theme.border.subtle }} />
                <span style={{ fontSize: '11px', color: theme.text.tertiary }}>or continue without account</span>
                <div style={{ flex: 1, height: '1px', background: theme.border.subtle }} />
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* LOGGED IN — profile info                                        */}
          {/* ================================================================ */}
          {user && (
            <div>
              {/* Avatar & Name */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  aria-label="Change profile photo"
                  style={{
                    position: 'relative', width: '80px', height: '80px', borderRadius: '50%', marginBottom: '12px',
                    border: `3px solid ${theme.amberTint.border30}`, overflow: 'hidden',
                    background: avatarUrl
                      ? `url(${avatarUrl}) center/cover no-repeat`
                      : `linear-gradient(135deg, ${theme.amberTint.border20}, ${theme.amberTint.border20})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: avatarUploading ? 'wait' : 'pointer', padding: 0,
                    opacity: avatarUploading ? 0.6 : 1,
                  }}
                >
                  {!avatarUrl && !avatarUploading && (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={theme.accent.amber} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  )}
                  {avatarUploading && (
                    <div style={{ fontSize: '11px', color: '#fff', fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                      Uploading...
                    </div>
                  )}
                  {/* Camera badge */}
                  <div style={{
                    position: 'absolute', bottom: '0', right: '0',
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: theme.accent.amber, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    border: `2px solid ${theme.bg.surface}`,
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                </button>
                <div style={{ fontSize: '18px', fontWeight: 700, color: theme.text.primary, marginBottom: '4px' }}>
                  {fullName}
                </div>
                {user.email && (
                  <div style={{ fontSize: '12px', color: theme.text.tertiary }}>{user.email}</div>
                )}
              </div>

              {/* Stats Row */}
              <div style={{
                display: 'flex', justifyContent: 'center', gap: '0',
                background: theme.bg.subtle, borderRadius: '16px',
                border: `1px solid ${theme.border.subtle}`, marginBottom: '24px', overflow: 'hidden',
              }}>
                {[
                  { value: savedPlaces.length, label: 'Saved' },
                  { value: profileTotalStops, label: 'Planned' },
                  { value: profileDayCount, label: 'Days' },
                ].map((stat, i) => (
                  <div key={stat.label} style={{
                    flex: 1, textAlign: 'center', padding: '16px 12px',
                    borderRight: i < 2 ? `1px solid ${theme.border.subtle}` : 'none',
                  }}>
                    <div style={{
                      fontSize: '22px', fontWeight: 700,
                      background: theme.accent.amberTextGradient,
                      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>
                      {stat.value}
                    </div>
                    <div style={{ fontSize: '11px', color: theme.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '4px' }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* COMMON — Theme, Saved, Trips, Sign Out (all users see theme)    */}
          {/* ================================================================ */}

          {/* Theme Section */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '11px', color: theme.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
              Theme
            </div>
            <div style={{
              display: 'flex', gap: '8px', marginBottom: '10px',
            }}>
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
                    style={{
                      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                      padding: '12px 8px', borderRadius: '12px', cursor: 'pointer',
                      background: isActive ? theme.amberTint.bg15 : theme.bg.subtle,
                      border: `1.5px solid ${isActive ? theme.accent.amber : theme.border.subtle}`,
                      color: isActive ? theme.accent.amber : theme.text.secondary,
                    }}
                  >
                    <span style={{ display: 'flex', stroke: 'currentColor' }}>{icon}</span>
                    <span style={{ fontSize: '12px', fontWeight: isActive ? 600 : 500 }}>{label}</span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setThemePreference('auto')}
              style={{
                width: '100%', padding: '10px', borderRadius: '10px', cursor: 'pointer',
                background: themePreference === 'auto' ? theme.amberTint.bg15 : theme.bg.subtle,
                border: `1.5px solid ${themePreference === 'auto' ? theme.accent.amber : theme.border.subtle}`,
                color: themePreference === 'auto' ? theme.accent.amber : theme.text.secondary,
                fontSize: '12px', fontWeight: themePreference === 'auto' ? 600 : 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Auto (changes with time of day)
            </button>
          </div>

          {/* Saved Places Section */}
          {savedPlaces.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', color: theme.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                Saved Places
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {savedPlaces.map(place => (
                  <button
                    key={place.placeId}
                    onClick={() => { setSelectedPlace(place); setShowProfile(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', width: '100%',
                      padding: '12px', borderRadius: '12px', border: `1px solid ${theme.border.subtle}`,
                      background: theme.bg.subtle, cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '10px', flexShrink: 0, overflow: 'hidden',
                      background: place.photoUrl
                        ? `url(${place.photoUrl}) center/cover no-repeat`
                        : theme.amberTint.bg10,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {!place.photoUrl && <span style={{ fontSize: '18px' }}>📍</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: theme.text.primary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {place.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        {place.rating > 0 && (
                          <span style={{ fontSize: '11px', color: theme.accent.amber }}>★ {place.rating.toFixed(1)}</span>
                        )}
                        {place.address && (
                          <span style={{ fontSize: '11px', color: theme.text.tertiary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {place.address.split(',')[0]}
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{ color: theme.text.tertiary, fontSize: '14px', flexShrink: 0 }}>›</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* My Trips Section */}
          {profileTotalStops > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', color: theme.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                My Trips
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(tripDays).map(([day, stops]) => (
                  <div
                    key={day}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 14px', borderRadius: '12px',
                      background: theme.bg.subtle, border: `1px solid ${theme.border.subtle}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: theme.amberTint.bg10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '14px', fontWeight: 700, color: theme.accent.amber,
                      }}>
                        {day}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: theme.text.primary }}>Day {day}</div>
                        <div style={{ fontSize: '11px', color: theme.text.tertiary }}>
                          {stops.length} {stops.length === 1 ? 'stop' : 'stops'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {stops.slice(0, 3).map((stop, i) => (
                        <div key={i} style={{
                          width: '24px', height: '24px', borderRadius: '6px', overflow: 'hidden',
                          background: (stop.place?.photoUrl)
                            ? `url(${stop.place.photoUrl}) center/cover no-repeat`
                            : theme.amberTint.bg15,
                          border: `1px solid ${theme.border.subtle}`,
                        }} />
                      ))}
                      {stops.length > 3 && (
                        <div style={{
                          width: '24px', height: '24px', borderRadius: '6px',
                          background: theme.bg.subtleStrong, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '9px', color: theme.text.tertiary, fontWeight: 600,
                        }}>
                          +{stops.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sign Out Button */}
          {user && (
            <button
              onClick={handleSignOut}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px', cursor: 'pointer',
                background: 'none', border: `1px solid ${theme.redTint.border}`,
                color: theme.status.red, fontSize: '14px', fontWeight: 500,
              }}
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
