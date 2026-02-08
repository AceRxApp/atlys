import { useState, useEffect } from 'react';
import { supabase, fetchCities, fetchPlacesByCity } from './supabase';

interface City {
  id: string;
  slug: string;
  name: string;
  country: string;
  region: string;
}

interface Place {
  id: string;
  name: string;
  blurb: string;
  address: string;
  category: string;
  tags: string[];
  open_time: string;
  close_time: string;
  safety_rating: string;
}

export default function SupabaseTest() {
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function testConnection() {
      try {
        const { data, error } = await supabase.from('cities').select('id').limit(1);
        if (error) throw error;

        const citiesData = await fetchCities();
        if (citiesData.length === 0) {
          setStatus('error');
          setError('No cities found in database');
          return;
        }

        setCities(citiesData);
        setStatus('connected');
        setSelectedCity(citiesData[0]);
      } catch (err: any) {
        setStatus('error');
        setError(err.message || 'Unknown error');
      }
    }

    testConnection();
  }, []);

  useEffect(() => {
    async function loadPlaces() {
      if (!selectedCity) return;
      const placesData = await fetchPlacesByCity(selectedCity.id);
      setPlaces(placesData);
    }
    loadPlaces();
  }, [selectedCity]);

  return (
    <div style={{
      fontFamily: 'system-ui, sans-serif',
      maxWidth: '800px',
      margin: '0 auto',
      padding: '40px 20px',
      background: '#0C0A09',
      minHeight: '100vh',
      color: '#FFFBEB'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>
          🔌 Supabase Connection Test
        </h1>
        <p style={{ color: '#A8A29E', fontSize: '16px' }}>NxStops by Navé</p>
      </div>

      <div style={{
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '24px',
        textAlign: 'center',
        background: status === 'connected' ? 'rgba(52, 211, 153, 0.15)' :
                   status === 'error' ? 'rgba(248, 113, 113, 0.15)' :
                   'rgba(245, 158, 11, 0.15)',
        border: `1px solid ${status === 'connected' ? 'rgba(52, 211, 153, 0.3)' :
                            status === 'error' ? 'rgba(248, 113, 113, 0.3)' :
                            'rgba(245, 158, 11, 0.3)'}`
      }}>
        {status === 'loading' && (
          <>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
            <div>Connecting to Supabase...</div>
          </>
        )}
        {status === 'connected' && (
          <>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>✅</div>
            <div style={{ color: '#34D399', fontWeight: 600 }}>Connected Successfully!</div>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>❌</div>
            <div style={{ color: '#F87171', fontWeight: 600 }}>Connection Failed</div>
            <div style={{ color: '#A8A29E', marginTop: '8px', fontSize: '14px' }}>{error}</div>
          </>
        )}
      </div>

      {status === 'connected' && (
        <>
          <div style={{
            background: '#1C1917',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
            border: '1px solid rgba(255,255,255,0.06)'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#F59E0B', marginBottom: '16px' }}>
              DATABASE STATS
            </h3>
            <div style={{ display: 'flex', gap: '40px', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', fontWeight: 700, color: '#F59E0B' }}>{cities.length}</div>
                <div style={{ color: '#A8A29E' }}>Cities</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', fontWeight: 700, color: '#F59E0B' }}>{places.length}</div>
                <div style={{ color: '#A8A29E' }}>Places in {selectedCity?.name}</div>
              </div>
            </div>
          </div>

          <div style={{
            background: '#1C1917',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
            border: '1px solid rgba(255,255,255,0.06)'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#F59E0B', marginBottom: '16px' }}>
              SELECT A CITY
            </h3>
            <select
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: '#0C0A09',
                color: '#FFFBEB',
                fontSize: '16px'
              }}
              value={selectedCity?.id || ''}
              onChange={(e) => {
                const city = cities.find(c => c.id === e.target.value);
                setSelectedCity(city || null);
              }}
            >
              {cities.map(city => (
                <option key={city.id} value={city.id}>
                  {city.name}, {city.country}
                </option>
              ))}
            </select>
          </div>

          <div style={{
            background: '#1C1917',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid rgba(255,255,255,0.06)'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#F59E0B', marginBottom: '16px' }}>
              PLACES IN {selectedCity?.name?.toUpperCase()} ({places.length})
            </h3>
            {places.length === 0 ? (
              <div style={{ color: '#A8A29E', textAlign: 'center', padding: '20px' }}>
                No places found for this city.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {places.map(place => (
                  <div key={place.id} style={{
                    padding: '16px',
                    background: '#0C0A09',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.06)'
                  }}>
                    <div style={{ fontWeight: 600, fontSize: '16px' }}>{place.name}</div>
                    <div style={{ color: '#A8A29E', fontSize: '14px', marginTop: '4px' }}>
                      {place.blurb}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
