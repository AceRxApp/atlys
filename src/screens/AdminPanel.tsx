import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { getCardStyle } from '../styles/shared';
import { CloseIcon } from '../components/icons';

export default function AdminPanel() {
  const {
    setShowAdmin,
    adminTab,
    setAdminTab,
    adminLoading,
    adminSignups,
    adminCities,
    handleToggleCity,
  } = useApp();
  const { theme } = useTheme();
  const cardStyle = getCardStyle(theme);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: theme.bg.body, zIndex: 200,
        overflow: 'auto', maxWidth: '430px', margin: '0 auto',
      }}
    >
      {/* Admin Header */}
      <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.border.subtle}` }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Admin Panel</h1>
          <p style={{ color: theme.text.tertiary, fontSize: '11px' }}>NxStops by Nav&eacute;</p>
        </div>
        <button onClick={() => setShowAdmin(false)}
          aria-label="Close admin panel"
          style={{ background: 'none', border: 'none', color: theme.text.tertiary, cursor: 'pointer', padding: '10px', minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CloseIcon />
        </button>
      </div>

      {/* Admin Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${theme.border.subtle}` }}>
        {(['dashboard', 'signups', 'cities'] as const).map(tab => (
          <button key={tab}
            onClick={() => setAdminTab(tab)}
            style={{
              flex: 1, padding: '12px', fontSize: '13px', fontWeight: 500,
              background: 'none', border: 'none', cursor: 'pointer',
              color: adminTab === tab ? theme.accent.amber : theme.text.tertiary,
              borderBottom: adminTab === tab ? `2px solid ${theme.accent.amber}` : '2px solid transparent',
            }}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ padding: '20px' }}>
        {adminLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ color: theme.text.tertiary, fontSize: '14px' }}>Loading admin data...</div>
          </div>
        ) : (
          <>
            {/* Dashboard */}
            {adminTab === 'dashboard' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                  {[
                    { label: 'Email Signups', value: adminSignups.length, emoji: '📬' },
                    { label: 'Total Cities', value: adminCities.length, emoji: '🏙️' },
                    { label: 'Active Cities', value: adminCities.filter(c => c.is_active).length, emoji: '✅' },
                    { label: 'Inactive Cities', value: adminCities.filter(c => !c.is_active).length, emoji: '⏸️' },
                  ].map(stat => (
                    <div key={stat.label} style={{ ...cardStyle }}>
                      <div style={{ fontSize: '24px', marginBottom: '4px' }}>{stat.emoji}</div>
                      <div style={{ fontSize: '28px', fontWeight: 700, color: theme.text.primary }}>{stat.value}</div>
                      <div style={{ fontSize: '11px', color: theme.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: theme.text.secondary }}>Recent Signups</h3>
                {adminSignups.slice(0, 5).map(s => (
                  <div key={s.id} style={{
                    display: 'flex', justifyContent: 'space-between', padding: '10px 0',
                    borderBottom: `1px solid ${theme.bg.subtle}`, fontSize: '13px',
                  }}>
                    <span style={{ color: theme.text.primary }}>{s.email}</span>
                    <span style={{ color: theme.text.tertiary }}>{s.city || 'No city'}</span>
                  </div>
                ))}
                {adminSignups.length === 0 && (
                  <p style={{ color: theme.text.tertiary, fontSize: '13px' }}>No signups yet</p>
                )}
              </div>
            )}

            {/* Signups Tab */}
            {adminTab === 'signups' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600 }}>All Signups ({adminSignups.length})</h3>
                </div>
                {adminSignups.length === 0 ? (
                  <p style={{ color: theme.text.tertiary, fontSize: '14px', textAlign: 'center', padding: '40px' }}>No signups yet.</p>
                ) : (
                  adminSignups.map(s => (
                    <div key={s.id} style={{
                      ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: theme.text.primary, marginBottom: '2px' }}>{s.email}</div>
                        <div style={{ fontSize: '12px', color: theme.text.tertiary }}>
                          {s.city || 'No city selected'} · {new Date(s.signed_up_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ fontSize: '11px', color: theme.text.tertiary }}>
                        {new Date(s.signed_up_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Cities Tab */}
            {adminTab === 'cities' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600 }}>All Cities ({adminCities.length})</h3>
                </div>
                {adminCities.map(city => (
                  <div key={city.id} style={{
                    ...cardStyle, display: 'flex', alignItems: 'center', gap: '12px',
                  }}>
                    {city.banner_url && (
                      <div style={{
                        width: '48px', height: '48px', borderRadius: '10px', flexShrink: 0,
                        background: `url(${city.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center',
                      }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: theme.text.primary }}>{city.name}</div>
                      <div style={{ fontSize: '12px', color: theme.text.tertiary }}>{city.country} · {city.region}</div>
                    </div>
                    <button
                      onClick={() => handleToggleCity(city.id, !!city.is_active)}
                      style={{
                        padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                        cursor: 'pointer', border: 'none',
                        background: city.is_active ? theme.greenTint.bgStrong : theme.redTint.bg,
                        color: city.is_active ? theme.status.green : theme.status.red,
                      }}
                    >
                      {city.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
