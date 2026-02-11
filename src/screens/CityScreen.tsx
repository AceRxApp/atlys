import { useParams, Link, Navigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { CITY_COORDS } from '../data/cityCoords';
import Footer from '../components/Footer';

// Top cities for SEO landing pages — slug → display name + tagline
const CITY_META: Record<string, { name: string; country: string; tagline: string; description: string }> = {
  'new-york': { name: 'New York', country: 'USA', tagline: 'The city that never sleeps', description: 'Discover the best restaurants, hidden speakeasies, rooftop bars, world-class museums, and iconic landmarks in New York City.' },
  'los-angeles': { name: 'Los Angeles', country: 'USA', tagline: 'Where dreams meet the Pacific', description: 'Explore LA\'s best tacos, beachside cafes, hiking trails, art galleries, and nightlife from Hollywood to Venice Beach.' },
  'miami': { name: 'Miami', country: 'USA', tagline: 'Sun, art, and endless vibes', description: 'Find the hottest spots in Miami — from South Beach clubs and Little Havana cafes to Wynwood murals and waterfront dining.' },
  'chicago': { name: 'Chicago', country: 'USA', tagline: 'Bold architecture, bolder flavors', description: 'Deep-dish pizza, jazz clubs, lakefront parks, and world-renowned museums — discover what makes Chicago unforgettable.' },
  'atlanta': { name: 'Atlanta', country: 'USA', tagline: 'Where culture runs deep', description: 'ATL\'s best soul food spots, live music venues, historic landmarks, and trendy neighborhoods all in one place.' },
  'houston': { name: 'Houston', country: 'USA', tagline: 'Space City\'s hidden treasures', description: 'Houston\'s diverse food scene, space center, art districts, and vibrant nightlife — all waiting to be explored.' },
  'london': { name: 'London', country: 'UK', tagline: 'Timeless and ever-changing', description: 'From Borough Market to Shoreditch, discover London\'s best pubs, galleries, parks, and secret spots.' },
  'paris': { name: 'Paris', country: 'France', tagline: 'The City of Light', description: 'Parisian cafes, hidden courtyards, world-famous museums, and the best croissants — explore Paris like a local.' },
  'tokyo': { name: 'Tokyo', country: 'Japan', tagline: 'Where tradition meets the future', description: 'Ramen shops, cherry blossom parks, neon-lit streets, and serene temples — discover Tokyo\'s endless layers.' },
  'toronto': { name: 'Toronto', country: 'Canada', tagline: 'The world in one city', description: 'Toronto\'s diverse neighborhoods, waterfront dining, CN Tower views, and vibrant arts scene await.' },
  'dubai': { name: 'Dubai', country: 'UAE', tagline: 'Luxury meets adventure', description: 'Desert safaris, sky-high dining, traditional souks, and futuristic architecture — experience Dubai\'s contrasts.' },
  'barcelona': { name: 'Barcelona', country: 'Spain', tagline: 'Gaudi\'s playground', description: 'Tapas bars, Gothic Quarter strolls, beach vibes, and Sagrada Familia — Barcelona has it all.' },
  'amsterdam': { name: 'Amsterdam', country: 'Netherlands', tagline: 'Canals, culture, and creativity', description: 'Bike along canals, visit world-class museums, and discover cozy cafes in Amsterdam.' },
  'accra': { name: 'Accra', country: 'Ghana', tagline: 'West Africa\'s vibrant heart', description: 'Accra\'s buzzing markets, beachfront bars, jollof rice joints, and cultural landmarks — explore Ghana\'s capital.' },
  'lagos': { name: 'Lagos', country: 'Nigeria', tagline: 'Africa\'s city of hustle', description: 'Lagos\' explosive food scene, Afrobeats nightlife, art galleries, and island getaways.' },
  'cape-town': { name: 'Cape Town', country: 'South Africa', tagline: 'Where mountains meet the sea', description: 'Table Mountain hikes, wine estates, waterfront dining, and vibrant Bo-Kaap — Cape Town is breathtaking.' },
  'nairobi': { name: 'Nairobi', country: 'Kenya', tagline: 'Safari meets city life', description: 'Nairobi\'s craft coffee shops, national park, vibrant markets, and emerging food scene.' },
  'kingston': { name: 'Kingston', country: 'Jamaica', tagline: 'Reggae, rum, and real vibes', description: 'Bob Marley Museum, jerk chicken spots, Blue Mountain coffee, and Kingston\'s pulsing nightlife.' },
  'mexico-city': { name: 'Mexico City', country: 'Mexico', tagline: 'A feast for every sense', description: 'Street tacos, ancient ruins, Frida Kahlo\'s house, and mezcal bars — Mexico City is unforgettable.' },
  'san-juan': { name: 'San Juan', country: 'Puerto Rico', tagline: 'Color, rhythm, and ocean breeze', description: 'Old San Juan\'s cobblestone streets, mofongo spots, rooftop bars, and stunning beaches.' },
};

export default function CityScreen() {
  const { slug } = useParams<{ slug: string }>();
  const { theme } = useTheme();

  const meta = slug ? CITY_META[slug] : null;
  if (!meta) return <Navigate to="/" replace />;

  const coordKey = meta.name.toLowerCase();
  const coords = CITY_COORDS[coordKey];

  return (
    <div style={{
      fontFamily: "'DM Sans', system-ui, sans-serif",
      background: theme.bg.body,
      minHeight: '100vh',
      color: theme.text.primary,
    }}>
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '40px 24px 60px' }}>
        {/* Back */}
        <Link to="/" style={{ color: theme.accent.amber, textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>
          &larr; Back to NxStops
        </Link>

        {/* Hero */}
        <div style={{ marginTop: '32px', marginBottom: '40px' }}>
          <div style={{ fontSize: '12px', color: theme.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
            {meta.country}
          </div>
          <h1 style={{
            fontSize: '36px', fontWeight: 700, marginBottom: '8px', lineHeight: 1.1,
            background: theme.accent.amberTextGradient,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            {meta.name}
          </h1>
          <p style={{ fontSize: '18px', color: theme.text.secondary, fontStyle: 'italic', marginBottom: '16px' }}>
            {meta.tagline}
          </p>
          <p style={{ fontSize: '15px', color: theme.text.body, lineHeight: 1.7 }}>
            {meta.description}
          </p>
        </div>

        {/* What you can do */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
            What to explore in {meta.name}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[
              { icon: '\u{1F37D}\u{FE0F}', title: 'Food & Drinks', desc: 'Restaurants, cafes, bars, and local eats' },
              { icon: '\u{1F3E8}', title: 'Places to Stay', desc: 'Hotels, boutique stays, and hostels' },
              { icon: '\u{1F3AD}', title: 'Things to Do', desc: 'Museums, attractions, and nightlife' },
              { icon: '\u{1F48E}', title: 'Hidden Gems', desc: 'Parks, bookstores, and local favorites' },
            ].map((item, i) => (
              <div key={i} style={{
                padding: '16px',
                background: theme.bg.surface,
                borderRadius: '14px',
                border: `1px solid ${theme.border.subtle}`,
              }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{item.icon}</div>
                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{item.title}</div>
                <div style={{ fontSize: '12px', color: theme.text.secondary, lineHeight: 1.4 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{
          textAlign: 'center', padding: '32px 24px',
          background: theme.bg.surface,
          borderRadius: '16px',
          border: `1px solid ${theme.amberTint.border20}`,
          marginBottom: '40px',
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
            Ready to explore {meta.name}?
          </h2>
          <p style={{ color: theme.text.secondary, fontSize: '14px', marginBottom: '20px' }}>
            Discover places, plan your trip, and find events — all free on NxStops.
          </p>
          <Link to="/" style={{
            display: 'inline-block',
            padding: '14px 32px',
            borderRadius: '14px',
            background: theme.accent.amberGradient,
            color: theme.text.onAccent,
            fontWeight: 600,
            fontSize: '16px',
            textDecoration: 'none',
          }}>
            Open NxStops
          </Link>
        </div>

        {coords && (
          <p style={{ fontSize: '12px', color: theme.text.tertiary, textAlign: 'center' }}>
            {meta.name} coordinates: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
          </p>
        )}
      </div>

      <Footer />
    </div>
  );
}
