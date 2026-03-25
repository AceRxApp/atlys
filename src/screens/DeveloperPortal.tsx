import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';

const API_BASE = import.meta.env.PROD ? '' : '';

interface KeyInfo {
  id: string;
  developer_email: string;
  app_name: string;
  status: string;
  tier: string;
  monthly_limit: number;
  monthly_usage: number;
  usage_reset_at: string;
  created_at: string;
  approved_at: string | null;
  last_used_at: string | null;
}

const TIERS = [
  {
    name: 'Free',
    id: 'free',
    price: '$0',
    period: 'forever',
    limit: '100 requests/month',
    features: ['Places search', 'Weather data', 'Currency rates', 'Community support'],
  },
  {
    name: 'Basic',
    id: 'basic',
    price: '$29',
    period: '/month',
    limit: '5,000 requests/month',
    features: ['All Free endpoints', 'Events API', 'AI day planner', 'Email support', 'Usage analytics'],
    popular: true,
  },
  {
    name: 'Pro',
    id: 'pro',
    price: '$99',
    period: '/month',
    limit: '50,000 requests/month',
    features: ['All Basic endpoints', 'TasteLens AI', 'Priority support', 'Webhook notifications', 'Custom rate limits'],
  },
];

export default function DeveloperPortal() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'register' | 'status' | 'docs'>('docs');

  // Registration form
  const [regEmail, setRegEmail] = useState('');
  const [regName, setRegName] = useState('');
  const [regApp, setRegApp] = useState('');
  const [regDesc, setRegDesc] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regResult, setRegResult] = useState<{ success?: boolean; message?: string; key_preview?: string } | null>(null);

  // Key status check
  const [checkKey, setCheckKey] = useState('');
  const [checkLoading, setCheckLoading] = useState(false);
  const [keyInfo, setKeyInfo] = useState<KeyInfo | null>(null);
  const [checkError, setCheckError] = useState('');

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegLoading(true);
    setRegResult(null);
    try {
      const resp = await fetch(`${API_BASE}/api/user-actions?action=register-api-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail, name: regName, app_name: regApp, app_description: regDesc }),
      });
      const data = await resp.json();
      if (resp.ok) {
        setRegResult({ success: true, message: data.message, key_preview: data.key_preview });
      } else {
        setRegResult({ success: false, message: data.error || data.hint || 'Registration failed' });
      }
    } catch {
      setRegResult({ success: false, message: 'Network error. Please try again.' });
    } finally {
      setRegLoading(false);
    }
  }

  async function handleCheckKey(e: React.FormEvent) {
    e.preventDefault();
    setCheckLoading(true);
    setCheckError('');
    setKeyInfo(null);
    try {
      const resp = await fetch(`${API_BASE}/api/user-actions?action=check-api-key&key=${encodeURIComponent(checkKey)}`);
      const data = await resp.json();
      if (resp.ok) {
        setKeyInfo(data);
      } else {
        setCheckError(data.error || 'Key not found');
      }
    } catch {
      setCheckError('Network error');
    } finally {
      setCheckLoading(false);
    }
  }

  async function handleUpgrade(tier: string) {
    if (!keyInfo || !checkKey) {
      setTab('status');
      return;
    }
    try {
      const resp = await fetch(`${API_BASE}/api/stripe?action=api-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: checkKey, tier }),
      });
      const data = await resp.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to start checkout');
      }
    } catch {
      alert('Network error');
    }
  }

  const statusColor = (s: string) => {
    if (s === 'approved') return 'text-green-400';
    if (s === 'pending') return 'text-yellow-400';
    if (s === 'revoked' || s === 'suspended') return 'text-red-400';
    return 'text-text-secondary';
  };

  return (
    <div className="font-sans bg-body-gradient min-h-screen text-text-primary">
      <div className="max-w-[700px] mx-auto px-5">
        {/* Back button */}
        <div className="py-4">
          <button
            onClick={() => navigate('/')}
            className="bg-transparent border-none cursor-pointer text-text-secondary text-sm flex items-center gap-1.5 py-2"
          >
            <span className="text-lg">&larr;</span> Back to NxStops
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl font-bold mb-2" style={{ background: 'linear-gradient(135deg, #E8940A, #F5A623)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            NxStops API
          </h1>
          <p className="text-text-secondary text-sm">
            Build travel apps with our places, events, weather, and AI planning data.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-bg-elevated mb-6">
          {(['docs', 'register', 'status'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === t
                  ? 'bg-bg-surface text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              style={tab === t ? { background: 'linear-gradient(135deg, rgba(232,148,10,0.15), rgba(245,166,35,0.08))' } : undefined}
            >
              {t === 'docs' ? 'Documentation' : t === 'register' ? 'Get API Key' : 'Check Status'}
            </button>
          ))}
        </div>

        {/* === DOCUMENTATION TAB === */}
        {tab === 'docs' && (
          <div className="space-y-6">
            {/* Getting Started */}
            <section className="bg-bg-elevated rounded-2xl p-5 border border-border-subtle">
              <h2 className="text-lg font-bold mb-3">Getting Started</h2>
              <ol className="space-y-3 text-sm text-text-secondary">
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-accent-amber/20 text-accent-amber flex items-center justify-center text-xs font-bold shrink-0">1</span>
                  <span>Register for an API key in the "Get API Key" tab</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-accent-amber/20 text-accent-amber flex items-center justify-center text-xs font-bold shrink-0">2</span>
                  <span>Wait for admin approval (you'll receive an email)</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-accent-amber/20 text-accent-amber flex items-center justify-center text-xs font-bold shrink-0">3</span>
                  <span>Include your key in the <code className="bg-bg-surface px-1.5 py-0.5 rounded text-accent-amber text-xs">X-API-Key</code> header with every request</span>
                </li>
              </ol>
            </section>

            {/* Base URL */}
            <section className="bg-bg-elevated rounded-2xl p-5 border border-border-subtle">
              <h2 className="text-lg font-bold mb-3">Base URL</h2>
              <code className="block bg-bg-surface p-3 rounded-lg text-sm text-accent-amber">
                https://nxstops.com/api
              </code>
            </section>

            {/* Authentication */}
            <section className="bg-bg-elevated rounded-2xl p-5 border border-border-subtle">
              <h2 className="text-lg font-bold mb-3">Authentication</h2>
              <p className="text-sm text-text-secondary mb-3">All requests require an API key passed via header:</p>
              <pre className="bg-bg-surface p-3 rounded-lg text-xs text-text-secondary overflow-x-auto">
{`curl -H "X-API-Key: nxs_live_your_key_here" \\
     https://nxstops.com/api/places?action=nearby&lat=40.7128&lng=-74.006`}
              </pre>
            </section>

            {/* Endpoints */}
            <section className="bg-bg-elevated rounded-2xl p-5 border border-border-subtle">
              <h2 className="text-lg font-bold mb-4">Available Endpoints</h2>
              <div className="space-y-4">
                <EndpointDoc
                  method="GET"
                  path="/api/places"
                  desc="Search for places, get details, and photos"
                  params={[
                    'action=nearby|textsearch|details|autocomplete|geocode',
                    'lat, lng — coordinates',
                    'radius — search radius in meters',
                    'type — place type filter',
                  ]}
                  tier="Free"
                />
                <EndpointDoc
                  method="GET"
                  path="/api/events"
                  desc="Find local events near a location"
                  params={[
                    'lat, lng — coordinates',
                    'radius — search radius in km',
                    'category — filter by type',
                    'page — pagination',
                  ]}
                  tier="Basic"
                />
                <EndpointDoc
                  method="GET"
                  path="/api/weather"
                  desc="Weather forecast and travel advisories"
                  params={[
                    'lat, lng — coordinates',
                    'action=advisory — travel safety info',
                  ]}
                  tier="Free"
                />
                <EndpointDoc
                  method="GET"
                  path="/api/currency"
                  desc="Real-time currency exchange rates"
                  params={['from — base currency code (e.g. USD)']}
                  tier="Free"
                />
                <EndpointDoc
                  method="POST"
                  path="/api/plan-day"
                  desc="AI-powered day itinerary generation"
                  params={[
                    'city, lat, lng — location',
                    'vibe — trip mood/style',
                    'duration — hours',
                    'groupType — solo, couple, family, friends',
                  ]}
                  tier="Basic"
                />
                <EndpointDoc
                  method="POST"
                  path="/api/dishlens"
                  desc="AI food analysis — identify dishes from photos"
                  params={['image — base64 image data', 'dishName — or text query']}
                  tier="Pro"
                />
              </div>
            </section>

            {/* Rate Limits */}
            <section className="bg-bg-elevated rounded-2xl p-5 border border-border-subtle">
              <h2 className="text-lg font-bold mb-3">Rate Limits</h2>
              <p className="text-sm text-text-secondary mb-3">
                Rate limits are per API key, tracked monthly. Usage resets on the 1st of each month.
              </p>
              <div className="bg-bg-surface rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-subtle">
                      <th className="text-left px-3 py-2 text-text-secondary font-medium">Tier</th>
                      <th className="text-left px-3 py-2 text-text-secondary font-medium">Monthly Limit</th>
                      <th className="text-left px-3 py-2 text-text-secondary font-medium">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border-subtle">
                      <td className="px-3 py-2">Free</td>
                      <td className="px-3 py-2 text-text-secondary">100 requests</td>
                      <td className="px-3 py-2 text-text-secondary">$0</td>
                    </tr>
                    <tr className="border-b border-border-subtle">
                      <td className="px-3 py-2">Basic</td>
                      <td className="px-3 py-2 text-text-secondary">5,000 requests</td>
                      <td className="px-3 py-2 text-text-secondary">$29/mo</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2">Pro</td>
                      <td className="px-3 py-2 text-text-secondary">50,000 requests</td>
                      <td className="px-3 py-2 text-text-secondary">$99/mo</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Response Format */}
            <section className="bg-bg-elevated rounded-2xl p-5 border border-border-subtle">
              <h2 className="text-lg font-bold mb-3">Response Format</h2>
              <p className="text-sm text-text-secondary mb-3">All responses are JSON. Errors include an error message:</p>
              <pre className="bg-bg-surface p-3 rounded-lg text-xs text-text-secondary overflow-x-auto">
{`// Success
{ "places": [...], "total": 20 }

// Error
{ "error": "Rate limit exceeded" }  // 429
{ "error": "Invalid API key" }      // 401`}
              </pre>
            </section>

            {/* Pricing Cards */}
            <section>
              <h2 className="text-lg font-bold mb-4 text-center">Pricing</h2>
              <div className="grid gap-4">
                {TIERS.map(tier => (
                  <div
                    key={tier.id}
                    className={`bg-bg-elevated rounded-2xl p-5 border ${
                      tier.popular ? 'border-accent-amber' : 'border-border-subtle'
                    } relative`}
                  >
                    {tier.popular && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full"
                        style={{ background: 'linear-gradient(135deg, #E8940A, #F5A623)', color: '#000' }}>
                        Most Popular
                      </span>
                    )}
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-2xl font-bold">{tier.price}</span>
                      <span className="text-text-secondary text-sm">{tier.period}</span>
                    </div>
                    <div className="font-semibold mb-1">{tier.name}</div>
                    <div className="text-xs text-text-secondary mb-3">{tier.limit}</div>
                    <ul className="space-y-1.5">
                      {tier.features.map(f => (
                        <li key={f} className="text-sm text-text-secondary flex items-center gap-2">
                          <span className="text-green-400 text-xs">&#10003;</span> {f}
                        </li>
                      ))}
                    </ul>
                    {tier.id !== 'free' && (
                      <button
                        onClick={() => handleUpgrade(tier.id)}
                        className="w-full mt-4 py-2.5 rounded-xl text-sm font-semibold border-none cursor-pointer transition-all"
                        style={
                          tier.popular
                            ? { background: 'linear-gradient(135deg, #E8940A, #F5A623)', color: '#000' }
                            : { background: 'rgba(232,148,10,0.15)', color: '#E8940A' }
                        }
                      >
                        Upgrade to {tier.name}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* === REGISTER TAB === */}
        {tab === 'register' && (
          <div className="bg-bg-elevated rounded-2xl p-5 border border-border-subtle">
            <h2 className="text-lg font-bold mb-1">Request API Access</h2>
            <p className="text-sm text-text-secondary mb-5">
              Fill out the form below. Your key starts on the Free tier (100 requests/month) and requires admin approval.
            </p>

            {regResult ? (
              <div className={`p-4 rounded-xl border ${
                regResult.success
                  ? 'bg-green-400/10 border-green-400/30'
                  : 'bg-red-400/10 border-red-400/30'
              }`}>
                <p className={`text-sm font-medium ${regResult.success ? 'text-green-400' : 'text-red-400'}`}>
                  {regResult.success ? 'Application Submitted!' : 'Error'}
                </p>
                <p className="text-sm text-text-secondary mt-1">{regResult.message}</p>
                {regResult.key_preview && (
                  <div className="mt-3 p-3 bg-bg-surface rounded-lg">
                    <p className="text-xs text-text-secondary mb-1">Your API key (preview):</p>
                    <code className="text-accent-amber text-sm">{regResult.key_preview}</code>
                    <p className="text-xs text-text-secondary mt-2">
                      Full key will be visible once approved. Save it securely — it won't be shown again.
                    </p>
                  </div>
                )}
                <button
                  onClick={() => { setRegResult(null); setTab('status'); }}
                  className="mt-3 text-sm text-accent-amber bg-transparent border-none cursor-pointer underline"
                >
                  Check your key status &rarr;
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Email *</label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    placeholder="dev@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-input border border-border-subtle text-text-primary text-sm outline-none focus:border-accent-amber transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Your Name</label>
                  <input
                    type="text"
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    placeholder="Jane Smith"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-input border border-border-subtle text-text-primary text-sm outline-none focus:border-accent-amber transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">App/Project Name *</label>
                  <input
                    type="text"
                    required
                    value={regApp}
                    onChange={e => setRegApp(e.target.value)}
                    placeholder="My Travel App"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-input border border-border-subtle text-text-primary text-sm outline-none focus:border-accent-amber transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">What will you build?</label>
                  <textarea
                    value={regDesc}
                    onChange={e => setRegDesc(e.target.value)}
                    placeholder="Describe how you'll use the NxStops API..."
                    rows={3}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-input border border-border-subtle text-text-primary text-sm outline-none focus:border-accent-amber transition-colors resize-y"
                  />
                </div>
                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full py-3 rounded-xl text-sm font-semibold border-none cursor-pointer transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #E8940A, #F5A623)', color: '#000' }}
                >
                  {regLoading ? 'Submitting...' : 'Request API Key'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* === STATUS TAB === */}
        {tab === 'status' && (
          <div className="space-y-5">
            <div className="bg-bg-elevated rounded-2xl p-5 border border-border-subtle">
              <h2 className="text-lg font-bold mb-3">Check Your API Key</h2>
              <form onSubmit={handleCheckKey} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={checkKey}
                  onChange={e => setCheckKey(e.target.value)}
                  placeholder="nxs_live_..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-bg-input border border-border-subtle text-text-primary text-sm outline-none focus:border-accent-amber transition-colors font-mono"
                />
                <button
                  type="submit"
                  disabled={checkLoading}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold border-none cursor-pointer shrink-0 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #E8940A, #F5A623)', color: '#000' }}
                >
                  {checkLoading ? '...' : 'Check'}
                </button>
              </form>
              {checkError && (
                <p className="mt-3 text-sm text-red-400">{checkError}</p>
              )}
            </div>

            {keyInfo && (
              <div className="bg-bg-elevated rounded-2xl p-5 border border-border-subtle space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">{keyInfo.app_name}</h3>
                  <span className={`text-xs font-semibold uppercase tracking-wider ${statusColor(keyInfo.status)}`}>
                    {keyInfo.status}
                  </span>
                </div>

                {/* Usage bar */}
                <div>
                  <div className="flex justify-between text-xs text-text-secondary mb-1.5">
                    <span>Monthly Usage</span>
                    <span>{keyInfo.monthly_usage.toLocaleString()} / {keyInfo.monthly_limit.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-bg-surface rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (keyInfo.monthly_usage / keyInfo.monthly_limit) * 100)}%`,
                        background: keyInfo.monthly_usage / keyInfo.monthly_limit > 0.9
                          ? '#ef4444'
                          : 'linear-gradient(135deg, #E8940A, #F5A623)',
                      }}
                    />
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-3">
                  <InfoCard label="Tier" value={keyInfo.tier.toUpperCase()} />
                  <InfoCard label="Email" value={keyInfo.developer_email} />
                  <InfoCard label="Created" value={new Date(keyInfo.created_at).toLocaleDateString()} />
                  <InfoCard label="Resets" value={new Date(keyInfo.usage_reset_at).toLocaleDateString()} />
                  {keyInfo.approved_at && (
                    <InfoCard label="Approved" value={new Date(keyInfo.approved_at).toLocaleDateString()} />
                  )}
                  {keyInfo.last_used_at && (
                    <InfoCard label="Last Used" value={new Date(keyInfo.last_used_at).toLocaleDateString()} />
                  )}
                </div>

                {/* Upgrade CTA */}
                {keyInfo.status === 'approved' && keyInfo.tier === 'free' && (
                  <div className="p-3 rounded-xl border border-accent-amber/30" style={{ background: 'rgba(232,148,10,0.08)' }}>
                    <p className="text-sm font-medium mb-2">Need more requests?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpgrade('basic')}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold border-none cursor-pointer"
                        style={{ background: 'linear-gradient(135deg, #E8940A, #F5A623)', color: '#000' }}
                      >
                        Basic — $29/mo
                      </button>
                      <button
                        onClick={() => handleUpgrade('pro')}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold border border-accent-amber/40 bg-transparent text-accent-amber cursor-pointer"
                      >
                        Pro — $99/mo
                      </button>
                    </div>
                  </div>
                )}

                {keyInfo.status === 'pending' && (
                  <div className="p-3 rounded-xl bg-yellow-400/10 border border-yellow-400/30">
                    <p className="text-sm text-yellow-400">
                      Your application is pending review. You'll receive an email when approved.
                    </p>
                  </div>
                )}

                {keyInfo.status === 'revoked' && (
                  <div className="p-3 rounded-xl bg-red-400/10 border border-red-400/30">
                    <p className="text-sm text-red-400">
                      This API key has been revoked. Contact support for more information.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="h-12" />
        <Footer />
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-surface p-2.5 rounded-lg">
      <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-sm text-text-primary truncate">{value}</div>
    </div>
  );
}

function EndpointDoc({ method, path, desc, params, tier }: {
  method: string; path: string; desc: string; params: string[]; tier: string;
}) {
  return (
    <div className="border-b border-border-subtle pb-4 last:border-0 last:pb-0">
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
          method === 'GET' ? 'bg-blue-400/20 text-blue-400' : 'bg-green-400/20 text-green-400'
        }`}>
          {method}
        </span>
        <code className="text-sm text-text-primary">{path}</code>
        <span className="text-[10px] text-text-secondary ml-auto">{tier}</span>
      </div>
      <p className="text-xs text-text-secondary mb-2">{desc}</p>
      <ul className="space-y-0.5">
        {params.map(p => (
          <li key={p} className="text-xs text-text-tertiary">
            <code className="text-accent-amber">{p.split(' — ')[0]}</code>
            {p.includes(' — ') && <span className="text-text-secondary"> — {p.split(' — ')[1]}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
