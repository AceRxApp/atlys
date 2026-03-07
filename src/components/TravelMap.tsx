import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';

interface TravelMapProps {
  cities: { name: string; lat: number; lng: number }[];
  apiKey: string;
}

export default function TravelMap({ cities, apiKey }: TravelMapProps) {
  if (cities.length === 0 || !apiKey) return null;

  // Compute center from all cities
  const avgLat = cities.reduce((sum, c) => sum + c.lat, 0) / cities.length;
  const avgLng = cities.reduce((sum, c) => sum + c.lng, 0) / cities.length;

  return (
    <div className="w-full h-[200px] rounded-2xl overflow-hidden border border-border-subtle">
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={{ lat: avgLat, lng: avgLng }}
          defaultZoom={cities.length === 1 ? 6 : 2}
          mapId="travel-map"
          disableDefaultUI
          gestureHandling="none"
          style={{ width: '100%', height: '100%' }}
          colorScheme="DARK"
        >
          {cities.map((city, i) => (
            <AdvancedMarker key={i} position={{ lat: city.lat, lng: city.lng }}>
              <div className="w-3.5 h-3.5 rounded-full bg-accent-amber border-2 border-white shadow-md" />
            </AdvancedMarker>
          ))}
        </Map>
      </APIProvider>
    </div>
  );
}
