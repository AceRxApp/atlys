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
    <div className="font-sans max-w-[800px] mx-auto px-5 py-10 bg-bg-body min-h-screen text-text-primary">
      <div className="text-center mb-10">
        <h1 className="text-[32px] font-bold mb-2">
          {'\u{1F50C}'} Supabase Connection Test
        </h1>
        <p className="text-text-secondary text-base">NxStops by Nav{'\u00E9'}</p>
      </div>

      <div className={`p-5 rounded-xl mb-6 text-center border ${
        status === 'connected' ? 'bg-green-tint-bg border-green-tint-border' :
        status === 'error' ? 'bg-red-tint-bg border-red-tint-border' :
        'bg-amber-tint-bg10 border-amber-tint-border20'
      }`}>
        {status === 'loading' && (
          <>
            <div className="text-2xl mb-2">{'\u23F3'}</div>
            <div>Connecting to Supabase...</div>
          </>
        )}
        {status === 'connected' && (
          <>
            <div className="text-2xl mb-2">{'\u2705'}</div>
            <div className="text-status-green font-semibold">Connected Successfully!</div>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-2xl mb-2">{'\u274C'}</div>
            <div className="text-status-red font-semibold">Connection Failed</div>
            <div className="text-text-secondary mt-2 text-sm">{error}</div>
          </>
        )}
      </div>

      {status === 'connected' && (
        <>
          <div className="bg-bg-surface rounded-xl p-5 mb-5 border border-border-subtle">
            <h3 className="text-sm font-semibold text-accent-amber mb-4">
              DATABASE STATS
            </h3>
            <div className="flex gap-10 justify-center">
              <div className="text-center">
                <div className="text-[48px] font-bold text-accent-amber">{cities.length}</div>
                <div className="text-text-secondary">Cities</div>
              </div>
              <div className="text-center">
                <div className="text-[48px] font-bold text-accent-amber">{places.length}</div>
                <div className="text-text-secondary">Places in {selectedCity?.name}</div>
              </div>
            </div>
          </div>

          <div className="bg-bg-surface rounded-xl p-5 mb-5 border border-border-subtle">
            <h3 className="text-sm font-semibold text-accent-amber mb-4">
              SELECT A CITY
            </h3>
            <select
              className="w-full px-4 py-3 rounded-lg border border-border-strong bg-bg-body text-text-primary text-base"
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

          <div className="bg-bg-surface rounded-xl p-5 border border-border-subtle">
            <h3 className="text-sm font-semibold text-accent-amber mb-4">
              PLACES IN {selectedCity?.name?.toUpperCase()} ({places.length})
            </h3>
            {places.length === 0 ? (
              <div className="text-text-secondary text-center p-5">
                No places found for this city.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {places.map(place => (
                  <div key={place.id} className="p-4 bg-bg-body rounded-[10px] border border-border-subtle">
                    <div className="font-semibold text-base">{place.name}</div>
                    <div className="text-text-secondary text-sm mt-1">
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
