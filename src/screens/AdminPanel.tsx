import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { CloseIcon } from '../components/icons';
import { fetchReports, updateReportStatus, deleteReviewById, fetchPendingStops, updateStopStatus, deleteUserStop } from '../supabase';
import type { UserStop } from '../supabase';

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

  const [adminReports, setAdminReports] = useState<{ id: string; reporter_id: string; content_type: string; content_id: string; reason: string; details: string | null; status: string; created_at: string }[]>([]);
  const [pendingStops, setPendingStops] = useState<UserStop[]>([]);

  useEffect(() => {
    fetchReports().then(setAdminReports);
    fetchPendingStops().then(setPendingStops);
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

  return (
    <div className="fixed inset-0 bg-bg-body z-[200] overflow-auto max-w-[430px] mx-auto">
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
        {(['dashboard', 'signups', 'cities', 'reports', 'stops'] as const).map(tab => (
          <button key={tab}
            onClick={() => setAdminTab(tab)}
            className={`flex-1 p-3 text-[13px] font-medium bg-transparent border-none cursor-pointer border-b-2 whitespace-nowrap ${adminTab === tab ? 'text-accent-amber border-b-accent-amber' : 'text-text-tertiary border-b-transparent'}`}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="p-5">
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
                    { label: 'Email Signups', value: adminSignups.length, emoji: '📬' },
                    { label: 'Total Cities', value: adminCities.length, emoji: '🏙️' },
                    { label: 'Active Cities', value: adminCities.filter(c => c.is_active).length, emoji: '✅' },
                    { label: 'Inactive Cities', value: adminCities.filter(c => !c.is_active).length, emoji: '⏸️' },
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
          </>
        )}
      </div>
    </div>
  );
}
