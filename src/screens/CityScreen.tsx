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

  // ─── Mid-sized US cities ────────────────────────────────────────────────────
  'albuquerque-nm': { name: 'Albuquerque, NM', country: 'USA', tagline: 'Where desert meets art and chile', description: 'Old Town pueblo charm, Sandia Tram views, hot air balloons over the Rio Grande, and green chile on everything you order.' },
  'asheville-nc': { name: 'Asheville, NC', country: 'USA', tagline: 'Blue Ridge Mountain art town', description: 'A creative mountain city full of breweries, indie galleries, mile-long farmers markets, and the Biltmore Estate\'s Gilded Age grandeur.' },
  'birmingham-al': { name: 'Birmingham, AL', country: 'USA', tagline: 'The Magic City, reborn', description: 'Civil Rights history, James Beard-winning Southern food, and a downtown built on iron heritage transforming into a cultural hub.' },
  'boise-id': { name: 'Boise, ID', country: 'USA', tagline: 'The outdoor playground hiding in plain sight', description: 'Foothill trails out the back door, the Boise River Greenbelt, basque culture downtown, and a craft beer scene quietly rivaling Portland.' },
  'boulder-co': { name: 'Boulder, CO', country: 'USA', tagline: 'Where the Rockies meet college-town energy', description: 'Mountain trails, Pearl Street Mall, Celestial Seasonings, and one of the highest concentrations of yoga studios per capita anywhere.' },
  'buffalo-ny': { name: 'Buffalo, NY', country: 'USA', tagline: 'Lake Erie\'s comeback city', description: 'Wing-eating capital of America, Frank Lloyd Wright architecture, and a waterfront reimagined into a four-season playground.' },
  'burlington-vt': { name: 'Burlington, VT', country: 'USA', tagline: 'Lake Champlain\'s craft city', description: 'Church Street Marketplace, microbreweries, Ben & Jerry\'s pilgrimage tours, and lake sunsets you don\'t expect from a town this size.' },
  'chattanooga-tn': { name: 'Chattanooga, TN', country: 'USA', tagline: 'Riverfront city in the foothills', description: 'Tennessee River walks, Lookout Mountain views, the Tennessee Aquarium, and Southern food in restored industrial spaces.' },
  'cincinnati-oh': { name: 'Cincinnati, OH', country: 'USA', tagline: 'Queen City on the river', description: 'Findlay Market, Over-the-Rhine\'s revival, Skyline Chili rituals, and the Ohio River bridge connecting two states.' },
  'cleveland-oh': { name: 'Cleveland, OH', country: 'USA', tagline: 'Where Rock & Roll lives', description: 'The Rock Hall, Cleveland Museum of Art (free), Great Lakes Brewing, and West Side Market\'s historic food halls.' },
  'des-moines-ia': { name: 'Des Moines, IA', country: 'USA', tagline: 'Midwest creative capital', description: 'John & Mary Pappajohn Sculpture Park, the Des Moines Arts Festival, East Village indie shops, and food halls in old printing buildings.' },
  'greenville-sc': { name: 'Greenville, SC', country: 'USA', tagline: 'Southern downtown done right', description: 'Falls Park on the Reedy, Main Street\'s tree-lined dining, BMW heritage, and a thriving food scene quietly putting the South\'s big names on notice.' },
  'hartford-ct': { name: 'Hartford, CT', country: 'USA', tagline: 'New England\'s underrated capital', description: 'Mark Twain\'s home, Wadsworth Atheneum (oldest public art museum in America), and surprisingly great Italian neighborhoods.' },
  'indianapolis-in': { name: 'Indianapolis, IN', country: 'USA', tagline: 'Mid-America\'s sports + culture hub', description: 'The Speedway, Newfields\' park-museum hybrid, Mass Ave\'s independent shops, and a downtown more walkable than expected.' },
  'key-west-fl': { name: 'Key West, FL', country: 'USA', tagline: 'Where the highways end', description: 'Sunset rituals at Mallory Square, Hemingway\'s six-toed cats, conch fritters, and the southernmost point in the continental US.' },
  'knoxville-tn': { name: 'Knoxville, TN', country: 'USA', tagline: 'Smoky Mountains\' cultural gateway', description: 'Market Square, Old City\'s music scene, Sunsphere views, and the start of Great Smoky Mountains National Park drives.' },
  'louisville-ky': { name: 'Louisville, KY', country: 'USA', tagline: 'Bourbon, Derby, and Southern hospitality', description: 'The Bourbon Trail, Churchill Downs, Muhammad Ali Center, and the food-driven NuLu neighborhood revival.' },
  'madison-wi': { name: 'Madison, WI', country: 'USA', tagline: 'Lakeside college town with capital-city polish', description: 'Two lakes, the State Street walk to the capitol, the Dane County Farmers\' Market, and serious Wisconsin cheese culture.' },
  'milwaukee-wi': { name: 'Milwaukee, WI', country: 'USA', tagline: 'Lake Michigan\'s beer + brat capital', description: 'Historic breweries, the Milwaukee Art Museum\'s Calatrava wings, Bay View food scene, and lakefront festivals all summer.' },
  'naples-fl': { name: 'Naples, FL', country: 'USA', tagline: 'Gulf Coast luxury without the chaos', description: 'Vanderbilt Beach sunsets, Fifth Avenue dining, Naples Pier rituals, and Everglades day-trip access.' },
  'providence-ri': { name: 'Providence, RI', country: 'USA', tagline: 'Compact New England culture', description: 'WaterFire art events, Federal Hill Italian dining, RISD\'s creative ecosystem, and a downtown that punches way above its size.' },
  'raleigh-nc': { name: 'Raleigh, NC', country: 'USA', tagline: 'The Triangle\'s cultural anchor', description: 'NC State campus energy, world-class free museums, Videri Chocolate, and a food scene shaped by NC\'s farm-to-table heritage.' },
  'richmond-va': { name: 'Richmond, VA', country: 'USA', tagline: 'The South\'s reborn capital', description: 'Belle Isle on the James River, Carytown\'s indie shops, Maymont gardens, and a James Beard-recognized food scene.' },
  'salt-lake-city-ut': { name: 'Salt Lake City, UT', country: 'USA', tagline: 'Mountains-meet-modern in the West', description: 'Wasatch Range backdrops, Temple Square, a food scene that surprised everyone, and 30-minute access to seven world-class ski resorts.' },
  'sedona-az': { name: 'Sedona, AZ', country: 'USA', tagline: 'Red rock magic in the desert', description: 'Cathedral Rock vortexes, Oak Creek Canyon drives, Tlaquepaque arts village, and sunsets that make even skeptics believe.' },
  'spokane-wa': { name: 'Spokane, WA', country: 'USA', tagline: 'Pacific Northwest\'s eastern soul', description: 'Riverfront Park, the historic Davenport Hotel, Spokane Falls, and a small-but-serious food + coffee scene.' },
  'st-augustine-fl': { name: 'St. Augustine, FL', country: 'USA', tagline: 'America\'s oldest city', description: 'Castillo de San Marcos, cobblestone streets, ghost tours, and a Mediterranean Revival skyline that feels more Spain than Florida.' },
  'st-petersburg-fl': { name: 'St. Petersburg, FL', country: 'USA', tagline: 'Florida\'s Gulf Coast art capital', description: 'The Dalí Museum, Beach Drive bars, the St. Pete Pier, and a vibrant mural scene that turned the city into an arts destination.' },
  'tucson-az': { name: 'Tucson, AZ', country: 'USA', tagline: 'Sonoran desert + UNESCO food culture', description: 'Saguaro National Park, Sonoran hot dogs, Mission San Xavier del Bac, and a UNESCO-designated City of Gastronomy.' },
  'tulsa-ok': { name: 'Tulsa, OK', country: 'USA', tagline: 'Art Deco oil money turned creative city', description: 'The Gathering Place park, Greenwood District + Black Wall Street history, Cain\'s Ballroom, and downtown Art Deco architecture.' },
  'wilmington-de': { name: 'Wilmington, DE', country: 'USA', tagline: 'Mid-Atlantic\'s underrated city', description: 'Riverfront Wilmington, Brandywine Park, Hagley Museum (the DuPont legacy), and a Saturday-night downtown that\'s growing.' },
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
