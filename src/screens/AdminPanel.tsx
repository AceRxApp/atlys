import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { CloseIcon } from '../components/icons';
import { fetchReports, updateReportStatus, deleteReviewById, fetchPendingStops, updateStopStatus, deleteUserStop, uploadDishImage, fetchDishImages, deleteDishImage } from '../supabase';
import type { UserStop, DishImageRecord } from '../supabase';

export default function AdminPanel() {
  const {
    setShowAdmin,
    adminTab,
    setAdminTab,
    adminLoading,
    adminSignups,
    adminCities,
    adminUsers,
    adminHealth,
    handleToggleCity,
  } = useApp();

  const [adminReports, setAdminReports] = useState<{ id: string; reporter_id: string; content_type: string; content_id: string; reason: string; details: string | null; status: string; created_at: string }[]>([]);
  const [pendingStops, setPendingStops] = useState<UserStop[]>([]);
  const [dishImages, setDishImages] = useState<DishImageRecord[]>([]);
  const [dishName, setDishName] = useState('');
  const [dishRestaurant, setDishRestaurant] = useState('');
  const [dishUploading, setDishUploading] = useState(false);
  const [dishMsg, setDishMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [adminError, setAdminError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchReports().then(setAdminReports),
      fetchPendingStops().then(setPendingStops),
      fetchDishImages().then(setDishImages),
    ]).catch(err => {
      console.error('Admin panel data load error:', err);
      setAdminError('Some admin data failed to load. Check Supabase RLS policies.');
    });
  }, []);

  const handleResolveReport = useCallback(async (reportId: string, status: 'resolved' | 'dismissed') => {
    const success = await updateReportStatus(reportId, status);
    if (success) {
      setAdminReports(prev => prev.map(r => r.id === reportId ? { ...r, status } : r));
    }
  }, []);

  const handleDeleteReportedContent = useCallback(async (reportId: string, contentId: string) => {
    const deleted = await deleteReviewById(contentId);
    if (deleted) {
      await updateReportStatus(reportId, 'resolved');
      setAdminReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r));
    }
  }, []);

  const handleDishImageUpload = useCallback(async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !dishName.trim()) {
      setDishMsg('Enter a dish name and select an image.');
      return;
    }
    setDishUploading(true);
    setDishMsg(null);
    const { url, error } = await uploadDishImage(dishName.trim(), file, dishRestaurant.trim() || undefined);
    if (error) {
      setDishMsg(`Error: ${error}`);
    } else if (url) {
      const label = dishRestaurant.trim() ? `"${dishName.trim()}" at ${dishRestaurant.trim()}` : `"${dishName.trim()}"`;
      setDishMsg(`Uploaded ${label} successfully.`);
      setDishName('');
      setDishRestaurant('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchDishImages().then(setDishImages);
    }
    setDishUploading(false);
  }, [dishName, dishRestaurant]);

  const handleDeleteDishImage = useCallback(async (id: string, imageUrl: string) => {
    const ok = await deleteDishImage(id, imageUrl);
    if (ok) setDishImages(prev => prev.filter(d => d.id !== id));
  }, []);

  return (
    <div className="fixed inset-0 bg-bg-body z-[200] overflow-auto max-w-[430px] md:max-w-[768px] lg:max-w-[1024px] mx-auto">
      {/* Admin Header */}
      <div className="px-5 py-4 flex justify-between items-center border-b border-border-subtle">
        <div>
          <h1 className="text-xl font-bold">Admin Panel</h1>
          <p className="text-text-tertiary text-[11px]">NxStops by Nav&eacute;</p>
        </div>
        <button onClick={() => setShowAdmin(false)}
          aria-label="Close admin panel"
          className="bg-transparent border-none text-text-tertiary cursor-pointer p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center">
          <CloseIcon />
        </button>
      </div>

      {/* Admin Tabs */}
      <div className="flex border-b border-border-subtle overflow-x-auto scroll-hidden">
        {(['dashboard', 'signups', 'users', 'cities', 'reports', 'stops', 'dish-images', 'health'] as const).map(tab => (
          <button key={tab}
            onClick={() => setAdminTab(tab)}
            className={`flex-1 p-3 text-[13px] font-medium bg-transparent border-none cursor-pointer border-b-2 whitespace-nowrap ${adminTab === tab ? 'text-accent-amber border-b-accent-amber' : 'text-text-tertiary border-b-transparent'}`}>
            {tab === 'dish-images' ? 'Dishes' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="p-5">
        {adminError && (
          <div className="mb-4 p-3 rounded-xl bg-red-tint-bg border border-red-tint-border text-status-red text-xs">
            {adminError}
          </div>
        )}
        {adminLoading ? (
          <div className="text-center p-10">
            <div className="text-text-tertiary text-sm">Loading admin data...</div>
          </div>
        ) : (
          <>
            {/* Dashboard */}
            {adminTab === 'dashboard' && (
              <div>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {[
                    { label: 'Email Signups', value: adminSignups.length, emoji: '\u{1F4EC}' },
                    { label: 'Registered Users', value: adminUsers.length, emoji: '\u{1F465}' },
                    { label: 'Total Cities', value: adminCities.length, emoji: '\u{1F3D9}\u{FE0F}' },
                    { label: 'Active Cities', value: adminCities.filter(c => c.is_active).length, emoji: '\u{2705}' },
                    { label: 'Pending Reports', value: adminReports.filter(r => r.status === 'pending').length, emoji: '\u{26A0}\u{FE0F}' },
                    { label: 'Pending Stops', value: pendingStops.length, emoji: '\u{1F4CD}' },
                  ].map(stat => (
                    <div key={stat.label} className="card">
                      <div className="text-2xl mb-1">{stat.emoji}</div>
                      <div className="text-[28px] font-bold text-text-primary">{stat.value}</div>
                      <div className="text-[11px] text-text-tertiary uppercase tracking-[0.05em]">{stat.label}</div>
                    </div>
                  ))}
                </div>

                <h3 className="text-sm font-semibold mb-3 text-text-secondary">Recent Signups</h3>
                {adminSignups.slice(0, 5).map(s => (
                  <div key={s.id} className="flex justify-between py-2.5 border-b border-bg-subtle text-[13px]">
                    <span className="text-text-primary">{s.email}</span>
                    <span className="text-text-tertiary">{s.city || 'No city'}</span>
                  </div>
                ))}
                {adminSignups.length === 0 && (
                  <p className="text-text-tertiary text-[13px]">No signups yet</p>
                )}

                {adminUsers.length > 0 && (
                  <>
                    <h3 className="text-sm font-semibold mb-3 mt-5 text-text-secondary">Recent Users</h3>
                    {adminUsers.slice(0, 5).map(u => (
                      <div key={u.id} className="flex justify-between py-2.5 border-b border-bg-subtle text-[13px]">
                        <span className="text-text-primary">{u.email || 'No email'}</span>
                        <span className="text-text-tertiary">{new Date(u.created_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Signups Tab */}
            {adminTab === 'signups' && (
              <div>
                <div className="flex justify-between mb-4">
                  <h3 className="text-base font-semibold">All Signups ({adminSignups.length})</h3>
                </div>
                {adminSignups.length === 0 ? (
                  <p className="text-text-tertiary text-sm text-center p-10">No signups yet.</p>
                ) : (
                  adminSignups.map(s => (
                    <div key={s.id} className="card flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-sm text-text-primary mb-0.5">{s.email}</div>
                        <div className="text-xs text-text-tertiary">
                          {s.city || 'No city selected'} · {new Date(s.signed_up_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-[11px] text-text-tertiary">
                        {new Date(s.signed_up_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Users Tab — Registered Supabase Auth users */}
            {adminTab === 'users' && (
              <div>
                <div className="flex justify-between mb-4">
                  <h3 className="text-base font-semibold">Registered Users ({adminUsers.length})</h3>
                </div>
                <p className="text-xs text-text-tertiary mb-4">
                  Users who created accounts via Supabase Auth. Fetched server-side with service role key.
                </p>
                {adminUsers.length === 0 ? (
                  <p className="text-text-tertiary text-sm text-center p-10">No registered users yet.</p>
                ) : (
                  adminUsers.map(u => (
                    <div key={u.id} className="card flex flex-col gap-1">
                      <div className="flex justify-between items-start">
                        <div className="font-semibold text-sm text-text-primary">{u.email || 'No email'}</div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          u.confirmed_at ? 'bg-green-tint-bg text-status-green' : 'bg-amber-tint-bg10 text-accent-amber'
                        }`}>
                          {u.confirmed_at ? 'Verified' : 'Unverified'}
                        </span>
                      </div>
                      <div className="text-xs text-text-tertiary">
                        Joined: {new Date(u.created_at).toLocaleDateString()}
                        {u.last_sign_in_at && ` · Last active: ${new Date(u.last_sign_in_at).toLocaleDateString()}`}
                      </div>
                      {u.user_metadata?.name != null && (
                        <div className="text-xs text-text-secondary">
                          Name: {String(u.user_metadata.name as string)}
                        </div>
                      )}
                      <div className="text-[10px] text-text-muted font-mono truncate">{u.id}</div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Cities Tab */}
            {adminTab === 'cities' && (
              <div>
                <div className="flex justify-between mb-4">
                  <h3 className="text-base font-semibold">All Cities ({adminCities.length})</h3>
                </div>
                {adminCities.map(city => (
                  <div key={city.id} className="card flex items-center gap-3">
                    {city.banner_url && (
                      <div
                        className="w-12 h-12 rounded-[10px] shrink-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${city.banner_url})` }}
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-text-primary">{city.name}</div>
                      <div className="text-xs text-text-tertiary">{city.country} · {city.region}</div>
                    </div>
                    <button
                      onClick={() => handleToggleCity(city.id, !!city.is_active)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer border-none ${city.is_active ? 'bg-green-tint-bg-strong text-status-green' : 'bg-red-tint-bg text-status-red'}`}
                    >
                      {city.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Stops Tab */}
            {adminTab === 'stops' && (
              <div>
                <div className="flex justify-between mb-4">
                  <h3 className="text-base font-semibold">Pending Stops ({pendingStops.length})</h3>
                </div>
                <p className="text-xs text-text-tertiary mb-4">
                  User-submitted places awaiting approval. Approve to make them visible, reject to hide, or delete permanently.
                </p>
                {pendingStops.length === 0 ? (
                  <p className="text-text-tertiary text-sm text-center p-10">No pending stops to review.</p>
                ) : (
                  pendingStops.map(stop => (
                    <div key={stop.id} className="card flex flex-col gap-2 !border-amber-tint-border20">
                      <div>
                        <div className="font-semibold text-sm text-text-primary mb-0.5">{stop.name}</div>
                        <div className="text-xs text-text-tertiary mb-1">
                          {stop.category} · {stop.city_slug} · {new Date(stop.created_at).toLocaleDateString()}
                        </div>
                        {stop.description && (
                          <p className="text-[13px] text-text-secondary mt-1 mb-0">{stop.description}</p>
                        )}
                        <div className="text-[11px] text-text-muted mt-1">
                          Lat: {stop.lat.toFixed(4)}, Lng: {stop.lng.toFixed(4)}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={async () => {
                            const ok = await updateStopStatus(stop.id, 'approved');
                            if (ok) setPendingStops(prev => prev.filter(s => s.id !== stop.id));
                          }}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer border-none bg-green-tint-bg-strong text-status-green">
                          Approve
                        </button>
                        <button
                          onClick={async () => {
                            const ok = await updateStopStatus(stop.id, 'rejected');
                            if (ok) setPendingStops(prev => prev.filter(s => s.id !== stop.id));
                          }}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer border-none bg-bg-subtle-strong text-text-tertiary">
                          Reject
                        </button>
                        <button
                          onClick={async () => {
                            const ok = await deleteUserStop(stop.id);
                            if (ok) setPendingStops(prev => prev.filter(s => s.id !== stop.id));
                          }}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer border-none bg-red-tint-bg text-status-red">
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Dish Images Tab */}
            {adminTab === 'dish-images' && (
              <div>
                <h3 className="text-base font-semibold mb-4">Custom Dish Photos</h3>
                <p className="text-xs text-text-tertiary mb-4">
                  Upload photos for niche dishes that stock APIs can't find (e.g. Chofi, Tatale, Tuo Zaafi).
                  These appear first in TasteLens results.
                </p>

                {/* Upload form */}
                <div className="card !border-amber-tint-border20 mb-5">
                  <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1.5">Restaurant</label>
                  <input
                    type="text"
                    value={dishRestaurant}
                    onChange={e => setDishRestaurant(e.target.value)}
                    placeholder="e.g. Buka Restaurant, The Chop Bar"
                    className="w-full p-2.5 rounded-lg border border-border-medium bg-bg-body text-text-primary text-sm mb-3"
                  />
                  <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1.5">Dish Name</label>
                  <input
                    type="text"
                    value={dishName}
                    onChange={e => setDishName(e.target.value)}
                    placeholder="e.g. Chofi, Tuo Zaafi, Tatale"
                    className="w-full p-2.5 rounded-lg border border-border-medium bg-bg-body text-text-primary text-sm mb-3"
                  />
                  <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1.5">Photo</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="w-full text-sm text-text-secondary mb-3"
                  />
                  <button
                    onClick={handleDishImageUpload}
                    disabled={dishUploading || !dishName.trim()}
                    className={`w-full py-2.5 rounded-lg text-sm font-semibold border-none cursor-pointer ${
                      dishUploading || !dishName.trim()
                        ? 'bg-bg-subtle-strong text-text-tertiary opacity-50'
                        : 'bg-accent-amber text-bg-body'
                    }`}
                  >
                    {dishUploading ? 'Uploading...' : 'Upload Dish Photo'}
                  </button>
                  {dishMsg && (
                    <p className={`text-xs mt-2 ${dishMsg.startsWith('Error') ? 'text-status-red' : 'text-status-green'}`}>
                      {dishMsg}
                    </p>
                  )}
                </div>

                {/* Existing images */}
                <h4 className="text-sm font-semibold mb-3 text-text-secondary">
                  Uploaded ({dishImages.length})
                </h4>
                {dishImages.length === 0 ? (
                  <p className="text-text-tertiary text-sm text-center p-10">No custom dish images yet.</p>
                ) : (
                  dishImages.map(img => (
                    <div key={img.id} className="card flex gap-3 items-center">
                      <img
                        src={img.image_url}
                        alt={img.dish_name}
                        className="w-16 h-16 rounded-lg object-cover shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-text-primary capitalize">{img.dish_name}</div>
                        <div className="text-[11px] text-text-tertiary">
                          {img.restaurant && <span className="text-accent-amber">{img.restaurant} · </span>}
                          {new Date(img.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteDishImage(img.id, img.image_url)}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer border-none bg-red-tint-bg text-status-red shrink-0"
                      >
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Reports Tab */}
            {adminTab === 'reports' && (
              <div>
                <div className="flex justify-between mb-4">
                  <h3 className="text-base font-semibold">Content Reports ({adminReports.length})</h3>
                </div>
                {adminReports.length === 0 ? (
                  <p className="text-text-tertiary text-sm text-center p-10">No reports yet.</p>
                ) : (
                  adminReports.map(report => (
                    <div key={report.id} className={`card flex flex-col gap-2 ${report.status === 'pending' ? '!border-red-tint-border' : '!border-border-subtle'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              report.status === 'pending' ? 'bg-red-tint-bg text-status-red' : 'bg-green-tint-bg text-status-green'
                            }`}>
                              {report.status}
                            </span>
                            <span className="text-[11px] text-text-tertiary">
                              {report.content_type} · {report.reason}
                            </span>
                          </div>
                          <div className="text-xs text-text-tertiary">
                            ID: {report.content_id.slice(0, 20)}...
                          </div>
                          {report.details && (
                            <p className="text-[13px] text-text-secondary mt-1">{report.details}</p>
                          )}
                          <div className="text-[11px] text-text-muted mt-1">
                            {new Date(report.created_at).toLocaleDateString()} {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                      {report.status === 'pending' && (
                        <div className="flex gap-2 mt-1">
                          <button
                            onClick={() => handleResolveReport(report.id, 'resolved')}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer border-none bg-green-tint-bg-strong text-status-green">
                            Resolve
                          </button>
                          <button
                            onClick={() => handleResolveReport(report.id, 'dismissed')}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer border-none bg-bg-subtle-strong text-text-tertiary">
                            Dismiss
                          </button>
                          {report.content_type === 'review' && (
                            <button
                              onClick={() => handleDeleteReportedContent(report.id, report.content_id)}
                              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer border-none bg-red-tint-bg text-status-red">
                              Delete Review
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Health Tab — System health checks */}
            {adminTab === 'health' && (
              <div>
                <div className="flex justify-between mb-4">
                  <h3 className="text-base font-semibold">System Health</h3>
                </div>
                <p className="text-xs text-text-tertiary mb-4">
                  Server-side health checks run each time you open the admin panel. Each check tests Supabase table access and auth service connectivity.
                </p>
                {adminHealth.length === 0 ? (
                  <p className="text-text-tertiary text-sm text-center p-10">No health data available. Close and reopen admin to run checks.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {adminHealth.map((check, i) => (
                      <div key={i} className={`card flex items-center gap-3 ${
                        check.status === 'ok' ? '!border-green-tint-border' : '!border-red-tint-border'
                      }`}>
                        <div className={`w-3 h-3 rounded-full shrink-0 ${
                          check.status === 'ok' ? 'bg-status-green' : 'bg-status-red'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-text-primary">{check.name}</div>
                          {check.detail && (
                            <div className="text-[11px] text-text-tertiary truncate">{check.detail}</div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`text-xs font-semibold ${check.status === 'ok' ? 'text-status-green' : 'text-status-red'}`}>
                            {check.status.toUpperCase()}
                          </div>
                          {check.ms != null && (
                            <div className="text-[10px] text-text-muted">{check.ms}ms</div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Summary */}
                    <div className="card mt-2">
                      <div className="text-center">
                        <div className="text-2xl mb-1">
                          {adminHealth.every(c => c.status === 'ok') ? '\u{2705}' : '\u{26A0}\u{FE0F}'}
                        </div>
                        <div className="text-sm font-semibold text-text-primary">
                          {adminHealth.every(c => c.status === 'ok')
                            ? 'All systems operational'
                            : `${adminHealth.filter(c => c.status === 'error').length} service(s) have issues`
                          }
                        </div>
                        <div className="text-[11px] text-text-tertiary mt-1">
                          {adminHealth.filter(c => c.status === 'ok').length}/{adminHealth.length} checks passed
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
