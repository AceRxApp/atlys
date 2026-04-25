import { useParams, Link, Navigate } from 'react-router-dom';
import { lookupCityCoords } from '../data/cityCoords';
import Footer from '../components/Footer';

// Top cities for SEO landing pages — slug -> display name + tagline
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
  'sarasota': { name: 'Sarasota', country: 'USA', tagline: 'Gulf Coast charm and culture', description: 'Sarasota\'s stunning beaches, world-class dining from rooftop steakhouses to waterfront seafood, Ringling Museum, and vibrant arts scene on Florida\'s Gulf Coast.' },
};

export default function CityScreen() {
  const { slug } = useParams<{ slug: string }>();

  const meta = slug ? CITY_META[slug] : null;
  if (!meta) return <Navigate to="/" replace />;

  const coords = lookupCityCoords(meta.name);

  return (
    <div className="font-sans bg-bg-body min-h-screen text-text-primary">
      <div className="max-w-[700px] mx-auto px-6 pt-10 pb-[60px]">
        {/* Back */}
        <Link to="/" className="text-accent-amber no-underline text-sm font-medium">
          &larr; Back to NxStops
        </Link>

        {/* Hero */}
        <div className="mt-8 mb-10">
          <div className="text-xs text-text-tertiary uppercase tracking-[0.1em] mb-2">
            {meta.country}
          </div>
          <h1 className="font-heading text-4xl font-bold mb-2 leading-[1.1] bg-accent-text-gradient">
            {meta.name}
          </h1>
          <p className="text-lg text-text-secondary italic mb-4">
            {meta.tagline}
          </p>
          <p className="text-[15px] text-text-body leading-[1.7]">
            {meta.description}
          </p>
        </div>

        {/* What you can do */}
        <div className="mb-10">
          <h2 className="text-xl font-bold mb-4">
            What to explore in {meta.name}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: '\u{1F37D}\u{FE0F}', title: 'Food & Drinks', desc: 'Restaurants, cafes, bars, and local eats' },
              { icon: '\u{1F3E8}', title: 'Places to Stay', desc: 'Hotels, boutique stays, and hostels' },
              { icon: '\u{1F3AD}', title: 'Things to Do', desc: 'Museums, attractions, and nightlife' },
              { icon: '\u{1F48E}', title: 'Hidden Gems', desc: 'Parks, bookstores, and local favorites' },
            ].map((item, i) => (
              <div key={i} className="p-4 bg-bg-surface rounded-[14px] border border-border-subtle">
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="font-semibold text-sm mb-1">{item.title}</div>
                <div className="text-xs text-text-secondary leading-[1.4]">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center px-6 py-8 bg-bg-surface rounded-2xl border border-amber-tint-border20 mb-10">
          <h2 className="text-xl font-bold mb-2">
            Ready to explore {meta.name}?
          </h2>
          <p className="text-text-secondary text-sm mb-5">
            Discover places, plan your trip, and find events — all free on NxStops.
          </p>
          <Link to="/" className="inline-block px-8 py-3.5 rounded-[14px] bg-accent-gradient text-text-on-accent font-semibold text-base no-underline">
            Open NxStops
          </Link>
        </div>

        {coords && (
          <p className="text-xs text-text-tertiary text-center">
            {meta.name} coordinates: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
          </p>
        )}
      </div>

      <Footer />
    </div>
  );
}
