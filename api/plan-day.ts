// Vercel Serverless API Route — Auto Day Planner
// Uses GPT-4o-mini + Google Places to generate personalized day itineraries

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIp, validateApiKey } from './_lib/cors.js';

const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || '').trim();
const GOOGLE_API_KEY = (process.env.GOOGLE_PLACES_API_KEY || '').trim();
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();

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
  'performing_arts_theater', 'movie_theater',
];

const ADVENTURE_TYPES = [
  'museum', 'art_gallery', 'tourist_attraction', 'park',
  'performing_arts_theater', 'historical_landmark', 'zoo',
  'aquarium', 'amusement_park', 'hiking_area', 'market',
  'book_store', 'spa', 'bowling_alley',
];

// Diverse text searches per vibe — we pick random subsets to keep API usage reasonable
const DIVERSE_TEXT_SEARCHES: Record<string, string[]> = {
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
    'cultural district walking tour', 'scenic viewpoint lookout',
    'historic neighborhood landmark', 'mural street art district',
    'botanical garden park', 'waterfront boardwalk pier',
    'cultural center heritage museum', 'farmers market outdoor market',
    'neighborhood walking tour', 'iconic landmark must see',
    'beach oceanfront seaside', 'beach bar restaurant waterfront',
    'temple shrine palace historic visit', 'wildlife sanctuary nature park',
    'adventure outdoor activity zipline kayak', 'river cruise boat tour',
    'national park nature reserve hiking', 'famous monument memorial site',
  ],
  surprise: [
    'Michelin star restaurant tasting menu fine dining', 'award winning chef restaurant upscale',
    'luxury rooftop bar cocktails panoramic views', 'five star hotel restaurant bar lounge',
    'premium steakhouse fine dining upscale', 'omakase sushi high end restaurant',
    'champagne bar wine lounge upscale', 'exclusive members club restaurant',
    'world class art museum gallery', 'iconic landmark monument must visit',
    'luxury shopping district designer boutiques', 'scenic observation deck skyline views',
    'historic theater performing arts opera', 'famous landmark cultural heritage site',
    'botanical garden conservatory scenic', 'waterfront promenade scenic boardwalk',
    'penthouse rooftop lounge city views', 'celebrity chef restaurant signature dining',
    'spa wellness luxury treatment', 'yacht club marina waterfront dining',
  ],
  chill: [
    'cozy coffee shop cafe', 'indie bookstore cafe', 'botanical garden park scenic',
    'farmers market local', 'quiet brunch spot', 'tea house matcha cafe',
    'bakery pastry shop local', 'scenic walking trail park', 'art gallery exhibition',
    'vintage shop boutique', 'beach seaside relaxing waterfront',
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
    'national monument memorial landmark', 'historic architecture landmark tour',
  ],
  stacked: [
    'iconic landmark must visit attraction', 'world class museum gallery exhibition',
    'scenic viewpoint observation deck skyline', 'famous park botanical garden',
    'cultural district historic neighborhood tour', 'waterfront boardwalk scenic walk',
    'rooftop bar lounge panoramic views', 'speakeasy hidden cocktail bar',
    'underground music venue live show', 'nightclub dance club DJ',
    'comedy show improv theater', 'jazz club live music venue',
    'hidden gem restaurant local favorite', 'chef owned restaurant tasting menu',
    'interactive art installation museum', 'architecture tour unique buildings',
    'beach club oceanfront bar', 'street art mural district walking',
    'temple shrine sacred site visit', 'wildlife sanctuary nature experience',
    'palace royal historic tour', 'famous market bazaar shopping experience',
    'river cruise boat tour waterfront', 'adventure outdoor activity excursion',
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
    ],
    nightlifeSearches: [
      'Afrobeat club lounge', 'highlife music bar', 'rooftop bar lounge Accra',
      'live band bar nightclub', 'outdoor bar garden lounge',
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

// Vibe → which Google types to fetch + diverse text searches + AI behavior
const VIBE_CONFIG: Record<string, {
  foodTypes: string[];
  activityTypes: string[];
  textSearchKey: string;
  textSearchCount: number;
  aiHint: string;
  structureHint: Record<string, string>;
}> = {
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
    foodTypes: FOOD_TYPES,
    activityTypes: ADVENTURE_TYPES,
    textSearchKey: 'adventure',
    textSearchCount: 4,
    aiHint: 'This is an ADVENTURE day — about DOING things, SEEING things, and EXPLORING — not just eating. The MAJORITY of stops (at least 60-70%) must be ACTIVITIES: parks, beaches, hiking trails, museums, galleries, landmarks, scenic viewpoints, markets, historic neighborhoods, waterfront walks. Food is fuel between adventures — weave in just 1-2 food stops for half day, 2-3 for full day. The food should match the adventure context (beach → nearby seafood shack, park → local cafe, cultural district → neighborhood ethnic food). BEACH RULE: If the city has beaches, MUST include at least one beach stop. NEVER let the plan become 4+ restaurants with one museum tacked on — that\'s a food tour, not an adventure.',
    structureHint: {
      morning: '3 stops required: Breakfast/brunch (FOOD — mandatory) → outdoor activity, museum, temple, or beach (ACTIVITY) → coffee or scenic walk (ACTIVITY). Start with food, then explore.',
      afternoon: '3 stops required: Lunch (FOOD — mandatory) → museum, landmark, or nature (ACTIVITY) → beach, scenic walk, or market (ACTIVITY).',
      evening: '3 stops required: Cultural venue, viewpoint, or sunset spot (ACTIVITY) → Dinner at local restaurant (FOOD — mandatory) → dessert or drinks (ACTIVITY).',
      full: 'Breakfast → morning activity → lunch (local spot) → beach or afternoon adventure → snack/coffee → dinner or sunset spot',
    },
  },
  surprise: {
    foodTypes: ['fine_dining_restaurant', 'steak_house', 'seafood_restaurant', 'restaurant', 'sushi_restaurant', 'wine_bar', 'brunch_restaurant'],
    activityTypes: ADVENTURE_TYPES.concat(NIGHTLIFE_TYPES).concat(['shopping_mall', 'clothing_store', 'spa']),
    textSearchKey: 'surprise',
    textSearchCount: 6,
    aiHint: 'CITY\'S BEST — a LUXURY curated experience of the city\'s most prestigious and elevated offerings. This should feel like a high-end concierge planned it for a VIP. Every stop should feel PREMIUM and UPSCALE — think Michelin-starred restaurants, award-winning fine dining, exclusive rooftop lounges, world-class museums, iconic cultural landmarks, luxury shopping districts, and scenic viewpoints. NO chains, no casual fast food, no budget spots. THE MIX IS MANDATORY: At least HALF the stops must be NON-FOOD experiences (world-class museums, iconic landmarks, scenic viewpoints, luxury shopping, cultural sites). Food stops must be the city\'s FINEST dining — celebrity chef restaurants, Michelin-starred spots, upscale steakhouses, signature tasting menus. Drinks should be at the most exclusive cocktail bars, rooftop lounges, or champagne bars. Every stop should make someone feel like they\'re living their BEST, most elevated life. This is not a budget tour — this is the LUXURY edition.',
    structureHint: {
      morning: 'Luxury brunch or upscale café → iconic cultural landmark or world-class gallery → premium patisserie or artisan coffee',
      afternoon: 'Fine dining lunch (Michelin-caliber or celebrity chef) → world-class museum or luxury shopping district → scenic viewpoint or prestigious cultural landmark',
      evening: 'Award-winning fine dining (tasting menu or signature restaurant) → exclusive rooftop lounge or champagne bar → premium nightlife or VIP late-night',
      full: 'Luxury brunch → iconic landmark or world-class gallery → finest lunch (chef-driven, upscale) → premier museum or luxury shopping district → scenic viewpoint → fine dining dinner (Michelin-caliber) → exclusive rooftop bar or lounge → premium nightlife',
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

  const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
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
  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
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
// OpenAI GPT-4o-mini call
// --------------------------------------------------------------------------

async function callOpenAI(messages: { role: string; content: string }[]): Promise<string | null> {
  if (!OPENAI_API_KEY) return null;
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.8,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
      }),
    });
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
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 1200,
            responseMimeType: 'application/json',
          },
        }),
      },
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
      localTime,
    } = req.body as {
      lat: number; lng: number; city?: string;
      vibe?: string; mood?: string;
      travelGroup?: string; duration?: string;
      weather?: string; preferences?: string;
      events?: { name: string; category: string; time: string; venue: string }[];
      advisory?: string;
      jetLagContext?: string;
      localTime?: string; // e.g. "14:30" — user's local time
    };

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Location is required' });
    }

    // Determine vibe config — use structured vibe if provided, fall back to 'surprise'
    const vibeKey = vibe && VIBE_CONFIG[vibe] ? vibe : 'surprise';
    const config = VIBE_CONFIG[vibeKey];

    // 1. ALWAYS fetch food places (food is woven into every itinerary)
    const fetches: Promise<Record<string, unknown>[]>[] = [];
    const fetchLabels: string[] = [];

    // Food types — always fetched (start with 5km, expand if too few results)
    fetches.push(fetchNearbyPlaces(lat, lng, config.foodTypes, 5000));
    fetchLabels.push('food');

    // Activity types — fetched if the vibe has them
    // Activities get a WIDER radius than food — people will travel further for landmarks/museums/parks
    if (config.activityTypes.length > 0) {
      const activityRadius = (vibeKey === 'stacked' || vibeKey === 'adventure' || vibeKey === 'surprise') ? 15000 : 6000;
      fetches.push(fetchNearbyPlaces(lat, lng, config.activityTypes, activityRadius));
      fetchLabels.push('activity');
    }

    const rawResults = await Promise.all(fetches);
    let allRaw = rawResults.flat();
    console.log(`[NxStops Plan] Initial nearby: ${rawResults.map((r, i) => `${fetchLabels[i]}=${r.length}`).join(', ')} total=${allRaw.length}`);

    // Fallback for small/island/remote cities: if nearby search returned too few,
    // retry with much larger radius (25km covers most islands and small cities)
    if (allRaw.length < 10) {
      console.log(`[NxStops Plan] Only ${allRaw.length} nearby results — expanding search radius to 25km`);
      const expandedFetches: Promise<Record<string, unknown>[]>[] = [
        fetchNearbyPlaces(lat, lng, config.foodTypes, 25000),
      ];
      if (config.activityTypes.length > 0) {
        expandedFetches.push(fetchNearbyPlaces(lat, lng, config.activityTypes, 25000));
      }
      const expandedResults = await Promise.all(expandedFetches);
      allRaw = [...allRaw, ...expandedResults.flat()];
    }

    // 1b. Region-aware text searches
    // Non-Western cities → HEAVY local cuisine + sprinkle of international
    // Western cities → diverse multicultural mix
    const localRegion = detectLocalRegion(city || '');
    const shuffledSearches: string[] = [];

    if (localRegion) {
      // LOCAL REGION: 70-80% local cuisine, 20-30% sprinkle of international
      if (vibeKey === 'nightout') {
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
      } else {
        // Surprise/chill/daydrinks: heavy local + cultural mix
        const localFood = localRegion.foodSearches.sort(() => Math.random() - 0.5).slice(0, 3);
        const globalSurprise = (DIVERSE_TEXT_SEARCHES.surprise || []).sort(() => Math.random() - 0.5).slice(0, 1);
        const culturalSearches = (DIVERSE_TEXT_SEARCHES.cultural || []).sort(() => Math.random() - 0.5).slice(0, 2);
        shuffledSearches.push(...localFood, ...globalSurprise, ...culturalSearches);
      }

      // ALWAYS add hidden gem searches — the secret sauce for unique discoveries
      const gemSearches = DIVERSE_TEXT_SEARCHES.hiddengems.sort(() => Math.random() - 0.5).slice(0, 2);
      shuffledSearches.push(...gemSearches);
    } else {
      // WESTERN / DEFAULT: diverse multicultural mix (existing behavior)
      const vibeSearches = DIVERSE_TEXT_SEARCHES[config.textSearchKey] || [];
      shuffledSearches.push(...vibeSearches.sort(() => Math.random() - 0.5).slice(0, config.textSearchCount));

      // For activity-focused vibes: add MORE activity/cultural searches, NOT more food
      // The food already comes from fetchNearbyPlaces — no need to inflate it further
      if (vibeKey === 'surprise' || vibeKey === 'adventure' || vibeKey === 'cultural' || vibeKey === 'stacked') {
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

    if (shuffledSearches.length > 0) {
      // Use larger text search radius (10km default, 25km for small/island cities)
      const textRadius = allRaw.length < 15 ? 25000 : 10000;
      const textResults = await Promise.all(
        shuffledSearches.map(q => textSearchPlaces(q, lat, lng, textRadius).catch(() => []))
      );
      allRaw = [...allRaw, ...textResults.flat()];
    }

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
      // Safety net: filter out places too far from the city center (>50km)
      const loc = p.location as { latitude: number; longitude: number } | undefined;
      if (loc) {
        const dLat = (loc.latitude - lat) * Math.PI / 180;
        const dLng = (loc.longitude - lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat * Math.PI / 180) * Math.cos(loc.latitude * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        const distKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        if (distKm > 50) return false;
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
    ]);
    const filtered = allTransformed.filter(p => {
      const nameLower = p.name.toLowerCase();
      if (CHAIN_KEYWORDS.some(chain => nameLower.includes(chain))) return false;
      if (EXCLUDED_PLAN_TYPES.has(p.category)) return false;
      if (/\b(hotel|motel|inn|suites|lodge|resort)\b/i.test(nameLower) && !nameLower.includes('restaurant') && !nameLower.includes('bar')) return false;
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
    const allPlaces: PlanPlace[] = [];
    for (const p of filtered) {
      if (!p.placeId || seen.has(p.placeId)) continue;
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
    allPlaces.sort((a, b) => gemScore(b) - gemScore(a));

    // Balance candidate pool: activity-focused vibes need plenty of non-food options
    const FOOD_CAT_SET = new Set([...FOOD_TYPES, 'bar', 'wine_bar']);
    const isPlaceFood = (p: PlanPlace) => FOOD_CAT_SET.has(p.category);

    // Identify hidden gems: high-rated (4.0+) but under 300 reviews — the sweet spot
    const isHiddenGem = (p: PlanPlace) => p.rating >= 4.0 && p.reviewCount > 0 && p.reviewCount < 300;

    let topPlaces: PlanPlace[];

    if (vibeKey === 'surprise' || vibeKey === 'adventure' || vibeKey === 'cultural') {
      const foodCandidates = allPlaces.filter(p => isPlaceFood(p));
      const activityCandidates = allPlaces.filter(p => !isPlaceFood(p));
      const activityCount = Math.min(activityCandidates.length, 18);
      const foodCount = Math.min(foodCandidates.length, 30 - activityCount);
      topPlaces = [...activityCandidates.slice(0, activityCount), ...foodCandidates.slice(0, foodCount)]
        .sort((a, b) => gemScore(b) - gemScore(a))
        .slice(0, 30);
    } else if (vibeKey === 'stacked') {
      // Stacked needs 3 categories: restaurants, activities, AND nightlife
      const NIGHTLIFE_CAT_SET = new Set(['bar', 'wine_bar', 'night_club', 'casino', 'performing_arts_theater']);
      const RESTAURANT_CAT_SET = new Set([...FOOD_TYPES].filter(t => !NIGHTLIFE_CAT_SET.has(t)));
      const restaurantCandidates = allPlaces.filter(p => RESTAURANT_CAT_SET.has(p.category));
      const nightlifeCandidates = allPlaces.filter(p => NIGHTLIFE_CAT_SET.has(p.category));
      const activityCandidates = allPlaces.filter(p => !isPlaceFood(p) && !NIGHTLIFE_CAT_SET.has(p.category));
      // Guarantee strong representation of all 3 categories
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
    console.log(`[NxStops Plan] vibe="${vibeKey}" duration="${duration || 'full'}" region="${localRegion?.label || 'diverse'}" fetched=[${fetchLabels}] totalPlaces=${topPlaces.length} hiddenGems=${gemCount}`);

    if (topPlaces.length < 3) {
      return res.status(200).json({
        plan: [],
        dayTitle: '',
        message: 'Not enough places found nearby. Try a different location.',
      });
    }

    const condensed = topPlaces.map((p, i) => ({
      idx: i,
      name: p.name,
      cat: p.categoryDisplay,
      rating: p.rating,
      price: p.priceLevel,
      open: p.openNow,
      dist: p.distance ? `${p.distance.toFixed(1)}km` : '?',
      lat: Math.round(p.lat * 10000) / 10000,
      lng: Math.round(p.lng * 10000) / 10000,
      ...(isHiddenGem(p) ? { gem: true } : {}),
    }));

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
      ? (isStackedVibe ? 6 : isFullDay ? 4 : 3)
      : (isStackedVibe ? 8 : isFullDay ? 6 : 3);
    // Use the client's local time (they pass it from the browser)
    const timeLabel = localTime || `${new Date().getHours()}:${String(new Date().getMinutes()).padStart(2, '0')}`;
    const localHour = parseInt(timeLabel.split(':')[0], 10);

    const vibeLabels: Record<string, string> = {
      nightout: 'Night Out', food: 'Food Tour',
      adventure: 'Adventure', surprise: 'The Curated City',
      chill: 'Chill Vibes', daydrinks: 'Day Drinks',
      stacked: 'Stacked',
    };
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
GROUP: ${travelGroup || 'solo'}${weather ? `\nWEATHER: ${weather}` : ''}${preferences ? `\nPREFS: ${preferences}` : ''}${jetLagContext ? `\nJET LAG: ${jetLagContext}` : ''}

ITINERARY STRUCTURE (follow this arc):
${structureGuide}

PLACES (pick from these ONLY, reference by idx):
${JSON.stringify(condensed)}${eventsSection}

CRITICAL RULES:

0. START FROM NOW: The current local time is ${timeLabel}. Your FIRST stop must be scheduled for RIGHT NOW or within the next 30 minutes. Do NOT start the plan earlier than the current time. If it's 2 PM, your first stop should be around 2:00-2:30 PM (lunch or afternoon activity), NOT 9 AM breakfast. The plan should feel like "what should I do starting NOW." Match the first meal to the current time of day — if it's afternoon, start with lunch; if it's evening, start with dinner; if it's morning, start with breakfast/coffee.

1. Pick EXACTLY ${stopCount} stops — no more, no fewer. You MUST return exactly ${stopCount} entries in the stops array. EVERY stop must be a DIFFERENT place — never pick the same idx twice. Each stop must be a unique, distinct location. If you return fewer than ${stopCount} stops, YOU HAVE FAILED.

2. ${config.aiHint}

2b. HIDDEN GEMS ARE MANDATORY: At least ${isFullDay ? '1-2' : '1'} stop(s) MUST be a hidden gem — a place marked with "gem":true in the list, or any high-rated place with fewer reviews that most tourists would never find. These are the neighborhood spots, hole-in-the-wall restaurants, tucked-away cafes, and local favorites that make a plan feel like a friend who lives there curated it. DO NOT make every stop a famous landmark or top-rated tourist destination — the magic is in mixing iconic spots with local discoveries.

3. CATEGORY MIX — THIS IS THE MOST IMPORTANT RULE:
${vibeKey === 'food'
  ? 'Every stop is food/drink. Create a GLOBAL TASTING JOURNEY — each stop MUST be a different cuisine/culture (e.g., Mexican → Chinese → Ethiopian → Korean). NEVER two stops from the same cuisine. Vary price points.'
  : vibeKey === 'adventure'
    ? `ADVENTURE RATIO FOR ${stopCount} STOPS: EXACTLY ${isFullDay ? '2' : '1'} stop(s) MUST be food/drink (meal or coffee — you MUST include food, people need to eat). The rest (${isFullDay ? '4' : '2'}) MUST be activities — parks, beaches, museums, landmarks, scenic walks, viewpoints, markets, galleries, temples, nature. Food goes between adventures as fuel. NEVER skip food entirely — always include at least 1 food stop. Count: ${isFullDay ? '2 food + 4 activities' : '1 food + 2 activities'} = ${stopCount} total.`
    : vibeKey === 'surprise'
      ? `LUXURY CITY'S BEST RATIO: At MOST ${isFullDay ? '2-3' : '1-2'} stops can be food/drink — and every food stop MUST be UPSCALE (fine dining, celebrity chef, Michelin-starred, premium steakhouse — NOT casual cafes or budget spots). The rest (${isFullDay ? '3-4' : '1-2'}) MUST be PREMIUM experiences — world-class museums, iconic landmarks, scenic viewpoints, luxury shopping districts, prestigious cultural sites. This is the LUXURY edition — every single stop should feel elevated, exclusive, and high-end. If you pick 4+ food spots, YOU HAVE FAILED. If any stop feels budget or casual, YOU HAVE FAILED. Count your food vs non-food stops before responding.`
      : isStackedVibe
        ? `STACKED FULL EXPERIENCE — EXACT CATEGORY BREAKDOWN FOR ${stopCount} STOPS:
   - EXACTLY 3 RESTAURANTS (breakfast/brunch, lunch, dinner). No more. A late-night food stop counts as the 3rd if needed.
   - EXACTLY ${stopCount >= 8 ? '2-3' : '1-2'} ACTIVITIES (museum, landmark, park, scenic viewpoint, cultural site, gallery, market, temple, monument). These are MANDATORY — not optional.
   - EXACTLY ${stopCount >= 8 ? '2-3' : '1'} NIGHTLIFE (cocktail bar, rooftop lounge, nightclub, live music, speakeasy). Bars count as nightlife, NOT as food.
   VALIDATION: Before responding, count each stop's category. If you have more than 3 restaurants/cafes, YOU HAVE FAILED — delete a food stop and replace it with an activity or nightlife stop. This is the FULL EXPERIENCE — food, culture, adventure, AND nightlife. NOT a food tour with a bar at the end.`
        : `At least ${isFullDay ? '2-3' : '1'} stop(s) MUST be food/drink. Food goes BETWEEN activities. Every food stop MUST be a DIFFERENT cuisine.`}

${isStackedVibe ? `3b. STACKED NIGHTLIFE IS MANDATORY: After dinner, include 2-3 nightlife stops — cocktail bar/rooftop lounge, then nightclub/live music/speakeasy. These are NOT restaurants — they are bars, clubs, and music venues. The arc of the FULL day: relaxed morning → active afternoon exploring → elevated dinner → nightlife escalation → wind-down.` : ''}
${vibeKey !== 'food' ? `3c. NON-FOOD STOPS ARE MANDATORY: At least ${isFullDay ? (vibeKey === 'adventure' || vibeKey === 'surprise' || vibeKey === 'stacked' ? '4-5' : '2') : '1-2'} stop(s) MUST be a non-food experience — museum, park, landmark, gallery, viewpoint, market, cultural site, scenic walk, beach, temple, monument. Look at the "cat" field in the places list — anything that is NOT a restaurant/cafe/bakery counts as a non-food experience. Bars, lounges, and nightclubs count as NIGHTLIFE (non-food). DO NOT default to all restaurants just because they have higher ratings. A plan with mostly restaurants is a FAILED plan (unless it's a Food Tour vibe).` : ''}

4. TELL A STORY — GEOGRAPHIC FLOW: Your plan must tell a coherent story as a journey through the city. Use the lat/lng coordinates to pick stops that are NEAR each other and flow in a logical geographic path — don't zigzag across town. Group nearby stops together. Each "reason" should connect to the journey: "Start your ${localHour < 12 ? 'morning' : localHour < 17 ? 'afternoon' : 'evening'} with..." → "A short walk brings you to..." → "After exploring, refuel at..." → "As the ${localHour < 17 ? 'afternoon' : 'evening'} unfolds..." The plan should feel like ONE continuous adventure through connected neighborhoods, not a random list of unrelated pins on a map.

5. ${localRegion
  ? `LOCAL CULTURE IS KING: You are in ${localRegion.label} territory. HEAVILY prioritize authentic ${localRegion.label} food, drinks, and culture. At least ${isStackedVibe ? '3 out of 4' : isFullDay ? '2 out of 3' : '1 out of 2'} food stops should be ${localRegion.label} cuisine. Include at least 1 cultural/heritage stop. You may sprinkle in 1 international option if genuinely great.`
  : 'CULTURAL DIVERSITY IS CORE: Mix cultures — include diverse businesses, ethnic neighborhoods, cultural landmarks, and heritage museums. Never pick 2 places from the same cuisine or culture back-to-back.'}

6. VIBE NOTE: Each "reason" must be a vivid 1-sentence description making someone EXCITED to go AND connecting it to the story.${vibeKey === 'surprise' ? ' For City\'s Best, use LUXURY language — words like "prestigious", "world-renowned", "award-winning", "exclusive", "stunning", "premier". Good: "A Michelin-starred tasting menu where the chef\'s omakase rivals Tokyo\'s finest — the pinnacle of the city\'s dining scene." Bad: "highly rated restaurant" or "popular spot."' : ' Good: "A tucked-away speakeasy with killer mezcal cocktails — the perfect nightcap after exploring the arts district." Bad: "highly rated restaurant" or "popular bar."'}

7. MEAL-APPROPRIATE FOOD: Match food to the time of day:
   - BREAKFAST (before 11 AM): cafés, bakeries, brunch spots, coffee shops only. NEVER pizza, BBQ, steakhouse, sushi.
   - LUNCH (11 AM – 3 PM): any restaurant.
   - DINNER (6 PM – 10 PM): sit-down, elevated dining.
   - LATE-NIGHT (after 10 PM): casual — tacos, pizza, diners.

8. REALISTIC TIMING: Each timeSlot = specific time (e.g., "7:30 PM") accounting for:
   - Coffee/cafe: 30-45 min | Quick bite: 45 min | Sit-down dinner: 1.5h | Bar: 1-1.5h
   - Museum/gallery: 2-3h | Park/market: 1.5-2h | Beach: 1.5-2.5h
   - Travel between stops: 20-30 min buffer
   NEVER schedule next stop sooner than activity duration + travel buffer.
${vibeKey === 'food' ? `\n   FOOD TOUR SPACING: AT LEAST 2.5-3 HOURS between food stops. Fill gaps with walks, window shopping, coffee.` : ''}

9. NO DUPLICATES: Never same name, brand, or cuisine twice. Each food stop = different cultural cuisine.

10. MIX PRICE POINTS: Include at least one affordable/casual stop.

11. SPEND: Realistic per-person USD (coffee=$5, tacos=$12, dinner=$45, museum=$20, bar=$18).

12. GROUP: family=kid-friendly no nightlife; couple=romantic; solo=flexible; friends=social.${eventsSection ? `\n\n13. Include at most 1 event if it fits.` : ''}${advisory ? `\n\n${eventsSection ? '14' : '13'}. TRAVEL ADVISORY: ${advisory}. Prefer well-lit, busy venues.` : ''}${jetLagContext ? `\n\n${eventsSection ? (advisory ? '15' : '14') : (advisory ? '14' : '13')}. JET LAG: Plan lighter — start later (10-11 AM), include relaxing stops, no late-night past 10 PM.` : ''}

Return ONLY this JSON:
{"stops":[{"idx":0,"timeSlot":"7:30 PM","reason":"Vivid 1-sentence connecting to journey","spend":25}],"dayTitle":"Catchy 3-5 word title"}`;

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
      stops: { idx: number; timeSlot: string; reason: string; spend: number; eventIdx?: number }[];
      dayTitle?: string;
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
        estimatedSpend: s.spend || 0,
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
          estimatedSpend: 0,
        });
      }
    }

    return res.status(200).json({
      plan: planStops,
      dayTitle: aiPlan.dayTitle || 'Your Day Plan',
      totalPlaces: topPlaces.length,
    });
  } catch (err: unknown) {
    console.error('[NxStops Plan] Error:', err);
    return res.status(500).json({ error: 'Something went wrong generating your plan. Please try again.' });
  }
}
