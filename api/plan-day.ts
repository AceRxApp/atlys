// Vercel Serverless API Route — Auto Day Planner
// Uses GPT-4o-mini + Google Places to generate personalized day itineraries

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIp, validateApiKey } from './_lib/cors.js';

// Fetch with 5-second timeout to prevent hanging on slow external APIs
function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}
import { CURATED_SEEDS } from './_lib/curated-seeds.js';

const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || '').trim();
const GOOGLE_API_KEY = (process.env.GOOGLE_PLACES_API_KEY || '').trim();
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();

// In-memory place cache — reuse Google results for same city within 10 minutes
const placeCache = new Map<string, { places: Record<string, unknown>[]; timestamp: number }>();
const PLACE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Final plan cache — cache complete AI-generated plans for 5 minutes
// Same city + vibe + duration returns instantly on second request
const planCache = new Map<string, { result: unknown; timestamp: number }>();
const PLAN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const FIELD_MASK = [
  'places.id', 'places.displayName', 'places.formattedAddress',
  'places.location', 'places.types', 'places.primaryType',
  'places.primaryTypeDisplayName', 'places.rating', 'places.userRatingCount',
  'places.priceLevel', 'places.currentOpeningHours', 'places.nationalPhoneNumber',
  'places.websiteUri', 'places.googleMapsUri', 'places.photos',
  'places.editorialSummary', 'places.businessStatus',
].join(',');

const FOOD_TYPES = [
  'restaurant', 'cafe', 'coffee_shop', 'bar', 'bakery',
  'brunch_restaurant', 'breakfast_restaurant', 'ice_cream_shop',
  'steak_house', 'seafood_restaurant', 'sushi_restaurant', 'pizza_restaurant',
  'wine_bar', 'fine_dining_restaurant',
];

const NIGHTLIFE_TYPES = [
  'bar', 'wine_bar', 'night_club', 'casino',
];

const ADVENTURE_TYPES = [
  'museum', 'art_gallery', 'tourist_attraction', 'park',
  'performing_arts_theater', 'historical_landmark', 'zoo',
  'aquarium', 'amusement_park', 'hiking_area', 'market',
  'book_store', 'spa', 'bowling_alley',
];

// Diverse text searches per vibe — we pick random subsets to keep API usage reasonable
const DIVERSE_TEXT_SEARCHES: Record<string, string[]> = {
  // ── NEW 6 VIBES ──────────────────────────────────────────────────────────
  starthare: [
    'iconic landmark monument must visit', 'famous landmark cultural heritage site',
    'world class art museum gallery', 'historic theater performing arts opera',
    'scenic observation deck skyline views', 'waterfront promenade scenic boardwalk',
    'botanical garden conservatory scenic', 'famous monument memorial site',
    'cultural center heritage museum', 'iconic landmark must see attraction',
    'temple shrine palace historic visit', 'famous architecture landmark',
    'best brunch restaurant popular', 'famous brunch spot acclaimed',
  ],
  indulge: [
    'Mexican taqueria restaurant', 'Ethiopian Eritrean restaurant',
    'soul food Southern restaurant', 'Jamaican Caribbean jerk restaurant',
    'Indian curry restaurant', 'Korean BBQ restaurant',
    'Vietnamese pho banh mi', 'Middle Eastern shawarma falafel',
    'African restaurant', 'Halal restaurant', 'dim sum Chinese restaurant',
    'street food food truck', 'hole in the wall restaurant local favorite',
    'best brunch spot mimosas bottomless', 'brunch restaurant eggs benedict avocado toast',
    'dessert bakery pastry', 'ramen noodle bar',
    'cocktail bar craft drinks', 'wine bar tasting',
  ],
  afterdark: [
    'speakeasy cocktail bar', 'rooftop bar lounge', 'jazz club live music',
    'Black owned club lounge bar', 'Latin salsa nightclub', 'hookah lounge',
    'Afrobeat dancehall reggae club', 'wine bar upscale lounge', 'karaoke bar',
    'hip hop club lounge', 'comedy club open mic', 'underground bar hidden',
    'bowling alley arcade entertainment', 'escape room activity',
    'late night food restaurant open late', 'nightclub dance floor DJ',
  ],
  escape: [
    'scenic hiking trail nature walk', 'beach oceanfront seaside',
    'park gardens scenic viewpoint', 'spa wellness relaxation massage',
    'waterfront marina boardwalk', 'national park nature reserve hiking',
    'beach bar restaurant waterfront', 'botanical garden conservatory scenic',
    'hot springs thermal bath spa', 'scenic viewpoint overlook panoramic',
    'lake river kayak outdoor', 'sunset spot scenic photography',
    'brunch restaurant scenic outdoor patio', 'waterfront brunch cafe',
  ],
  luxe: [
    'Michelin star restaurant tasting menu fine dining', 'award winning chef restaurant upscale',
    'luxury rooftop bar cocktails panoramic views', 'five star hotel restaurant bar lounge',
    'premium steakhouse fine dining upscale', 'omakase sushi high end restaurant',
    'champagne bar wine lounge upscale', 'exclusive members club restaurant',
    'world class art museum gallery', 'iconic landmark monument must visit',
    'luxury shopping district designer boutiques', 'celebrity chef restaurant signature dining',
    'spa wellness luxury treatment', 'penthouse rooftop lounge city views',
    // Luxe brunch — hotel restaurants, jazz brunch, supper clubs, rooftop brunch
    'luxury hotel restaurant brunch five star', 'jazz brunch live music upscale',
    'supper club brunch elegant live performance', 'rooftop brunch bottomless champagne views',
    'gospel brunch soul food upscale', 'celebrity chef brunch acclaimed restaurant',
    'hotel dining room brunch prix fixe elegant', 'bottomless brunch cocktails upscale trendy',
  ],
  undertheradar: [
    'neighborhood restaurant locals favorite authentic', 'hole in the wall restaurant hidden gem',
    'family owned restaurant home cooking traditional', 'local cafe neighborhood coffee',
    'street food stall market local specialty', 'neighborhood bar pub locals hangout',
    'local bakery pastry traditional neighborhood', 'authentic ethnic restaurant family run',
    'local market food hall neighborhood grocery', 'neighborhood diner breakfast spot locals',
    'off the beaten path restaurant local gem', 'community cafe neighborhood gathering',
    'traditional food local specialty authentic cuisine', 'neighborhood pizza shop local favorite',
    'local fish market seafood fresh catch', 'neighborhood taco shop authentic street food',
    'locals only bar dive bar neighborhood', 'hidden courtyard cafe tucked away',
    'old school deli sandwich shop local', 'neighborhood ramen noodle shop authentic',
  ],
  // ── LEGACY VIBES (still used by backend fallback + existing plans) ──────
  nightout: [
    'speakeasy cocktail bar', 'rooftop bar lounge', 'jazz club live music',
    'Black owned club lounge bar', 'Latin salsa nightclub', 'hookah lounge',
    'Afrobeat dancehall reggae club', 'wine bar upscale lounge', 'karaoke bar',
    'hip hop club lounge', 'comedy club open mic', 'underground bar hidden',
  ],
  food: [
    'Mexican taqueria restaurant', 'Ethiopian Eritrean restaurant',
    'soul food Southern restaurant', 'Jamaican Caribbean jerk restaurant',
    'Indian curry restaurant', 'Korean BBQ restaurant',
    'Vietnamese pho banh mi', 'Middle Eastern shawarma falafel',
    'African restaurant', 'Halal restaurant', 'dim sum Chinese restaurant',
    'street food food truck', 'hole in the wall restaurant local favorite',
    'brunch spot breakfast', 'dessert bakery pastry', 'ramen noodle bar',
  ],
  adventure: [
    'cultural district historic neighborhood', 'scenic viewpoint lookout',
    'historic neighborhood landmark', 'mural street art district',
    'botanical garden park', 'waterfront boardwalk pier',
    'cultural center heritage museum', 'farmers market outdoor market',
    'iconic landmark must see attraction', 'famous monument memorial site',
    'beach oceanfront seaside', 'beach bar restaurant waterfront',
    'temple shrine palace historic visit', 'wildlife sanctuary nature park',
    'adventure outdoor activity zipline kayak',
    'national park nature reserve hiking',
  ],
  surprise: [
    'neighborhood restaurant locals favorite authentic', 'hole in the wall restaurant hidden gem',
    'family owned restaurant home cooking traditional', 'local cafe neighborhood coffee',
    'street food stall market local specialty', 'neighborhood bar pub locals hangout',
    'local bakery pastry traditional neighborhood', 'authentic ethnic restaurant family run',
    'local market food hall neighborhood grocery', 'neighborhood diner breakfast spot locals',
    'off the beaten path restaurant local gem', 'community cafe neighborhood gathering',
    'traditional food local specialty authentic cuisine', 'neighborhood pizza shop local favorite',
    'local fish market seafood fresh catch', 'neighborhood taco shop authentic street food',
    'locals only bar dive bar neighborhood', 'hidden courtyard cafe tucked away',
    'old school deli sandwich shop local', 'neighborhood ramen noodle shop authentic',
  ],
  chill: [
    'cozy coffee shop cafe', 'indie bookstore cafe', 'botanical garden park scenic',
    'farmers market local', 'quiet brunch spot', 'tea house matcha cafe',
    'bakery pastry shop local', 'scenic walking trail park', 'art gallery exhibition',
    'vintage shop boutique', 'beach seaside relaxing waterfront',
  ],
  wander: [
    'historic neighborhood walking tour', 'street art mural district',
    'local market bazaar neighborhood', 'pedestrian street shopping district',
    'waterfront boardwalk promenade', 'cultural district heritage quarter',
    'charming neighborhood cafe local', 'vintage shop thrift store district',
    'food market street food stalls', 'scenic neighborhood architecture walk',
    'park plaza public square landmark', 'artisan shops craft neighborhood',
  ],
  daydrinks: [
    'rooftop bar views', 'happy hour cocktail bar', 'wine bar wine tasting',
    'craft brewery taproom', 'boozy brunch mimosa', 'cocktail lounge afternoon',
    'beer garden outdoor patio', 'champagne bar prosecco', 'aperol spritz bar patio',
    'wine bar small plates tapas',
  ],
  cultural: [
    'Black history museum cultural center', 'Hispanic heritage museum center',
    'Asian cultural district neighborhood', 'African art gallery museum',
    'Caribbean cultural center heritage', 'civil rights museum memorial',
    'jazz heritage museum music history', 'immigration history museum',
    'science and industry museum', 'natural history museum exhibits',
    'modern art museum contemporary gallery', 'cultural heritage landmark historic',
    'planetarium space science center', 'maritime museum naval history',
    'national monument memorial landmark', 'historic architecture district landmark',
  ],
  stacked: [
    'iconic landmark must visit attraction', 'world class museum gallery exhibition',
    'scenic viewpoint observation deck skyline', 'famous park botanical garden',
    'cultural district historic neighborhood', 'waterfront boardwalk scenic walk',
    'rooftop bar lounge panoramic views', 'speakeasy hidden cocktail bar',
    'underground music venue live show', 'nightclub dance club DJ',
    'comedy show improv theater', 'jazz club live music venue',
    'hidden gem restaurant local favorite', 'chef owned restaurant tasting menu',
    'interactive art installation museum', 'unique architecture district buildings',
    'beach club oceanfront bar', 'street art mural district walking',
    'temple shrine sacred site visit', 'wildlife sanctuary nature experience',
    'palace royal historic landmark', 'famous market bazaar shopping experience',
    'adventure outdoor activity excursion',
  ],
  datenight: [
    'romantic restaurant candlelit intimate dinner', 'rooftop bar panoramic views sunset',
    'wine bar upscale cozy date', 'cocktail lounge speakeasy intimate',
    'waterfront restaurant scenic dining', 'fine dining tasting menu date',
    'jazz bar live music intimate venue', 'scenic viewpoint sunset overlook',
    'dessert bar patisserie late night sweets', 'champagne bar lounge upscale',
  ],
  // Hidden gems — dedicated searches for off-the-beaten-path discoveries
  hiddengems: [
    'hole in the wall restaurant', 'neighborhood gem cafe',
    'local favorite restaurant off beaten path', 'family owned restaurant authentic',
    'dive bar neighborhood local', 'mom and pop restaurant local',
    'underrated restaurant hidden', 'locals only spot neighborhood',
    'tucked away cafe secret', 'back alley bar hidden speakeasy',
    'neighborhood bakery local favorite', 'authentic ethnic food hole in wall',
    'hidden courtyard garden park', 'secret viewpoint scenic overlook',
    'unknown museum gallery quirky', 'neighborhood street art mural alley',
  ],
};

// Gem score: favors high-rated places with fewer reviews (the "hidden gem" signal)
// A 4.7-star place with 80 reviews is more of a gem than a 4.7 with 5000 reviews
function gemScore(p: { rating: number; reviewCount: number }): number {
  if (!p.rating || p.rating < 3.5) return 0;
  // Diminishing returns on review count — more reviews = less "hidden"
  const discoveryFactor = 1 / (1 + Math.log10(Math.max(p.reviewCount || 1, 1)));
  return p.rating * (0.6 + 0.4 * discoveryFactor);
}

// ── Region-aware local cuisine ──
// Non-Western cities get HEAVY local cuisine with a sprinkle of international
// Western cities (US, Canada, UK, W. Europe, Australia) get diverse multicultural mix
interface LocalRegion {
  keywords: string[];
  label: string;
  foodSearches: string[];
  nightlifeSearches: string[];
}

const LOCAL_REGIONS: LocalRegion[] = [
  {
    keywords: ['ghana', 'accra', 'kumasi', 'tamale'],
    label: 'Ghanaian',
    foodSearches: [
      'fufu restaurant local', 'jollof rice restaurant', 'waakye restaurant',
      'banku tilapia restaurant', 'kelewele street food', 'chop bar local food',
      'kenkey restaurant', 'red red beans plantain', 'light soup restaurant',
      'Ghanaian restaurant local food', 'suya grilled meat spot',
      'upscale restaurant fine dining Accra', 'brunch restaurant cafe Accra',
    ],
    nightlifeSearches: [
      'rooftop bar lounge panoramic views', 'speakeasy cocktail bar upscale',
      'Afrobeat nightclub dance club', 'highlife live music bar',
      'jazz bar live performance', 'wine bar champagne lounge',
      'hookah lounge rooftop', 'outdoor bar garden lounge',
      'nightclub VIP hip hop Afrobeats', 'lounge bar sophisticated cocktails',
    ],
  },
  {
    keywords: ['nigeria', 'lagos', 'lekki', 'abuja', 'ibadan', 'port harcourt'],
    label: 'Nigerian',
    foodSearches: [
      'jollof rice restaurant', 'suya spot grilled meat', 'pepper soup restaurant',
      'egusi soup restaurant', 'pounded yam restaurant', 'amala restaurant',
      'ofada rice restaurant', 'buka local restaurant', 'Nigerian restaurant local',
      'chin chin puff puff snack', 'palm wine bar spot',
    ],
    nightlifeSearches: [
      'Afrobeat club lounge', 'rooftop bar lounge Lagos', 'beach bar club',
      'live music lounge bar', 'karaoke bar nightlife',
    ],
  },
  {
    keywords: ['senegal', 'dakar'],
    label: 'Senegalese',
    foodSearches: [
      'thieboudienne restaurant', 'yassa poulet restaurant', 'mafe restaurant',
      'Senegalese restaurant local', 'dibi grilled lamb', 'fataya pastry snack',
      'cafe touba coffee', 'ceebu jen restaurant', 'African restaurant local food',
    ],
    nightlifeSearches: ['live music mbalax bar', 'rooftop bar lounge Dakar', 'beach bar club'],
  },
  {
    keywords: ['kenya', 'nairobi', 'mombasa'],
    label: 'Kenyan',
    foodSearches: [
      'nyama choma restaurant grilled meat', 'ugali sukuma wiki restaurant',
      'mandazi cafe', 'chapati restaurant local', 'Kenyan restaurant local food',
      'pilau rice restaurant', 'mutura street food', 'chai tea cafe',
      'samosa restaurant snack', 'githeri restaurant',
    ],
    nightlifeSearches: ['rooftop bar lounge Nairobi', 'live music bar club', 'Afrobeat club'],
  },
  {
    keywords: ['ethiopia', 'addis ababa'],
    label: 'Ethiopian',
    foodSearches: [
      'injera restaurant Ethiopian', 'tibs restaurant', 'kitfo restaurant',
      'shiro restaurant', 'Ethiopian coffee ceremony cafe', 'doro wot restaurant',
      'beyaynetu mixed platter restaurant', 'tej honey wine bar',
      'Ethiopian restaurant local food', 'firfir breakfast restaurant',
    ],
    nightlifeSearches: ['Ethiopian music bar', 'live music lounge', 'tej wine bar'],
  },
  {
    keywords: ['south africa', 'johannesburg', 'cape town', 'durban', 'pretoria'],
    label: 'South African',
    foodSearches: [
      'braai restaurant grilled meat', 'bunny chow restaurant', 'bobotie restaurant',
      'biltong shop', 'pap vleis restaurant', 'gatsby sandwich cape town',
      'South African restaurant local', 'shisa nyama braai', 'koeksister dessert',
      'chakalaka restaurant', 'rooibos tea cafe',
    ],
    nightlifeSearches: ['rooftop bar lounge', 'jazz club live music', 'craft beer brewery'],
  },
  {
    keywords: ['jamaica', 'kingston', 'montego bay', 'ocho rios', 'negril'],
    label: 'Jamaican',
    foodSearches: [
      'jerk chicken restaurant', 'oxtail restaurant Jamaican', 'ackee saltfish restaurant',
      'patty shop beef patty', 'curry goat restaurant', 'festival fried dumpling',
      'Jamaican restaurant local food', 'ital food restaurant', 'bammy cassava restaurant',
      'escovitch fish restaurant', 'run down mackerel restaurant', 'sorrel drink juice bar',
    ],
    nightlifeSearches: [
      'reggae dancehall club', 'rum bar cocktail', 'beach bar lounge',
      'live reggae music bar', 'sound system party club',
    ],
  },
  {
    keywords: ['trinidad', 'tobago', 'port of spain'],
    label: 'Trinidadian',
    foodSearches: [
      'doubles roti restaurant', 'bake and shark restaurant', 'pelau restaurant',
      'callaloo crab restaurant', 'Trinidadian restaurant local food',
      'macaroni pie restaurant', 'curry duck restaurant', 'corn soup street food',
    ],
    nightlifeSearches: ['soca calypso club', 'rum bar cocktail lounge', 'beach bar'],
  },
  {
    keywords: ['barbados', 'bridgetown'],
    label: 'Bajan',
    foodSearches: [
      'flying fish cou cou restaurant', 'Bajan restaurant local food',
      'fish cutter sandwich', 'macaroni pie restaurant', 'pudding souse restaurant',
      'rum punch bar', 'conkies local dessert', 'cutters beach bar restaurant',
    ],
    nightlifeSearches: ['beach bar rum bar', 'live music bar lounge', 'calypso club'],
  },
  {
    keywords: ['bahamas', 'nassau', 'freeport'],
    label: 'Bahamian',
    foodSearches: [
      'conch salad restaurant', 'cracked conch restaurant', 'Bahamian restaurant local',
      'peas and rice restaurant', 'guava duff dessert', 'fish fry restaurant local',
      'sky juice cocktail bar', 'johnnycake restaurant',
    ],
    nightlifeSearches: ['beach bar club', 'junkanoo festival bar', 'rum bar lounge'],
  },
  {
    keywords: ['puerto rico', 'san juan', 'ponce'],
    label: 'Puerto Rican',
    foodSearches: [
      'mofongo restaurant', 'lechon asado restaurant', 'alcapurrias frituras',
      'arroz con gandules restaurant', 'piragua shaved ice', 'bacalaito fritters',
      'Puerto Rican restaurant local food', 'chinchorro bar food', 'tembleque dessert',
    ],
    nightlifeSearches: ['salsa reggaeton club', 'rum bar cocktail lounge', 'rooftop bar Old San Juan'],
  },
  {
    keywords: ['dominican republic', 'santo domingo', 'punta cana'],
    label: 'Dominican',
    foodSearches: [
      'mangu restaurant Dominican', 'sancocho soup restaurant', 'la bandera restaurant',
      'chicharron restaurant', 'Dominican restaurant local food', 'empanada stand',
      'morir sonando juice bar', 'chimichurri burger Dominican', 'habichuela con dulce',
    ],
    nightlifeSearches: ['merengue bachata club', 'rum bar lounge', 'colmado bar local'],
  },
  {
    keywords: ['cuba', 'havana'],
    label: 'Cuban',
    foodSearches: [
      'ropa vieja restaurant', 'Cuban sandwich restaurant', 'lechon restaurant',
      'arroz con pollo restaurant', 'tostones maduros restaurant', 'Cuban restaurant local',
      'mojito bar cocktail', 'paladar restaurant local', 'Cuban coffee cafecito',
    ],
    nightlifeSearches: ['salsa club live music', 'mojito bar lounge', 'live son cubano bar'],
  },
  {
    keywords: ['haiti', 'port-au-prince'],
    label: 'Haitian',
    foodSearches: [
      'griot fried pork restaurant', 'diri ak djon djon restaurant', 'tassot restaurant',
      'Haitian restaurant local food', 'accra fritters snack', 'soup joumou restaurant',
      'pain patate dessert', 'pikliz restaurant spicy',
    ],
    nightlifeSearches: ['kompa music club', 'rum bar lounge', 'live music bar'],
  },
  {
    keywords: ['mexico', 'mexico city', 'cdmx', 'cancun', 'cozumel', 'cabo san lucas', 'puerto vallarta', 'guadalajara', 'oaxaca', 'playa del carmen', 'tulum', 'merida', 'puebla', 'monterrey', 'tijuana'],
    label: 'Mexican',
    foodSearches: [
      'taqueria street tacos al pastor', 'mole restaurant Oaxacan', 'tamales restaurant local',
      'pozole restaurant', 'elote esquites street food', 'tlayuda restaurant',
      'torta restaurant Mexican sandwich', 'churros chocolate cafe', 'cochinita pibil restaurant',
      'birria restaurant', 'mezcal bar mezcaleria', 'ceviche mariscos restaurant',
      'Mexican market antojitos comida', 'huarache sope restaurant',
    ],
    nightlifeSearches: [
      'mezcal bar cantina', 'rooftop bar lounge', 'live mariachi bar',
      'pulqueria bar', 'Latin nightclub salsa', 'speakeasy cocktail bar',
    ],
  },
  {
    keywords: ['colombia', 'bogota', 'medellin', 'cartagena', 'cali', 'barranquilla'],
    label: 'Colombian',
    foodSearches: [
      'arepa restaurant', 'bandeja paisa restaurant', 'empanada stand local',
      'sancocho soup restaurant', 'ajiaco restaurant', 'lechona restaurant',
      'Colombian restaurant local food', 'patacon restaurant', 'buñuelo pandebono bakery',
      'ceviche restaurant Caribbean coast', 'aguardiente bar',
    ],
    nightlifeSearches: [
      'salsa club Cali style', 'reggaeton club bar', 'rooftop bar lounge',
      'live vallenato music bar', 'aguardiente bar nightlife',
    ],
  },
  {
    keywords: ['brazil', 'sao paulo', 'rio de janeiro', 'salvador', 'recife', 'belo horizonte', 'fortaleza', 'florianopolis', 'brasilia'],
    label: 'Brazilian',
    foodSearches: [
      'churrascaria steakhouse', 'feijoada restaurant', 'acai bowl cafe',
      'coxinha snack bar', 'pao de queijo bakery', 'Brazilian restaurant local food',
      'moqueca fish stew restaurant', 'pastel fried pastry', 'tapioca crepe stand',
      'brigadeiro dessert cafe', 'boteco bar restaurant',
    ],
    nightlifeSearches: [
      'samba bar live music', 'forró dance club', 'rooftop bar lounge',
      'pagode live bar', 'caipirinha cocktail bar',
    ],
  },
  {
    keywords: ['peru', 'lima', 'cusco', 'arequipa'],
    label: 'Peruvian',
    foodSearches: [
      'ceviche restaurant Peruvian', 'lomo saltado restaurant', 'anticucho restaurant',
      'causa rellena restaurant', 'aji de gallina restaurant', 'Peruvian restaurant local food',
      'chicharron sandwich restaurant', 'lucuma dessert cafe', 'pisco sour bar',
      'pollo a la brasa rotisserie', 'chifa restaurant Peruvian Chinese',
    ],
    nightlifeSearches: ['pisco bar cocktail lounge', 'peña criolla live music', 'rooftop bar'],
  },
  {
    keywords: ['argentina', 'buenos aires', 'mendoza', 'cordoba'],
    label: 'Argentine',
    foodSearches: [
      'parrilla steakhouse asado', 'empanada restaurant Argentine', 'milanesa restaurant',
      'choripan sandwich stand', 'dulce de leche dessert cafe', 'Argentine restaurant local',
      'provoleta grilled cheese', 'locro stew restaurant', 'medialunas bakery cafe',
      'malbec wine bar bodega',
    ],
    nightlifeSearches: ['tango milonga club', 'wine bar bodega', 'jazz bar lounge', 'boliche nightclub'],
  },
  {
    keywords: ['india', 'mumbai', 'delhi', 'new delhi', 'bangalore', 'bengaluru', 'chennai', 'kolkata', 'hyderabad', 'jaipur', 'pune', 'goa', 'ahmedabad', 'kochi'],
    label: 'Indian',
    foodSearches: [
      'biryani restaurant local', 'tandoori restaurant dhaba', 'dosa south Indian restaurant',
      'chaat street food', 'thali restaurant', 'chai tea cafe stall',
      'paneer tikka restaurant', 'butter chicken restaurant local', 'pav bhaji street food',
      'idli sambar restaurant', 'kebab restaurant mughlai', 'lassi sweet shop',
      'vada pav street food', 'chole bhature restaurant', 'paratha restaurant',
    ],
    nightlifeSearches: [
      'rooftop bar lounge', 'live music bar Bollywood', 'craft brewery taproom',
      'hookah lounge bar', 'wine bar cocktail lounge',
    ],
  },
  {
    keywords: ['thailand', 'bangkok', 'chiang mai', 'phuket', 'pattaya', 'krabi', 'koh samui'],
    label: 'Thai',
    foodSearches: [
      'pad thai restaurant local', 'tom yum restaurant', 'green curry restaurant Thai',
      'mango sticky rice dessert', 'som tum papaya salad', 'Thai street food stall',
      'khao soi restaurant', 'massaman curry restaurant', 'Thai restaurant local food',
      'boat noodle restaurant', 'night market food stall', 'Thai tea cafe',
    ],
    nightlifeSearches: [
      'rooftop bar Bangkok', 'cocktail lounge bar', 'night market bar',
      'jazz bar live music', 'sky bar lounge',
    ],
  },
  {
    keywords: ['vietnam', 'hanoi', 'ho chi minh', 'saigon', 'da nang', 'hoi an'],
    label: 'Vietnamese',
    foodSearches: [
      'pho restaurant local', 'banh mi sandwich restaurant', 'bun cha restaurant',
      'com tam broken rice restaurant', 'Vietnamese restaurant local food',
      'spring roll restaurant', 'ca phe sua da Vietnamese coffee', 'bun bo hue restaurant',
      'banh xeo crepe restaurant', 'Vietnamese street food stall', 'egg coffee cafe',
    ],
    nightlifeSearches: [
      'rooftop bar lounge', 'bia hoi beer corner', 'cocktail bar speakeasy',
      'live music bar', 'night market street food bar',
    ],
  },
  {
    keywords: ['japan', 'tokyo', 'osaka', 'kyoto', 'yokohama', 'sapporo', 'fukuoka', 'nagoya'],
    label: 'Japanese',
    foodSearches: [
      'ramen shop local', 'sushi restaurant omakase', 'izakaya bar restaurant',
      'yakitori grilled chicken restaurant', 'tempura restaurant', 'udon soba noodle shop',
      'matcha cafe tea house', 'takoyaki street food', 'tonkatsu restaurant',
      'onigiri rice ball shop', 'Japanese curry restaurant', 'okonomiyaki restaurant',
    ],
    nightlifeSearches: [
      'izakaya bar drinking', 'sake bar Japanese', 'cocktail bar lounge',
      'karaoke bar', 'jazz bar live music',
    ],
  },
  {
    keywords: ['korea', 'seoul', 'busan', 'incheon', 'jeju', 'south korea'],
    label: 'Korean',
    foodSearches: [
      'Korean BBQ restaurant local', 'bibimbap restaurant', 'kimchi jjigae restaurant',
      'tteokbokki street food', 'Korean fried chicken restaurant', 'samgyeopsal restaurant',
      'kalguksu noodle soup restaurant', 'jajangmyeon restaurant', 'Korean restaurant local food',
      'sundubu jjigae tofu soup', 'gimbap restaurant', 'hotteok street food dessert',
    ],
    nightlifeSearches: [
      'soju bar Korean', 'noraebang karaoke', 'Korean craft beer bar',
      'makgeolli bar traditional', 'rooftop bar lounge Seoul',
    ],
  },
  {
    keywords: ['china', 'beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'hong kong', 'macau', 'hangzhou', 'xian'],
    label: 'Chinese',
    foodSearches: [
      'dim sum restaurant local', 'hot pot restaurant Sichuan', 'dumpling restaurant',
      'Peking duck restaurant', 'hand pulled noodle shop', 'mapo tofu restaurant',
      'bao steamed buns', 'congee breakfast restaurant', 'wonton restaurant',
      'Cantonese restaurant local', 'Chinese street food stall', 'xiaolongbao soup dumpling',
    ],
    nightlifeSearches: [
      'cocktail bar lounge', 'rooftop bar skyline', 'karaoke KTV bar',
      'jazz bar live music', 'craft brewery taproom',
    ],
  },
  {
    keywords: ['singapore'],
    label: 'Singaporean',
    foodSearches: [
      'hawker center food stall', 'chicken rice restaurant', 'laksa restaurant',
      'char kway teow restaurant', 'chili crab restaurant', 'roti prata restaurant',
      'kaya toast coffee shop', 'satay street food', 'bak kut teh restaurant',
      'nasi lemak restaurant', 'ice kachang dessert', 'Singaporean restaurant local food',
    ],
    nightlifeSearches: ['rooftop bar lounge', 'cocktail bar speakeasy', 'craft beer bar', 'live music bar'],
  },
  {
    keywords: ['malaysia', 'kuala lumpur', 'penang', 'malacca', 'langkawi'],
    label: 'Malaysian',
    foodSearches: [
      'nasi lemak restaurant local', 'char kuey teow restaurant', 'roti canai restaurant',
      'laksa restaurant', 'satay street food', 'Malaysian restaurant local food',
      'teh tarik cafe', 'nasi kandar restaurant', 'cendol dessert',
      'mamak restaurant', 'rendang restaurant',
    ],
    nightlifeSearches: ['rooftop bar lounge', 'night market food bar', 'cocktail bar lounge'],
  },
  {
    keywords: ['indonesia', 'jakarta', 'bali', 'yogyakarta', 'bandung'],
    label: 'Indonesian',
    foodSearches: [
      'nasi goreng restaurant', 'satay restaurant local', 'rendang restaurant',
      'gado gado restaurant', 'bakso meatball soup', 'Indonesian restaurant local food',
      'warung local food stall', 'nasi padang restaurant', 'martabak street food',
      'soto soup restaurant', 'tempeh tofu restaurant',
    ],
    nightlifeSearches: ['beach bar club Bali', 'rooftop bar lounge', 'live music bar'],
  },
  {
    keywords: ['philippines', 'manila', 'cebu', 'boracay'],
    label: 'Filipino',
    foodSearches: [
      'adobo restaurant Filipino', 'sinigang soup restaurant', 'lechon restaurant',
      'sisig restaurant', 'halo halo dessert', 'Filipino restaurant local food',
      'lumpia spring roll', 'kare kare restaurant', 'tapa silog breakfast',
      'pancit noodle restaurant', 'balut street food',
    ],
    nightlifeSearches: ['karaoke bar', 'rooftop bar lounge', 'live band bar', 'craft beer bar'],
  },
  {
    keywords: ['dubai', 'abu dhabi', 'uae', 'sharjah'],
    label: 'Emirati & Middle Eastern',
    foodSearches: [
      'shawarma restaurant local', 'mandi restaurant Arabic', 'kunafa dessert shop',
      'falafel hummus restaurant', 'machboos restaurant', 'Arabic restaurant local food',
      'karak chai tea cafe', 'luqaimat dessert shop', 'manakeesh bakery',
      'kebab grill restaurant', 'dates Arabic sweets shop',
    ],
    nightlifeSearches: [
      'rooftop bar lounge Dubai', 'beach bar club', 'shisha hookah lounge',
      'cocktail bar speakeasy', 'sky bar lounge',
    ],
  },
  {
    keywords: ['lebanon', 'beirut'],
    label: 'Lebanese',
    foodSearches: [
      'mezze restaurant Lebanese', 'shawarma restaurant', 'falafel restaurant local',
      'manoushe bakery', 'tabbouleh fattoush restaurant', 'kibbeh restaurant',
      'Lebanese restaurant local food', 'knafeh dessert', 'arak bar Lebanese wine',
    ],
    nightlifeSearches: ['rooftop bar Beirut', 'cocktail bar lounge', 'live music bar'],
  },
  {
    keywords: ['turkey', 'istanbul', 'ankara', 'izmir', 'antalya'],
    label: 'Turkish',
    foodSearches: [
      'kebab restaurant Turkish local', 'lahmacun pide restaurant', 'baklava kunefe dessert',
      'Turkish breakfast kahvalti', 'iskender doner restaurant', 'kofte meatball restaurant',
      'Turkish restaurant local food', 'simit bakery', 'manti dumpling restaurant',
      'Turkish coffee cafe', 'borek pastry shop', 'raki meyhane bar',
    ],
    nightlifeSearches: ['meyhane bar Turkish', 'rooftop bar lounge Istanbul', 'live music bar', 'raki bar'],
  },
  {
    keywords: ['morocco', 'marrakech', 'fes', 'casablanca', 'rabat'],
    label: 'Moroccan',
    foodSearches: [
      'tagine restaurant Moroccan', 'couscous restaurant', 'pastilla bastilla restaurant',
      'harira soup restaurant', 'Moroccan restaurant local food', 'mint tea cafe',
      'msemen pancake bakery', 'mechoui roasted lamb', 'rfissa restaurant',
    ],
    nightlifeSearches: ['rooftop bar riad', 'live gnawa music', 'cocktail lounge bar'],
  },
  {
    keywords: ['egypt', 'cairo', 'alexandria'],
    label: 'Egyptian',
    foodSearches: [
      'koshari restaurant Egyptian', 'foul medames restaurant', 'shawarma kofta restaurant',
      'Egyptian restaurant local food', 'feteer meshaltet pastry', 'molokhia restaurant',
      'hawawshi restaurant', 'ta\'ameya falafel Egyptian', 'om ali dessert shop',
    ],
    nightlifeSearches: ['Nile rooftop bar', 'shisha hookah lounge', 'live music bar'],
  },
  {
    keywords: ['israel', 'tel aviv', 'jerusalem', 'haifa'],
    label: 'Israeli & Middle Eastern',
    foodSearches: [
      'hummus restaurant local', 'falafel restaurant best local', 'shakshuka restaurant',
      'sabich restaurant', 'Israeli restaurant local food', 'bourekas bakery',
      'halva dessert shop', 'schnitzel restaurant', 'jachnun malawach breakfast',
    ],
    nightlifeSearches: ['cocktail bar Tel Aviv', 'rooftop bar lounge', 'live music bar'],
  },
];

/** Detect if a city is in a region with strong local food culture */
function detectLocalRegion(city: string): LocalRegion | null {
  if (!city) return null;
  const cityLower = city.toLowerCase();
  for (const region of LOCAL_REGIONS) {
    if (region.keywords.some(kw => cityLower.includes(kw))) {
      return region;
    }
  }
  return null;
}

// ── Party / Island / Beach destination awareness ──
// These destinations are famous for specific venue types that generic searches miss
interface PartyDestination {
  keywords: string[];
  searches: string[];
  aiBoost: string;
}

const PARTY_DESTINATIONS: PartyDestination[] = [
  {
    keywords: ['ibiza'],
    searches: [
      'mega club nightclub Ibiza', 'beach club Ibiza day party pool',
      'sunset bar cafe Ibiza', 'famous nightclub DJ Ibiza',
      'rooftop bar Ibiza', 'restaurant Ibiza old town',
      'beach bar chiringuito Ibiza', 'best beach Ibiza turquoise',
      'cala beach hidden cove Ibiza', 'tapas restaurant Ibiza local',
      'paella seafood restaurant Ibiza', 'farm to table restaurant Ibiza',
    ],
    aiBoost: 'This is IBIZA — the world capital of nightlife and beach culture. MUST include iconic clubs (Hi, Ushuaia, Pacha, Amnesia, DC-10, Privilege), famous beach clubs (Blue Marlin, Nikki Beach, Nassau), legendary sunset bars (Cafe Del Mar, Cafe Mambo, Sunset Ashram), stunning beaches (Cala Comte, Cala Salada, Ses Salines, Cala d\'Hort), and hidden local restaurants in Ibiza Town/Dalt Vila. Mix world-famous venues with secret coves and local tapas spots.',
  },
  {
    keywords: ['mykonos'],
    searches: [
      'beach club Mykonos party', 'famous bar Mykonos nightlife',
      'sunset bar Mykonos Little Venice', 'beach bar Mykonos',
      'Greek taverna restaurant Mykonos', 'seafood restaurant Mykonos waterfront',
      'nightclub Mykonos DJ dance', 'best beach Mykonos',
    ],
    aiBoost: 'This is MYKONOS — famous for beach parties, sunset cocktails at Little Venice, iconic beach clubs (Scorpios, Nammos, Super Paradise), incredible Greek tavernas, and world-class nightlife. Mix the famous party spots with authentic local experiences.',
  },
  {
    keywords: ['cancun', 'tulum', 'playa del carmen'],
    searches: [
      'beach club resort Cancun party', 'nightclub Cancun hotel zone',
      'cenote swimming natural pool', 'Mayan ruins archaeological site',
      'taco restaurant authentic Mexican', 'rooftop bar ocean view',
      'beach bar Caribbean sunset', 'jungle restaurant eco dining',
    ],
    aiBoost: 'This is the RIVIERA MAYA — mix beach clubs, cenotes, Mayan ruins, incredible Mexican street food, rooftop bars, and nightlife. Include both the famous resort party spots AND the authentic local gems.',
  },
  {
    keywords: ['miami', 'south beach', 'wynwood', 'brickell'],
    searches: [
      'nightclub South Beach Miami', 'rooftop bar Brickell downtown',
      'beach club Miami pool party', 'Cuban restaurant Little Havana',
      'art deco district Ocean Drive', 'street art Wynwood Walls',
      'Latin nightclub salsa Miami', 'waterfront restaurant Biscayne Bay',
    ],
    aiBoost: 'This is MIAMI — include South Beach nightlife, Wynwood arts, Little Havana Cuban food, Brickell rooftop bars, and waterfront dining. Mix the glamorous with the authentic.',
  },
  {
    keywords: ['las vegas', 'vegas'],
    searches: [
      'nightclub pool party Las Vegas Strip', 'famous casino resort',
      'celebrity chef restaurant Vegas', 'rooftop bar cocktails Strip',
      'steakhouse fine dining Vegas', 'buffet restaurant resort',
      'lounge speakeasy hidden Vegas', 'show entertainment Vegas',
    ],
    aiBoost: 'This is LAS VEGAS — include iconic casinos, world-class restaurants, mega nightclubs, pool parties, shows, and hidden gems off the Strip. Mix the spectacle with unexpected local finds.',
  },
  {
    keywords: ['bali', 'seminyak', 'canggu', 'ubud', 'kuta'],
    searches: [
      'beach club Bali sunset party', 'rice terrace scenic viewpoint',
      'temple visit Bali cultural', 'waterfall natural swimming Bali',
      'warung local restaurant Balinese', 'rooftop bar infinity pool',
      'surf beach break Bali', 'yoga retreat wellness spa',
    ],
    aiBoost: 'This is BALI — include beach clubs (Potato Head, Finns, La Brisa), rice terraces, temples, waterfalls, incredible warungs, sunset bars, and surf spots. Mix the famous Instagram spots with authentic Balinese culture.',
  },
  {
    keywords: ['barcelona'],
    searches: [
      'tapas bar restaurant Barcelona', 'beach club Barcelona waterfront',
      'rooftop bar Gothic Quarter', 'nightclub Barcelona Poble Sec',
      'Gaudi architecture landmark', 'La Boqueria market food',
      'pintxos bar vermouth aperitivo', 'chiringuito beach bar Barcelona',
    ],
    aiBoost: 'This is BARCELONA — include tapas bars, Gaudi landmarks, La Boqueria market, beach clubs, Gothic Quarter, rooftop bars, and vibrant nightlife. Mix the iconic architecture with the best food and nightlife scenes.',
  },
  // ── US CITIES ──
  {
    keywords: ['new york', 'brooklyn', 'bronx', 'manhattan'],
    searches: [
      'speakeasy hidden cocktail bar NYC', 'rooftop bar Manhattan skyline views',
      'jazz club live music Greenwich Village', 'comedy club stand up NYC',
      'Michelin restaurant tasting menu NYC', 'pizza slice best New York',
      'dim sum Chinatown Flushing', 'bagel shop best NYC',
      'Broadway theater show', 'museum world class Met Guggenheim MoMA',
      'Central Park scenic walk', 'Brooklyn Bridge waterfront DUMBO',
    ],
    aiBoost: 'This is NEW YORK CITY — include iconic landmarks (Statue of Liberty, Central Park, Brooklyn Bridge, Times Square), world-class museums (Met, MoMA, Guggenheim), legendary food (dollar pizza, bagels, dim sum, delis), speakeasies, rooftop bars, Broadway, jazz clubs, and diverse neighborhood exploring (SoHo, Williamsburg, Harlem, Lower East Side, Chelsea).',
  },
  {
    keywords: ['los angeles', 'hollywood', 'santa monica', 'venice beach'],
    searches: [
      'rooftop bar Hollywood sunset views', 'taco truck authentic LA',
      'beach club Santa Monica Venice', 'celebrity chef restaurant LA',
      'hiking trail Griffith Observatory', 'street art mural Arts District',
      'Korean BBQ Koreatown LA', 'sunset strip bar lounge',
      'Getty museum art gallery LA', 'Venice Beach boardwalk',
    ],
    aiBoost: 'This is LOS ANGELES — include Hollywood landmarks, beach culture (Santa Monica, Venice, Malibu), iconic hikes (Griffith Observatory, Runyon Canyon), incredible food diversity (Koreatown, Little Tokyo, taco trucks, celebrity chef restaurants), rooftop bars, sunset views, and the Arts District.',
  },
  {
    keywords: ['chicago'],
    searches: [
      'deep dish pizza best Chicago', 'speakeasy cocktail bar Chicago',
      'jazz club live music Chicago blues', 'rooftop bar skyline Lake Michigan',
      'architecture boat tour river', 'Millennium Park Cloud Gate Bean',
      'hot dog stand Chicago style', 'steakhouse fine dining Chicago',
      'comedy club improv Second City', 'art museum Institute Chicago',
    ],
    aiBoost: 'This is CHICAGO — include deep dish pizza, the Bean/Millennium Park, architecture river tours, world-class museums (Art Institute), blues/jazz clubs, speakeasies, rooftop bars on the river, comedy clubs (Second City), and diverse neighborhood food (Pilsen, Chinatown, Wicker Park).',
  },
  {
    keywords: ['new orleans', 'nola'],
    searches: [
      'jazz club live music Frenchmen Street', 'beignet cafe du monde',
      'Creole restaurant gumbo jambalaya', 'bourbon street bar nightlife',
      'cocktail bar historic New Orleans', 'po boy sandwich best NOLA',
      'garden district mansion tour', 'voodoo museum French Quarter',
      'oyster bar raw seafood', 'brass band second line parade',
    ],
    aiBoost: 'This is NEW ORLEANS — include Frenchmen Street jazz clubs, French Quarter bars, beignets at Cafe du Monde, Creole/Cajun food (gumbo, jambalaya, po-boys, crawfish), cocktail history (Sazerac, Hurricane), Garden District, live brass bands, and the unique NOLA nightlife culture. This city IS the party.',
  },
  {
    keywords: ['nashville'],
    searches: [
      'honky tonk bar Broadway Nashville', 'hot chicken restaurant best',
      'live music venue country Nashville', 'rooftop bar downtown Nashville',
      'BBQ restaurant Nashville', 'songwriter round listening room',
      'whiskey bar bourbon tasting', 'Grand Ole Opry show',
    ],
    aiBoost: 'This is NASHVILLE — include Broadway honky tonks, hot chicken spots (Hattie B\'s, Prince\'s, Bolton\'s), live music venues, songwriter rounds, rooftop bars, whiskey tastings, the Grand Ole Opry, and BBQ joints. The whole city is a party.',
  },
  {
    keywords: ['austin'],
    searches: [
      'live music venue Sixth Street Austin', 'BBQ restaurant best Austin',
      'taco truck authentic Austin', 'rooftop bar downtown Austin',
      'craft brewery taproom Austin', 'Barton Springs swimming hole',
      'food truck park Austin', 'honky tonk bar Rainey Street',
    ],
    aiBoost: 'This is AUSTIN — include Sixth Street and Rainey Street nightlife, legendary BBQ (Franklin, la Barbecue, Terry Black\'s), live music venues, food truck parks, craft breweries, Barton Springs, and South Congress. Keep it weird.',
  },
  {
    keywords: ['atlanta'],
    searches: [
      'hip hop club lounge Atlanta', 'soul food restaurant Atlanta',
      'rooftop bar Buckhead Midtown', 'cocktail bar Ponce City Market',
      'brunch spot Atlanta popular', 'Beltline trail walk restaurant',
      'strip club famous Atlanta', 'trap music venue Atlanta',
    ],
    aiBoost: 'This is ATLANTA — include the BeltLine, soul food, hip hop culture, Midtown and Buckhead nightlife, incredible brunch culture, Ponce City Market, diverse food scene, and world-famous nightlife.',
  },
  {
    keywords: ['houston'],
    searches: [
      'Vietnamese restaurant Midtown Houston', 'BBQ restaurant Houston best',
      'rooftop bar downtown Houston', 'Tex-Mex restaurant Houston',
      'NASA Space Center museum', 'hip hop club lounge Houston',
      'crawfish restaurant seafood Houston', 'food hall Houston diverse',
    ],
    aiBoost: 'This is HOUSTON — the most diverse food city in America. Include Viet-Cajun crawfish, Tex-Mex, BBQ, Nigerian food, Indian food, Chinese food, NASA Space Center, the Museum District, and Houston nightlife.',
  },
  {
    keywords: ['san francisco'],
    searches: [
      'Golden Gate Bridge viewpoint scenic', 'dim sum restaurant Chinatown SF',
      'sourdough bread clam chowder Fishermans Wharf', 'craft cocktail bar Mission District',
      'tech startup cafe SOMA', 'Alcatraz island tour',
      'street food taco Mission burrito', 'wine bar Napa tasting room SF',
    ],
    aiBoost: 'This is SAN FRANCISCO — include the Golden Gate Bridge, Fisherman\'s Wharf, Chinatown, Mission District burritos, Alcatraz, cable cars, incredible dim sum, craft cocktails, wine bars, and Pacific Ocean views.',
  },
  {
    keywords: ['washington d.c.', 'washington dc'],
    searches: [
      'Smithsonian museum free DC', 'Ethiopian restaurant U Street',
      'Georgetown bar restaurant waterfront', 'rooftop bar DC skyline monument',
      'half smoke hot dog Ben\'s Chili Bowl', 'cocktail bar 14th Street DC',
      'National Mall monument Lincoln Memorial', 'brunch spot DC popular',
    ],
    aiBoost: 'This is WASHINGTON D.C. — include the Smithsonian museums (free!), National Mall monuments, Georgetown waterfront, U Street corridor, Ethiopian food, incredible brunch culture, rooftop bars with monument views, and the 14th Street scene.',
  },
  {
    keywords: ['seattle'],
    searches: [
      'Pike Place Market fish throw coffee', 'craft brewery taproom Seattle',
      'seafood restaurant waterfront Puget Sound', 'Space Needle observation',
      'coffee shop original Starbucks', 'sushi restaurant fresh Seattle',
      'cocktail bar Capitol Hill', 'music venue grunge history',
    ],
    aiBoost: 'This is SEATTLE — include Pike Place Market, the original Starbucks, Space Needle, incredible seafood, craft beer culture, coffee culture, Capitol Hill nightlife, and Pacific Northwest nature.',
  },
  {
    keywords: ['portland'],
    searches: [
      'food cart pod Portland', 'craft brewery Portland best',
      'donut shop Voodoo Portland', 'Japanese garden scenic',
      'Powell\'s bookstore world largest', 'coffee roaster Portland',
      'natural wine bar Portland', 'food truck park Portland',
    ],
    aiBoost: 'This is PORTLAND — include food cart pods, craft breweries, coffee roasters, Powell\'s Books, Japanese Garden, Voodoo Doughnuts, natural wine bars, and the quirky DIY culture. Keep Portland weird.',
  },
  {
    keywords: ['denver'],
    searches: [
      'craft brewery taproom Denver RiNo', 'dispensary cannabis lounge',
      'Mexican restaurant Denver best', 'rooftop bar mountain views Denver',
      'Red Rocks amphitheater concert', 'hiking trail near Denver',
    ],
    aiBoost: 'This is DENVER — include craft breweries (RiNo district), Red Rocks, mountain views, incredible Mexican food, rooftop bars, and outdoor culture.',
  },
  {
    keywords: ['honolulu', 'waikiki', 'hawaii', 'oahu', 'maui'],
    searches: [
      'beach bar Waikiki sunset', 'poke bowl restaurant best Hawaii',
      'shave ice Hawaiian dessert', 'luau traditional Hawaiian show',
      'snorkeling beach turquoise Hawaii', 'surf lesson Waikiki beach',
      'seafood restaurant oceanfront Hawaii', 'plate lunch Hawaiian food',
    ],
    aiBoost: 'This is HAWAII — include incredible beaches, poke bowls, shave ice, plate lunches, luaus, snorkeling, surfing, sunset bars, Diamond Head hike, and oceanfront dining. Mix the tourist highlights with local Hawaiian food culture.',
  },
  // ── EUROPE ──
  {
    keywords: ['london'],
    searches: [
      'pub historic traditional London', 'cocktail bar Soho speakeasy',
      'Borough Market food stall', 'afternoon tea luxury London',
      'rooftop bar London skyline', 'curry Brick Lane restaurant',
      'fish and chips best London', 'West End theater show musical',
      'museum free British Museum Tate', 'Camden Market street food',
    ],
    aiBoost: 'This is LONDON — include historic pubs, Borough Market, West End shows, world-class museums (British Museum, Tate, V&A — all free), afternoon tea, Soho cocktail bars, Brick Lane curry, Camden Market, and incredible diverse food (the best Indian, Chinese, Nigerian, and Lebanese food outside those countries).',
  },
  {
    keywords: ['paris'],
    searches: [
      'bistro restaurant traditional French Paris', 'wine bar natural wine Paris',
      'patisserie croissant best Paris', 'cocktail bar Marais speakeasy',
      'Eiffel Tower scenic viewpoint', 'Louvre museum art gallery',
      'crepe stand Montmartre', 'jazz club Saint-Germain Paris',
      'cheese wine shop fromagerie', 'rooftop bar Paris skyline',
    ],
    aiBoost: 'This is PARIS — include iconic landmarks (Eiffel Tower, Louvre, Sacré-Cœur), classic bistros, patisseries, wine bars, Le Marais cocktail bars, Montmartre, jazz clubs, fromageries, the Seine at sunset, and hidden neighborhood gems.',
  },
  {
    keywords: ['berlin'],
    searches: [
      'techno nightclub Berghain Berlin', 'street food Kreuzberg Turkish',
      'beer garden Prater Biergarten', 'cocktail bar Neukölln Friedrichshain',
      'currywurst best Berlin', 'Berlin Wall East Side Gallery',
      'rooftop bar Berlin sunset', 'underground music venue Berlin',
    ],
    aiBoost: 'This is BERLIN — include legendary techno clubs (Berghain, Tresor, Watergate), Kreuzberg street food, beer gardens, the Wall/East Side Gallery, incredible Turkish food, underground music venues, and the raw creative energy of Neukölln and Friedrichshain.',
  },
  {
    keywords: ['amsterdam'],
    searches: [
      'brown cafe traditional Amsterdam pub', 'cocktail bar Jordaan canal',
      'Indonesian rijsttafel restaurant', 'Van Gogh Rijksmuseum museum',
      'canal cruise boat tour', 'stroopwafel herring street food',
      'coffee shop Amsterdam', 'rooftop bar Amsterdam views',
    ],
    aiBoost: 'This is AMSTERDAM — include canal cruises, the Van Gogh Museum, Rijksmuseum, brown cafes, Indonesian rijsttafel, Jordaan neighborhood, stroopwafels, cocktail bars, and the Red Light District area. Mix culture with the famous laid-back Amsterdam vibe.',
  },
  {
    keywords: ['madrid'],
    searches: [
      'tapas bar Mercado San Miguel', 'flamenco show tablao Madrid',
      'rooftop bar Gran Via Madrid', 'cocktail bar Malasaña Chueca',
      'churros chocolate San Ginés', 'cochinillo restaurant Madrid',
      'Prado museum Reina Sofia art', 'Retiro Park boat lake',
    ],
    aiBoost: 'This is MADRID — include tapas crawls, Mercado San Miguel, flamenco shows, churros at San Ginés, the Prado and Reina Sofia museums, Retiro Park, rooftop bars on Gran Vía, and the legendary late-night culture (dinner at 10pm, out until sunrise).',
  },
  {
    keywords: ['lisbon'],
    searches: [
      'fado music venue restaurant Alfama', 'pastel de nata bakery Belem',
      'rooftop bar miradouro viewpoint Lisbon', 'seafood restaurant fresh grilled fish',
      'Time Out Market food hall', 'tram 28 scenic ride Lisbon',
      'ginjinha cherry liqueur bar', 'cocktail bar Bairro Alto nightlife',
    ],
    aiBoost: 'This is LISBON — include fado houses in Alfama, pastéis de nata in Belém, miradouro viewpoints, Time Out Market, tram 28, fresh seafood, ginjinha bars, Bairro Alto nightlife, and LX Factory. One of Europe\'s best nightlife cities.',
  },
  {
    keywords: ['prague'],
    searches: [
      'beer hall Czech lager Prague', 'cocktail bar Old Town speakeasy',
      'trdelník pastry street food', 'Prague Castle cathedral panoramic',
      'Charles Bridge scenic walk', 'jazz club underground Prague',
      'rooftop bar Prague skyline', 'absinthe bar Prague',
    ],
    aiBoost: 'This is PRAGUE — include Prague Castle, Charles Bridge, Old Town Square, incredible Czech beer halls, absinthe bars, speakeasies, jazz clubs, trdelník, and some of Europe\'s most affordable nightlife.',
  },
  {
    keywords: ['budapest'],
    searches: [
      'ruin bar Szimpla Kert Budapest', 'thermal bath spa Szechenyi Gellert',
      'goulash restaurant Hungarian traditional', 'rooftop bar Danube views',
      'cocktail bar Jewish Quarter', 'chimney cake kürtőskalács street',
      'Danube river cruise night', 'wine bar Hungarian tokaji',
    ],
    aiBoost: 'This is BUDAPEST — include ruin bars (Szimpla Kert), thermal baths (Széchenyi, Gellért), Hungarian goulash, the Jewish Quarter nightlife, Danube river views, Parliament building, and incredible wine. One of Europe\'s best party cities.',
  },
  {
    keywords: ['dublin'],
    searches: [
      'pub traditional Irish music live Dublin', 'Guinness Storehouse brewery tour',
      'Temple Bar nightlife area', 'whiskey tasting bar Dublin',
      'fish and chips best Dublin', 'cocktail bar Dublin creative',
      'Irish stew restaurant traditional', 'street food market Dublin',
    ],
    aiBoost: 'This is DUBLIN — include traditional pubs with live music, the Guinness Storehouse, Temple Bar area, whiskey tastings, fish and chips, Irish stew, and the legendary craic (fun). Dublin knows how to party.',
  },
  {
    keywords: ['edinburgh'],
    searches: [
      'whisky bar tasting Edinburgh', 'pub Royal Mile Old Town',
      'Edinburgh Castle scenic viewpoint', 'haggis restaurant Scottish',
      'cocktail bar New Town Edinburgh', 'Arthur Seat hike panoramic',
      'gin bar Edinburgh Scottish', 'underground vault tour Edinburgh',
    ],
    aiBoost: 'This is EDINBURGH — include Edinburgh Castle, the Royal Mile, Arthur\'s Seat hike, whisky bars, traditional pubs, haggis, gin distilleries, underground vault tours, and the stunning Old Town/New Town contrast.',
  },
  {
    keywords: ['rome'],
    searches: [
      'trattoria authentic Roman pasta cacio e pepe', 'gelato best artisanal Rome',
      'Colosseum Roman Forum ancient', 'rooftop bar Trastevere views',
      'aperitivo spritz bar Rome', 'pizza al taglio best Rome',
      'Vatican Sistine Chapel museum', 'Pantheon Piazza Navona fountain',
    ],
    aiBoost: 'This is ROME — include the Colosseum, Vatican/Sistine Chapel, Pantheon, authentic Roman trattorias (cacio e pepe, carbonara, amatriciana), gelato, pizza al taglio, aperitivo culture, Trastevere nightlife, and Piazza Navona.',
  },
  {
    keywords: ['florence', 'firenze'],
    searches: [
      'bistecca fiorentina steakhouse Florence', 'gelato best artisanal Florence',
      'Uffizi Gallery Renaissance art', 'Ponte Vecchio scenic bridge',
      'wine bar Chianti tasting', 'leather market San Lorenzo',
      'Duomo cathedral dome climb', 'trattoria authentic Tuscan',
    ],
    aiBoost: 'This is FLORENCE — include the Uffizi, Duomo, Ponte Vecchio, bistecca alla fiorentina, incredible gelato, Chianti wine, leather markets, Renaissance art, and Tuscan trattorias.',
  },
  {
    keywords: ['venice', 'venezia'],
    searches: [
      'cicchetti bar bacaro Venice', 'gondola ride canal Venice',
      'St Marks Square Basilica Doges Palace', 'seafood restaurant Rialto market',
      'aperitivo spritz bar canal side', 'Murano glass island tour',
      'hidden campo square Venice local', 'sunset viewpoint Accademia bridge',
    ],
    aiBoost: 'This is VENICE — include cicchetti bars (Venetian tapas), gondola rides, St Mark\'s Square, Rialto Market, spritz culture, Murano island, hidden campos, and canal-side dining.',
  },
  {
    keywords: ['milan', 'milano'],
    searches: [
      'aperitivo Navigli canal bar Milan', 'fashion district luxury shopping',
      'Duomo cathedral rooftop Milan', 'risotto restaurant Milanese traditional',
      'cocktail bar Brera district', 'Last Supper Leonardo da Vinci',
      'nightclub Milan design district', 'gelato best Milan',
    ],
    aiBoost: 'This is MILAN — include the Duomo, Last Supper, Navigli aperitivo culture, fashion district, risotto alla milanese, Brera district, and Milan\'s underrated nightlife scene.',
  },
  {
    keywords: ['copenhagen'],
    searches: [
      'Noma restaurant New Nordic', 'Tivoli Gardens amusement park',
      'smørrebrød restaurant traditional Danish', 'cocktail bar Nørrebro Vesterbro',
      'canal tour Nyhavn colorful houses', 'street food market Reffen',
      'bakery cardamom bun Danish pastry', 'Michelin restaurant Copenhagen',
    ],
    aiBoost: 'This is COPENHAGEN — include Nyhavn, Tivoli Gardens, New Nordic cuisine, smørrebrød, Reffen street food market, incredible bakeries, craft cocktail bars, and the hygge atmosphere.',
  },
  {
    keywords: ['stockholm'],
    searches: [
      'meatball restaurant Swedish traditional', 'cocktail bar Södermalm Stockholm',
      'Gamla Stan Old Town walk scenic', 'ABBA museum Djurgården',
      'fika cafe coffee cinnamon bun', 'archipelago boat tour Stockholm',
      'rooftop bar Stockholm waterfront', 'Michelin restaurant Nordic cuisine',
    ],
    aiBoost: 'This is STOCKHOLM — include Gamla Stan (Old Town), fika culture, Swedish meatballs, ABBA Museum, archipelago tours, Södermalm nightlife, and Nordic fine dining.',
  },
  {
    keywords: ['vienna', 'wien'],
    searches: [
      'coffee house traditional Viennese cafe', 'Sachertorte cake famous Vienna',
      'Schönbrunn Palace imperial landmark', 'opera classical concert Vienna',
      'wiener schnitzel restaurant traditional', 'wine tavern heuriger Vienna',
      'Naschmarkt food market', 'cocktail bar Vienna 1st district',
    ],
    aiBoost: 'This is VIENNA — include traditional coffee houses, Sachertorte, Schönbrunn Palace, the opera, wiener schnitzel, heuriger wine taverns, Naschmarkt, and classical music culture.',
  },
  {
    keywords: ['santorini'],
    searches: [
      'sunset restaurant Oia caldera view', 'wine tasting vineyard Santorini',
      'black sand beach Perissa Kamari', 'seafood restaurant Ammoudi Bay',
      'cocktail bar rooftop caldera sunset', 'Greek taverna traditional Santorini',
      'boat tour volcanic hot springs', 'fava beans tomato fritters local food',
    ],
    aiBoost: 'This is SANTORINI — include Oia sunset views, caldera restaurants, wine tastings, black sand beaches, Ammoudi Bay seafood, volcanic hot springs boat tour, and traditional Greek tavernas. Every sunset here is legendary.',
  },
  {
    keywords: ['crete'],
    searches: [
      'taverna traditional Cretan restaurant', 'beach turquoise Balos Elafonissi',
      'raki tasting Cretan village', 'Knossos palace Minoan ruins',
      'olive oil tasting farm Crete', 'seafood restaurant harbor Chania',
      'gorge hiking Samaria', 'mezze restaurant Cretan cuisine',
    ],
    aiBoost: 'This is CRETE — include Balos and Elafonissi beaches, Knossos ruins, Chania harbor, traditional Cretan tavernas, raki culture, olive oil farms, Samaria Gorge, and the best mezze in Greece.',
  },
  {
    keywords: ['nice', 'côte d\'azur', 'french riviera'],
    searches: [
      'beach club Nice Riviera', 'Promenade des Anglais scenic walk',
      'socca restaurant old town Nice', 'rooftop bar Mediterranean views',
      'art museum Matisse Chagall Nice', 'market Cours Saleya flowers food',
      'cocktail bar Vieux Nice', 'seafood bouillabaisse restaurant',
    ],
    aiBoost: 'This is the FRENCH RIVIERA — include the Promenade des Anglais, beach clubs, Old Town Nice, socca, bouillabaisse, art museums (Matisse, Chagall), Cours Saleya market, and Mediterranean sunset bars.',
  },
  // ── CARIBBEAN & LATIN AMERICA ──
  {
    keywords: ['nassau', 'bahamas'],
    searches: [
      'beach bar Junkanoo Beach Nassau', 'conch salad fritters Bahamian',
      'fish fry restaurant Arawak Cay', 'resort beach club Atlantis Paradise Island',
      'snorkeling swimming pigs Exuma', 'rum cocktail bar Nassau',
    ],
    aiBoost: 'This is THE BAHAMAS — include Junkanoo Beach, conch salad at Arawak Cay fish fry, Atlantis resort, snorkeling, rum bars, and incredible Bahamian seafood.',
  },
  {
    keywords: ['montego bay', 'jamaica', 'kingston', 'ocho rios', 'negril'],
    searches: [
      'jerk chicken restaurant best Jamaica', 'beach bar Seven Mile Beach Negril',
      'reggae music club bar Jamaica', 'rum bar cocktail Jamaica',
      'Dunns River Falls waterfall climb', 'Blue Mountain coffee tour',
      'ackee saltfish restaurant Jamaican', 'beach club Rick\'s Cafe cliff diving',
    ],
    aiBoost: 'This is JAMAICA — include jerk chicken, Seven Mile Beach, reggae clubs, rum bars, Dunn\'s River Falls, Rick\'s Cafe cliff diving, Blue Mountain coffee, ackee and saltfish, and the laid-back island vibe.',
  },
  {
    keywords: ['cartagena'],
    searches: [
      'ceviche restaurant Cartagena old town', 'rooftop bar walled city sunset',
      'salsa club nightlife Getsemaní', 'street food arepa empanada',
      'beach club Rosario Islands boat', 'cocktail bar colonial mansion',
      'seafood restaurant Caribbean Cartagena', 'historic walled city walk',
    ],
    aiBoost: 'This is CARTAGENA — include the walled city, Getsemaní nightlife, ceviche, rooftop bars with colonial skyline views, salsa clubs, Rosario Islands, incredible street food, and Caribbean seafood.',
  },
  {
    keywords: ['rio de janeiro', 'rio'],
    searches: [
      'samba club Lapa nightlife Rio', 'churrascaria steakhouse Brazilian BBQ',
      'Copacabana Ipanema beach bar', 'Christ the Redeemer Sugarloaf scenic',
      'açaí bowl juice bar Rio', 'favela tour community experience',
      'caipirinha bar cocktail Rio', 'feijoada restaurant traditional Brazilian',
    ],
    aiBoost: 'This is RIO DE JANEIRO — include Christ the Redeemer, Sugarloaf Mountain, Copacabana and Ipanema beaches, samba clubs in Lapa, churrascarias, açaí, caipirinhas, feijoada, and the incredible beach bar culture.',
  },
  {
    keywords: ['buenos aires'],
    searches: [
      'tango show milonga Buenos Aires', 'parrilla steakhouse Argentine asado',
      'Malbec wine bar San Telmo', 'cafe historic Recoleta Palermo',
      'empanada restaurant Buenos Aires', 'speakeasy cocktail bar Palermo Soho',
      'La Boca Caminito street art', 'ice cream helado Buenos Aires',
    ],
    aiBoost: 'This is BUENOS AIRES — include tango milongas, incredible parrillas (steak), Malbec wine, San Telmo market, Palermo Soho bars, La Boca, historic cafes, empanadas, and the legendary late-night dinner culture.',
  },
  {
    keywords: ['medellin'],
    searches: [
      'rooftop bar El Poblado Medellin', 'bandeja paisa restaurant traditional',
      'Comuna 13 street art tour graffiti', 'coffee farm tour near Medellin',
      'salsa club nightlife Medellin', 'brunch cafe Laureles Envigado',
      'arepa restaurant Antioquian food', 'cocktail bar Provenza Medellin',
    ],
    aiBoost: 'This is MEDELLÍN — include Comuna 13 street art, coffee farm tours, El Poblado nightlife, bandeja paisa, incredible rooftop bars, salsa clubs, and the transformation story of this incredible city.',
  },
  // ── ASIA ──
  {
    keywords: ['tokyo'],
    searches: [
      'ramen shop best Tokyo late night', 'izakaya traditional Japanese pub',
      'sushi Tsukiji Toyosu fish market', 'Shibuya crossing Harajuku',
      'cocktail bar Shinjuku Golden Gai', 'temple shrine Senso-ji Meiji',
      'Robot Restaurant show Kabukicho', 'omakase sushi counter Tokyo',
    ],
    aiBoost: 'This is TOKYO — include Shibuya Crossing, Harajuku, Golden Gai bars, incredible ramen shops, sushi at Tsukiji/Toyosu, temples (Senso-ji, Meiji), izakayas, Akihabara, and the mind-blowing food culture. Every meal here is a destination.',
  },
  {
    keywords: ['bangkok'],
    searches: [
      'street food Chinatown Yaowarat Bangkok', 'rooftop bar skyline Bangkok',
      'temple Wat Pho Wat Arun Grand Palace', 'night market Chatuchak Bangkok',
      'Pad Thai best restaurant Bangkok', 'cocktail bar Thonglor Sukhumvit',
      'floating market tour Bangkok', 'Muay Thai boxing stadium',
    ],
    aiBoost: 'This is BANGKOK — include Yaowarat (Chinatown) street food, temples (Wat Pho, Wat Arun, Grand Palace), rooftop bars, night markets, incredible Pad Thai, Thonglor nightlife, floating markets, and Muay Thai. The street food alone is worth the trip.',
  },
  {
    keywords: ['singapore'],
    searches: [
      'hawker center food stall Singapore', 'cocktail bar Marina Bay rooftop',
      'Gardens by the Bay Supertree', 'chili crab restaurant famous Singapore',
      'Marina Bay Sands infinity pool', 'Little India Chinatown Kampong Glam',
      'satay street food Lau Pa Sat', 'Clarke Quay nightlife bar',
    ],
    aiBoost: 'This is SINGAPORE — include hawker centers (the best cheap food in the world), Marina Bay Sands, Gardens by the Bay, chili crab, Little India, Chinatown, cocktail bars, Clarke Quay nightlife, and the incredible mix of Malay, Chinese, Indian, and Peranakan food.',
  },
  {
    keywords: ['hong kong'],
    searches: [
      'dim sum restaurant best Hong Kong', 'rooftop bar Victoria Peak harbour',
      'street food Mong Kok temple street night market', 'cocktail bar Lan Kwai Fong',
      'wonton noodle restaurant Hong Kong', 'Star Ferry harbour crossing scenic',
      'egg waffle bubble waffle street food', 'Michelin restaurant Hong Kong',
    ],
    aiBoost: 'This is HONG KONG — include dim sum, Victoria Peak, Star Ferry, Temple Street Night Market, Lan Kwai Fong nightlife, wonton noodles, egg waffles, rooftop bars with harbour views, and some of the best Michelin-starred restaurants in the world.',
  },
  {
    keywords: ['seoul'],
    searches: [
      'Korean BBQ restaurant best Seoul', 'soju bar pojangmacha tent bar',
      'street food Myeongdong Gwangjang Market', 'rooftop bar Gangnam Itaewon',
      'palace Gyeongbokgung hanbok traditional', 'nightclub Hongdae Itaewon Seoul',
      'fried chicken beer chimaek Seoul', 'karaoke noraebang Seoul',
    ],
    aiBoost: 'This is SEOUL — include Korean BBQ, Gwangjang Market street food, Hongdae and Itaewon nightlife, palaces (Gyeongbokgung), pojangmacha tent bars, chimaek (fried chicken + beer), karaoke, and the incredible K-culture scene.',
  },
  {
    keywords: ['dubai'],
    searches: [
      'rooftop bar Burj Khalifa Dubai skyline', 'brunch champagne luxury Dubai',
      'desert safari dune bashing camel', 'gold souk spice market old Dubai',
      'beach club Dubai Marina JBR', 'fine dining celebrity chef Dubai',
      'Dubai Mall Fountain show', 'nightclub lounge DIFC Downtown Dubai',
    ],
    aiBoost: 'This is DUBAI — include the Burj Khalifa, luxury brunches, beach clubs, desert safaris, gold and spice souks in old Dubai, Dubai Mall, celebrity chef restaurants, rooftop bars, and the over-the-top nightlife scene.',
  },
  {
    keywords: ['istanbul'],
    searches: [
      'kebab restaurant best Istanbul', 'rooftop bar Bosphorus view',
      'Hagia Sophia Blue Mosque Grand Bazaar', 'meyhane raki fish restaurant',
      'baklava Turkish delight dessert', 'hammam Turkish bath spa',
      'nightclub Beyoğlu İstiklal Caddesi', 'tea house çay garden scenic',
    ],
    aiBoost: 'This is ISTANBUL — include the Hagia Sophia, Grand Bazaar, Bosphorus views, incredible kebabs, meyhanes (raki + fish), baklava, Turkish baths, İstiklal Avenue nightlife, and the magical East-meets-West culture.',
  },
  {
    keywords: ['tel aviv'],
    searches: [
      'hummus restaurant best Tel Aviv', 'beach bar Gordon Frishman Tel Aviv',
      'nightclub bar Rothschild Florentin', 'shakshuka breakfast restaurant',
      'Carmel Market shuk food stall', 'cocktail bar Neve Tzedek',
      'falafel restaurant famous Tel Aviv', 'rooftop bar Mediterranean sunset',
    ],
    aiBoost: 'This is TEL AVIV — include incredible hummus, Carmel Market (Shuk), beach bars, Rothschild Boulevard, Florentin nightlife, shakshuka, falafel, Mediterranean sunset bars, and one of the world\'s most underrated nightlife scenes.',
  },
  // ── OCEANIA ──
  {
    keywords: ['sydney'],
    searches: [
      'beach bar Bondi Manly Sydney', 'Opera House Harbour Bridge scenic',
      'seafood restaurant Sydney Fish Market', 'rooftop bar Darling Harbour',
      'cocktail bar Surry Hills Newtown', 'brunch cafe Sydney best',
      'Bondi to Coogee coastal walk', 'night market Chinatown Sydney',
    ],
    aiBoost: 'This is SYDNEY — include Bondi Beach, the Opera House, Harbour Bridge, incredible seafood, Bondi to Coogee walk, Surry Hills and Newtown bars, rooftop bars with harbour views, and the incredible brunch culture.',
  },
  {
    keywords: ['melbourne'],
    searches: [
      'laneway bar hidden Melbourne', 'coffee shop best Melbourne flat white',
      'street art laneway Hosier Lane', 'brunch restaurant Melbourne best',
      'Asian restaurant Chinatown Melbourne', 'rooftop bar city views Melbourne',
      'Queen Victoria Market food', 'wine bar Yarra Valley tasting',
    ],
    aiBoost: 'This is MELBOURNE — include hidden laneway bars, world-class coffee culture, street art (Hosier Lane), incredible brunch, Queen Victoria Market, diverse Asian food, Yarra Valley wine, and Australia\'s best bar scene.',
  },
  // ── AFRICA ──
  {
    keywords: ['cape town'],
    searches: [
      'Table Mountain cable car scenic', 'wine tasting Stellenbosch Franschhoek',
      'braai restaurant South African BBQ', 'V&A Waterfront restaurant bar',
      'Boulders Beach penguins', 'Cape Point scenic drive',
      'cocktail bar Long Street Bree Street', 'seafood restaurant Camps Bay',
    ],
    aiBoost: 'This is CAPE TOWN — include Table Mountain, Cape Point, Boulders Beach penguins, Stellenbosch/Franschhoek wine farms, V&A Waterfront, Long Street nightlife, Camps Bay beach bars, and incredible braai culture.',
  },
  {
    keywords: ['marrakech', 'marrakesh'],
    searches: [
      'riad restaurant traditional Moroccan', 'Jemaa el-Fnaa night market square',
      'tagine couscous restaurant best Marrakech', 'rooftop bar medina views',
      'hammam spa traditional Moroccan bath', 'souk market shopping spices leather',
      'mint tea ceremony Moroccan cafe', 'Jardin Majorelle Yves Saint Laurent',
    ],
    aiBoost: 'This is MARRAKECH — include Jemaa el-Fnaa square at night, the souks, traditional riads, incredible tagine, hammam baths, Jardin Majorelle, rooftop terraces with medina views, and mint tea culture.',
  },
  {
    keywords: ['zanzibar'],
    searches: [
      'Stone Town spice tour Zanzibar', 'beach bar Nungwi Kendwa sunset',
      'seafood restaurant fresh catch Zanzibar', 'Forodhani Gardens night food market',
      'snorkeling dolphin tour Mnemba', 'spice farm tour Zanzibar',
      'Swahili restaurant traditional food', 'sunset dhow cruise sailing',
    ],
    aiBoost: 'This is ZANZIBAR — include Stone Town, Forodhani Gardens night market, Nungwi and Kendwa beaches, spice farm tours, dhow sunset cruises, snorkeling at Mnemba Atoll, and incredible Swahili seafood.',
  },
  // ── MORE ISLANDS & PARTY SPOTS ──
  {
    keywords: ['phuket', 'koh samui', 'koh phangan'],
    searches: [
      'beach club Phuket party sunset', 'Patong nightlife Bangla Road',
      'Thai restaurant seafood beachfront', 'island hopping Phi Phi James Bond',
      'muay thai boxing show', 'Full Moon Party beach Koh Phangan',
      'sunset bar viewpoint Phuket', 'night market street food Thai',
    ],
    aiBoost: 'This is THAILAND ISLANDS — include beach clubs, Bangla Road nightlife, island hopping (Phi Phi, James Bond Island), incredible Thai seafood, Full Moon Party, Muay Thai, night markets, and the famous sunset bars.',
  },
  {
    keywords: ['cabo san lucas', 'cabo'],
    searches: [
      'beach club resort Cabo party', 'fish taco restaurant best Cabo',
      'rooftop bar Marina Cabo', 'nightclub Cabo San Lucas',
      'El Arco landmark boat tour', 'whale watching tour Cabo',
      'mezcal tequila tasting bar', 'seafood restaurant waterfront Cabo',
    ],
    aiBoost: 'This is CABO — include El Arco, beach clubs, incredible fish tacos, mezcal/tequila bars, whale watching, marina nightlife, and the famous party scene. Mix the resort energy with authentic Mexican food.',
  },
  {
    keywords: ['punta cana'],
    searches: [
      'all inclusive resort beach club', 'Dominican restaurant la bandera',
      'catamaran party boat tour', 'zip line adventure park Punta Cana',
      'cigar lounge rum tasting Dominican', 'beach bar Bavaro Punta Cana',
    ],
    aiBoost: 'This is PUNTA CANA — include incredible beaches, resort beach clubs, Dominican food (la bandera, mofongo), catamaran tours, rum tastings, cigar lounges, and adventure activities.',
  },
  {
    keywords: ['curacao', 'curaçao'],
    searches: [
      'beach club Mambo Jan Thiel Curacao', 'Handelskade waterfront colorful Willemstad',
      'blue curaçao liqueur distillery tour', 'snorkeling Playa Kenepa beach',
      'local restaurant Krioyo cuisine', 'sunset bar Pietermaai district',
    ],
    aiBoost: 'This is CURAÇAO — include the colorful Handelskade waterfront, Playa Kenepa beach, Blue Curaçao distillery, Pietermaai nightlife district, Krioyo cuisine, and incredible snorkeling spots.',
  },
  {
    keywords: ['aruba'],
    searches: [
      'beach bar Eagle Beach Palm Beach Aruba', 'seafood restaurant waterfront Aruba',
      'natural pool Arikok National Park', 'sunset sailing catamaran tour',
      'casino nightlife Aruba', 'local restaurant Aruban cuisine keshi yena',
    ],
    aiBoost: 'This is ARUBA — include Eagle Beach, Palm Beach, natural pools in Arikok National Park, sunset sailing, incredible seafood, casino nightlife, and keshi yena (local stuffed cheese dish).',
  },
  {
    keywords: ['tenerife', 'majorca', 'mallorca', 'sardinia', 'sicily'],
    searches: [
      'beach club Mediterranean island', 'seafood restaurant fresh catch waterfront',
      'sunset bar scenic viewpoint', 'historic old town walk',
      'wine tasting vineyard local', 'nightclub beach party island',
      'local restaurant traditional cuisine', 'scenic coastal drive viewpoint',
    ],
    aiBoost: 'This is a MEDITERRANEAN ISLAND — include stunning beaches, waterfront seafood restaurants, sunset bars, historic old towns, local wine, beach clubs, and the laid-back island lifestyle. Mix tourist highlights with authentic local villages.',
  },
  {
    keywords: ['fiji', 'bora bora', 'mauritius', 'male', 'maldives'],
    searches: [
      'overwater restaurant resort dining', 'snorkeling coral reef lagoon',
      'beach bar sunset tropical cocktail', 'spa resort luxury treatment',
      'boat tour island hopping lagoon', 'local restaurant traditional cuisine',
      'diving reef tropical marine life', 'sunset cruise sailing catamaran',
    ],
    aiBoost: 'This is a TROPICAL PARADISE — include overwater dining, incredible snorkeling/diving, beach bars, sunset cruises, spa experiences, local cuisine, and the most beautiful lagoons in the world.',
  },
];

function detectPartyDestination(city: string): PartyDestination | null {
  if (!city) return null;
  const cityLower = city.toLowerCase();
  for (const dest of PARTY_DESTINATIONS) {
    if (dest.keywords.some(kw => cityLower.includes(kw))) return dest;
  }
  return null;
}

// Vibe → which Google types to fetch + diverse text searches + AI behavior
const VIBE_CONFIG: Record<string, {
  foodTypes: string[];
  activityTypes: string[];
  textSearchKey: string;
  textSearchCount: number;
  aiHint: string;
  structureHint: Record<string, string>;
}> = {
  // ── NEW 6 VIBES ──────────────────────────────────────────────────────────
  starthare: {
    foodTypes: FOOD_TYPES,
    activityTypes: ['museum', 'art_gallery', 'tourist_attraction', 'historical_landmark', 'performing_arts_theater', 'park', 'library', 'market'],
    textSearchKey: 'starthare',
    textSearchCount: 10,
    aiHint: 'GREATEST HITS — the legendary, iconic, can\'t-miss spots that DEFINE this city. These are the places people FLY here for. The landmarks on every postcard. The restaurants with 2-hour waits. The viewpoints that make people cry. 60-70% MUST be world-famous EXPERIENCES (the #1 landmark, the museum everyone talks about, the viewpoint that goes viral, the street that defines the city) and 30-40% must be the city\'s most CELEBRATED food & drink (the restaurant with the line around the block, the cafe in every guidebook). If someone says "I went to [city]" and didn\'t hit these spots, they didn\'t really go. EVERY stop should make someone say "oh you HAVE to go there." No hidden gems, no under-the-radar — this is THE list.',
    structureHint: {
      morning: 'Iconic breakfast spot → famous landmark → scenic viewpoint → celebrated brunch → must-see museum → neighborhood walk',
      afternoon: 'Acclaimed lunch spot → world-class museum → iconic landmark → scenic walk → famous cafe → cultural site',
      evening: 'Famous dinner spot → iconic sunset viewpoint → celebrated bar → cultural venue → legendary late-night spot → nightcap',
      full: 'Iconic breakfast cafe → must-see landmark → famous museum → acclaimed lunch → iconic neighborhood walk → scenic viewpoint → celebrated dinner → famous bar or cultural venue',
    },
  },
  indulge: {
    foodTypes: FOOD_TYPES,
    activityTypes: [],
    textSearchKey: 'indulge',
    textSearchCount: 10,
    aiHint: 'INDULGE — food so good it makes you close your eyes. This is a culinary EXPERIENCE that should IMPRESS — not just fill your stomach. Every stop is a restaurant, cafe, bar, dessert shop, or food market that would make a food critic stop in their tracks. Think: the chef who trained in Paris, the omakase counter with 8 seats, the hole-in-the-wall where the mole recipe is 4 generations old, the cocktail bar where every drink is a work of art. Each stop MUST be a different cuisine/culture — NEVER two from the same. Mix jaw-dropping fine dining with legendary street food, innovative cocktail bars with beloved neighborhood institutions. These should be places people POST about, TALK about, DREAM about going back to. The food should be so good it becomes a core memory.',
    structureHint: {
      morning: 'Celebrated cafe → acclaimed brunch #1 → stroll → brunch #2 (different cuisine) → dessert spot → coffee at iconic spot',
      afternoon: 'Impressive lunch → coffee break → food market or street food → happy hour cocktails + bites → dessert → evening appetizer',
      evening: 'Pre-dinner cocktails → elevated dinner → stroll → dessert spot → cocktail bar → nightcap',
      full: 'Iconic breakfast cafe → acclaimed brunch → food market or street food → impressive lunch → cocktail bar → celebrated dinner → dessert destination → nightcap',
    },
  },
  afterdark: {
    foodTypes: ['restaurant', 'fine_dining_restaurant', 'steak_house', 'seafood_restaurant', 'wine_bar', 'bar', 'pizza_restaurant'],
    activityTypes: NIGHTLIFE_TYPES.concat(['bowling_alley', 'amusement_park', 'karaoke']),
    textSearchKey: 'afterdark',
    textSearchCount: 8,
    aiHint: 'AFTER DARK — nightlife so good you don\'t want to go home. This isn\'t a quiet evening out — this is THE night. The kind of night you tell stories about for years. Start with dinner at a place with ENERGY, then escalate through the city\'s BEST bars, the speakeasy everyone whispers about, the rooftop with the insane view, the live music venue where the crowd goes wild, the dance floor where you lose track of time. Mix in FUN — karaoke, bowling alleys, comedy clubs, arcade bars, late-night boat cruises. The arc MUST escalate: pre-game food → cocktails → entertainment → PEAK energy (the best club/venue/bar in the city) → wind-down late-night food. Every stop should have more energy than the last. By the end, they should be saying "one more spot" at 2 AM.',
    structureHint: {
      morning: 'Boozy brunch → rooftop day bar → fun activity → chill cocktails → second bar → lunch with drinks',
      afternoon: 'Late lunch → happy hour rooftop → bowling/arcade/activity → pre-game cocktails → second happy hour → sunset drinks',
      evening: 'Dinner with energy → cocktail bar → live music or comedy → rooftop bar → dance spot or club → late-night eats',
      full: 'Dinner at energetic spot → cocktail lounge → live entertainment → rooftop bar → THE club/venue of the city → late-night food → one more spot → after-hours',
    },
  },
  escape: {
    foodTypes: ['restaurant', 'cafe', 'coffee_shop', 'seafood_restaurant', 'brunch_restaurant'],
    activityTypes: ['park', 'hiking_area', 'tourist_attraction', 'zoo', 'aquarium', 'botanical_garden', 'spa', 'market'],
    textSearchKey: 'escape',
    textSearchCount: 8,
    aiHint: 'ESCAPE — get completely LOST in another world. This is about being so immersed in beauty, nature, and serenity that you forget what day it is. 70%+ of stops MUST be OUTDOORS or deeply IMMERSIVE: the beach where the water is crystal clear, the hike where the view makes you gasp, the botanical garden that feels like another planet, the waterfront where time stops, the spa where you melt into the table. Food is scenic — beachside cafes, cliffside restaurants, garden terraces where you eat surrounded by nature. If the city has beaches, include THE best one. If it has mountains, go to the viewpoint that takes your breath away. The pace is slow, intentional, and restorative. By the end of this day, they should feel like they\'ve been on a spiritual retreat — recharged, in awe, completely removed from the stress of real life.',
    structureHint: {
      morning: 'Scenic breakfast → park or garden → nature trail → beachside brunch → botanical garden → scenic viewpoint',
      afternoon: 'Waterfront lunch → beach or nature walk → spa or garden → scenic viewpoint → waterfront cafe → sunset spot',
      evening: 'Sunset viewpoint → waterfront dinner → evening beach walk → scenic restaurant → garden stroll → stargazing spot',
      full: 'Scenic breakfast → morning park or hike → beachside brunch → afternoon beach or spa → botanical garden → scenic viewpoint for sunset → waterfront dinner → evening walk under the stars',
    },
  },
  luxe: {
    foodTypes: ['fine_dining_restaurant', 'steak_house', 'seafood_restaurant', 'restaurant', 'sushi_restaurant', 'wine_bar', 'brunch_restaurant'],
    activityTypes: ADVENTURE_TYPES.concat(NIGHTLIFE_TYPES).concat(['shopping_mall', 'clothing_store', 'spa']),
    textSearchKey: 'luxe',
    textSearchCount: 10,
    aiHint: 'LUXE — I want to feel like a billionaire\'s daughter. Take my money and make me feel like royalty. ONLY pick places rated 4.8+ stars. Every single stop should make you feel like you\'ve ARRIVED — Michelin-starred restaurants where the chef comes to your table, the rooftop champagne bar where the city glitters below you, the spa where they remember your name, the boutique where they bring you espresso while you shop, the private gallery viewing, the scenic viewpoint from the penthouse level. NO chains, no casual, no budget spots — if it doesn\'t feel EXCLUSIVE, it doesn\'t belong. At least HALF the stops must be premium NON-FOOD experiences (world-class museums, luxury shopping, five-star spas, iconic landmarks, private tours). Food is the city\'s FINEST — the reservation you wait 3 months for. Drinks at the bar where celebrities sit. Every stop should feel like "I can\'t believe this is my life right now."',
    structureHint: {
      morning: 'Luxury brunch → iconic landmark → world-class gallery → premium patisserie → five-star spa → upscale cafe',
      afternoon: 'Fine dining lunch → world-class museum → luxury shopping → scenic viewpoint → premium spa → champagne bar',
      evening: 'Award-winning fine dining → exclusive rooftop lounge → champagne bar → premium nightclub → VIP experience → late-night luxury',
      full: 'Luxury brunch → iconic landmark → world-class gallery → finest lunch → premier museum or luxury shopping → scenic viewpoint → fine dining dinner → exclusive rooftop bar',
    },
  },
  undertheradar: {
    foodTypes: [...FOOD_TYPES, 'bakery', 'sandwich_shop', 'pizza_restaurant', 'ramen_restaurant', 'noodle_restaurant'],
    activityTypes: ['market', 'park', 'flea_market', 'farmers_market', 'cultural_landmark', 'historical_landmark'],
    textSearchKey: 'undertheradar',
    textSearchCount: 8,
    aiHint: 'UNDER THE RADAR — the places people don\'t always hear about but will absolutely LOVE. These are the spots that make someone say "how did you even FIND this place?!" Think: the hole-in-the-wall where the owner has been making the same recipe for 40 years, the cafe with no sign but a line of locals every morning, the tiny bakery that makes the best croissant in the city, the bar behind an unmarked door, the park bench with the best view nobody knows about, the market stall where the grandmother makes everything by hand. EVERY stop should feel like a SECRET being shared — authentic, undiscovered, and genuinely surprising. NO chains, no tourist traps, no places in guidebooks. PRIORITIZE places with fewer reviews but 4.5+ ratings — the hidden gems. The $8 plate that destroys the $80 one. Mix food discoveries with non-food surprises: street art alleys, neighborhood markets, hidden rooftops, local community spots. By the end, they should feel like they discovered a city nobody else knows.',
    structureHint: {
      morning: 'Local bakery with a line → hidden breakfast spot → neighborhood market → second brunch spot (different style) → tucked-away park → street art alley',
      afternoon: 'Hole-in-the-wall lunch (family-run) → local market → neighborhood walk → hidden cafe → street food stall → community gathering spot',
      evening: 'Neighborhood restaurant locals guard jealously → hidden bar behind unmarked door → local pub → street food → locals-only late-night spot → secret after-hours',
      full: 'Local bakery → neighborhood market → authentic lunch (family-run, generations old) → hidden park or street art → neighborhood cafe → secret dinner spot → locals-only bar → late-night street food',
    },
  },
  // ── LEGACY VIBES (backend fallback for existing plans) ──────────────────
  nightout: {
    foodTypes: ['restaurant', 'fine_dining_restaurant', 'steak_house', 'seafood_restaurant', 'wine_bar', 'bar'],
    activityTypes: NIGHTLIFE_TYPES,
    textSearchKey: 'nightout',
    textSearchCount: 4,
    aiHint: 'This is a NIGHT OUT. Start with dinner or a pre-game food spot, then build through bars, lounges, speakeasies, jazz clubs, or live music, and END with a late-night food spot (tacos, pizza, diner, etc). The arc should feel like a real night out with friends — not just a list of bars.',
    structureHint: {
      morning: 'Brunch spot → 2 chill daytime bars/lounges',
      afternoon: 'Late lunch → 2 happy hour spots or pre-game bars',
      evening: 'Dinner → bar/lounge → speakeasy or club → late-night food',
      full: 'Dinner/pre-game → cocktail bar → lounge or jazz club → dance spot or live music → late-night eats → after-hours spot',
    },
  },
  stacked: {
    foodTypes: FOOD_TYPES.concat(['fine_dining_restaurant', 'steak_house', 'seafood_restaurant']),
    activityTypes: ADVENTURE_TYPES.concat(NIGHTLIFE_TYPES),
    textSearchKey: 'stacked',
    textSearchCount: 6,
    aiHint: 'This is the FULL EXPERIENCE — a premium day-to-night concierge itinerary covering EVERYTHING the city offers. CRITICAL: This is NOT a food tour. Think of it as: breakfast → EXPLORE (museum, temple, landmark) → lunch → ADVENTURE (park, viewpoint, cultural site) → dinner → NIGHTLIFE (rooftop bar, speakeasy, live music). The plan must feel like a COMPLETE day — eating, exploring, discovering, AND going out. Food is just the fuel between experiences. If the plan reads like a restaurant crawl with one museum, YOU HAVE FAILED. A great Full Experience plan has 3 meals woven between 2-3 iconic activities and 2 nightlife stops.',
    structureHint: {
      morning: 'Breakfast → activity → coffee stop',
      afternoon: 'Lunch → cultural experience → scenic walk',
      evening: 'Dinner → lounge → club → late-night eats',
      full: 'Breakfast → morning activity/culture → lunch → afternoon adventure → dinner → lounge or rooftop → nightclub or live music → late-night eats',
    },
  },
  food: {
    foodTypes: FOOD_TYPES,
    activityTypes: [],
    textSearchKey: 'food',
    textSearchCount: 5,
    aiHint: 'This is a FOOD TOUR — a global culinary journey through the city. Every stop is food or drink. ABSOLUTE RULE: Each stop MUST be a DIFFERENT cuisine/culture. If stop 1 is Mexican, stop 2 must be a completely different culture (Chinese, Ethiopian, Korean, Indian, Caribbean, Italian, Middle Eastern, Japanese, African, Vietnamese, Thai, etc.). NEVER two stops from the same cuisine, culture, or restaurant brand. Rotate through as many different cultures as possible. Create a NARRATIVE ARC: start light (coffee, pastries, brunch), build to heavier dishes (entrees, BBQ, curry), end sweet or boozy (dessert, cocktails, nightcap). Include a mix of sit-down, casual, and grab-and-go. This food tour should feel like eating around the WORLD in one day.',
    structureHint: {
      morning: 'Coffee/pastry → stroll neighborhood → brunch spot (2.5-3 hrs after first stop)',
      afternoon: 'Lunch entree → scenic walk or coffee break → happy hour drinks + bites (2.5-3 hrs after lunch)',
      evening: 'Dinner entree → walk and digest → dessert or cocktail spot (2.5-3 hrs after dinner)',
      full: 'Coffee/pastry (10 AM) → walk/explore → brunch (12:30-1 PM) → stroll/digest → afternoon bite (3:30-4 PM) → walk → dinner (7 PM) → dessert or nightcap (9:30-10 PM)',
    },
  },
  adventure: {
    foodTypes: ['restaurant', 'cafe', 'coffee_shop', 'seafood_restaurant', 'brunch_restaurant'],
    activityTypes: ['park', 'hiking_area', 'tourist_attraction', 'zoo', 'aquarium', 'amusement_park', 'market', 'botanical_garden'],
    textSearchKey: 'adventure',
    textSearchCount: 5,
    aiHint: 'This is an OUTDOOR ADVENTURE day — parks, beaches, hikes, scenic viewpoints, nature, and outdoor activities. 70%+ of stops must be OUTDOORS: parks, trails, beaches, gardens, waterfront boardwalks, scenic lookouts, farmers markets. Food stops are quick fuel between adventures — local cafes, beachside restaurants, food trucks. If the city has beaches, MUST include at least one. If it has mountains/hills, include a viewpoint. This is about fresh air and exploration, not sitting indoors.',
    structureHint: {
      morning: 'Quick breakfast/coffee → park, garden or beach → scenic viewpoint or nature trail',
      afternoon: 'Lunch at local spot → beach, waterfront or hike → outdoor market or garden',
      evening: 'Sunset viewpoint → dinner at waterfront or local restaurant → evening walk',
      full: 'Coffee → morning hike or park → beachside lunch → afternoon beach or nature → scenic viewpoint for sunset → dinner outdoors',
    },
  },
  datenight: {
    foodTypes: ['fine_dining_restaurant', 'restaurant', 'seafood_restaurant', 'steak_house', 'sushi_restaurant', 'wine_bar', 'bar'],
    activityTypes: ['tourist_attraction', 'art_gallery', 'performing_arts_theater', 'park'],
    textSearchKey: 'datenight',
    textSearchCount: 4,
    aiHint: 'This is a ROMANTIC DATE NIGHT. Every stop should feel intimate, beautiful, and special. Think candlelit restaurants, rooftop bars with views, scenic sunset spots, wine bars, cocktail lounges, and waterfront walks. The arc should build: start with a scenic/romantic appetizer spot or drinks → move to a memorable dinner → end with a cocktail lounge, dessert spot, or scenic walk. No loud clubs, no casual chains, no fast food. Price level 3-4 preferred. Atmosphere matters more than anything.',
    structureHint: {
      morning: 'Brunch at scenic restaurant → waterfront walk or garden stroll → cocktails with a view',
      afternoon: 'Wine tasting or cocktail bar → scenic lunch → art gallery or scenic walk',
      evening: 'Sunset drinks at rooftop bar → intimate dinner (fine dining or waterfront) → dessert or cocktail lounge',
      full: 'Scenic brunch → garden or waterfront walk → afternoon wine bar → sunset rooftop drinks → fine dining dinner → cocktail lounge nightcap',
    },
  },
  cultural: {
    foodTypes: FOOD_TYPES,
    activityTypes: ['museum', 'art_gallery', 'tourist_attraction', 'historical_landmark', 'performing_arts_theater', 'library'],
    textSearchKey: 'cultural',
    textSearchCount: 5,
    aiHint: 'This is an ART & CULTURE day — museums, galleries, historic landmarks, street art, architecture, and cultural neighborhoods. 60-70% of stops must be CULTURAL: museums, art galleries, historic landmarks, cultural centers, street art districts, famous architecture. Weave in 2-3 food stops at neighborhood restaurants near the cultural sites — the food should reflect the cultural neighborhood. Include a mix of major institutions AND smaller local galleries/cultural spaces.',
    structureHint: {
      morning: 'Cafe near cultural district → world-class museum or gallery → street art or architecture walk',
      afternoon: 'Lunch in cultural neighborhood → historic landmark or smaller gallery → cultural center or theater',
      evening: 'Dinner at neighborhood restaurant → arts venue or cultural event → cocktails near cultural district',
      full: 'Morning cafe → major museum → lunch in cultural neighborhood → historic landmark → local gallery → dinner → evening cultural venue',
    },
  },
  surprise: {
    foodTypes: [...FOOD_TYPES, 'bakery', 'sandwich_shop', 'pizza_restaurant', 'ramen_restaurant', 'noodle_restaurant'],
    activityTypes: ['market', 'park', 'flea_market', 'farmers_market', 'cultural_landmark', 'historical_landmark', 'neighborhood'],
    textSearchKey: 'surprise',
    textSearchCount: 8,
    aiHint: 'LOCAL SECRETS — the hidden spots only neighborhood residents know about. Think hole-in-the-wall eateries, family-run restaurants passed down for generations, neighborhood cafes where regulars know each other by name, tiny bakeries with lines out the door, street food stalls, local markets, and cozy bars where tourists never go. EVERY stop should feel AUTHENTIC and UNDISCOVERED — the kind of place a local friend would take you. NO chains, no tourist traps, no places that appear in guidebooks. PRIORITIZE places with fewer reviews but excellent ratings — these are the hidden gems. Food should be traditional, authentic, neighborhood-level — the $8 plate that beats the $80 one. Mix in non-food local experiences: neighborhood markets, scenic local parks, street art alleys, community gathering spots. This is the REAL city, not the postcard version.',
    structureHint: {
      morning: 'Neighborhood cafe or bakery where locals line up → hidden breakfast spot or street food → local market or park',
      afternoon: 'Hole-in-the-wall lunch spot (family-run, traditional) → local market or neighborhood walk → neighborhood cafe or dessert shop',
      evening: 'Neighborhood restaurant (the kind locals guard jealously) → local bar or pub → late-night street food or local sweet shop',
      full: 'Local bakery or cafe → neighborhood market → authentic lunch (family-run) → local park or street art → neighborhood dinner spot → locals-only bar → late-night street food',
    },
  },
  chill: {
    foodTypes: ['cafe', 'coffee_shop', 'bakery', 'breakfast_restaurant', 'brunch_restaurant', 'ice_cream_shop'],
    activityTypes: ['book_store', 'park', 'art_gallery', 'market', 'spa', 'library'],
    textSearchKey: 'chill',
    textSearchCount: 3,
    aiHint: 'This is a CHILL morning/day. Think cozy coffee shops, indie bookstores, scenic parks, farmers markets, and relaxed brunch spots. The pace should be slow and leisurely — not rushed. Every stop should feel like a warm exhale.',
    structureHint: {
      morning: 'Coffee shop or bakery → scenic walk or park → brunch spot',
      afternoon: 'Cafe or tea house → bookstore or gallery → dessert or market browse',
      evening: 'Cozy dinner spot → quiet wine bar or dessert cafe → scenic walk',
      full: 'Morning coffee → park or bookstore → brunch → afternoon cafe → gallery or market → cozy dinner',
    },
  },
  wander: {
    foodTypes: ['cafe', 'restaurant', 'bakery', 'coffee_shop', 'ice_cream_shop', 'brunch_restaurant'],
    activityTypes: ['market', 'park', 'art_gallery', 'historical_landmark', 'cultural_landmark', 'tourist_attraction', 'book_store', 'clothing_store', 'gift_shop'],
    textSearchKey: 'wander',
    textSearchCount: 5,
    aiHint: 'This is a WANDER afternoon — exploring neighborhoods on foot. Think charming streets, local markets, street art, pedestrian districts, and stumbling upon great spots. Mix walkable food stops (cafes, street food, bakeries) with interesting places to browse (vintage shops, bookstores, markets). Each stop should feel like a natural discovery while walking. The route should flow geographically — no backtracking.',
    structureHint: {
      morning: 'Neighborhood cafe → local market or park → bakery or brunch spot',
      afternoon: 'Lunch in a walkable district → market or street art area → cafe or gelato → vintage shop or bookstore',
      evening: 'Neighborhood dinner → evening walk through historic area → cocktail or dessert spot',
      full: 'Morning coffee in a neighborhood → market browse → lunch spot → afternoon wander through district → cafe stop → neighborhood dinner → evening stroll',
    },
  },
  daydrinks: {
    foodTypes: ['restaurant', 'bar', 'wine_bar', 'brunch_restaurant', 'cafe', 'seafood_restaurant'],
    activityTypes: ['bar', 'wine_bar'],
    textSearchKey: 'daydrinks',
    textSearchCount: 3,
    aiHint: 'This is a DAY DRINKS outing. Think rooftop bars with views, happy hour spots, wine bars, breweries, and cocktail-forward lunch spots. Pair every drink stop with food — tapas, small plates, or a proper lunch. The vibe is social, sunny, and relaxed but elevated.',
    structureHint: {
      morning: 'Boozy brunch → mimosa bar or wine bar → cafe or bakery',
      afternoon: 'Lunch + cocktails → rooftop bar or brewery → happy hour spot with bites',
      evening: 'Happy hour dinner → wine bar or cocktail lounge → rooftop sunset drinks',
      full: 'Boozy brunch → midday wine bar → lunch + cocktails → rooftop happy hour → dinner + drinks → sunset bar',
    },
  },
};

// --------------------------------------------------------------------------
// Google Places fetch
// --------------------------------------------------------------------------

async function fetchNearbyPlaces(
  lat: number, lng: number, types: string[], radius: number,
): Promise<Record<string, unknown>[]> {
  const body = {
    includedTypes: types,
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius,
      },
    },
  };

  const response = await fetchWithTimeout('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => 'no body');
    console.error('[NxStops Plan] Google Nearby error:', response.status, errText.slice(0, 500));
    return [];
  }
  const data = await response.json();
  const places = data.places || [];
  if (places.length === 0) {
    console.error(`[NxStops Plan] Nearby returned 0! status=${response.status} body=${JSON.stringify(data).slice(0, 500)}`);
  } else {
    console.log(`[NxStops Plan] Nearby search: types=${types.slice(0, 3).join(',')}... radius=${radius} → ${places.length} results`);
  }
  return places;
}

async function textSearchPlaces(
  query: string, lat: number, lng: number, radius: number,
): Promise<Record<string, unknown>[]> {
  // Use locationRestriction (rectangle) to STRICTLY limit results to the city area
  // locationBias only hints — Google can return results from other cities/countries
  const deltaLat = radius / 111111;
  const deltaLng = radius / (111111 * Math.cos(lat * Math.PI / 180));
  const body = {
    textQuery: query,
    maxResultCount: 10,
    locationRestriction: {
      rectangle: {
        low: { latitude: lat - deltaLat, longitude: lng - deltaLng },
        high: { latitude: lat + deltaLat, longitude: lng + deltaLng },
      },
    },
  };
  const response = await fetchWithTimeout('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => 'no body');
    console.error(`[NxStops Plan] Text search error: query="${query}" status=${response.status}`, errText.slice(0, 300));
    return [];
  }
  const data = await response.json();
  return data.places || [];
}

// --------------------------------------------------------------------------
// Transform raw Google Place → our Place shape
// --------------------------------------------------------------------------

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const PRICE_MAP: Record<string, number> = {
  'PRICE_LEVEL_FREE': 0,
  'PRICE_LEVEL_INEXPENSIVE': 1,
  'PRICE_LEVEL_MODERATE': 2,
  'PRICE_LEVEL_EXPENSIVE': 3,
  'PRICE_LEVEL_VERY_EXPENSIVE': 4,
};

interface PlanPlace {
  placeId: string;
  name: string;
  category: string;
  categoryDisplay: string;
  tags: string[];
  address: string;
  photoUrl: string | null;
  photoNames: string[];
  rating: number;
  reviewCount: number;
  priceLevel: number;
  openNow: boolean;
  hours: string[];
  distance: number | null;
  lat: number;
  lng: number;
  phone: string;
  website: string;
  googleMapsUrl: string;
  editorialSummary: string;
}

function transformPlace(raw: Record<string, unknown>, userLat: number, userLng: number): PlanPlace {
  const location = raw.location as { latitude: number; longitude: number } | undefined;
  const displayName = raw.displayName as { text: string } | undefined;
  const primaryTypeDisplay = raw.primaryTypeDisplayName as { text: string } | undefined;
  const editorial = raw.editorialSummary as { text: string } | undefined;
  const currentHours = raw.currentOpeningHours as { openNow?: boolean; weekdayDescriptions?: string[] } | undefined;
  const photos = raw.photos as { name: string }[] | undefined;
  const types = raw.types as string[] | undefined;

  const lat = location?.latitude || 0;
  const lng = location?.longitude || 0;
  const photoNames = photos?.map(p => p.name) || [];

  const vibeMap: Record<string, string> = {
    restaurant: 'food', cafe: 'food', bar: 'food', bakery: 'food', coffee_shop: 'food',
    steak_house: 'food', seafood_restaurant: 'food', pizza_restaurant: 'food',
    sushi_restaurant: 'food', brunch_restaurant: 'food', breakfast_restaurant: 'food',
    ice_cream_shop: 'food', fine_dining_restaurant: 'food', wine_bar: 'food',
    museum: 'culture', art_gallery: 'culture', performing_arts_theater: 'culture',
    historical_landmark: 'culture', movie_theater: 'culture',
    tourist_attraction: 'outdoors', park: 'outdoors', hiking_area: 'outdoors',
    zoo: 'outdoors', aquarium: 'outdoors', amusement_park: 'outdoors',
    night_club: 'nightlife', casino: 'nightlife',
    hotel: 'stay', motel: 'stay',
  };
  const tags: string[] = [];
  if (types) {
    for (const t of types) {
      const v = vibeMap[t];
      if (v && !tags.includes(v)) tags.push(v);
    }
  }

  return {
    placeId: (raw.id as string) || '',
    name: displayName?.text || 'Unknown',
    category: (raw.primaryType as string) || '',
    categoryDisplay: primaryTypeDisplay?.text ||
      ((raw.primaryType as string) || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    tags,
    address: (raw.formattedAddress as string) || '',
    photoUrl: photoNames.length > 0
      ? `https://nxstops.com/api/places?action=photo&name=${encodeURIComponent(photoNames[0])}&maxWidth=400`
      : null,
    photoNames,
    rating: (raw.rating as number) || 0,
    reviewCount: (raw.userRatingCount as number) || 0,
    priceLevel: PRICE_MAP[(raw.priceLevel as string)] ?? -1,
    openNow: currentHours?.openNow ?? true,
    hours: currentHours?.weekdayDescriptions || [],
    lat,
    lng,
    phone: (raw.nationalPhoneNumber as string) || '',
    website: (raw.websiteUri as string) || '',
    googleMapsUrl: (raw.googleMapsUri as string) || '',
    editorialSummary: editorial?.text || '',
    distance: lat && lng ? getDistanceKm(userLat, userLng, lat, lng) : null,
  };
}

// --------------------------------------------------------------------------
// Best time-of-day heuristic — when is this place at its best?
// Returns one of: 'morning' | 'midday' | 'afternoon' | 'sunset' | 'evening' | 'night' | 'any'
// Used to (1) hint to the AI which slot a place belongs in and (2) reorder
// stops so each lands in its sweet spot.
// --------------------------------------------------------------------------
type BestTime = 'morning' | 'midday' | 'afternoon' | 'sunset' | 'evening' | 'night' | 'any';

// Map best-time → an "ideal hour" used for sorting
const BEST_TIME_HOUR: Record<BestTime, number> = {
  morning: 9,
  midday: 13,
  afternoon: 15,
  sunset: 18,
  evening: 20,
  night: 22,
  any: 14,
};

function getBestTime(place: PlanPlace): BestTime {
  const cat = (place.category || '').toLowerCase();
  const display = (place.categoryDisplay || '').toLowerCase();
  const name = (place.name || '').toLowerCase();
  const editorial = (place.editorialSummary || '').toLowerCase();
  const haystack = `${cat} ${display} ${name} ${editorial}`;

  // Night-only — clubs, late-night venues
  if (/night_club|nightclub|disco|dance_club/.test(cat)) return 'night';
  if (/\b(club|nightclub|after.?hours|late.?night)\b/.test(haystack)) return 'night';

  // Sunset spots — rooftops, sky bars, sunset viewpoints
  if (/\b(rooftop|sky.?bar|sunset|skyline|observation deck|panoramic)\b/.test(haystack)) return 'sunset';

  // Evening — bars, lounges, dinner-focused, live music, theaters
  if (/\b(bar|lounge|speakeasy|cocktail|wine_bar|pub|brewery|izakaya|live music|jazz|comedy)\b/.test(haystack)) return 'evening';
  if (/performing_arts_theater|movie_theater|theater/.test(cat)) return 'evening';
  if (/fine_dining|steak_house|sushi|ramen/.test(cat)) return 'evening';

  // Morning — cafés, bakeries, breakfast, brunch, parks (cool hours), beaches (cool hours)
  if (/cafe|coffee_shop|bakery|breakfast_restaurant|brunch_restaurant/.test(cat)) return 'morning';
  if (/\b(cafe|coffee|bakery|breakfast|brunch|patisserie|donut|bagel)\b/.test(haystack)) return 'morning';
  if (/\b(beach|park|garden|botanic|hike|trail|farmers.?market)\b/.test(haystack) && !/night/.test(haystack)) return 'morning';
  if (/park|hiking_area|beach|botanical_garden/.test(cat)) return 'morning';

  // Midday — museums, galleries, indoor cultural (beat the heat), shopping
  if (/museum|art_gallery|aquarium|library|historical_landmark/.test(cat)) return 'midday';
  if (/\b(museum|gallery|exhibition|aquarium|planetarium)\b/.test(haystack)) return 'midday';

  // Afternoon — markets, shopping, neighborhoods, casual lunch
  if (/market|shopping_mall|department_store|book_store|boutique/.test(cat)) return 'afternoon';
  if (/\b(market|bazaar|souk|boutique|vintage|shopping)\b/.test(haystack)) return 'afternoon';

  // Default: restaurants are flexible (lean afternoon), everything else any
  if (/restaurant/.test(cat)) return 'afternoon';
  return 'any';
}

// Parse a "7:30 PM" / "19:30" timeSlot string into a fractional hour (0–24)
function parseTimeSlot(slot: string): number {
  if (!slot) return -1;
  const m = slot.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)?/);
  if (!m) return -1;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ampm = m[3]?.toUpperCase();
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return h + min / 60;
}

// --------------------------------------------------------------------------
// OpenAI GPT-4o-mini call
// --------------------------------------------------------------------------

async function callOpenAI(messages: { role: string; content: string }[]): Promise<string | null> {
  if (!OPENAI_API_KEY) return null;
  try {
    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.8,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      }),
    }, 15000);
    if (!response.ok) {
      console.error('[NxStops Plan] OpenAI error:', response.status);
      return null;
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (e) {
    console.error('[NxStops Plan] OpenAI exception:', e);
    return null;
  }
}

// --------------------------------------------------------------------------
// Gemini fallback (free tier: 15 RPM, 1M+ TPD)
// --------------------------------------------------------------------------

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string | null> {
  if (!GEMINI_API_KEY) return null;
  try {
    const response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 800,
            responseMimeType: 'application/json',
          },
        }),
      },
      15000,
    );
    if (!response.ok) {
      console.error('[NxStops Plan] Gemini error:', response.status);
      return null;
    }
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (e) {
    console.error('[NxStops Plan] Gemini exception:', e);
    return null;
  }
}

// --------------------------------------------------------------------------
// Handler
// --------------------------------------------------------------------------

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const corsOk = setCorsHeaders(res, req.headers.origin as string | undefined, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!corsOk) {
    const apiKeyInfo = await validateApiKey(req.headers as Record<string, string | string[] | undefined>, res, 'plan-day');
    if (!apiKeyInfo) return res.status(403).json({ error: 'Origin not allowed. Use X-API-Key header for API access.' });
    // Plan-day requires Basic tier or higher
    if (apiKeyInfo.tier === 'free') return res.status(403).json({ error: 'Plan API requires Basic tier or higher. Upgrade at nxstops.com/developers' });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIp(req.headers);
  if (!(await checkRateLimit(ip, 15, 60_000))) {
    return res.status(429).json({ error: 'Too many plan requests. Please wait a moment.' });
  }

  if ((!OPENAI_API_KEY && !GEMINI_API_KEY) || !GOOGLE_API_KEY) {
    return res.status(500).json({ error: 'Plan service not configured.' });
  }

  try {
    const {
      lat, lng, city, vibe, mood, travelGroup, duration,
      weather, preferences, events, advisory, jetLagContext,
      localTime, mode,
    } = req.body as {
      lat: number; lng: number; city?: string;
      vibe?: string; mood?: string;
      travelGroup?: string; duration?: string;
      weather?: string; preferences?: string;
      events?: { name: string; category: string; time: string; venue: string }[];
      advisory?: string;
      jetLagContext?: string;
      localTime?: string; // e.g. "14:30" — user's local time
      mode?: 'itinerary' | 'curated';
    };

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Location is required' });
    }

    // Check final plan cache — instant response for repeat city+vibe+duration requests
    if (mode !== 'curated') {
      const planCacheKey = `plan_${Math.round(lat * 100)}_${Math.round(lng * 100)}_${vibe || 'starthare'}_${duration || 'full'}_${travelGroup || 'solo'}`;
      const cachedPlan = planCache.get(planCacheKey);
      if (cachedPlan && Date.now() - cachedPlan.timestamp < PLAN_CACHE_TTL) {
        console.log(`[NxStops Plan] Plan cache hit: ${planCacheKey}`);
        return res.status(200).json(cachedPlan.result);
      }
      // Store key for later caching
      (req as unknown as Record<string, unknown>)._planCacheKey = planCacheKey;
    }

    // Determine vibe config — supports comma-separated multi-vibe (e.g. "luxe,escape")
    const vibeKeys = (vibe || 'starthare').split(',').map((v: string) => v.trim()).filter((v: string) => VIBE_CONFIG[v]);
    if (vibeKeys.length === 0) vibeKeys.push('starthare');
    const vibeKey = vibeKeys[0]; // primary vibe drives config
    const isBlended = vibeKeys.length > 1;
    if (isBlended) console.log(`[NxStops Plan] Blended vibes: ${vibeKeys.join(' + ')}`);

    // When blended, MERGE configs so both vibes contribute food types + activity types
    const config = isBlended
      ? {
          foodTypes: [...new Set(vibeKeys.flatMap(k => VIBE_CONFIG[k].foodTypes))],
          activityTypes: [...new Set(vibeKeys.flatMap(k => VIBE_CONFIG[k].activityTypes))],
          textSearchKeys: vibeKeys.map(k => VIBE_CONFIG[k].textSearchKey),
          textSearchKey: VIBE_CONFIG[vibeKey].textSearchKey,
          textSearchCount: Math.max(...vibeKeys.map(k => VIBE_CONFIG[k].textSearchCount)),
          aiHint: vibeKeys.map(k => VIBE_CONFIG[k].aiHint).join('\n\n'),
          structureHint: (() => {
            // Merge structure hints from all vibes — combine the arcs
            const keys = ['morning', 'afternoon', 'evening', 'full'] as const;
            const merged: Record<string, string> = {};
            for (const k of keys) {
              merged[k] = vibeKeys.map(v => VIBE_CONFIG[v].structureHint[k]).filter(Boolean).join(' + ');
            }
            return merged;
          })(),
        }
      : VIBE_CONFIG[vibeKey];

    // These are used in AI prompt regardless of cache — declare early
    const localRegion = detectLocalRegion(city || '');
    const partyDest = detectPartyDestination(city || '');
    const cityLower = (city || '').toLowerCase().trim();
    const citySeeds = CURATED_SEEDS[cityLower];
    const seedSearches: string[] = [];
    if (citySeeds) {
      for (const vk of vibeKeys) {
        const vibeSeeds = citySeeds[vk] || [];
        if (vibeSeeds.length > 0) seedSearches.push(...vibeSeeds);
      }
    }

    // Check place cache — reuse Google results if same city was fetched recently
    const cacheKey = `${Math.round(lat * 100)}_${Math.round(lng * 100)}_${vibeKey}`;
    const cached = placeCache.get(cacheKey);
    let allRaw: Record<string, unknown>[];
    const seedPlaceIds = new Set<string>();

    if (cached && Date.now() - cached.timestamp < PLACE_CACHE_TTL) {
      allRaw = cached.places;
      console.log(`[NxStops Plan] Cache hit: ${allRaw.length} places for ${cacheKey}`);
    } else {

    // 1. Fire ALL searches in parallel — nearby + wide-radius fallback + text searches
    //    This is the critical speed optimization: instead of sequential steps, run everything at once
    const nearbyFetches: Promise<Record<string, unknown>[]>[] = [];

    // Food nearby (5km tight + 25km wide for coverage)
    nearbyFetches.push(fetchNearbyPlaces(lat, lng, config.foodTypes, 5000).catch(() => []));
    nearbyFetches.push(fetchNearbyPlaces(lat, lng, config.foodTypes, 25000).catch(() => []));

    // Activity nearby (if vibe needs them)
    if (config.activityTypes.length > 0) {
      const wideRadiusVibes = ['stacked', 'adventure', 'starthare', 'escape'];
      const needsWideRadius = isBlended ? vibeKeys.some(k => wideRadiusVibes.includes(k)) : wideRadiusVibes.includes(vibeKey);
      const activityRadius = needsWideRadius ? 15000 : 6000;
      nearbyFetches.push(fetchNearbyPlaces(lat, lng, config.activityTypes, activityRadius).catch(() => []));
      nearbyFetches.push(fetchNearbyPlaces(lat, lng, config.activityTypes, 25000).catch(() => []));
    }

    // 1b. Region-aware text searches
    const shuffledSearches: string[] = [];

    if (localRegion) {
      // LOCAL REGION: 70-80% local cuisine, 20-30% sprinkle of international
      if (isBlended) {
        // BLENDED: pull text searches from ALL selected vibes + local food/nightlife
        const localFood = localRegion.foodSearches.sort(() => Math.random() - 0.5).slice(0, 2);
        const localNight = localRegion.nightlifeSearches.sort(() => Math.random() - 0.5).slice(0, 2);
        for (const k of vibeKeys) {
          const searches = DIVERSE_TEXT_SEARCHES[k as keyof typeof DIVERSE_TEXT_SEARCHES];
          if (searches) {
            const picked = [...searches].sort(() => Math.random() - 0.5).slice(0, 4);
            shuffledSearches.push(...picked);
          }
        }
        shuffledSearches.push(...localFood, ...localNight);
      } else if (vibeKey === 'nightout') {
        // Nightlife: use region's nightlife searches + a few global ones
        const localNight = localRegion.nightlifeSearches.sort(() => Math.random() - 0.5).slice(0, 3);
        const globalNight = (DIVERSE_TEXT_SEARCHES.nightout || []).sort(() => Math.random() - 0.5).slice(0, 1);
        shuffledSearches.push(...localNight, ...globalNight);
        // Always include local food for dinner/late-night stops
        const localFood = localRegion.foodSearches.sort(() => Math.random() - 0.5).slice(0, 2);
        shuffledSearches.push(...localFood);
      } else if (vibeKey === 'food') {
        // Food tour: mostly local cuisine, sprinkle 1 international
        const localFood = localRegion.foodSearches.sort(() => Math.random() - 0.5).slice(0, 5);
        const globalFood = (DIVERSE_TEXT_SEARCHES.food || []).sort(() => Math.random() - 0.5).slice(0, 1);
        shuffledSearches.push(...localFood, ...globalFood);
      } else if (vibeKey === 'adventure') {
        // Adventure: keep adventure searches + local food for meal stops
        const adventureSearches = (DIVERSE_TEXT_SEARCHES.adventure || []).sort(() => Math.random() - 0.5).slice(0, 3);
        const localFood = localRegion.foodSearches.sort(() => Math.random() - 0.5).slice(0, 2);
        shuffledSearches.push(...adventureSearches, ...localFood);
      } else if (vibeKey === 'stacked') {
        // Stacked in local region: balanced mix — local food + activities + nightlife
        const localFood = localRegion.foodSearches.sort(() => Math.random() - 0.5).slice(0, 2);
        const adventureSearches = (DIVERSE_TEXT_SEARCHES.adventure || []).sort(() => Math.random() - 0.5).slice(0, 3);
        const culturalSearches = (DIVERSE_TEXT_SEARCHES.cultural || []).sort(() => Math.random() - 0.5).slice(0, 2);
        const localNight = localRegion.nightlifeSearches.sort(() => Math.random() - 0.5).slice(0, 2);
        shuffledSearches.push(...localFood, ...adventureSearches, ...culturalSearches, ...localNight);
      } else if (vibeKey === 'starthare') {
        // Greatest Hits: iconic landmarks + museums + celebrated local food + evening bars
        const vibeSearches = DIVERSE_TEXT_SEARCHES.starthare.sort(() => Math.random() - 0.5).slice(0, 5);
        const localFood = localRegion.foodSearches.sort(() => Math.random() - 0.5).slice(0, 2);
        const localNight = localRegion.nightlifeSearches.sort(() => Math.random() - 0.5).slice(0, 2);
        shuffledSearches.push(...vibeSearches, ...localFood, ...localNight);
      } else if (vibeKey === 'indulge') {
        // Indulge: HEAVY local cuisine + diverse food exploration
        const localFood = localRegion.foodSearches.sort(() => Math.random() - 0.5).slice(0, 5);
        const vibeSearches = DIVERSE_TEXT_SEARCHES.indulge.sort(() => Math.random() - 0.5).slice(0, 3);
        shuffledSearches.push(...localFood, ...vibeSearches);
      } else if (vibeKey === 'afterdark') {
        // After Dark: local nightlife + global nightlife searches + dinner
        const localNight = localRegion.nightlifeSearches.sort(() => Math.random() - 0.5).slice(0, 3);
        const vibeSearches = DIVERSE_TEXT_SEARCHES.afterdark.sort(() => Math.random() - 0.5).slice(0, 3);
        const localFood = localRegion.foodSearches.sort(() => Math.random() - 0.5).slice(0, 2);
        shuffledSearches.push(...localNight, ...vibeSearches, ...localFood);
      } else if (vibeKey === 'escape') {
        // Escape: nature/scenic/outdoor + local food for meals
        const vibeSearches = DIVERSE_TEXT_SEARCHES.escape.sort(() => Math.random() - 0.5).slice(0, 5);
        const localFood = localRegion.foodSearches.sort(() => Math.random() - 0.5).slice(0, 2);
        shuffledSearches.push(...vibeSearches, ...localFood);
      } else if (vibeKey === 'luxe') {
        // Luxe: upscale/fine dining + luxury nightlife + brunch
        const vibeSearches = DIVERSE_TEXT_SEARCHES.luxe.sort(() => Math.random() - 0.5).slice(0, 6);
        const localFood = localRegion.foodSearches.sort(() => Math.random() - 0.5).slice(0, 1);
        // Include local nightlife for evening section — rooftop bars, lounges, cocktail spots
        const localNight = localRegion.nightlifeSearches.sort(() => Math.random() - 0.5).slice(0, 3);
        shuffledSearches.push(...vibeSearches, ...localFood, ...localNight);
      } else if (vibeKey === 'undertheradar' || vibeKey === 'surprise') {
        // Under the Radar: hidden gems + local neighborhood food
        const vibeSearches = DIVERSE_TEXT_SEARCHES.undertheradar.sort(() => Math.random() - 0.5).slice(0, 5);
        const localFood = localRegion.foodSearches.sort(() => Math.random() - 0.5).slice(0, 3);
        shuffledSearches.push(...vibeSearches, ...localFood);
      } else {
        // Legacy/fallback: local food + cultural mix
        const localFood = localRegion.foodSearches.sort(() => Math.random() - 0.5).slice(0, 3);
        const culturalSearches = (DIVERSE_TEXT_SEARCHES.cultural || []).sort(() => Math.random() - 0.5).slice(0, 2);
        shuffledSearches.push(...localFood, ...culturalSearches);
      }

      // ALWAYS add hidden gem searches — the secret sauce for unique discoveries
      const gemSearches = DIVERSE_TEXT_SEARCHES.hiddengems.sort(() => Math.random() - 0.5).slice(0, 2);
      shuffledSearches.push(...gemSearches);
    } else if (isBlended) {
      // BLENDED (Western): pull text searches from ALL selected vibes
      for (const k of vibeKeys) {
        const searches = DIVERSE_TEXT_SEARCHES[k as keyof typeof DIVERSE_TEXT_SEARCHES];
        if (searches) {
          const picked = [...searches].sort(() => Math.random() - 0.5).slice(0, 5);
          shuffledSearches.push(...picked);
        }
      }
      // Add cultural + hidden gems for variety
      const culturalSearches = DIVERSE_TEXT_SEARCHES.cultural.sort(() => Math.random() - 0.5).slice(0, 2);
      const gemSearches = DIVERSE_TEXT_SEARCHES.hiddengems.sort(() => Math.random() - 0.5).slice(0, 2);
      shuffledSearches.push(...culturalSearches, ...gemSearches);
    } else {
      // WESTERN / DEFAULT: diverse multicultural mix (existing behavior)
      // For blended vibes, pull text searches from ALL vibes so both are represented in the pool
      const allTextSearchKeys = isBlended
        ? vibeKeys.map(k => VIBE_CONFIG[k]?.textSearchKey).filter(Boolean)
        : [config.textSearchKey];
      const perKeyCount = isBlended ? Math.ceil(config.textSearchCount / allTextSearchKeys.length) : config.textSearchCount;
      for (const searchKey of allTextSearchKeys) {
        const vibeSearches = DIVERSE_TEXT_SEARCHES[searchKey] || [];
        shuffledSearches.push(...vibeSearches.sort(() => Math.random() - 0.5).slice(0, perKeyCount));
      }

      // For activity-focused vibes: add MORE activity/cultural searches, NOT more food
      // The food already comes from fetchNearbyPlaces — no need to inflate it further
      if (vibeKey === 'adventure' || vibeKey === 'cultural' || vibeKey === 'stacked') {
        const culturalSearches = DIVERSE_TEXT_SEARCHES.cultural.sort(() => Math.random() - 0.5).slice(0, 4);
        shuffledSearches.push(...culturalSearches);
        // Stacked also needs adventure searches for daytime activities
        if (vibeKey === 'stacked') {
          const adventureSearches = DIVERSE_TEXT_SEARCHES.adventure.sort(() => Math.random() - 0.5).slice(0, 3);
          shuffledSearches.push(...adventureSearches);
        }
      } else if (vibeKey !== 'food') {
        // Other vibes (chill, daydrinks, nightout): light food + cultural mix
        const foodSearches = DIVERSE_TEXT_SEARCHES.food.sort(() => Math.random() - 0.5).slice(0, 1);
        shuffledSearches.push(...foodSearches);
        const culturalSearches = DIVERSE_TEXT_SEARCHES.cultural.sort(() => Math.random() - 0.5).slice(0, 2);
        shuffledSearches.push(...culturalSearches);
      }

      // ALWAYS add hidden gem searches — neighborhood spots tourists miss
      const gemSearches = DIVERSE_TEXT_SEARCHES.hiddengems.sort(() => Math.random() - 0.5).slice(0, 2);
      shuffledSearches.push(...gemSearches);

      // Stacked vibe: add nightlife text searches for evening portion
      if (vibeKey === 'stacked') {
        const nightSearches = DIVERSE_TEXT_SEARCHES.nightout.sort(() => Math.random() - 0.5).slice(0, 2);
        shuffledSearches.push(...nightSearches);
      }

    }

    // Luxe vibe: ALWAYS add brunch searches for ALL cities — brunch is critical for morning section
    if (vibeKey === 'luxe' || (isBlended && vibeKeys.includes('luxe'))) {
      shuffledSearches.push(
        'best upscale brunch restaurant popular acclaimed',
        'luxury hotel brunch five star restaurant elegant',
        'jazz brunch supper club live music upscale',
        'rooftop brunch bottomless mimosa champagne',
      );
    }

    // ── PARTY DESTINATION: add venue-specific searches for famous nightlife/beach cities ──
    if (partyDest) {
      const partySearches = [...partyDest.searches].sort(() => Math.random() - 0.5).slice(0, 8);
      shuffledSearches.push(...partySearches);
      console.log(`[NxStops Plan] Party destination detected: adding ${partySearches.length} venue searches`);
    }

    // Cap text searches at 4 for speed — each is a Google API call (~500ms)
    const cappedSearches = shuffledSearches.slice(0, 4);
    const textRadius = 15000; // 15km default for text searches
    const seedRadius = 100000;
    const textFetches = cappedSearches.map(q => textSearchPlaces(q, lat, lng, textRadius).catch(() => []));
    const curatedFetches = seedSearches.map(q => textSearchPlaces(q, lat, lng, seedRadius).catch(() => []));

    // FIRE EVERYTHING AT ONCE — nearby + text + curated seeds in one parallel batch
    const allFetches = [...nearbyFetches, ...textFetches, ...curatedFetches];
    const allSettled = await Promise.allSettled(allFetches);
    const allResults = allSettled.map(r => r.status === 'fulfilled' ? r.value : []);

    // Split results back out
    const nearbyCount = nearbyFetches.length;
    const textCount = textFetches.length;
    const nearbyResults = allResults.slice(0, nearbyCount);
    const textResults = allResults.slice(nearbyCount, nearbyCount + textCount);
    const curatedResults = allResults.slice(nearbyCount + textCount);

    allRaw = nearbyResults.flat();
    console.log(`[NxStops Plan] Parallel fetch: ${nearbyCount} nearby (${allRaw.length} places), ${textCount} text, ${curatedFetches.length} seeds — all in one batch`);

    // Mark curated seed placeIds
    for (const results of curatedResults) {
      for (const p of results) {
        const id = p.id as string;
        if (id) seedPlaceIds.add(id);
      }
    }
    if (seedPlaceIds.size > 0) {
      console.log(`[NxStops Plan] ${seedPlaceIds.size} curated seed places found`);
    }
    allRaw = [...allRaw, ...textResults.flat(), ...curatedResults.flat()];

    // Store in cache for subsequent requests
    placeCache.set(cacheKey, { places: [...allRaw], timestamp: Date.now() });
    // Clean stale entries
    for (const [k, v] of placeCache) {
      if (Date.now() - v.timestamp > PLACE_CACHE_TTL) placeCache.delete(k);
    }

    } // end cache miss block

    // 1c. Filter out closed, not-yet-open, ghost listings, and out-of-city places
    const NOT_OPEN_RE = /\b(coming soon|opening soon|under construction|not yet open|grand opening|pre-opening|opening \d{4}|opens? in|currently closed|permanently closed|temporarily closed|reopening|closed for renovation|under renovation)\b/i;
    allRaw = allRaw.filter(p => {
      const status = p.businessStatus as string | undefined;
      if (status === 'CLOSED_PERMANENTLY' || status === 'CLOSED_TEMPORARILY') return false;
      // Filter out "coming soon" / not-yet-open places
      const summary = (p.editorialSummary as { text?: string } | undefined)?.text || '';
      const name = (p.displayName as { text?: string } | undefined)?.text || '';
      if (NOT_OPEN_RE.test(summary) || NOT_OPEN_RE.test(name)) return false;
      // Filter out non-venues: junctions, event halls, generic POIs
      const primaryType = p.primaryType as string | undefined;
      if (!primaryType) return false;
      const NON_VENUE_TYPES = ['event_venue', 'wedding_venue', 'banquet_hall', 'condominium_complex', 'apartment_complex', 'residential_area'];
      if (NON_VENUE_TYPES.includes(primaryType)) return false;
      if (/\b(junction|interchange|roundabout|overpass|flyover|intersection|highway)\b/i.test(name)) return false;
      // Filter out ghost listings with no reviews AND no rating (likely non-existent)
      // Allow places with a rating even if review count is 0 (common on small islands)
      const reviewCount = (p.userRatingCount as number) || 0;
      const rating = (p.rating as number) || 0;
      if (reviewCount === 0 && rating === 0) return false;
      // Safety net: filter out places too far from the city center
      // Use 120km for destinations with curated seeds (regions/islands like Corsica)
      // and 50km for regular cities
      const maxDistKm = seedSearches.length > 0 ? 120 : 50;
      const loc = p.location as { latitude: number; longitude: number } | undefined;
      if (loc) {
        const dLat = (loc.latitude - lat) * Math.PI / 180;
        const dLng = (loc.longitude - lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat * Math.PI / 180) * Math.cos(loc.latitude * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        const distKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        if (distKm > maxDistKm) return false;
      }
      return true;
    });

    const allTransformed = allRaw.map(p => transformPlace(p, lat, lng));

    // 2. Filter out chains + hotels — NxStops is about culturally diverse, locally-owned spots
    const CHAIN_KEYWORDS = [
      'starbucks', 'mcdonald', 'subway', 'burger king', 'wendy', 'taco bell',
      'chick-fil-a', 'chipotle', 'panera', 'dunkin', 'domino', 'pizza hut',
      'papa john', 'kfc', 'popeye', 'five guys', 'shake shack', 'amc ',
      'regal cinema', 'cinemark', 'applebee', 'chili\'s', 'olive garden',
      'red lobster', 'outback', 'ihop', 'denny', 'cracker barrel',
      'buffalo wild wings', 'wingstop', 'panda express', 'jack in the box',
      'arby', 'sonic drive', 'whataburger', 'raising cane', 'in-n-out',
      'cold stone', 'baskin-robbins', 'krispy kreme', 'tim horton',
    ];
    const EXCLUDED_PLAN_TYPES = new Set([
      'lodging', 'hotel', 'motel', 'resort_hotel', 'extended_stay_hotel',
      'gas_station', 'car_wash', 'car_repair', 'car_dealer',
      'hospital', 'dentist', 'doctor', 'pharmacy', 'veterinary_care',
      'school', 'university', 'post_office', 'bank', 'atm',
      'gym', 'fitness_center', 'grocery_store', 'supermarket', 'convenience_store',
      'travel_agency', 'tour_operator',
    ]);
    const filtered = allTransformed.filter(p => {
      const nameLower = p.name.toLowerCase();
      const isCuratedSeed = seedPlaceIds.has(p.placeId);
      if (CHAIN_KEYWORDS.some(chain => nameLower.includes(chain))) return false;
      // Curated seeds bypass type/hotel filters (e.g. luxe vibe includes hotels)
      if (!isCuratedSeed && EXCLUDED_PLAN_TYPES.has(p.category)) return false;
      if (!isCuratedSeed && /\b(hotel|motel|inn|suites|lodge|resort)\b/i.test(nameLower) && !nameLower.includes('restaurant') && !nameLower.includes('bar')) return false;
      // Exclude tour guides, tour operators, and travel agencies — the app is for self-guided exploration
      if (/\b(tour guide|guided tour|walking tour|tour operator|tour company|tour agency|travel agency|private tour|group tour)\b/i.test(nameLower)) return false;
      if (/\b(tour guide|guided tour|walking tour|tour operator|tour company)\b/i.test(p.categoryDisplay || '')) return false;
      // Filter out very low-rated places (safety concern)
      if (p.rating > 0 && p.rating < 2.5) return false;
      // Filter out low-rated nightlife specifically
      const nightlifeTypes = ['bar', 'night_club', 'casino', 'wine_bar'];
      if (nightlifeTypes.includes(p.category) && p.rating > 0 && p.rating < 3.0) return false;
      return true;
    });

    // 3. Deduplicate by placeId AND by brand/name similarity
    const seen = new Set<string>();
    const seenNames = new Set<string>();
    // ── Category blocklist: these are NOT places tourists want to visit ──
    const BLOCKED_CATEGORIES = new Set([
      'community_center', 'association_or_organization', 'non_profit_organization',
      'photographer', 'services', 'real_estate_agency', 'insurance_agency',
      'lawyer', 'dentist', 'doctor', 'hospital', 'school', 'university',
      'church', 'funeral_home', 'post_office', 'bank', 'atm', 'gas_station',
      'car_repair', 'car_dealer', 'parking', 'storage', 'moving_company',
      'laundry', 'dry_cleaning', 'travel_agency', 'consultant', 'accountant',
      'veterinarian', 'pet_store', 'gym', 'fitness_center',
      'educational_institution', 'cultural_center',
      'bus_station', 'subway_station',
      'home_goods_store', 'furniture_store', 'hardware_store', 'electronics_store',
      'supermarket', 'grocery_store', 'convenience_store', 'liquor_store',
      'movie_theater', 'sports_club', 'athletic_club', 'sports_complex',
      'amusement_center', 'trampoline_park', 'water_park',
    ]);
    // Chain restaurants / non-venue names to always exclude
    const BLOCKED_NAMES = /\b(little caesars|domino'?s|papa john|subway|mcdonald|burger king|wendy'?s|kfc|popeyes|taco bell|pizza hut|chick-fil-a|five guys|chipotle|panda express|dunkin|starbucks|7.eleven|circle k|wawa|sheetz|jumbo|walmart|costco|target|club deportivo|trampoline|masaje|solomasajes|entertainment center)\b/i;
    // Minimum review count — filter out garbage/new/unverified places
    // Lower threshold for hidden-gem vibes and European/island cities where local spots have fewer reviews
    const isSmallCityRegion = !!localRegion || filtered.length < 80;
    const MIN_REVIEWS = vibeKey === 'undertheradar' || vibeKey === 'surprise' ? 5
      : isSmallCityRegion ? 10
      : 25;

    const allPlaces: PlanPlace[] = [];
    for (const p of filtered) {
      if (!p.placeId || seen.has(p.placeId)) continue;
      // Skip blocked categories
      if (BLOCKED_CATEGORIES.has(p.category)) continue;
      // Skip chain restaurants and non-venues
      if (BLOCKED_NAMES.test(p.name)) continue;
      // Skip places with too few reviews (unreliable data)
      // Curated seed places bypass this — they're hand-picked and known-good
      const isCurated = seedPlaceIds.has(p.placeId);
      if (!isCurated && (p.reviewCount || 0) < MIN_REVIEWS) continue;
      // Normalize name: lowercase, strip trailing location words, keep first 2-3 core words
      const nameLower = p.name.toLowerCase().replace(/['']/g, "'");
      // Extract the brand/base name (first 2-3 significant words) to catch "Ramen San", "Ramen San Whiskey Bar", "Ramen San Lincolnwood"
      const nameWords = nameLower.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 1);
      const baseName = nameWords.slice(0, 3).join(' ');
      // Skip if we already have a place with this base name (same brand/restaurant)
      if (baseName && seenNames.has(baseName)) continue;
      // Also check if any existing name starts with or contains this base name
      const isDuplicate = baseName.length >= 5 && [...seenNames].some(existing =>
        existing.startsWith(baseName) || baseName.startsWith(existing)
      );
      if (isDuplicate) continue;
      seen.add(p.placeId);
      if (baseName) seenNames.add(baseName);
      allPlaces.push(p);
    }
    // Sort by gem score (balances rating with discoverability — hidden gems rank higher)
    // Sort by the right score for this vibe:
    // - undertheradar/surprise: gemScore (rewards low review count = hidden gems)
    // - everyone else: popularityScore (rewards high rating + moderate-to-high review count)
    const popularityScore = (p: { rating: number; reviewCount: number; placeId: string }) => {
      // Curated seeds get a massive boost — they're hand-picked and should always rank high
      const curatedBoost = seedPlaceIds.has(p.placeId) ? 100 : 0;
      if (!p.rating || p.rating < 3.5) return curatedBoost;
      // Logarithmic popularity: 100 reviews = 2, 1000 = 3, 10000 = 4
      const pop = Math.log10(Math.max(p.reviewCount || 1, 1));
      return curatedBoost + p.rating * (0.5 + 0.5 * Math.min(pop / 4, 1)); // caps at ~10k reviews
    };
    const curatedGemScore = (p: { rating: number; reviewCount: number; placeId: string }) => {
      const curatedBoost = seedPlaceIds.has(p.placeId) ? 100 : 0;
      return curatedBoost + gemScore(p);
    };
    const sortScore = (vibeKey === 'undertheradar' || vibeKey === 'surprise') ? curatedGemScore : popularityScore;
    allPlaces.sort((a, b) => sortScore(b) - sortScore(a));

    // Balance candidate pool: activity-focused vibes need plenty of non-food options
    const FOOD_CAT_SET = new Set([...FOOD_TYPES, 'bar', 'wine_bar']);
    const isPlaceFood = (p: PlanPlace) => FOOD_CAT_SET.has(p.category);

    // Identify hidden gems: high-rated (4.0+) but under 300 reviews — the sweet spot
    const isHiddenGem = (p: PlanPlace) => p.rating >= 4.0 && p.reviewCount > 0 && p.reviewCount < 300;

    let topPlaces: PlanPlace[];

    // ── BLENDED vibes ALWAYS go first — ensures both vibes are represented ──
    if (isBlended) {
      const NIGHTLIFE_CAT_SET = new Set(['bar', 'wine_bar', 'night_club', 'casino', 'performing_arts_theater']);
      const hasLuxe = vibeKeys.includes('luxe');
      const hasNightlife = vibeKeys.some(k => k === 'afterdark' || k === 'nightout');
      const hasFoodVibe = vibeKeys.some(k => k === 'indulge' || k === 'food');
      const hasActivityVibe = vibeKeys.some(k => ['adventure', 'escape', 'starthare', 'cultural'].includes(k));

      // If luxe is part of the blend, apply luxury filtering first
      let pool = allPlaces;
      if (hasLuxe) {
        const LUXE_CATEGORIES = new Set(['fine_dining_restaurant', 'steak_house', 'sushi_restaurant', 'seafood_restaurant']);
        const LUXE_NAME_RE = /palace|grand|ritz|four seasons|mandarin|peninsula|waldorf|shangri|rosewood|aman|nobu|hakkasan|zuma|robuchon|ducasse|gaggan|noma|atelier|maison/i;
        const LUXE_SUMMARY_RE = /michelin|award.winning|fine dining|upscale|luxury|acclaimed|prestigious|world.class|signature|tasting menu|omakase|haute cuisine|gourmet|premier|star chef|james beard/i;
        const isLuxeSignal = (p: PlanPlace) =>
          p.priceLevel >= 3 || (LUXE_CATEGORIES.has(p.category) && p.rating >= 4.3) ||
          LUXE_NAME_RE.test(p.name) || (p.editorialSummary && LUXE_SUMMARY_RE.test(p.editorialSummary)) || false;
        const luxePool = allPlaces.filter(p =>
          (isLuxeSignal(p) && p.rating >= 4.0 && p.reviewCount >= 30) ||
          (p.rating >= 4.5 && p.reviewCount >= 200)
        );
        const fallback = allPlaces.filter(p => p.rating >= 4.3 && p.reviewCount >= 50 && !luxePool.includes(p));
        pool = luxePool.length >= 15 ? [...luxePool, ...fallback] : allPlaces;
      }

      const hasUnderRadar = vibeKeys.some(k => k === 'undertheradar' || k === 'surprise');

      // When undertheradar is in the blend, boost hidden gems in all candidate pools
      const sortPool = hasUnderRadar
        ? (arr: PlanPlace[]) => arr.sort((a, b) => {
            const aGem = isHiddenGem(a) ? 50 : 0;
            const bGem = isHiddenGem(b) ? 50 : 0;
            return (gemScore(b) + bGem) - (gemScore(a) + aGem);
          })
        : (arr: PlanPlace[]) => arr.sort((a, b) => popularityScore(b) - popularityScore(a));

      const foodCandidates = sortPool(pool.filter(p => isPlaceFood(p) && !NIGHTLIFE_CAT_SET.has(p.category)));
      const nightlifeCandidates = sortPool(pool.filter(p => NIGHTLIFE_CAT_SET.has(p.category)));
      const activityCandidates = sortPool(pool.filter(p => !isPlaceFood(p) && !NIGHTLIFE_CAT_SET.has(p.category)));

      // Dynamic ratio based on what vibes are in the mix
      let targetFood = 10, targetActivity = 10, targetNightlife = 4;
      if (hasFoodVibe && !hasActivityVibe) { targetFood = 14; targetActivity = 8; }
      if (hasActivityVibe && !hasFoodVibe) { targetFood = 8; targetActivity = 14; }
      if (hasNightlife) { targetNightlife = 8; targetFood = Math.max(targetFood - 2, 6); }
      if (!hasNightlife) { targetNightlife = 2; }

      const activityCount = Math.min(activityCandidates.length, targetActivity);
      const nightlifeCount = Math.min(nightlifeCandidates.length, targetNightlife);
      const foodCount = Math.min(foodCandidates.length, 30 - activityCount - nightlifeCount);
      topPlaces = [
        ...activityCandidates.slice(0, activityCount),
        ...nightlifeCandidates.slice(0, nightlifeCount),
        ...foodCandidates.slice(0, foodCount),
      ]
        .sort((a, b) => (hasUnderRadar ? gemScore(b) + (isHiddenGem(b) ? 50 : 0) : popularityScore(b)) - (hasUnderRadar ? gemScore(a) + (isHiddenGem(a) ? 50 : 0) : popularityScore(a)))
        .slice(0, 30);
      console.log(`[NxStops Plan] Blended pool: ${activityCount} activities + ${nightlifeCount} nightlife + ${foodCount} food${hasUnderRadar ? ' (hidden-gem weighted)' : ''}`);
    } else if (vibeKey === 'adventure' || vibeKey === 'cultural' || vibeKey === 'starthare' || vibeKey === 'escape') {
      // Activity-heavy vibes: prioritize non-food places
      const foodCandidates = allPlaces.filter(p => isPlaceFood(p));
      const activityCandidates = allPlaces.filter(p => !isPlaceFood(p));
      const activityCount = Math.min(activityCandidates.length, 18);
      const foodCount = Math.min(foodCandidates.length, 30 - activityCount);
      topPlaces = [...activityCandidates.slice(0, activityCount), ...foodCandidates.slice(0, foodCount)]
        .sort((a, b) => gemScore(b) - gemScore(a))
        .slice(0, 30);
    } else if (vibeKey === 'surprise' || vibeKey === 'undertheradar') {
      // Under the Radar / Local Secrets: heavily favor hidden gems
      topPlaces = allPlaces
        .sort((a, b) => {
          const aGem = isHiddenGem(a) ? 50 : 0;
          const bGem = isHiddenGem(b) ? 50 : 0;
          return (gemScore(b) + bGem) - (gemScore(a) + aGem);
        })
        .slice(0, 30);
    } else if (vibeKey === 'luxe') {
      // Luxe solo: detect luxury through MULTIPLE signals, not just priceLevel
      const LUXE_CATEGORIES = new Set(['fine_dining_restaurant', 'steak_house', 'sushi_restaurant', 'seafood_restaurant']);
      const LUXE_NAME_RE = /palace|grand|ritz|four seasons|mandarin|peninsula|waldorf|shangri|rosewood|aman|nobu|hakkasan|zuma|robuchon|ducasse|gaggan|noma|atelier|maison/i;
      const LUXE_SUMMARY_RE = /michelin|award.winning|fine dining|upscale|luxury|acclaimed|prestigious|world.class|signature|tasting menu|omakase|haute cuisine|gourmet|premier|star chef|james beard/i;

      const isLuxeSignal = (p: PlanPlace) => {
        if (p.priceLevel >= 3) return true;
        if (LUXE_CATEGORIES.has(p.category) && p.rating >= 4.3) return true;
        if (LUXE_NAME_RE.test(p.name)) return true;
        if (p.editorialSummary && LUXE_SUMMARY_RE.test(p.editorialSummary)) return true;
        return false;
      };

      const luxeScore = (p: PlanPlace) => {
        if (p.rating < 4.0) return 0;
        const popularity = Math.log10(Math.max(p.reviewCount || 1, 1));
        const priceBoost = p.priceLevel >= 4 ? 1.5 : p.priceLevel >= 3 ? 1.3 : p.priceLevel >= 2 ? 1.1 : 1;
        const catBoost = LUXE_CATEGORIES.has(p.category) ? 1.2 : 1;
        const summaryBoost = (p.editorialSummary && LUXE_SUMMARY_RE.test(p.editorialSummary)) ? 1.15 : 1;
        const nameBoost = LUXE_NAME_RE.test(p.name) ? 1.2 : 1;
        return p.rating * popularity * priceBoost * catBoost * summaryBoost * nameBoost;
      };

      const luxePool = allPlaces.filter(p =>
        (isLuxeSignal(p) && p.rating >= 4.0 && p.reviewCount >= 30) ||
        (p.rating >= 4.5 && p.reviewCount >= 200)
      );
      const fallback = allPlaces.filter(p => p.rating >= 4.3 && p.reviewCount >= 50 && !luxePool.includes(p));
      const pool = [...luxePool, ...fallback].sort((a, b) => luxeScore(b) - luxeScore(a));
      const foodCandidates = pool.filter(p => isPlaceFood(p));
      const activityCandidates = pool.filter(p => !isPlaceFood(p));
      const activityCount = Math.min(activityCandidates.length, 12);
      const foodCount = Math.min(foodCandidates.length, 30 - activityCount);
      topPlaces = [...activityCandidates.slice(0, activityCount), ...foodCandidates.slice(0, foodCount)]
        .sort((a, b) => luxeScore(b) - luxeScore(a))
        .slice(0, 30);
    } else if (vibeKey === 'stacked') {
      // Stacked needs 3 categories: restaurants, activities, AND nightlife
      const NIGHTLIFE_CAT_SET = new Set(['bar', 'wine_bar', 'night_club', 'casino', 'performing_arts_theater']);
      const RESTAURANT_CAT_SET = new Set([...FOOD_TYPES].filter(t => !NIGHTLIFE_CAT_SET.has(t)));
      const restaurantCandidates = allPlaces.filter(p => RESTAURANT_CAT_SET.has(p.category));
      const nightlifeCandidates = allPlaces.filter(p => NIGHTLIFE_CAT_SET.has(p.category));
      const activityCandidates = allPlaces.filter(p => !isPlaceFood(p) && !NIGHTLIFE_CAT_SET.has(p.category));
      const activityCount = Math.min(activityCandidates.length, 12);
      const nightlifeCount = Math.min(nightlifeCandidates.length, 8);
      const restaurantCount = Math.min(restaurantCandidates.length, 30 - activityCount - nightlifeCount);
      topPlaces = [
        ...activityCandidates.slice(0, activityCount),
        ...nightlifeCandidates.slice(0, nightlifeCount),
        ...restaurantCandidates.slice(0, restaurantCount),
      ]
        .sort((a, b) => gemScore(b) - gemScore(a))
        .slice(0, 30);
    } else {
      topPlaces = allPlaces.slice(0, 30);
    }

    // Ensure at least ~20% of candidates are hidden gems (swap out lowest-scored popular places)
    const gems = allPlaces.filter(p => isHiddenGem(p) && !topPlaces.includes(p));
    const gemTarget = Math.max(Math.floor(topPlaces.length * 0.2), 3);
    const currentGems = topPlaces.filter(p => isHiddenGem(p)).length;
    if (currentGems < gemTarget && gems.length > 0) {
      const needed = Math.min(gemTarget - currentGems, gems.length);
      // Replace lowest-scored places with gems
      const gemsToAdd = gems.slice(0, needed);
      topPlaces = [...topPlaces.slice(0, topPlaces.length - needed), ...gemsToAdd];
    }

    const gemCount = topPlaces.filter(p => isHiddenGem(p)).length;
    console.log(`[NxStops Plan] vibe="${vibeKey}" duration="${duration || 'full'}" region="${localRegion?.label || 'diverse'}" totalPlaces=${topPlaces.length} hiddenGems=${gemCount}`);

    // Vibe labels — defined early so curated mode can use them
    const vibeLabels: Record<string, string> = {
      starthare: 'Greatest Hits', indulge: 'Indulge',
      afterdark: 'After Dark', escape: 'Escape',
      luxe: 'Luxe', undertheradar: 'Under the Radar',
      // Legacy vibes
      nightout: 'Night Out', food: 'Foodie Tour',
      adventure: 'Outdoor Adventure', surprise: 'Under the Radar',
      chill: 'Chill Vibes', wander: 'Wander', daydrinks: 'Day Drinks',
      stacked: 'Stacked', cultural: 'Art & Culture',
      datenight: 'Date Night', hiddengems: 'Hidden Gems',
    };

    // ─── Curated mode: return categorized picks for user to browse ──────────
    if (mode === 'curated') {
      // Categorize places by type
      const isFood = (p: { category: string }) =>
        FOOD_TYPES.includes(p.category) || /restaurant|cafe|bakery|coffee|brunch|breakfast|dessert|ice.cream/i.test(p.category);
      const isNightlife = (p: { category: string }) =>
        NIGHTLIFE_TYPES.includes(p.category) || /bar|club|lounge|pub|karaoke/i.test(p.category);

      // Curated seed places bypass review-count thresholds (small destinations have fewer reviews)
      const isCurated = (p: PlanPlace) => seedPlaceIds.has(p.placeId);

      // Score and sort within each category — use the vibe-appropriate score
      const foodPlaces = allPlaces.filter(p => isFood(p)).sort((a, b) => sortScore(b) - sortScore(a));
      const activityPlaces = allPlaces.filter(p => !isFood(p) && !isNightlife(p)).sort((a, b) => sortScore(b) - sortScore(a));
      const nightlifePlaces = allPlaces.filter(p => isNightlife(p)).sort((a, b) => sortScore(b) - sortScore(a));

      // Helper: match against category + categoryDisplay + name
      const cm = (p: PlanPlace, re: RegExp) => re.test(p.category + ' ' + (p.categoryDisplay || '') + ' ' + p.name);

      // Tag hidden gems in each pick
      const tagGems = (places: PlanPlace[]) => places.map(p => ({ ...p, gem: isHiddenGem(p) }));

      // Track used places to prevent duplicates across sections
      const used = new Set<string>();
      const markUsed = (picks: PlanPlace[]) => { picks.forEach(p => used.add(p.placeId)); return picks; };
      const notUsed = (p: PlanPlace) => !used.has(p.placeId);

      let morningPicks: PlanPlace[], afternoonPicks: PlanPlace[], eveningPicks: PlanPlace[];
      let morningLabel: string, afternoonLabel: string, eveningLabel: string;
      let morningEmoji: string, afternoonEmoji: string, eveningEmoji: string;

      if (vibeKey === 'starthare') {
        // ── START HERE — must-do highlights, iconic spots ────────────────────
        const landmarks = activityPlaces.filter(p =>
          cm(p, /landmark|historic|monument|temple|palace|church|mosque|cathedral|tourist_attraction/i) &&
          (isCurated(p) || p.reviewCount >= 1000)
        );
        const museums = activityPlaces.filter(p =>
          !landmarks.includes(p) && cm(p, /museum|gallery|art_gallery/i) &&
          (isCurated(p) || p.reviewCount >= 500)
        );
        morningPicks = markUsed([...landmarks.slice(0, 4), ...museums.slice(0, 2)].slice(0, 6));
        morningLabel = 'Iconic Landmarks';
        morningEmoji = '\u{2B50}';

        const moreMuseums = activityPlaces.filter(p =>
          notUsed(p) && cm(p, /museum|gallery|art_gallery|performing_arts|opera/i) && (isCurated(p) || p.reviewCount >= 500)
        );
        const moreLandmarks = activityPlaces.filter(p =>
          notUsed(p) && !moreMuseums.includes(p) &&
          cm(p, /landmark|park|bridge|tourist_attraction|transit/i) && (isCurated(p) || p.reviewCount >= 1000) &&
          !cm(p, /movie|cinema|arena|bowling/i)
        );
        const lunch = foodPlaces.filter(p => notUsed(p) && p.rating >= 4.3 && (isCurated(p) || p.reviewCount >= 500));
        afternoonPicks = markUsed([...moreMuseums.slice(0, 3), ...moreLandmarks.slice(0, 3), ...lunch.slice(0, 2)].slice(0, 8));
        afternoonLabel = 'Museums & Must-Sees';
        afternoonEmoji = '\u{1F3DB}\u{FE0F}';

        const dinner = foodPlaces.filter(p => notUsed(p) && cm(p, /restaurant|dining|steak|seafood/i) && (isCurated(p) || p.reviewCount >= 500));
        const eveningActs = activityPlaces.filter(p =>
          notUsed(p) && cm(p, /performing_arts|opera|theater|plaza|park/i) &&
          !cm(p, /movie|cinema|bowling|arcade/i) && (isCurated(p) || p.reviewCount >= 1000)
        );
        const eveningBars = nightlifePlaces.filter(p =>
          notUsed(p) && !cm(p, /movie|cinema|bowling|arcade/i)
        );
        eveningPicks = markUsed([...dinner.slice(0, 3), ...eveningActs.slice(0, 3), ...eveningBars.slice(0, 2)].slice(0, 8));
        eveningLabel = 'Evening Highlights';
        eveningEmoji = '\u{1F303}';

      } else if (vibeKey === 'indulge') {
        // ── INDULGE — food & drink worth the trip ──────────────────────────
        const brunchFood = foodPlaces.filter(p =>
          cm(p, /brunch|breakfast|cafe|coffee|bakery|pastry/i)
        );
        morningPicks = markUsed(brunchFood.slice(0, 6));
        morningLabel = 'Breakfast & Brunch';
        morningEmoji = '\u{1F950}';

        const lunch = foodPlaces.filter(p => notUsed(p));
        afternoonPicks = markUsed(lunch.slice(0, 8));
        afternoonLabel = 'Lunch & Afternoon Bites';
        afternoonEmoji = '\u{1F35C}';

        const dinner = foodPlaces.filter(p => notUsed(p));
        const cocktails = nightlifePlaces.filter(p => notUsed(p));
        eveningPicks = markUsed([...dinner.slice(0, 5), ...cocktails.slice(0, 3)].slice(0, 8));
        eveningLabel = 'Dinner & Drinks';
        eveningEmoji = '\u{1F377}';

      } else if (vibeKey === 'afterdark') {
        // ── AFTER DARK — night energy + social activities ──────────────────
        const dinner = foodPlaces.filter(p =>
          cm(p, /restaurant|steak|seafood|sushi|fine_dining/i) && !/bakery|cafe|coffee/i.test(p.category)
        );
        morningPicks = markUsed(dinner.slice(0, 5));
        morningLabel = 'Pre-Game Eats';
        morningEmoji = '\u{1F37D}\u{FE0F}';

        const bars = nightlifePlaces.filter(p =>
          notUsed(p) && cm(p, /bar|lounge|wine|cocktail|rooftop|brewery|pub/i)
        );
        const activities = activityPlaces.filter(p =>
          notUsed(p) && cm(p, /bowling|arcade|amusement|karaoke|comedy|escape/i)
        );
        afternoonPicks = markUsed([...bars.slice(0, 5), ...activities.slice(0, 3)].slice(0, 8));
        afternoonLabel = 'Bars & Activities';
        afternoonEmoji = '\u{1F378}';

        const clubs = nightlifePlaces.filter(p =>
          notUsed(p) && cm(p, /club|speakeasy|karaoke|music|jazz|comedy/i)
        );
        const lateNight = nightlifePlaces.filter(p => notUsed(p) && !clubs.includes(p));
        const lateFood = foodPlaces.filter(p => notUsed(p));
        eveningPicks = markUsed([...clubs.slice(0, 4), ...lateNight.slice(0, 2), ...lateFood.slice(0, 2)].slice(0, 8));
        eveningLabel = 'Late Night';
        eveningEmoji = '\u{1F31C}';

      } else if (vibeKey === 'escape') {
        // ── ESCAPE — nature, scenic, peaceful ──────────────────────────────
        // Escape-appropriate activities ONLY — no arenas, museums, memorials, theaters
        const isEscapeActivity = (p: PlanPlace) =>
          cm(p, /park|garden|beach|trail|hik|nature|botanical|spa|scenic|viewpoint|waterfront|pier|boardwalk|lake|river|bridge|conservatory/i) &&
          !cm(p, /arena|stadium|museum|memorial|monument|movie|cinema|theater|mall|shopping/i);

        const outdoorMorn = activityPlaces.filter(p => isEscapeActivity(p));
        const quickBreakfast = foodPlaces.filter(p => cm(p, /cafe|coffee|brunch|breakfast/i));
        morningPicks = markUsed([...quickBreakfast.slice(0, 1), ...outdoorMorn.slice(0, 5)].slice(0, 6));
        morningLabel = 'Morning Escapes';
        morningEmoji = '\u{1F33F}';

        const outdoorAftn = activityPlaces.filter(p => notUsed(p) && isEscapeActivity(p));
        const spas = activityPlaces.filter(p => notUsed(p) && cm(p, /spa/i) && p.rating >= 4.0);
        const lunchSpot = foodPlaces.filter(p =>
          notUsed(p) && cm(p, /restaurant|seafood|cafe/i) && !cm(p, /pizza|burger|fast|deli/i)
        );
        afternoonPicks = markUsed([...lunchSpot.slice(0, 2), ...outdoorAftn.slice(0, 4), ...spas.slice(0, 2)].slice(0, 8));
        afternoonLabel = 'Nature & Views';
        afternoonEmoji = '\u{1F3D6}\u{FE0F}';

        const sunsetSpots = activityPlaces.filter(p =>
          notUsed(p) && cm(p, /viewpoint|scenic|waterfront|pier|lookout|sunset/i) &&
          !cm(p, /arena|stadium|museum|memorial|monument/i)
        );
        const moreOutdoor = activityPlaces.filter(p => notUsed(p) && isEscapeActivity(p) && !sunsetSpots.includes(p));
        const dinner = foodPlaces.filter(p =>
          notUsed(p) && cm(p, /restaurant|seafood/i) && !cm(p, /pizza|burger|fast|deli/i)
        );
        eveningPicks = markUsed([...sunsetSpots.slice(0, 2), ...dinner.slice(0, 3), ...moreOutdoor.slice(0, 3)].slice(0, 8));
        eveningLabel = 'Sunset & Dinner';
        eveningEmoji = '\u{1F305}';

      } else if (vibeKey === 'luxe') {
        // ── LUXE — high-end, established, acclaimed ────────────────────────
        // Luxe scoring: multi-signal — price, category, name, editorial summary (works globally)
        const LUXE_CATS = new Set(['fine_dining_restaurant', 'steak_house', 'sushi_restaurant', 'seafood_restaurant']);
        const LUXE_NM = /palace|grand|ritz|four seasons|mandarin|peninsula|waldorf|shangri|rosewood|aman|nobu|hakkasan|zuma|robuchon|ducasse|gaggan|noma|atelier|maison|hyatt|hilton|marriott|kempinski|sofitel|fairmont|st\. regis|w hotel|intercontinental|bulgari|armani|versace|burj|jumeirah|sukiyabashi|ishikawa|narisawa|den tokyo|ryugin|quintessence|florilege|joël|ciel|sketch|gordon ramsay|heston|alain|pierre|beekman|royalton|roxy hotel|baccarat|edition hotel|nomad hotel|gramercy park hotel|plaza hotel|carlyle|mark hotel|lowell|langham|dorchester|claridge|savoy|connaught|red rooster|blue note|smoke jazz|django|lambs club|leopard|flatiron room|temple court|clement|ivy room/i;
        const LUXE_SM = /michelin|award.winning|fine dining|upscale|luxury|acclaimed|prestigious|world.class|signature|tasting menu|omakase|haute cuisine|gourmet|premier|star chef|james beard/i;
        const luxeS = (p: PlanPlace) => {
          if (p.rating < 4.0) return 0;
          const popularity = Math.log10(Math.max(p.reviewCount || 1, 1));
          const priceBoost = p.priceLevel >= 4 ? 1.5 : p.priceLevel >= 3 ? 1.3 : p.priceLevel >= 2 ? 1.1 : 1;
          const catBoost = LUXE_CATS.has(p.category) ? 1.2 : 1;
          const summaryBoost = (p.editorialSummary && LUXE_SM.test(p.editorialSummary)) ? 1.15 : 1;
          const nameBoost = LUXE_NM.test(p.name) ? 1.2 : 1;
          return p.rating * popularity * priceBoost * catBoost * summaryBoost * nameBoost;
        };
        // Categories that are NEVER luxe no matter the price
        const NEVER_LUXE = /ramen|noodle|pizza|burger|fast_food|sandwich|deli|food_court|taco|hot_dog|kebab|falafel|halal_restaurant|food_truck/i;
        const isLuxePlace = (p: PlanPlace) => {
          // Hard exclude: casual food categories are never luxe
          if (NEVER_LUXE.test(p.category)) return false;
          if (p.priceLevel >= 3 && p.rating >= 4.2) return true;
          // Fine dining categories count as luxe at price 3+ OR unknown price with high rating
          if (LUXE_CATS.has(p.category) && p.rating >= 4.3 && (p.priceLevel >= 3 || p.priceLevel === -1)) return true;
          if (LUXE_NM.test(p.name)) return true;
          if (p.editorialSummary && LUXE_SM.test(p.editorialSummary)) return true;
          return false;
        };
        // Established places — MUST have at least one luxury signal + good rating
        // Curated seeds bypass luxury signal checks (they're hand-picked for this vibe)
        const luxeFood = foodPlaces
          .filter(p => (isCurated(p) || isLuxePlace(p)) && p.rating >= 4.2 && (isCurated(p) || p.reviewCount >= 30))
          .sort((a, b) => luxeS(b) - luxeS(a));
        const luxeActs = activityPlaces
          .filter(p => {
            if (isCurated(p)) return true;
            // Exclude tourist traps: observation decks, memorials, movie theaters
            if (cm(p, /movie_theater|cinema|memorial|monument|observation/i)) return false;
            // Exclude generic markets (Chelsea Market etc.) — only allow if editorial says "luxury"
            if (cm(p, /market/i) && !(p.editorialSummary && /luxury|designer|high.end|upscale|premium/i.test(p.editorialSummary))) return false;
            return (isLuxePlace(p) && p.rating >= 4.0) || (p.rating >= 4.5 && p.reviewCount >= 200 && cm(p, /gallery|art_gallery|spa|museum/i));
          })
          .sort((a, b) => luxeS(b) - luxeS(a));
        const luxeNight = nightlifePlaces
          .filter(p => {
            if (isCurated(p)) return true;
            // Exclude non-bar nightlife from luxe evening
            if (cm(p, /movie_theater|cinema|bowling|arcade|comedy|performing_arts|theater|opera/i)) return false;
            return (isLuxePlace(p) && p.rating >= 4.0) ||
              (p.rating >= 4.3 && p.reviewCount >= 50 && cm(p, /rooftop|lounge|cocktail|wine_bar|champagne/i));
          })
          .sort((a, b) => luxeS(b) - luxeS(a));

        // ── MORNING: Upscale Brunch ──────────────────────────────────────
        // Brunch detection: category, name, or editorial — broad to catch hotel restaurants, jazz brunch, supper clubs
        const hasBrunchSignal = (p: PlanPlace) =>
          cm(p, /brunch_restaurant|breakfast_restaurant/i) ||
          (p.name && /brunch|breakfast/i.test(p.name)) ||
          (p.editorialSummary && /brunch|bottomless|mimosa|eggs benedict|morning|breakfast|sunday.*jazz|gospel.*brunch|prix.fixe/i.test(p.editorialSummary));

        // Known luxury names bypass category blocks (hotel restaurants, jazz clubs with brunch)
        const isKnownLuxeName = (p: PlanPlace) => LUXE_NM.test(p.name);
        const isNotBrunchCategory = (p: PlanPlace) =>
          cm(p, /steak_house|steak|pizza|burger|night_club|ramen|noodle|pub/i) ||
          (cm(p, /\bbar\b/i) && !isKnownLuxeName(p));
        // Names that are clearly not luxe brunch
        const isNotLuxeBrunchName = (p: PlanPlace) =>
          /cafeteria|stand|kiosk|stall|cart|truck|hole in the wall|empanada|hot dog|deli|bodega|colmado|horny|rowdy|dirty|dive|banter/i.test(p.name);

        // Tier 1: High-end brunch — price 3+ OR editorial says upscale OR known luxury name
        const tier1 = foodPlaces.filter(p => {
          if (isNotLuxeBrunchName(p)) return false;
          // Known luxury brands bypass category check (hotel restaurants, jazz clubs)
          if (!isKnownLuxeName(p) && isNotBrunchCategory(p)) return false;
          if (!hasBrunchSignal(p) && !isKnownLuxeName(p)) return false;
          return p.priceLevel >= 3 ||
            (p.editorialSummary && /upscale|elegant|acclaimed|refined|luxury|chic|sophisticated|award|trendy|stylish/i.test(p.editorialSummary));
        }).sort((a, b) => (b.rating * Math.log10(b.reviewCount || 1)) - (a.rating * Math.log10(a.reviewCount || 1)));

        // Tier 2: Popular brunch — 1000+ reviews with brunch signal (curated bypasses review count)
        const tier2 = foodPlaces.filter(p => {
          if (tier1.includes(p) || isNotBrunchCategory(p) || isNotLuxeBrunchName(p)) return false;
          return hasBrunchSignal(p) && (isCurated(p) || p.reviewCount >= 1000) && p.rating >= 4.2;
        }).sort((a, b) => (b.rating * Math.log10(b.reviewCount || 1)) - (a.rating * Math.log10(a.reviewCount || 1)));

        // Tier 3: Best available brunch/breakfast/cafe — for cities where tiers 1-2 are empty
        const tier3 = foodPlaces.filter(p => {
          if (tier1.includes(p) || tier2.includes(p) || isNotBrunchCategory(p) || isNotLuxeBrunchName(p)) return false;
          return (cm(p, /brunch|breakfast|cafe|bakery|patisserie/i) || hasBrunchSignal(p)) &&
            p.rating >= 4.3 && (isCurated(p) || p.reviewCount >= 100);
        }).sort((a, b) => (b.rating * Math.log10(b.reviewCount || 1)) - (a.rating * Math.log10(a.reviewCount || 1)));

        morningPicks = markUsed([
          ...tier1.slice(0, 3),
          ...tier2.slice(0, 2),
          ...tier3.slice(0, 2),
        ].slice(0, 6));
        morningLabel = 'Upscale Brunch';
        morningEmoji = '\u{1F951}';

        // ── AFTERNOON: Fine Dining & Premier Experiences ─────────────────
        // Fine dining: price 3+, fine_dining category, or acclaimed in editorial
        const fineDining = luxeFood.filter(p => {
          if (!notUsed(p)) return false;
          // Exclude casual categories
          if (cm(p, /pizza|burger|fast|deli|sandwich|bakery|cafe|coffee|brunch|breakfast/i)) return false;
          return cm(p, /fine_dining|sushi_restaurant|seafood_restaurant|steak_house/i) ||
            (p.priceLevel >= 3) ||
            (p.editorialSummary && LUXE_SM.test(p.editorialSummary));
        });
        // Premier experiences: world-class ART museums, luxury shopping, premium spas
        const premiumExperiences = luxeActs.filter(p => {
          if (!notUsed(p)) return false;
          // Curated seeds always qualify as premier experiences
          if (isCurated(p)) return true;
          if (cm(p, /memorial|monument|observation|deck|tower|platform|market|movie|cinema|park|bridge|plaza|arena/i)) return false;
          // Exclude non-art museums: science, history, natural history, immigration, children's
          if (cm(p, /science|natural_history|history_museum|children|liberty|immigration|field|discovery/i)) return false;
          // World-class ART museums only: art_museum or art_gallery with 10k+ reviews
          if (cm(p, /art_museum|art_gallery/i) && p.rating >= 4.5 && p.reviewCount >= 10000) return true;
          // Other museums ONLY if editorial explicitly says art/world-class (not science/history)
          if (cm(p, /museum/i) && p.rating >= 4.5 && p.reviewCount >= 5000 &&
            p.editorialSummary && /art|world.class|renowned|masterpiece|iconic.*collection|greatest/i.test(p.editorialSummary) &&
            !(p.editorialSummary && /science|natural history|history|children|field|dinosaur/i.test(p.editorialSummary))) return true;
          // Luxury shopping — must be well-known (1000+ reviews)
          if (cm(p, /shopping_mall/i) && p.rating >= 4.3 && p.reviewCount >= 1000) return true;
          // Premium spas with good reviews
          if (cm(p, /spa/i) && p.rating >= 4.3 && p.reviewCount >= 500) return true;
          // Places with world-class editorial
          if (p.editorialSummary && /world.class|renowned|premier|luxury|prestigious|iconic collection|masterpiece/i.test(p.editorialSummary) && p.reviewCount >= 5000) return true;
          return false;
        });
        afternoonPicks = markUsed([...fineDining.slice(0, 4), ...premiumExperiences.slice(0, 4)].slice(0, 8));
        afternoonLabel = 'Fine Dining & Premier Experiences';
        afternoonEmoji = '\u2728';

        // ── EVENING: Signature Dining & Cocktails ────────────────────────
        // Steakhouses — must be price 3+ or have luxury editorial signals (no casual steakhouses)
        const steaks = luxeFood.filter(p =>
          notUsed(p) && cm(p, /steak_house/i) &&
          (p.priceLevel >= 3 || (p.editorialSummary && LUXE_SM.test(p.editorialSummary)))
        );
        // Signature dinner — must be price 3+ OR explicitly fine_dining category
        const signatureDinner = luxeFood.filter(p => {
          if (!notUsed(p) || steaks.includes(p)) return false;
          if (cm(p, /cafe|coffee|bakery|patisserie|pastry|pizza|deli|sandwich|brunch|breakfast|burger|fast|wine_bar|bar$/i)) return false;
          // Fine dining category always qualifies
          if (cm(p, /fine_dining/i)) return true;
          // Everything else needs price 3+ to prove it's actually high-end
          if (p.priceLevel < 3) return false;
          return cm(p, /seafood_restaurant|sushi_restaurant|french_restaurant|restaurant/i) ||
            (p.editorialSummary && LUXE_SM.test(p.editorialSummary));
        });
        // Upscale bars — need luxury signals (price, name, or editorial)
        const rooftops = luxeNight.filter(p => {
          if (!notUsed(p) || p.rating < 4.2) return false;
          if (cm(p, /pub|dive|movie|cinema|bowling|arcade|comedy/i)) return false;
          const hasPrice = p.priceLevel >= 3;
          const isUpscaleType = cm(p, /wine_bar|cocktail/i) ||
            (p.name && /rooftop|lounge|sky|penthouse|champagne|speakeasy|jazz/i.test(p.name));
          const hasLuxeSummary = p.editorialSummary && /upscale|luxury|exclusive|premium|acclaimed|sophisticated|panoramic|rooftop/i.test(p.editorialSummary);
          return hasPrice || isUpscaleType || hasLuxeSummary;
        });
        // Deduplicate by placeId across all evening picks
        const eveningAll = [...steaks.slice(0, 2), ...signatureDinner.slice(0, 4), ...rooftops.slice(0, 3)];
        const seenIds = new Set<string>();
        const eveningDeduped = eveningAll.filter(p => {
          if (seenIds.has(p.placeId)) return false;
          seenIds.add(p.placeId);
          return true;
        });
        eveningPicks = markUsed(eveningDeduped.slice(0, 8));
        eveningLabel = 'Signature Dining & Cocktails';
        eveningEmoji = '\u{1F378}';

      } else if (vibeKey === 'surprise' || vibeKey === 'undertheradar') {
        // ── UNDER THE RADAR — hidden gems & local favorites ────────────────
        const localFood = foodPlaces.filter(p => isHiddenGem(p) || p.reviewCount < 500).sort((a, b) => gemScore(b) - gemScore(a));
        const localActivities = activityPlaces.filter(p => isHiddenGem(p) || cm(p, /market|park|garden|neighborhood|flea/i)).sort((a, b) => gemScore(b) - gemScore(a));

        const localBreakfast = localFood.filter(p =>
          cm(p, /cafe|coffee|bakery|breakfast|brunch|pastry/i)
        );
        const localMarkets = localActivities.filter(p =>
          cm(p, /market|farmers|flea/i)
        );
        const fallbackBreakfast = foodPlaces.filter(p =>
          !localBreakfast.includes(p) && cm(p, /cafe|coffee|bakery|breakfast|brunch/i)
        );
        morningPicks = markUsed([...localBreakfast.slice(0, 4), ...localMarkets.slice(0, 1), ...fallbackBreakfast.slice(0, 2)].slice(0, 6));
        morningLabel = 'Neighborhood Breakfast';
        morningEmoji = '\u2615';

        const localLunch = localFood.filter(p =>
          notUsed(p) && cm(p, /restaurant|ramen|noodle|pizza|sandwich|deli|taco|kebab|seafood/i)
        );
        const localSpots = localActivities.filter(p => notUsed(p));
        const fallbackLunch = foodPlaces.filter(p =>
          notUsed(p) && !localLunch.includes(p) && cm(p, /restaurant/i)
        );
        afternoonPicks = markUsed([...localLunch.slice(0, 5), ...localSpots.slice(0, 2), ...fallbackLunch.slice(0, 2)].slice(0, 8));
        afternoonLabel = 'Local Favorites';
        afternoonEmoji = '\u{1F4CD}';

        const localDinner = localFood.filter(p =>
          notUsed(p) && cm(p, /restaurant|seafood|steak|kebab|grill/i)
        );
        const localBars = nightlifePlaces.filter(p => notUsed(p)).sort((a, b) => gemScore(b) - gemScore(a));
        const fallbackDinner = foodPlaces.filter(p =>
          notUsed(p) && !localDinner.includes(p)
        );
        eveningPicks = markUsed([...localDinner.slice(0, 4), ...localBars.slice(0, 2), ...fallbackDinner.slice(0, 2)].slice(0, 8));
        eveningLabel = 'After-Hours Spots';
        eveningEmoji = '\u{1F312}';

      } else if (vibeKey === 'nightout') {
        // ── NIGHTLIFE ───────────────────────────────────────────────────
        const dinner = foodPlaces.filter(p =>
          cm(p, /restaurant|steak|seafood|sushi|fine_dining/i) && !/bakery|cafe|coffee/i.test(p.category)
        );
        morningPicks = markUsed(dinner.slice(0, 5));
        morningLabel = 'Pre-Game Eats';
        morningEmoji = '\u{1F37D}\u{FE0F}';

        const bars = nightlifePlaces.filter(p =>
          notUsed(p) && cm(p, /bar|lounge|wine|cocktail|rooftop|brewery|pub/i)
        );
        afternoonPicks = markUsed(bars.slice(0, 8));
        afternoonLabel = 'Bars & Lounges';
        afternoonEmoji = '\u{1F378}';

        const clubs = nightlifePlaces.filter(p =>
          notUsed(p) && cm(p, /club|speakeasy|karaoke|music|jazz|comedy/i)
        );
        const lateNight = nightlifePlaces.filter(p => notUsed(p) && !clubs.includes(p));
        const lateFood = foodPlaces.filter(p => notUsed(p));
        eveningPicks = markUsed([...clubs.slice(0, 4), ...lateNight.slice(0, 2), ...lateFood.slice(0, 2)].slice(0, 8));
        eveningLabel = 'Late Night';
        eveningEmoji = '\u{1F319}';

      } else if (vibeKey === 'food') {
        // ── FOOD EXPLORER ───────────────────────────────────────────────
        const brunchFood = foodPlaces.filter(p =>
          cm(p, /brunch|breakfast|cafe|coffee|bakery|pastry/i)
        );
        morningPicks = markUsed(brunchFood.slice(0, 6));
        morningLabel = 'Breakfast & Brunch';
        morningEmoji = '\u{1F950}';

        const lunch = foodPlaces.filter(p => notUsed(p));
        afternoonPicks = markUsed(lunch.slice(0, 8));
        afternoonLabel = 'Lunch';
        afternoonEmoji = '\u{1F35C}';

        const dinner = foodPlaces.filter(p => notUsed(p));
        eveningPicks = markUsed(dinner.slice(0, 8));
        eveningLabel = 'Dinner';
        eveningEmoji = '\u{1F377}';

      } else if (vibeKey === 'chill') {
        // ── CHILL VIBES ─────────────────────────────────────────────────
        const cafes = foodPlaces.filter(p => cm(p, /cafe|coffee|bakery|tea|pastry|brunch/i));
        const chillActs = activityPlaces.filter(p => cm(p, /park|garden|book|library|gallery|market/i));
        morningPicks = markUsed([...cafes.slice(0, 3), ...chillActs.slice(0, 3)].slice(0, 6));
        morningLabel = 'Cozy Mornings';
        morningEmoji = '\u2615';

        const afternoonFood = foodPlaces.filter(p => notUsed(p));
        const afternoonActs = activityPlaces.filter(p => notUsed(p));
        afternoonPicks = markUsed([...afternoonFood.slice(0, 4), ...afternoonActs.slice(0, 4)].slice(0, 8));
        afternoonLabel = 'Afternoon Strolls';
        afternoonEmoji = '\u{1F33F}';

        const dinner = foodPlaces.filter(p => notUsed(p) && cm(p, /restaurant|dinner|wine/i));
        const eveningBars = nightlifePlaces.filter(p => notUsed(p) && cm(p, /wine|lounge|cafe/i));
        eveningPicks = markUsed([...dinner.slice(0, 4), ...eveningBars.slice(0, 3)].slice(0, 8));
        eveningLabel = 'Cozy Evenings';
        eveningEmoji = '\u{1F56F}\u{FE0F}';

      } else if (vibeKey === 'wander') {
        // ── WANDER — walkable neighborhood exploration ────────────────
        const cafes = foodPlaces.filter(p => cm(p, /cafe|coffee|bakery|brunch/i));
        const wanderActs = activityPlaces.filter(p => cm(p, /market|art|gallery|book|shop|boutique|vintage|historic|landmark|park/i));
        morningPicks = markUsed([...cafes.slice(0, 3), ...wanderActs.slice(0, 3)].slice(0, 6));
        morningLabel = 'Morning Stroll';
        morningEmoji = '\u2615';

        const lunchSpots = foodPlaces.filter(p => notUsed(p));
        const browseSpots = activityPlaces.filter(p => notUsed(p));
        afternoonPicks = markUsed([...lunchSpots.slice(0, 3), ...browseSpots.slice(0, 5)].slice(0, 8));
        afternoonLabel = 'Afternoon Wander';
        afternoonEmoji = '\u{1F6B6}';

        const dinner = foodPlaces.filter(p => notUsed(p) && cm(p, /restaurant|dinner|bistro/i));
        const eveningWalk = activityPlaces.filter(p => notUsed(p));
        eveningPicks = markUsed([...dinner.slice(0, 4), ...eveningWalk.slice(0, 3)].slice(0, 8));
        eveningLabel = 'Evening Discovery';
        eveningEmoji = '\u{1F307}';

      } else if (vibeKey === 'daydrinks') {
        // ── DAY DRINKS ──────────────────────────────────────────────────
        const brunch = foodPlaces.filter(p => cm(p, /brunch|breakfast|cafe/i));
        const morningBars = nightlifePlaces.filter(p => cm(p, /wine|mimosa|champagne/i));
        morningPicks = markUsed([...brunch.slice(0, 4), ...morningBars.slice(0, 2)].slice(0, 6));
        morningLabel = 'Boozy Brunch';
        morningEmoji = '\u{1F37E}';

        const rooftops = nightlifePlaces.filter(p => notUsed(p) && cm(p, /rooftop|brewery|beer|patio|terrace/i));
        const happyHr = nightlifePlaces.filter(p => notUsed(p) && !rooftops.includes(p));
        const tapas = foodPlaces.filter(p => notUsed(p));
        afternoonPicks = markUsed([...rooftops.slice(0, 3), ...happyHr.slice(0, 3), ...tapas.slice(0, 2)].slice(0, 8));
        afternoonLabel = 'Rooftops & Happy Hour';
        afternoonEmoji = '\u{1F943}';

        const sunsetBars = nightlifePlaces.filter(p => notUsed(p));
        const dinnerDrinks = foodPlaces.filter(p => notUsed(p));
        eveningPicks = markUsed([...sunsetBars.slice(0, 5), ...dinnerDrinks.slice(0, 3)].slice(0, 8));
        eveningLabel = 'Sunset & Cocktails';
        eveningEmoji = '\u{1F305}';

      } else if (vibeKey === 'datenight') {
        // ── DATE NIGHT ──────────────────────────────────────────────────
        const romanticDinner = foodPlaces.filter(p =>
          cm(p, /fine_dining|steak_house|seafood|sushi|restaurant/i) && p.priceLevel >= 2
        );
        const scenicSpots = activityPlaces.filter(p =>
          cm(p, /park|garden|waterfront|scenic|viewpoint|landmark/i)
        );
        morningPicks = markUsed([...scenicSpots.slice(0, 3), ...romanticDinner.slice(0, 3)].slice(0, 6));
        morningLabel = 'Scenic & Romantic';
        morningEmoji = '\u{1F339}';

        const cocktails = nightlifePlaces.filter(p =>
          notUsed(p) && cm(p, /rooftop|wine|cocktail|lounge|champagne|bar/i)
        );
        const dinnerOptions = foodPlaces.filter(p =>
          notUsed(p) && cm(p, /fine_dining|steak|seafood|sushi|restaurant/i) && p.priceLevel >= 2
        );
        afternoonPicks = markUsed([...cocktails.slice(0, 4), ...dinnerOptions.slice(0, 4)].slice(0, 8));
        afternoonLabel = 'Cocktails & Fine Dining';
        afternoonEmoji = '\u{1F378}';

        const desserts = foodPlaces.filter(p =>
          notUsed(p) && cm(p, /dessert|pastry|ice.cream|bakery|chocolate/i)
        );
        const lateNightBars = nightlifePlaces.filter(p =>
          notUsed(p) && cm(p, /lounge|speakeasy|jazz|wine|cocktail/i)
        );
        const moreDinner = foodPlaces.filter(p => notUsed(p) && !desserts.includes(p));
        eveningPicks = markUsed([...moreDinner.slice(0, 3), ...lateNightBars.slice(0, 3), ...desserts.slice(0, 2)].slice(0, 8));
        eveningLabel = 'Nightcap & Desserts';
        eveningEmoji = '\u{1F319}';

      } else if (vibeKey === 'cultural') {
        // ── ART & CULTURE ───────────────────────────────────────────────
        const museums = activityPlaces.filter(p =>
          cm(p, /museum|gallery|art|exhibit/i)
        );
        const landmarks = activityPlaces.filter(p =>
          !museums.includes(p) && cm(p, /landmark|historic|monument|temple|palace|church|mosque|cathedral/i)
        );
        const cafes = foodPlaces.filter(p => cm(p, /cafe|coffee|bakery|brunch/i));
        morningPicks = markUsed([...museums.slice(0, 3), ...cafes.slice(0, 1), ...landmarks.slice(0, 2)].slice(0, 6));
        morningLabel = 'Museums & Galleries';
        morningEmoji = '\u{1F3DB}\u{FE0F}';

        const moreMuseums = activityPlaces.filter(p =>
          notUsed(p) && cm(p, /museum|gallery|art|exhibit|theater|performing/i)
        );
        const moreLandmarks = activityPlaces.filter(p =>
          notUsed(p) && !moreMuseums.includes(p) && cm(p, /landmark|historic|monument|market|district/i)
        );
        const lunch = foodPlaces.filter(p => notUsed(p));
        afternoonPicks = markUsed([...moreMuseums.slice(0, 3), ...moreLandmarks.slice(0, 3), ...lunch.slice(0, 2)].slice(0, 8));
        afternoonLabel = 'Landmarks & Districts';
        afternoonEmoji = '\u{1F3A8}';

        const dinner = foodPlaces.filter(p =>
          notUsed(p) && cm(p, /restaurant|dining|steak|seafood/i)
        );
        const eveningCulture = activityPlaces.filter(p => notUsed(p));
        const eveningBars = nightlifePlaces.filter(p => notUsed(p));
        eveningPicks = markUsed([...dinner.slice(0, 3), ...eveningCulture.slice(0, 3), ...eveningBars.slice(0, 2)].slice(0, 8));
        eveningLabel = 'Cultural Evenings';
        eveningEmoji = '\u{1F3AD}';

      } else if (vibeKey === 'adventure') {
        // ── OUTDOOR ADVENTURE ───────────────────────────────────────────
        const outdoorMorn = activityPlaces.filter(p =>
          cm(p, /park|garden|beach|trail|hik|nature|botanical/i)
        );
        const quickBreakfast = foodPlaces.filter(p => cm(p, /cafe|coffee|brunch|breakfast/i));
        morningPicks = markUsed([...quickBreakfast.slice(0, 1), ...outdoorMorn.slice(0, 5)].slice(0, 6));
        morningLabel = 'Morning Outdoors';
        morningEmoji = '\u{1F33F}';

        const outdoorAftn = activityPlaces.filter(p =>
          notUsed(p) && cm(p, /park|beach|waterfront|market|zoo|aquarium|viewpoint|scenic|pier|boardwalk/i)
        );
        const lunchSpot = foodPlaces.filter(p => notUsed(p));
        afternoonPicks = markUsed([...lunchSpot.slice(0, 2), ...outdoorAftn.slice(0, 6)].slice(0, 8));
        afternoonLabel = 'Beach, Trails & Views';
        afternoonEmoji = '\u{1F3D6}\u{FE0F}';

        const sunsetSpots = activityPlaces.filter(p =>
          notUsed(p) && cm(p, /viewpoint|scenic|waterfront|pier|lookout|sunset/i)
        );
        const moreOutdoor = activityPlaces.filter(p => notUsed(p) && !sunsetSpots.includes(p));
        const dinner = foodPlaces.filter(p => notUsed(p) && cm(p, /restaurant|seafood/i));
        eveningPicks = markUsed([...sunsetSpots.slice(0, 2), ...dinner.slice(0, 3), ...moreOutdoor.slice(0, 3)].slice(0, 8));
        eveningLabel = 'Sunset & Dinner';
        eveningEmoji = '\u{1F305}';

      } else {
        // ── DEFAULT (stacked, nightout, etc.) ───────────────────────────
        const morningFood = foodPlaces.filter(p =>
          cm(p, /cafe|coffee|bakery|breakfast|brunch|pastry/i)
        );
        const morningActs = activityPlaces.filter(p =>
          cm(p, /park|garden|market|museum|gallery|historic|temple|shrine/i)
        );
        morningPicks = markUsed([...morningFood.slice(0, 3), ...morningActs.slice(0, 3)].slice(0, 6));
        morningLabel = 'Morning';
        morningEmoji = '\u{1F305}';

        const afternoonFood = foodPlaces.filter(p => notUsed(p));
        const afternoonActs = activityPlaces.filter(p => notUsed(p));
        afternoonPicks = markUsed([...afternoonFood.slice(0, 4), ...afternoonActs.slice(0, 4)].slice(0, 8));
        afternoonLabel = 'Afternoon';
        afternoonEmoji = '\u2600\uFE0F';

        const eveningFood = foodPlaces.filter(p =>
          notUsed(p) && cm(p, /restaurant|dining|steak|seafood|sushi|fine_dining/i)
        );
        const eveningActs = [...activityPlaces.filter(p => notUsed(p)).slice(0, 2), ...nightlifePlaces.filter(p => notUsed(p)).slice(0, 3)];
        eveningPicks = markUsed([...eveningFood.slice(0, 4), ...eveningActs].slice(0, 8));
        eveningLabel = 'Evening';
        eveningEmoji = '\u{1F319}';
      }

      return res.status(200).json({
        mode: 'curated',
        sections: {
          morning: { label: morningLabel, emoji: morningEmoji, picks: tagGems(morningPicks) },
          afternoon: { label: afternoonLabel, emoji: afternoonEmoji, picks: tagGems(afternoonPicks) },
          evening: { label: eveningLabel, emoji: eveningEmoji, picks: tagGems(eveningPicks) },
        },
        totalPlaces: allPlaces.length,
        vibeLabel: vibeLabels[vibeKey] || 'Explore',
        vibeKey,
        region: localRegion?.label || null,
        city: city || null,
      });
    }

    if (topPlaces.length < 3) {
      return res.status(200).json({
        plan: [],
        dayTitle: '',
        message: 'Not enough places found nearby. Try a different location.',
      });
    }

    const condensed = topPlaces.map((p, i) => {
      const bestTime = getBestTime(p);
      return {
        idx: i,
        name: p.name,
        cat: p.categoryDisplay,
        rating: p.rating,
        price: p.priceLevel,
        open: p.openNow,
        dist: p.distance ? `${p.distance.toFixed(1)}km` : '?',
        lat: Math.round(p.lat * 10000) / 10000,
        lng: Math.round(p.lng * 10000) / 10000,
        best: bestTime,
        ...(isHiddenGem(p) ? { gem: true } : {}),
      };
    });

    // 3. Build events section if available
    let eventsSection = '';
    if (events && events.length > 0) {
      const todayEvents = events.slice(0, 5);
      eventsSection = `\n\nTODAY'S EVENTS (include 2-3 in the plan — weave them between food/activity stops as natural highlights):\n${todayEvents.map((e, i) => `E${i}: ${e.name} at ${e.venue} (${e.time}) [${e.category}]`).join('\n')}`;
    }

    // 4. Build AI prompt — curated itinerary with food woven in
    const durationLabel = duration || 'full';
    const isFullDay = durationLabel === 'full day' || durationLabel === 'full';
    const isStackedVibe = vibeKey === 'stacked';
    const jetLagActive = !!jetLagContext;
    const stopCount = jetLagActive
      ? (isStackedVibe ? 6 : isFullDay ? 6 : 4)
      : (isStackedVibe ? 10 : isFullDay ? 8 : 6);
    // Use the client's local time (they pass it from the browser)
    const timeLabel = localTime || `${new Date().getHours()}:${String(new Date().getMinutes()).padStart(2, '0')}`;
    const localHour = parseInt(timeLabel.split(':')[0], 10);

    // vibeLabels already defined above (before curated branch)
    const vibeLabel = vibeLabels[vibeKey] || 'The Curated City';

    // Duration-specific structure guidance
    const durationKey = (['morning', 'afternoon', 'evening'].includes(durationLabel) ? durationLabel : 'full') as keyof typeof config.structureHint;
    const structureGuide = config.structureHint[durationKey] || config.structureHint.full;

    // Duration-specific time windows — start from NOW if the window would've already started
    // Ensure at least 3 hours for half-day plans so AI can fit all stops
    const formatHour = (h: number) => {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${h12}:00 ${ampm}`;
    };
    const startNowLabel = formatHour(Math.max(localHour, 8));
    const morningEnd = Math.max(12, localHour + 3);   // At least 3 hours from now
    const afternoonEnd = Math.max(17, localHour + 3);
    const eveningEnd = Math.max(22, localHour + 3);
    const timeWindows: Record<string, string> = {
      morning: localHour >= 8 ? `${startNowLabel} – ${formatHour(morningEnd)}` : '8:00 AM – 12:00 PM',
      afternoon: localHour >= 12 ? `${startNowLabel} – ${formatHour(afternoonEnd)}` : '12:00 PM – 5:00 PM',
      evening: localHour >= 17 ? `${startNowLabel} – ${formatHour(eveningEnd > 23 ? 0 : eveningEnd)}` : '5:00 PM – 12:00 AM',
      full: localHour >= 9 ? `${startNowLabel} – ${isStackedVibe ? '2:00 AM' : '11:00 PM'}` : (isStackedVibe ? '9:00 AM – 2:00 AM' : '9:00 AM – 11:00 PM'),
    };
    const timeWindow = timeWindows[durationKey] || timeWindows.full;

    const prompt = `You are planning a curated ${vibeLabel} itinerary${isStackedVibe ? ' — the concierge itinerary: a premium FULL day-to-night experience with breakfast through late-night nightlife' : ''}. This should feel like a LOCAL FRIEND planned it — not a generic list from Google.

CITY: ${city || 'nearby area'}
TIME: ${timeLabel} | WINDOW: ${timeWindow}
VIBE: ${vibeLabel}
GROUP: ${travelGroup || 'solo'}${weather ? `\nWEATHER: ${weather}` : ''}${preferences ? `\nPREFS: ${preferences}` : ''}${jetLagContext ? `\nJET LAG: ${jetLagContext}` : ''}${partyDest ? `\nDESTINATION CONTEXT: ${partyDest.aiBoost}` : ''}

ITINERARY STRUCTURE (follow this arc):
${structureGuide}

PLACES (pick from these ONLY, reference by idx):
${JSON.stringify(condensed)}${eventsSection}

CRITICAL RULES:

0. TIME WINDOW IS ABSOLUTE: The user chose "${durationLabel}" and the time window is ${timeWindow}. ALL ${stopCount} stops MUST have timeSlots that fall WITHIN this window. ${
  durationLabel === 'morning' ? 'EVERY stop must be scheduled between 8:00 AM and 12:00 PM. NO afternoon or evening times. All stops are MORNING activities — breakfast, brunch, coffee, morning adventures.'
  : durationLabel === 'afternoon' ? 'EVERY stop must be scheduled between 12:00 PM and 5:00 PM. NO morning or evening times. All stops are AFTERNOON activities — lunch, afternoon adventures, coffee, happy hour.'
  : durationLabel === 'evening' ? 'EVERY stop must be scheduled between 5:00 PM and 12:00 AM (or later). NO morning or afternoon times. All stops are EVENING activities — dinner, nightlife, bars, evening adventures, late-night food.'
  : `For a FULL DAY, spread stops across morning (8-12), afternoon (12-5), AND evening (5+). Include all three time periods.`
} Your FIRST stop must start at the beginning of the window or within 30 minutes of the current time (${timeLabel}), whichever is later. If you schedule ANY stop outside the ${durationLabel} window, YOU HAVE FAILED.

1. Pick EXACTLY ${stopCount} stops — no more, no fewer. You MUST return exactly ${stopCount} entries in the stops array. EVERY stop must be a DIFFERENT place — never pick the same idx twice. Each stop must be a unique, distinct location. If you return fewer than ${stopCount} stops, YOU HAVE FAILED.

2. ${isBlended
  ? `BLENDED VIBES — you are mixing ${vibeKeys.map(k => VIBE_CONFIG[k]?.aiHint?.split(' — ')[0] || k).join(' + ')}. BOTH vibes MUST be equally represented — not one dominating and the other as an afterthought. If it's LUXE + ESCAPE, I need to feel BOTH the luxury AND the immersion. If it's GREATEST HITS + UNDER THE RADAR, I need the iconic spots AND the hidden gems. Split the stops roughly 50/50 between vibes, then weave them together so the day flows naturally. ${vibeKeys.map(k => VIBE_CONFIG[k]?.aiHint?.split('.')[0] || '').join('. ')}. The plan should feel like a REMIX where both vibes shine — not two separate plans glued together, and not one vibe with a token nod to the other.`
  : config.aiHint}

2b. HIDDEN GEMS ARE MANDATORY: At least ${isFullDay ? '1-2' : '1'} stop(s) MUST be a hidden gem — a place marked with "gem":true in the list, or any high-rated place with fewer reviews that most tourists would never find. These are the neighborhood spots, hole-in-the-wall restaurants, tucked-away cafes, and local favorites that make a plan feel like a friend who lives there curated it. DO NOT make every stop a famous landmark or top-rated tourist destination — the magic is in mixing iconic spots with local discoveries.

3. CATEGORY MIX — THIS IS THE MOST IMPORTANT RULE:
${isBlended
  ? `BLENDED MIX for ${vibeKeys.join(' + ')}: You MUST include BOTH food/drink AND non-food experiences — this is NON-NEGOTIABLE. ${(() => {
    const hasFoodVibe = vibeKeys.some(k => k === 'indulge' || k === 'food');
    const hasActivityVibe = vibeKeys.some(k => ['adventure', 'escape', 'starthare', 'cultural'].includes(k));
    const hasNightVibe = vibeKeys.some(k => k === 'afterdark' || k === 'nightout');
    const hasLuxe = vibeKeys.includes('luxe');
    const hasUnderRadar = vibeKeys.some(k => k === 'undertheradar' || k === 'surprise');
    if (hasFoodVibe && hasLuxe) return `HALF the stops (${isFullDay ? '4' : '3'}) must be EXCEPTIONAL food (different cuisines, upscale, impressive) and HALF (${isFullDay ? '4' : '3'}) must be PREMIUM non-food experiences (world-class museums, luxury shopping, spas, iconic landmarks). Every food stop should make you say "this is the best [cuisine] I've ever had." Every experience should feel exclusive.`;
    if (hasFoodVibe && hasActivityVibe) return `HALF the stops (${isFullDay ? '4' : '3'}) must be OUTSTANDING food (different cuisines, celebrated, impressive) and HALF (${isFullDay ? '4' : '3'}) must be memorable experiences (landmarks, parks, museums, cultural sites). Alternate food and experiences so neither dominates.`;
    if (hasFoodVibe && hasNightVibe) return `${isFullDay ? '3-4' : '2-3'} amazing food stops (different cuisines, impressive dining) that transition into ${isFullDay ? '4-5' : '3-4'} nightlife (bars, lounges, live music, clubs). Arc from dinner → drinks → energy → peak.`;
    if (hasFoodVibe && hasUnderRadar) return `Every stop should be a HIDDEN GEM — ${isFullDay ? '4' : '3'} incredible food spots locals guard jealously + ${isFullDay ? '4' : '3'} off-the-beaten-path experiences. No tourist traps, no chains. The food should IMPRESS despite being undiscovered.`;
    if (hasLuxe && hasNightVibe) return `Premium day-to-night: ${isFullDay ? '2-3' : '2'} upscale dining + ${isFullDay ? '2-3' : '2'} premium daytime activities + ${isFullDay ? '3' : '2'} exclusive nightlife (rooftop bars, champagne lounges, VIP clubs). Every single stop must feel HIGH-END and EXCLUSIVE.`;
    if (hasLuxe && hasActivityVibe) return `${isFullDay ? '3' : '2'} fine dining experiences + ${isFullDay ? '5' : '4'} world-class experiences (museums, landmarks, galleries, scenic viewpoints, luxury shopping). Everything rated 4.5+, nothing casual or budget. Both the luxury AND the adventure must be felt equally.`;
    if (hasLuxe && hasUnderRadar) return `Premium hidden gems — ${isFullDay ? '4' : '3'} upscale elevated spots (fine dining, luxury experiences) + ${isFullDay ? '4' : '3'} SECRET high-quality finds that most visitors miss (acclaimed but under-the-radar restaurants, boutique galleries, hidden rooftops). BOTH the luxury and the secrecy must come through in every stop.`;
    const hasEscape = vibeKeys.includes('escape') || vibeKeys.includes('adventure');
    if (hasEscape && hasNightVibe) return `ESCAPE INTO THE NIGHT — this is a two-act story. ACT 1 (${isFullDay ? '4' : '3'} stops): Immersive daytime escapes — the best beach, a breathtaking viewpoint, a scenic hike, a garden that feels like another world, a waterfront walk. ACT 2 (${isFullDay ? '4' : '3'} stops): The city's BEST nightlife — dinner with energy, the bar everyone talks about, live music or a club, a rooftop with insane views, late-night food. The transition should feel like golden hour → sunset drinks → the night comes alive. BOTH halves must be EQUALLY strong — don't skimp on nightlife just because there are beaches, and don't skip the nature just because there are bars.`;
    if (hasActivityVibe && hasNightVibe) return `Active day into vibrant night: ${isFullDay ? '4' : '3'} daytime experiences (landmarks, parks, culture) + ${isFullDay ? '1-2' : '1'} great meals + ${isFullDay ? '3' : '2'} nightlife spots. The energy should build from daytime exploration to nighttime party.`;
    if (hasActivityVibe && hasUnderRadar) return `Mix the city's MUST-SEE highlights with its HIDDEN SECRETS — ${isFullDay ? '4' : '3'} iconic landmarks/museums that define the city + ${isFullDay ? '4' : '3'} hidden gems only locals know (hole-in-the-wall eateries, neighborhood cafes, tucked-away parks, street art). BOTH the famous AND the secret must be equally represented. Prefer places marked "gem":true for the hidden stops.`;
    if (hasNightVibe && hasUnderRadar) return `Underground nightlife — ${isFullDay ? '2-3' : '2'} hidden-gem dinner spots + ${isFullDay ? '5-6' : '4'} secret nightlife (speakeasies, locals-only bars, underground music venues, hidden rooftops). Skip the obvious tourist bars entirely.`;
    if (hasUnderRadar) return `Every stop should be a HIDDEN GEM — places with fewer reviews but excellent ratings. ${isFullDay ? '4' : '3'} hidden food spots + ${isFullDay ? '4' : '3'} off-the-beaten-path experiences. No tourist traps, no chains. Prefer places marked "gem":true.`;
    return `Split roughly 50/50 between vibes. ${isFullDay ? '4' : '3'} food/drink stops and ${isFullDay ? '4' : '3'} non-food stops. Pull the best of each vibe equally and weave them into one cohesive day.`;
  })()}`
  : (vibeKey === 'food' || vibeKey === 'indulge')
  ? `Every stop is food/drink. Create a CULINARY JOURNEY with EXACTLY ${stopCount} stops — each MUST be a different cuisine/culture (e.g., Mexican → Chinese → Ethiopian → Korean). NEVER two from the same cuisine. For full day: include breakfast/brunch, lunch, AND dinner options. For morning: 2 breakfast/brunch spots + cafe + dessert. Vary price points. Mix jaw-dropping fine dining with legendary casual spots. Every stop should IMPRESS.`
  : vibeKey === 'adventure' || vibeKey === 'escape'
    ? `ESCAPE/ADVENTURE RATIO FOR ${stopCount} STOPS: ${isFullDay ? '3' : '2'} stops MUST be food/drink (breakfast + lunch + dinner for full day, or breakfast + lunch for partial). The rest (${isFullDay ? '5' : '4'}) MUST be immersive outdoor/peaceful experiences — parks, beaches, hikes, viewpoints, gardens, spas, nature, waterfronts. Food goes between escapes as scenic fuel (beachside cafes, garden restaurants). NEVER skip food entirely.`
    : vibeKey === 'surprise' || vibeKey === 'undertheradar'
      ? `UNDER THE RADAR RATIO FOR ${stopCount} STOPS: Mix ${isFullDay ? '4' : '3'} hidden food/drink spots with ${isFullDay ? '4' : '3'} hidden local experiences (secret markets, tucked-away parks, street art alleys, neighborhood walks). Every food stop MUST feel AUTHENTIC and LOCAL — family-run restaurants, hole-in-the-wall eateries, neighborhood bakeries, street food stalls. NO chains, NO tourist traps, NO places with 5000+ reviews. For full day, include breakfast/brunch, lunch, AND dinner. This is the REAL city experience.`
      : vibeKey === 'starthare'
        ? `GREATEST HITS RATIO FOR ${stopCount} STOPS: Mix ${isFullDay ? '3' : '2'} of the city's most CELEBRATED food/drink stops with ${isFullDay ? '5' : '4'} must-see experiences (iconic landmarks, world-class museums, famous viewpoints, celebrated cultural sites). For full day, food MUST include breakfast/brunch, lunch, AND dinner at LEGENDARY spots. Every single stop should be something people TALK about — the "you HAVE to go here" spots.`
        : vibeKey === 'luxe'
          ? `LUXE RATIO FOR ${stopCount} STOPS: ONLY pick places rated 4.8+ stars. ${isFullDay ? '3' : '2'} stops should be the city's FINEST dining (breakfast/brunch + lunch + dinner for full day) and ${isFullDay ? '5' : '4'} should be PREMIUM experiences — world-class museums, iconic landmarks, luxury shopping, five-star spas, private galleries. If ANY stop feels budget or casual, YOU HAVE FAILED. Every stop should feel like being a billionaire's daughter.`
          : vibeKey === 'afterdark' || vibeKey === 'nightout'
            ? `AFTER DARK RATIO FOR ${stopCount} STOPS: Start with ${isFullDay ? '2' : '1'} dinner/food spot(s) with ENERGY, then ${isFullDay ? '5-6' : '4-5'} nightlife + activity stops (bars, clubs, live music, bowling, karaoke, comedy, rooftop bars). End with late-night food. The arc MUST ESCALATE: dinner → chill drinks → entertainment → PEAK energy → wind-down food. Every nightlife stop should be better than the last.`
            : isStackedVibe
              ? `STACKED FULL EXPERIENCE — EXACT CATEGORY BREAKDOWN FOR ${stopCount} STOPS:
   - EXACTLY 3 RESTAURANTS (breakfast/brunch, lunch, dinner — each a different cuisine). No more.
   - EXACTLY 4 ACTIVITIES (museum, landmark, park, scenic viewpoint, cultural site, shopping).
   - EXACTLY 3 NIGHTLIFE (cocktail bar, rooftop lounge, nightclub, live music).
   VALIDATION: If you have more than 3 restaurants/cafes, YOU HAVE FAILED.`
              : `Include ${isFullDay ? '3' : '2'} food/drink stops (${isFullDay ? 'breakfast + lunch + dinner' : 'at least 2 meals'}). Food goes BETWEEN activities. Every food stop MUST be a DIFFERENT cuisine.`}

${isStackedVibe ? `3b. STACKED NIGHTLIFE IS MANDATORY: After dinner, include 2-3 nightlife stops. The arc: relaxed morning → active afternoon → elevated dinner → nightlife escalation → wind-down.` : ''}
${(isBlended || (vibeKey !== 'food' && vibeKey !== 'indulge')) ? `3c. NON-FOOD STOPS ARE MANDATORY: At least ${isFullDay ? (isBlended ? '4' : vibeKey === 'adventure' || vibeKey === 'escape' ? '5' : vibeKey === 'stacked' || vibeKey === 'starthare' ? '5' : vibeKey === 'surprise' || vibeKey === 'undertheradar' ? '4' : vibeKey === 'luxe' ? '5' : vibeKey === 'afterdark' || vibeKey === 'nightout' ? '5' : '3') : '3-4'} stop(s) MUST be a non-food experience. Look at the "cat" field — anything that is NOT a restaurant/cafe/bakery counts as non-food. DO NOT default to all restaurants just because they have higher ratings.` : ''}

4. TELL A STORY — AREA JOURNEY: Your plan must tell a coherent story as a journey through distinct areas of the city. Group stops by the area/district/quarter/barrio/arrondissement they're in — use whatever the locals call it (NOT the word "neighborhood" unless that's what locals actually say). Use the lat/lng coordinates to pick stops that are NEAR each other and flow in a logical geographic path — don't zigzag across town. Assign each stop a "neighborhood" value using the REAL local area name (e.g., "Sultanahmet", "Le Marais", "Shibuya", "SoHo", "La Condesa", "Beyoğlu"). Each "reason" MUST be a narrative transition that connects to the previous stop:
   - First stop: "Start your ${localHour < 12 ? 'morning' : localHour < 17 ? 'afternoon' : 'evening'} in [Neighborhood] with..."
   - Between nearby stops: "Just around the corner...", "A short walk down the cobblestones brings you to...", "Duck into this side street for..."
   - Between neighborhoods: "Head [direction] to [Neighborhood], where...", "Cross the bridge to [Area] for..."
   - Final stop: "End the night with...", "The perfect way to close out the day..."
The plan should feel like ONE continuous adventure through connected neighborhoods — a friend walking you through their city, not a random list of pins on a map.

5. ${localRegion
  ? `LOCAL CULTURE IS KING: You are in ${localRegion.label} territory. HEAVILY prioritize authentic ${localRegion.label} food, drinks, and culture. At least ${isStackedVibe ? '3 out of 4' : isFullDay ? '2 out of 3' : '1 out of 2'} food stops should be ${localRegion.label} cuisine. Include at least 1 cultural/heritage stop. You may sprinkle in 1 international option if genuinely great.`
  : 'CULTURAL DIVERSITY IS CORE: Mix cultures — include diverse businesses, ethnic neighborhoods, cultural landmarks, and heritage museums. Never pick 2 places from the same cuisine or culture back-to-back.'}

6. VIBE NOTE: Each "reason" must be a vivid 1-sentence description making someone EXCITED to go AND connecting it to the story as a narrative transition.${vibeKey === 'surprise' || vibeKey === 'undertheradar' ? ' For Under the Radar, use INSIDER language — "neighborhood favorite", "locals-only", "hidden", "family-run since", "off the beaten path". Good: "A tiny family-run kebab shop that\'s been here for 40 years — no sign out front, but there\'s always a line of locals." Bad: "highly rated restaurant."' : vibeKey === 'luxe' ? ' For Luxe, use PREMIUM language — "world-renowned", "award-winning", "exclusive", "stunning", "premier". Good: "A Michelin-starred tasting menu where the chef\'s omakase rivals Tokyo\'s finest." Bad: "highly rated restaurant."' : ' Good: "Duck down a side street in the old quarter to find this tucked-away speakeasy — the mezcal cocktails are unreal." Bad: "highly rated restaurant" or "popular bar."'}

7. MEAL STRUCTURE IS MANDATORY:
   - FULL DAY plans MUST include breakfast/brunch + lunch + dinner. These are NON-NEGOTIABLE meals woven between adventures.
   - MORNING plans MUST include 2 breakfast/brunch options (give variety — e.g., a cafe AND a brunch spot) plus adventures.
   - AFTERNOON plans MUST include lunch + an afternoon snack/drink stop.
   - EVENING plans MUST include dinner + a late-night food option.
   Match food to the time:
   - BREAKFAST (before 11 AM): cafés, bakeries, brunch spots, coffee shops. NEVER pizza, BBQ, steakhouse.
   - LUNCH (11 AM – 3 PM): any restaurant.
   - DINNER (6 PM – 10 PM): sit-down, elevated dining.
   - LATE-NIGHT (after 10 PM): casual — tacos, pizza, diners.

7b. BEST-TIME MATCHING (CRITICAL): Each place has a "best" field signaling when it shines: morning, midday, afternoon, sunset, evening, night, or any. RESPECT IT.
   - "best":"morning" → schedule before 11 AM (cafés, bakeries, parks, beaches when cool, farmers' markets)
   - "best":"midday" → schedule 11 AM – 3 PM (museums, galleries, indoor cultural — beat the sun)
   - "best":"afternoon" → schedule 2 PM – 5 PM (markets, shopping, neighborhood walks, casual lunch)
   - "best":"sunset" → schedule 5:30 PM – 7 PM (rooftops, sky bars, viewpoints — the golden hour magic happens here, never schedule them at noon)
   - "best":"evening" → schedule 6 PM – 10 PM (bars, lounges, dinner, live music)
   - "best":"night" → schedule 10 PM onward (clubs, late-night)
   - "best":"any" → flexible
   A rooftop bar at 11 AM is a FAILURE. A nightclub at 3 PM is a FAILURE. A café at 8 PM is a FAILURE. Match each pick to its window. Within the chosen duration, arrange stops in chronological order so each lands in its sweet spot.

8. REALISTIC TIMING: Each timeSlot = specific time (e.g., "7:30 PM") accounting for:
   - Coffee/cafe: 30-45 min | Quick bite: 45 min | Sit-down dinner: 1.5h | Bar: 1-1.5h
   - Museum/gallery: 2-3h | Park/market: 1.5-2h | Beach: 1.5-2.5h
   - Travel between stops: 20-30 min buffer
   NEVER schedule next stop sooner than activity duration + travel buffer.
${vibeKey === 'food' || vibeKey === 'indulge' ? `\n   FOOD TOUR SPACING: AT LEAST 2.5-3 HOURS between food stops. Fill gaps with walks, window shopping, coffee.` : ''}

9. NO DUPLICATES: Never same name, brand, or cuisine twice. Each food stop = different cultural cuisine.

10. MIX PRICE POINTS: Include at least one affordable/casual stop.

11. SPEND: Realistic per-person USD (coffee=$5, tacos=$12, dinner=$45, museum=$20, bar=$18).

12. GROUP: family=kid-friendly no nightlife; couple=romantic; solo=flexible; friends=social.${eventsSection ? `\n\n13. Include at most 1 event if it fits.` : ''}${advisory ? `\n\n${eventsSection ? '14' : '13'}. TRAVEL ADVISORY: ${advisory}. Prefer well-lit, busy venues.` : ''}${jetLagContext ? `\n\n${eventsSection ? (advisory ? '15' : '14') : (advisory ? '14' : '13')}. JET LAG: Plan lighter — start later (10-11 AM), include relaxing stops, no late-night past 10 PM.` : ''}

Return ONLY this JSON (keep reason + knownFor SHORT — max 8 words each):
{"stops":[{"idx":0,"timeSlot":"7:30 PM","reason":"Short transition","knownFor":"Famous for X","spend":25,"neighborhood":"Area"}],"dayTitle":"3-5 word title","headline":"One sentence journey summary"}`;

    const systemMsg = 'You are NxStops, a curated itinerary planner that feels like a local friend who knows all the best spots. You prioritize culturally diverse, locally-owned businesses and create itineraries with a narrative arc — not just a list of places. Every plan should make someone excited to go out. Return ONLY valid JSON.';
    const messages = [
      { role: 'system', content: systemMsg },
      { role: 'user', content: prompt },
    ];

    // Fallback chain: GPT-4o-mini → Gemini 2.0 Flash
    let aiContent: string | null = null;

    // 1. Try GPT-4o-mini (primary)
    aiContent = await callOpenAI(messages);

    if (!aiContent) {
      // 2. OpenAI failed — try Gemini as free backup
      console.log('[NxStops Plan] OpenAI unavailable, trying Gemini fallback');
      aiContent = await callGemini(systemMsg, prompt);
    }

    if (!aiContent) {
      return res.status(502).json({ error: 'AI service is busy. Please try again in a few minutes.' });
    }

    let aiPlan: {
      stops: { idx: number; timeSlot: string; reason: string; knownFor?: string; spend: number; eventIdx?: number; neighborhood?: string }[];
      dayTitle?: string;
      headline?: string;
    };
    try {
      aiPlan = JSON.parse(aiContent);
    } catch {
      console.error('[NxStops Plan] Invalid JSON from AI:', aiContent.slice(0, 200));
      return res.status(502).json({ error: 'AI returned an invalid response. Try again.' });
    }

    if (!aiPlan.stops || !Array.isArray(aiPlan.stops)) {
      return res.status(502).json({ error: 'AI returned unexpected format. Try again.' });
    }

    // 5. Map AI selections back to full place objects, dedup by idx and name
    const usedIdx = new Set<number>();
    const usedNames = new Set<string>();
    const planStops = aiPlan.stops
      .filter(s => {
        if (s.idx < 0 || s.idx >= topPlaces.length) return false;
        // Skip duplicate indices
        if (usedIdx.has(s.idx)) return false;
        // Skip duplicate names (same restaurant with different idx)
        const baseName = topPlaces[s.idx].name.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).slice(0, 3).join(' ');
        if (baseName.length >= 5 && [...usedNames].some(n => n.startsWith(baseName) || baseName.startsWith(n))) return false;
        usedIdx.add(s.idx);
        usedNames.add(baseName);
        return true;
      })
      .map(s => ({
        place: topPlaces[s.idx],
        timeSlot: s.timeSlot || '',
        reason: s.reason || '',
        knownFor: s.knownFor || '',
        estimatedSpend: s.spend || 0,
        neighborhood: s.neighborhood || '',
        bestTime: getBestTime(topPlaces[s.idx]),
      }));

    // Backfill if dedup removed stops — pick unused places to reach the target count
    if (planStops.length < stopCount) {
      for (let i = 0; i < topPlaces.length && planStops.length < stopCount; i++) {
        if (usedIdx.has(i)) continue;
        const baseName = topPlaces[i].name.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).slice(0, 3).join(' ');
        if (baseName.length >= 5 && [...usedNames].some(n => n.startsWith(baseName) || baseName.startsWith(n))) continue;
        usedIdx.add(i);
        usedNames.add(baseName);
        // Insert at the end with a reasonable time slot
        const lastTime = planStops.length > 0 ? planStops[planStops.length - 1].timeSlot : '';
        planStops.push({
          place: topPlaces[i],
          timeSlot: lastTime ? '' : '',
          reason: 'Bonus stop to round out your day',
          knownFor: '',
          estimatedSpend: 0,
          neighborhood: '',
          bestTime: getBestTime(topPlaces[i]),
        });
      }
    }

    // Reorder stops chronologically by their AI-assigned timeSlot. If a slot
    // is missing or unparseable, fall back to the place's bestTime ideal hour
    // so even backfilled bonus stops land in a sensible position.
    planStops.sort((a, b) => {
      const ah = parseTimeSlot(a.timeSlot);
      const bh = parseTimeSlot(b.timeSlot);
      const aHour = ah >= 0 ? ah : BEST_TIME_HOUR[a.bestTime];
      const bHour = bh >= 0 ? bh : BEST_TIME_HOUR[b.bestTime];
      return aHour - bHour;
    });

    const finalResult = {
      plan: planStops,
      dayTitle: aiPlan.dayTitle || 'Your Day Plan',
      headline: aiPlan.headline || '',
      totalPlaces: topPlaces.length,
    };

    // Cache the final plan for instant repeat requests
    const planCacheKey = (req as unknown as Record<string, unknown>)._planCacheKey as string | undefined;
    if (planCacheKey) {
      planCache.set(planCacheKey, { result: finalResult, timestamp: Date.now() });
      // Clean stale entries
      for (const [k, v] of planCache) {
        if (Date.now() - v.timestamp > PLAN_CACHE_TTL) planCache.delete(k);
      }
    }

    return res.status(200).json(finalResult);
  } catch (err: unknown) {
    console.error('[NxStops Plan] Error:', err);
    return res.status(500).json({ error: 'Something went wrong generating your plan. Please try again.' });
  }
}
