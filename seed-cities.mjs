// seed-cities.mjs - Insert 100 new cities into Supabase via REST API
// Usage: node seed-cities.mjs

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables');
  process.exit(1);
}
const HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=minimal',
};

const ALL_CITIES = [
  { name: 'Abuja', country: 'Nigeria', region: 'Africa', slug: 'abuja', timezone: 'Africa/Lagos' },
  { name: 'Accra', country: 'Ghana', region: 'Africa', slug: 'accra', timezone: 'Africa/Accra' },
  { name: 'Addis Ababa', country: 'Ethiopia', region: 'Africa', slug: 'addis-ababa', timezone: 'Africa/Addis_Ababa' },
  { name: 'Abu Dhabi', country: 'UAE', region: 'Middle East', slug: 'abu-dhabi', timezone: 'Asia/Dubai' },
  { name: 'Amman', country: 'Jordan', region: 'Middle East', slug: 'amman', timezone: 'Asia/Amman' },
  { name: 'Amsterdam', country: 'Netherlands', region: 'Europe', slug: 'amsterdam', timezone: 'Europe/Amsterdam' },
  { name: 'Aruba', country: 'Aruba', region: 'Caribbean', slug: 'aruba', timezone: 'America/Aruba' },
  { name: 'Athens', country: 'Greece', region: 'Europe', slug: 'athens', timezone: 'Europe/Athens' },
  { name: 'Atlanta', country: 'USA', region: 'North America', slug: 'atlanta', timezone: 'America/New_York' },
  { name: 'Auckland', country: 'New Zealand', region: 'Oceania', slug: 'auckland', timezone: 'Pacific/Auckland' },
  { name: 'Austin', country: 'USA', region: 'North America', slug: 'austin', timezone: 'America/Chicago' },
  { name: 'Bali', country: 'Indonesia', region: 'Asia', slug: 'bali', timezone: 'Asia/Makassar' },
  { name: 'Bangkok', country: 'Thailand', region: 'Asia', slug: 'bangkok', timezone: 'Asia/Bangkok' },
  { name: 'Barcelona', country: 'Spain', region: 'Europe', slug: 'barcelona', timezone: 'Europe/Madrid' },
  { name: 'Beijing', country: 'China', region: 'Asia', slug: 'beijing', timezone: 'Asia/Shanghai' },
  { name: 'Beirut', country: 'Lebanon', region: 'Middle East', slug: 'beirut', timezone: 'Asia/Beirut' },
  { name: 'Belize City', country: 'Belize', region: 'Central America', slug: 'belize-city', timezone: 'America/Belize' },
  { name: 'Berlin', country: 'Germany', region: 'Europe', slug: 'berlin', timezone: 'Europe/Berlin' },
  { name: 'Bogota', country: 'Colombia', region: 'South America', slug: 'bogota', timezone: 'America/Bogota' },
  { name: 'Boston', country: 'USA', region: 'North America', slug: 'boston', timezone: 'America/New_York' },
  { name: 'Bridgetown', country: 'Barbados', region: 'Caribbean', slug: 'bridgetown', timezone: 'America/Barbados' },
  { name: 'Brisbane', country: 'Australia', region: 'Oceania', slug: 'brisbane', timezone: 'Australia/Brisbane' },
  { name: 'Brussels', country: 'Belgium', region: 'Europe', slug: 'brussels', timezone: 'Europe/Brussels' },
  { name: 'Budapest', country: 'Hungary', region: 'Europe', slug: 'budapest', timezone: 'Europe/Budapest' },
  { name: 'Buenos Aires', country: 'Argentina', region: 'South America', slug: 'buenos-aires', timezone: 'America/Argentina/Buenos_Aires' },
  { name: 'Calgary', country: 'Canada', region: 'North America', slug: 'calgary', timezone: 'America/Edmonton' },
  { name: 'Cancun', country: 'Mexico', region: 'North America', slug: 'cancun', timezone: 'America/Cancun' },
  { name: 'Cape Town', country: 'South Africa', region: 'Africa', slug: 'cape-town', timezone: 'Africa/Johannesburg' },
  { name: 'Cartagena', country: 'Colombia', region: 'South America', slug: 'cartagena', timezone: 'America/Bogota' },
  { name: 'Casablanca', country: 'Morocco', region: 'Africa', slug: 'casablanca', timezone: 'Africa/Casablanca' },
  { name: 'Charleston', country: 'USA', region: 'North America', slug: 'charleston', timezone: 'America/New_York' },
  { name: 'Charlotte', country: 'USA', region: 'North America', slug: 'charlotte', timezone: 'America/New_York' },
  { name: 'Chiang Mai', country: 'Thailand', region: 'Asia', slug: 'chiang-mai', timezone: 'Asia/Bangkok' },
  { name: 'Chicago', country: 'USA', region: 'North America', slug: 'chicago', timezone: 'America/Chicago' },
  { name: 'Colombo', country: 'Sri Lanka', region: 'Asia', slug: 'colombo', timezone: 'Asia/Colombo' },
  { name: 'Copenhagen', country: 'Denmark', region: 'Europe', slug: 'copenhagen', timezone: 'Europe/Copenhagen' },
  { name: 'Curacao', country: 'Curacao', region: 'Caribbean', slug: 'curacao', timezone: 'America/Curacao' },
  { name: 'Cusco', country: 'Peru', region: 'South America', slug: 'cusco', timezone: 'America/Lima' },
  { name: 'Dakar', country: 'Senegal', region: 'Africa', slug: 'dakar', timezone: 'Africa/Dakar' },
  { name: 'Dallas', country: 'USA', region: 'North America', slug: 'dallas', timezone: 'America/Chicago' },
  { name: 'Dar es Salaam', country: 'Tanzania', region: 'Africa', slug: 'dar-es-salaam', timezone: 'Africa/Dar_es_Salaam' },
  { name: 'Delhi', country: 'India', region: 'Asia', slug: 'delhi', timezone: 'Asia/Kolkata' },
  { name: 'Denver', country: 'USA', region: 'North America', slug: 'denver', timezone: 'America/Denver' },
  { name: 'Detroit', country: 'USA', region: 'North America', slug: 'detroit', timezone: 'America/Detroit' },
  { name: 'Doha', country: 'Qatar', region: 'Middle East', slug: 'doha', timezone: 'Asia/Qatar' },
  { name: 'Dubai', country: 'UAE', region: 'Middle East', slug: 'dubai', timezone: 'Asia/Dubai' },
  { name: 'Dublin', country: 'Ireland', region: 'Europe', slug: 'dublin', timezone: 'Europe/Dublin' },
  { name: 'Edinburgh', country: 'UK', region: 'Europe', slug: 'edinburgh', timezone: 'Europe/London' },
  { name: 'Essaouira', country: 'Morocco', region: 'Africa', slug: 'essaouira', timezone: 'Africa/Casablanca' },
  { name: 'Fiji', country: 'Fiji', region: 'Oceania', slug: 'fiji', timezone: 'Pacific/Fiji' },
  { name: 'Florence', country: 'Italy', region: 'Europe', slug: 'florence', timezone: 'Europe/Rome' },
  { name: 'Gold Coast', country: 'Australia', region: 'Oceania', slug: 'gold-coast', timezone: 'Australia/Brisbane' },
  { name: 'Guatemala City', country: 'Guatemala', region: 'Central America', slug: 'guatemala-city', timezone: 'America/Guatemala' },
  { name: 'Hanoi', country: 'Vietnam', region: 'Asia', slug: 'hanoi', timezone: 'Asia/Ho_Chi_Minh' },
  { name: 'Havana', country: 'Cuba', region: 'Caribbean', slug: 'havana', timezone: 'America/Havana' },
  { name: 'Helsinki', country: 'Finland', region: 'Europe', slug: 'helsinki', timezone: 'Europe/Helsinki' },
  { name: 'Ho Chi Minh City', country: 'Vietnam', region: 'Asia', slug: 'ho-chi-minh-city', timezone: 'Asia/Ho_Chi_Minh' },
  { name: 'Hong Kong', country: 'China', region: 'Asia', slug: 'hong-kong', timezone: 'Asia/Hong_Kong' },
  { name: 'Honolulu', country: 'USA', region: 'North America', slug: 'honolulu', timezone: 'Pacific/Honolulu' },
  { name: 'Houston', country: 'USA', region: 'North America', slug: 'houston', timezone: 'America/Chicago' },
  { name: 'Istanbul', country: 'Turkey', region: 'Europe', slug: 'istanbul', timezone: 'Europe/Istanbul' },
  { name: 'Jaipur', country: 'India', region: 'Asia', slug: 'jaipur', timezone: 'Asia/Kolkata' },
  { name: 'Jakarta', country: 'Indonesia', region: 'Asia', slug: 'jakarta', timezone: 'Asia/Jakarta' },
  { name: 'Johannesburg', country: 'South Africa', region: 'Africa', slug: 'johannesburg', timezone: 'Africa/Johannesburg' },
  { name: 'Kampala', country: 'Uganda', region: 'Africa', slug: 'kampala', timezone: 'Africa/Kampala' },
  { name: 'Kathmandu', country: 'Nepal', region: 'Asia', slug: 'kathmandu', timezone: 'Asia/Kathmandu' },
  { name: 'Kigali', country: 'Rwanda', region: 'Africa', slug: 'kigali', timezone: 'Africa/Kigali' },
  { name: 'Kingston', country: 'Jamaica', region: 'Caribbean', slug: 'kingston', timezone: 'America/Jamaica' },
  { name: 'Krakow', country: 'Poland', region: 'Europe', slug: 'krakow', timezone: 'Europe/Warsaw' },
  { name: 'Kuala Lumpur', country: 'Malaysia', region: 'Asia', slug: 'kuala-lumpur', timezone: 'Asia/Kuala_Lumpur' },
  { name: 'Kyoto', country: 'Japan', region: 'Asia', slug: 'kyoto', timezone: 'Asia/Tokyo' },
  { name: 'La Paz', country: 'Bolivia', region: 'South America', slug: 'la-paz', timezone: 'America/La_Paz' },
  { name: 'Lagos', country: 'Nigeria', region: 'Africa', slug: 'lagos', timezone: 'Africa/Lagos' },
  { name: 'Las Vegas', country: 'USA', region: 'North America', slug: 'las-vegas', timezone: 'America/Los_Angeles' },
  { name: 'Lima', country: 'Peru', region: 'South America', slug: 'lima', timezone: 'America/Lima' },
  { name: 'Lisbon', country: 'Portugal', region: 'Europe', slug: 'lisbon', timezone: 'Europe/Lisbon' },
  { name: 'London', country: 'UK', region: 'Europe', slug: 'london', timezone: 'Europe/London' },
  { name: 'Los Angeles', country: 'USA', region: 'North America', slug: 'los-angeles', timezone: 'America/Los_Angeles' },
  { name: 'Luanda', country: 'Angola', region: 'Africa', slug: 'luanda', timezone: 'Africa/Luanda' },
  { name: 'Madrid', country: 'Spain', region: 'Europe', slug: 'madrid', timezone: 'Europe/Madrid' },
  { name: 'Manila', country: 'Philippines', region: 'Asia', slug: 'manila', timezone: 'Asia/Manila' },
  { name: 'Maputo', country: 'Mozambique', region: 'Africa', slug: 'maputo', timezone: 'Africa/Maputo' },
  { name: 'Marrakech', country: 'Morocco', region: 'Africa', slug: 'marrakech', timezone: 'Africa/Casablanca' },
  { name: 'Mauritius', country: 'Mauritius', region: 'Africa', slug: 'mauritius', timezone: 'Indian/Mauritius' },
  { name: 'Medellin', country: 'Colombia', region: 'South America', slug: 'medellin', timezone: 'America/Bogota' },
  { name: 'Melbourne', country: 'Australia', region: 'Oceania', slug: 'melbourne', timezone: 'Australia/Melbourne' },
  { name: 'Memphis', country: 'USA', region: 'North America', slug: 'memphis', timezone: 'America/Chicago' },
  { name: 'Mexico City', country: 'Mexico', region: 'North America', slug: 'mexico-city', timezone: 'America/Mexico_City' },
  { name: 'Miami', country: 'USA', region: 'North America', slug: 'miami', timezone: 'America/New_York' },
  { name: 'Milan', country: 'Italy', region: 'Europe', slug: 'milan', timezone: 'Europe/Rome' },
  { name: 'Minneapolis', country: 'USA', region: 'North America', slug: 'minneapolis', timezone: 'America/Chicago' },
  { name: 'Montego Bay', country: 'Jamaica', region: 'Caribbean', slug: 'montego-bay', timezone: 'America/Jamaica' },
  { name: 'Montevideo', country: 'Uruguay', region: 'South America', slug: 'montevideo', timezone: 'America/Montevideo' },
  { name: 'Montreal', country: 'Canada', region: 'North America', slug: 'montreal', timezone: 'America/Toronto' },
  { name: 'Mumbai', country: 'India', region: 'Asia', slug: 'mumbai', timezone: 'Asia/Kolkata' },
  { name: 'Munich', country: 'Germany', region: 'Europe', slug: 'munich', timezone: 'Europe/Berlin' },
  { name: 'Muscat', country: 'Oman', region: 'Middle East', slug: 'muscat', timezone: 'Asia/Muscat' },
  { name: 'Nairobi', country: 'Kenya', region: 'Africa', slug: 'nairobi', timezone: 'Africa/Nairobi' },
  { name: 'Nashville', country: 'USA', region: 'North America', slug: 'nashville', timezone: 'America/Chicago' },
  { name: 'Nassau', country: 'Bahamas', region: 'Caribbean', slug: 'nassau', timezone: 'America/Nassau' },
  { name: 'New Orleans', country: 'USA', region: 'North America', slug: 'new-orleans', timezone: 'America/Chicago' },
  { name: 'New York', country: 'USA', region: 'North America', slug: 'new-york', timezone: 'America/New_York' },
  { name: 'Nice', country: 'France', region: 'Europe', slug: 'nice', timezone: 'Europe/Paris' },
  { name: 'Ocho Rios', country: 'Jamaica', region: 'Caribbean', slug: 'ocho-rios', timezone: 'America/Jamaica' },
  { name: 'Orlando', country: 'USA', region: 'North America', slug: 'orlando', timezone: 'America/New_York' },
  { name: 'Osaka', country: 'Japan', region: 'Asia', slug: 'osaka', timezone: 'Asia/Tokyo' },
  { name: 'Oslo', country: 'Norway', region: 'Europe', slug: 'oslo', timezone: 'Europe/Oslo' },
  { name: 'Ottawa', country: 'Canada', region: 'North America', slug: 'ottawa', timezone: 'America/Toronto' },
  { name: 'Panama City', country: 'Panama', region: 'Central America', slug: 'panama-city', timezone: 'America/Panama' },
  { name: 'Paris', country: 'France', region: 'Europe', slug: 'paris', timezone: 'Europe/Paris' },
  { name: 'Perth', country: 'Australia', region: 'Oceania', slug: 'perth', timezone: 'Australia/Perth' },
  { name: 'Philadelphia', country: 'USA', region: 'North America', slug: 'philadelphia', timezone: 'America/New_York' },
  { name: 'Phnom Penh', country: 'Cambodia', region: 'Asia', slug: 'phnom-penh', timezone: 'Asia/Phnom_Penh' },
  { name: 'Phoenix', country: 'USA', region: 'North America', slug: 'phoenix', timezone: 'America/Phoenix' },
  { name: 'Pittsburgh', country: 'USA', region: 'North America', slug: 'pittsburgh', timezone: 'America/New_York' },
  { name: 'Portland', country: 'USA', region: 'North America', slug: 'portland', timezone: 'America/Los_Angeles' },
  { name: 'Porto', country: 'Portugal', region: 'Europe', slug: 'porto', timezone: 'Europe/Lisbon' },
  { name: 'Prague', country: 'Czech Republic', region: 'Europe', slug: 'prague', timezone: 'Europe/Prague' },
  { name: 'Punta Cana', country: 'Dominican Republic', region: 'Caribbean', slug: 'punta-cana', timezone: 'America/Santo_Domingo' },
  { name: 'Quebec City', country: 'Canada', region: 'North America', slug: 'quebec-city', timezone: 'America/Toronto' },
  { name: 'Queenstown', country: 'New Zealand', region: 'Oceania', slug: 'queenstown', timezone: 'Pacific/Auckland' },
  { name: 'Quito', country: 'Ecuador', region: 'South America', slug: 'quito', timezone: 'America/Guayaquil' },
  { name: 'Rio de Janeiro', country: 'Brazil', region: 'South America', slug: 'rio-de-janeiro', timezone: 'America/Sao_Paulo' },
  { name: 'Riyadh', country: 'Saudi Arabia', region: 'Middle East', slug: 'riyadh', timezone: 'Asia/Riyadh' },
  { name: 'Rome', country: 'Italy', region: 'Europe', slug: 'rome', timezone: 'Europe/Rome' },
  { name: 'San Antonio', country: 'USA', region: 'North America', slug: 'san-antonio', timezone: 'America/Chicago' },
  { name: 'San Diego', country: 'USA', region: 'North America', slug: 'san-diego', timezone: 'America/Los_Angeles' },
  { name: 'San Francisco', country: 'USA', region: 'North America', slug: 'san-francisco', timezone: 'America/Los_Angeles' },
  { name: 'San Jose', country: 'Costa Rica', region: 'Central America', slug: 'san-jose-cr', timezone: 'America/Costa_Rica' },
  { name: 'San Juan', country: 'Puerto Rico', region: 'Caribbean', slug: 'san-juan', timezone: 'America/Puerto_Rico' },
  { name: 'Santiago', country: 'Chile', region: 'South America', slug: 'santiago', timezone: 'America/Santiago' },
  { name: 'Santorini', country: 'Greece', region: 'Europe', slug: 'santorini', timezone: 'Europe/Athens' },
  { name: 'Santo Domingo', country: 'Dominican Republic', region: 'Caribbean', slug: 'santo-domingo', timezone: 'America/Santo_Domingo' },
  { name: 'Sao Paulo', country: 'Brazil', region: 'South America', slug: 'sao-paulo', timezone: 'America/Sao_Paulo' },
  { name: 'Savannah', country: 'USA', region: 'North America', slug: 'savannah', timezone: 'America/New_York' },
  { name: 'Seattle', country: 'USA', region: 'North America', slug: 'seattle', timezone: 'America/Los_Angeles' },
  { name: 'Seoul', country: 'South Korea', region: 'Asia', slug: 'seoul', timezone: 'Asia/Seoul' },
  { name: 'Seville', country: 'Spain', region: 'Europe', slug: 'seville', timezone: 'Europe/Madrid' },
  { name: 'Shanghai', country: 'China', region: 'Asia', slug: 'shanghai', timezone: 'Asia/Shanghai' },
  { name: 'Siem Reap', country: 'Cambodia', region: 'Asia', slug: 'siem-reap', timezone: 'Asia/Phnom_Penh' },
  { name: 'Singapore', country: 'Singapore', region: 'Asia', slug: 'singapore', timezone: 'Asia/Singapore' },
  { name: 'St. Louis', country: 'USA', region: 'North America', slug: 'st-louis', timezone: 'America/Chicago' },
  { name: 'St. Lucia', country: 'St. Lucia', region: 'Caribbean', slug: 'st-lucia', timezone: 'America/St_Lucia' },
  { name: 'Stockholm', country: 'Sweden', region: 'Europe', slug: 'stockholm', timezone: 'Europe/Stockholm' },
  { name: 'Sydney', country: 'Australia', region: 'Oceania', slug: 'sydney', timezone: 'Australia/Sydney' },
  { name: 'Taipei', country: 'Taiwan', region: 'Asia', slug: 'taipei', timezone: 'Asia/Taipei' },
  { name: 'Tampa', country: 'USA', region: 'North America', slug: 'tampa', timezone: 'America/New_York' },
  { name: 'Tel Aviv', country: 'Israel', region: 'Middle East', slug: 'tel-aviv', timezone: 'Asia/Jerusalem' },
  { name: 'Tokyo', country: 'Japan', region: 'Asia', slug: 'tokyo', timezone: 'Asia/Tokyo' },
  { name: 'Toronto', country: 'Canada', region: 'North America', slug: 'toronto', timezone: 'America/Toronto' },
  { name: 'Trinidad', country: 'Trinidad and Tobago', region: 'Caribbean', slug: 'trinidad', timezone: 'America/Port_of_Spain' },
  { name: 'Tulum', country: 'Mexico', region: 'North America', slug: 'tulum', timezone: 'America/Cancun' },
  { name: 'Vancouver', country: 'Canada', region: 'North America', slug: 'vancouver', timezone: 'America/Vancouver' },
  { name: 'Venice', country: 'Italy', region: 'Europe', slug: 'venice', timezone: 'Europe/Rome' },
  { name: 'Vienna', country: 'Austria', region: 'Europe', slug: 'vienna', timezone: 'Europe/Vienna' },
  { name: 'Warsaw', country: 'Poland', region: 'Europe', slug: 'warsaw', timezone: 'Europe/Warsaw' },
  { name: 'Washington', country: 'USA', region: 'North America', slug: 'washington', timezone: 'America/New_York' },
  { name: 'Zanzibar', country: 'Tanzania', region: 'Africa', slug: 'zanzibar', timezone: 'Africa/Dar_es_Salaam' },
  { name: 'Zurich', country: 'Switzerland', region: 'Europe', slug: 'zurich', timezone: 'Europe/Zurich' },
];

async function fetchExistingCities() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/cities?select=name`, {
    method: 'GET',
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch existing cities (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return new Set(data.map((c) => c.name));
}

async function insertBatch(batch, batchNumber) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/cities`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(batch),
  });
  if (!res.ok) throw new Error(`Batch ${batchNumber} failed (${res.status}): ${await res.text()}`);
  console.log(`  Batch ${batchNumber}: inserted ${batch.length} cities`);
}

async function main() {
  console.log('=== NxStops City Seeder ===\n');
  console.log('Fetching existing cities...');
  const existing = await fetchExistingCities();
  console.log(`Found ${existing.size} existing cities.\n`);

  const newCities = ALL_CITIES
    .filter((c) => !existing.has(c.name))
    .map((c) => ({ name: c.name, country: c.country, region: c.region, slug: c.slug, banner_url: null, timezone: c.timezone, is_active: true }));

  const skipped = ALL_CITIES.length - newCities.length;
  if (skipped > 0) console.log(`Skipping ${skipped} cities that already exist.\n`);

  if (newCities.length === 0) { console.log('All cities already exist. Nothing to insert.'); return; }

  console.log(`Inserting ${newCities.length} new cities in batches...\n`);
  const BATCH_SIZE = 25;
  for (let i = 0; i < newCities.length; i += BATCH_SIZE) {
    await insertBatch(newCities.slice(i, i + BATCH_SIZE), Math.floor(i / BATCH_SIZE) + 1);
  }
  console.log(`\nDone! Inserted ${newCities.length} new cities.`);
}

main().catch((err) => { console.error('ERROR:', err.message); process.exit(1); });
