// seed-cities.mjs - Insert 100 new cities into Supabase via REST API
// Usage: node seed-cities.mjs

const SUPABASE_URL = 'https://hwtsyigwsucpefadznnp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3dHN5aWd3c3VjcGVmYWR6bm5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwODcwOTgsImV4cCI6MjA4NTY2MzA5OH0.EnqHcTqoPN1pfSEUggwm_mMUNWME8kNcih5EvB4JlD4';
const HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=minimal',
};

const ALL_CITIES = [
  { name: 'Boston', country: 'USA', region: 'North America', slug: 'boston', timezone: 'America/New_York', lat: 42.3601, lng: -71.0589 },
  { name: 'Philadelphia', country: 'USA', region: 'North America', slug: 'philadelphia', timezone: 'America/New_York', lat: 39.9526, lng: -75.1652 },
  { name: 'Denver', country: 'USA', region: 'North America', slug: 'denver', timezone: 'America/Denver', lat: 39.7392, lng: -104.9903 },
  { name: 'Portland', country: 'USA', region: 'North America', slug: 'portland', timezone: 'America/Los_Angeles', lat: 45.5155, lng: -122.6789 },
  { name: 'San Diego', country: 'USA', region: 'North America', slug: 'san-diego', timezone: 'America/Los_Angeles', lat: 32.7157, lng: -117.1611 },
  { name: 'Honolulu', country: 'USA', region: 'North America', slug: 'honolulu', timezone: 'Pacific/Honolulu', lat: 21.3069, lng: -157.8583 },
  { name: 'Detroit', country: 'USA', region: 'North America', slug: 'detroit', timezone: 'America/Detroit', lat: 42.3314, lng: -83.0458 },
  { name: 'Minneapolis', country: 'USA', region: 'North America', slug: 'minneapolis', timezone: 'America/Chicago', lat: 44.9778, lng: -93.265 },
  { name: 'Dallas', country: 'USA', region: 'North America', slug: 'dallas', timezone: 'America/Chicago', lat: 32.7767, lng: -96.797 },
  { name: 'Houston', country: 'USA', region: 'North America', slug: 'houston', timezone: 'America/Chicago', lat: 29.7604, lng: -95.3698 },
  { name: 'Phoenix', country: 'USA', region: 'North America', slug: 'phoenix', timezone: 'America/Phoenix', lat: 33.4484, lng: -112.074 },
  { name: 'Charlotte', country: 'USA', region: 'North America', slug: 'charlotte', timezone: 'America/New_York', lat: 35.2271, lng: -80.8431 },
  { name: 'Tampa', country: 'USA', region: 'North America', slug: 'tampa', timezone: 'America/New_York', lat: 27.9506, lng: -82.4572 },
  { name: 'Orlando', country: 'USA', region: 'North America', slug: 'orlando', timezone: 'America/New_York', lat: 28.5383, lng: -81.3792 },
  { name: 'Savannah', country: 'USA', region: 'North America', slug: 'savannah', timezone: 'America/New_York', lat: 32.0809, lng: -81.0912 },
  { name: 'Charleston', country: 'USA', region: 'North America', slug: 'charleston', timezone: 'America/New_York', lat: 32.7765, lng: -79.9311 },
  { name: 'Memphis', country: 'USA', region: 'North America', slug: 'memphis', timezone: 'America/Chicago', lat: 35.1495, lng: -90.049 },
  { name: 'Pittsburgh', country: 'USA', region: 'North America', slug: 'pittsburgh', timezone: 'America/New_York', lat: 40.4406, lng: -79.9959 },
  { name: 'San Antonio', country: 'USA', region: 'North America', slug: 'san-antonio', timezone: 'America/Chicago', lat: 29.4241, lng: -98.4936 },
  { name: 'St. Louis', country: 'USA', region: 'North America', slug: 'st-louis', timezone: 'America/Chicago', lat: 38.627, lng: -90.1994 },
  { name: 'Calgary', country: 'Canada', region: 'North America', slug: 'calgary', timezone: 'America/Edmonton', lat: 51.0447, lng: -114.0719 },
  { name: 'Ottawa', country: 'Canada', region: 'North America', slug: 'ottawa', timezone: 'America/Toronto', lat: 45.4215, lng: -75.6972 },
  { name: 'Quebec City', country: 'Canada', region: 'North America', slug: 'quebec-city', timezone: 'America/Toronto', lat: 46.8139, lng: -71.208 },
  { name: 'Havana', country: 'Cuba', region: 'Caribbean', slug: 'havana', timezone: 'America/Havana', lat: 23.1136, lng: -82.3666 },
  { name: 'Kingston', country: 'Jamaica', region: 'Caribbean', slug: 'kingston', timezone: 'America/Jamaica', lat: 18.0179, lng: -76.8099 },
  { name: 'Nassau', country: 'Bahamas', region: 'Caribbean', slug: 'nassau', timezone: 'America/Nassau', lat: 25.048, lng: -77.3554 },
  { name: 'Punta Cana', country: 'Dominican Republic', region: 'Caribbean', slug: 'punta-cana', timezone: 'America/Santo_Domingo', lat: 18.5601, lng: -68.3725 },
  { name: 'Bridgetown', country: 'Barbados', region: 'Caribbean', slug: 'bridgetown', timezone: 'America/Barbados', lat: 13.1132, lng: -59.5988 },
  { name: 'Madrid', country: 'Spain', region: 'Europe', slug: 'madrid', timezone: 'Europe/Madrid', lat: 40.4168, lng: -3.7038 },
  { name: 'Prague', country: 'Czech Republic', region: 'Europe', slug: 'prague', timezone: 'Europe/Prague', lat: 50.0755, lng: 14.4378 },
  { name: 'Vienna', country: 'Austria', region: 'Europe', slug: 'vienna', timezone: 'Europe/Vienna', lat: 48.2082, lng: 16.3738 },
  { name: 'Budapest', country: 'Hungary', region: 'Europe', slug: 'budapest', timezone: 'Europe/Budapest', lat: 47.4979, lng: 19.0402 },
  { name: 'Dublin', country: 'Ireland', region: 'Europe', slug: 'dublin', timezone: 'Europe/Dublin', lat: 53.3498, lng: -6.2603 },
  { name: 'Edinburgh', country: 'UK', region: 'Europe', slug: 'edinburgh', timezone: 'Europe/London', lat: 55.9533, lng: -3.1883 },
  { name: 'Copenhagen', country: 'Denmark', region: 'Europe', slug: 'copenhagen', timezone: 'Europe/Copenhagen', lat: 55.6761, lng: 12.5683 },
  { name: 'Stockholm', country: 'Sweden', region: 'Europe', slug: 'stockholm', timezone: 'Europe/Stockholm', lat: 59.3293, lng: 18.0686 },
  { name: 'Oslo', country: 'Norway', region: 'Europe', slug: 'oslo', timezone: 'Europe/Oslo', lat: 59.9139, lng: 10.7522 },
  { name: 'Helsinki', country: 'Finland', region: 'Europe', slug: 'helsinki', timezone: 'Europe/Helsinki', lat: 60.1699, lng: 24.9384 },
  { name: 'Warsaw', country: 'Poland', region: 'Europe', slug: 'warsaw', timezone: 'Europe/Warsaw', lat: 52.2297, lng: 21.0122 },
  { name: 'Krakow', country: 'Poland', region: 'Europe', slug: 'krakow', timezone: 'Europe/Warsaw', lat: 50.0647, lng: 19.945 },
  { name: 'Athens', country: 'Greece', region: 'Europe', slug: 'athens', timezone: 'Europe/Athens', lat: 37.9838, lng: 23.7275 },
  { name: 'Santorini', country: 'Greece', region: 'Europe', slug: 'santorini', timezone: 'Europe/Athens', lat: 36.3932, lng: 25.4615 },
  { name: 'Istanbul', country: 'Turkey', region: 'Europe', slug: 'istanbul', timezone: 'Europe/Istanbul', lat: 41.0082, lng: 28.9784 },
  { name: 'Zurich', country: 'Switzerland', region: 'Europe', slug: 'zurich', timezone: 'Europe/Zurich', lat: 47.3769, lng: 8.5417 },
  { name: 'Milan', country: 'Italy', region: 'Europe', slug: 'milan', timezone: 'Europe/Rome', lat: 45.4642, lng: 9.19 },
  { name: 'Florence', country: 'Italy', region: 'Europe', slug: 'florence', timezone: 'Europe/Rome', lat: 43.7696, lng: 11.2558 },
  { name: 'Venice', country: 'Italy', region: 'Europe', slug: 'venice', timezone: 'Europe/Rome', lat: 45.4408, lng: 12.3155 },
  { name: 'Munich', country: 'Germany', region: 'Europe', slug: 'munich', timezone: 'Europe/Berlin', lat: 48.1351, lng: 11.582 },
  { name: 'Brussels', country: 'Belgium', region: 'Europe', slug: 'brussels', timezone: 'Europe/Brussels', lat: 50.8503, lng: 4.3517 },
  { name: 'Nice', country: 'France', region: 'Europe', slug: 'nice', timezone: 'Europe/Paris', lat: 43.7102, lng: 7.262 },
  { name: 'Seville', country: 'Spain', region: 'Europe', slug: 'seville', timezone: 'Europe/Madrid', lat: 37.3891, lng: -5.9845 },
  { name: 'Hong Kong', country: 'China', region: 'Asia', slug: 'hong-kong', timezone: 'Asia/Hong_Kong', lat: 22.3193, lng: 114.1694 },
  { name: 'Shanghai', country: 'China', region: 'Asia', slug: 'shanghai', timezone: 'Asia/Shanghai', lat: 31.2304, lng: 121.4737 },
  { name: 'Beijing', country: 'China', region: 'Asia', slug: 'beijing', timezone: 'Asia/Shanghai', lat: 39.9042, lng: 116.4074 },
  { name: 'Taipei', country: 'Taiwan', region: 'Asia', slug: 'taipei', timezone: 'Asia/Taipei', lat: 25.033, lng: 121.5654 },
  { name: 'Osaka', country: 'Japan', region: 'Asia', slug: 'osaka', timezone: 'Asia/Tokyo', lat: 34.6937, lng: 135.5023 },
  { name: 'Kyoto', country: 'Japan', region: 'Asia', slug: 'kyoto', timezone: 'Asia/Tokyo', lat: 35.0116, lng: 135.7681 },
  { name: 'Mumbai', country: 'India', region: 'Asia', slug: 'mumbai', timezone: 'Asia/Kolkata', lat: 19.076, lng: 72.8777 },
  { name: 'Delhi', country: 'India', region: 'Asia', slug: 'delhi', timezone: 'Asia/Kolkata', lat: 28.7041, lng: 77.1025 },
  { name: 'Jaipur', country: 'India', region: 'Asia', slug: 'jaipur', timezone: 'Asia/Kolkata', lat: 26.9124, lng: 75.7873 },
  { name: 'Hanoi', country: 'Vietnam', region: 'Asia', slug: 'hanoi', timezone: 'Asia/Ho_Chi_Minh', lat: 21.0278, lng: 105.8342 },
  { name: 'Ho Chi Minh City', country: 'Vietnam', region: 'Asia', slug: 'ho-chi-minh-city', timezone: 'Asia/Ho_Chi_Minh', lat: 10.8231, lng: 106.6297 },
  { name: 'Kuala Lumpur', country: 'Malaysia', region: 'Asia', slug: 'kuala-lumpur', timezone: 'Asia/Kuala_Lumpur', lat: 3.139, lng: 101.6869 },
  { name: 'Manila', country: 'Philippines', region: 'Asia', slug: 'manila', timezone: 'Asia/Manila', lat: 14.5995, lng: 120.9842 },
  { name: 'Colombo', country: 'Sri Lanka', region: 'Asia', slug: 'colombo', timezone: 'Asia/Colombo', lat: 6.9271, lng: 79.8612 },
  { name: 'Kathmandu', country: 'Nepal', region: 'Asia', slug: 'kathmandu', timezone: 'Asia/Kathmandu', lat: 27.7172, lng: 85.324 },
  { name: 'Phnom Penh', country: 'Cambodia', region: 'Asia', slug: 'phnom-penh', timezone: 'Asia/Phnom_Penh', lat: 11.5564, lng: 104.9282 },
  { name: 'Chiang Mai', country: 'Thailand', region: 'Asia', slug: 'chiang-mai', timezone: 'Asia/Bangkok', lat: 18.7883, lng: 98.9853 },
  { name: 'Addis Ababa', country: 'Ethiopia', region: 'Africa', slug: 'addis-ababa', timezone: 'Africa/Addis_Ababa', lat: 9.025, lng: 38.7469 },
  { name: 'Dar es Salaam', country: 'Tanzania', region: 'Africa', slug: 'dar-es-salaam', timezone: 'Africa/Dar_es_Salaam', lat: -6.7924, lng: 39.2083 },
  { name: 'Zanzibar', country: 'Tanzania', region: 'Africa', slug: 'zanzibar', timezone: 'Africa/Dar_es_Salaam', lat: -6.1659, lng: 39.2026 },
  { name: 'Dakar', country: 'Senegal', region: 'Africa', slug: 'dakar', timezone: 'Africa/Dakar', lat: 14.7167, lng: -17.4677 },
  { name: 'Casablanca', country: 'Morocco', region: 'Africa', slug: 'casablanca', timezone: 'Africa/Casablanca', lat: 33.5731, lng: -7.5898 },
  { name: 'Johannesburg', country: 'South Africa', region: 'Africa', slug: 'johannesburg', timezone: 'Africa/Johannesburg', lat: -26.2041, lng: 28.0473 },
  { name: 'Luanda', country: 'Angola', region: 'Africa', slug: 'luanda', timezone: 'Africa/Luanda', lat: -8.839, lng: 13.2894 },
  { name: 'Abuja', country: 'Nigeria', region: 'Africa', slug: 'abuja', timezone: 'Africa/Lagos', lat: 9.0579, lng: 7.4951 },
  { name: 'Kigali', country: 'Rwanda', region: 'Africa', slug: 'kigali', timezone: 'Africa/Kigali', lat: -1.9403, lng: 29.8739 },
  { name: 'Kampala', country: 'Uganda', region: 'Africa', slug: 'kampala', timezone: 'Africa/Kampala', lat: 0.3476, lng: 32.5825 },
  { name: 'Bogota', country: 'Colombia', region: 'South America', slug: 'bogota', timezone: 'America/Bogota', lat: 4.711, lng: -74.0721 },
  { name: 'Medellin', country: 'Colombia', region: 'South America', slug: 'medellin', timezone: 'America/Bogota', lat: 6.2442, lng: -75.5812 },
  { name: 'Cartagena', country: 'Colombia', region: 'South America', slug: 'cartagena', timezone: 'America/Bogota', lat: 10.391, lng: -75.5364 },
  { name: 'Lima', country: 'Peru', region: 'South America', slug: 'lima', timezone: 'America/Lima', lat: -12.0464, lng: -77.0428 },
  { name: 'Cusco', country: 'Peru', region: 'South America', slug: 'cusco', timezone: 'America/Lima', lat: -13.5319, lng: -71.9675 },
  { name: 'Santiago', country: 'Chile', region: 'South America', slug: 'santiago', timezone: 'America/Santiago', lat: -33.4489, lng: -70.6693 },
  { name: 'Quito', country: 'Ecuador', region: 'South America', slug: 'quito', timezone: 'America/Guayaquil', lat: -0.1807, lng: -78.4678 },
  { name: 'Montevideo', country: 'Uruguay', region: 'South America', slug: 'montevideo', timezone: 'America/Montevideo', lat: -34.9011, lng: -56.1645 },
  { name: 'La Paz', country: 'Bolivia', region: 'South America', slug: 'la-paz', timezone: 'America/La_Paz', lat: -16.4897, lng: -68.1193 },
  { name: 'Sao Paulo', country: 'Brazil', region: 'South America', slug: 'sao-paulo', timezone: 'America/Sao_Paulo', lat: -23.5505, lng: -46.6333 },
  { name: 'Abu Dhabi', country: 'UAE', region: 'Middle East', slug: 'abu-dhabi', timezone: 'Asia/Dubai', lat: 24.4539, lng: 54.3773 },
  { name: 'Doha', country: 'Qatar', region: 'Middle East', slug: 'doha', timezone: 'Asia/Qatar', lat: 25.2854, lng: 51.531 },
  { name: 'Riyadh', country: 'Saudi Arabia', region: 'Middle East', slug: 'riyadh', timezone: 'Asia/Riyadh', lat: 24.7136, lng: 46.6753 },
  { name: 'Amman', country: 'Jordan', region: 'Middle East', slug: 'amman', timezone: 'Asia/Amman', lat: 31.9454, lng: 35.9284 },
  { name: 'Beirut', country: 'Lebanon', region: 'Middle East', slug: 'beirut', timezone: 'Asia/Beirut', lat: 33.8938, lng: 35.5018 },
  { name: 'Muscat', country: 'Oman', region: 'Middle East', slug: 'muscat', timezone: 'Asia/Muscat', lat: 23.588, lng: 58.3829 },
  { name: 'Auckland', country: 'New Zealand', region: 'Oceania', slug: 'auckland', timezone: 'Pacific/Auckland', lat: -36.8485, lng: 174.7633 },
  { name: 'Queenstown', country: 'New Zealand', region: 'Oceania', slug: 'queenstown', timezone: 'Pacific/Auckland', lat: -45.0312, lng: 168.6626 },
  { name: 'Perth', country: 'Australia', region: 'Oceania', slug: 'perth', timezone: 'Australia/Perth', lat: -31.9505, lng: 115.8605 },
  { name: 'Brisbane', country: 'Australia', region: 'Oceania', slug: 'brisbane', timezone: 'Australia/Brisbane', lat: -27.4698, lng: 153.0251 },
  { name: 'Fiji', country: 'Fiji', region: 'Oceania', slug: 'fiji', timezone: 'Pacific/Fiji', lat: -17.7134, lng: 178.065 },
  { name: 'Panama City', country: 'Panama', region: 'Central America', slug: 'panama-city', timezone: 'America/Panama', lat: 8.9824, lng: -79.5199 },
  { name: 'San Jose', country: 'Costa Rica', region: 'Central America', slug: 'san-jose-cr', timezone: 'America/Costa_Rica', lat: 9.9281, lng: -84.0907 },
  { name: 'Guatemala City', country: 'Guatemala', region: 'Central America', slug: 'guatemala-city', timezone: 'America/Guatemala', lat: 14.6349, lng: -90.5069 },
  { name: 'Belize City', country: 'Belize', region: 'Central America', slug: 'belize-city', timezone: 'America/Belize', lat: 17.5046, lng: -88.1962 },
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
