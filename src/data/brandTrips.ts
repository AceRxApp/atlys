// ---------------------------------------------------------------------------
// Brand Trip Data — personalized mock itineraries for cold outreach
// ---------------------------------------------------------------------------

export interface BrandStop {
  time: string;
  name: string;
  type: string;
  desc: string;
}

export interface BrandDay {
  day: number;
  title: string;
  stops: BrandStop[];
}

export interface BrandTrip {
  slug: string;
  brandName: string;
  destination: string;
  tagline: string;
  heroSubtitle: string;
  days: BrandDay[];
}

export const TYPE_COLORS: Record<string, string> = {
  Hotel: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Dining: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Experience: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Sunset: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Adventure: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Brunch: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Explore: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  Transit: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  Shopping: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  Wellness: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  Culture: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  Beach: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

// ---------------------------------------------------------------------------
// Rhode x Amalfi Coast
// ---------------------------------------------------------------------------
const rhode: BrandTrip = {
  slug: 'rhode',
  brandName: 'Rhode',
  destination: 'Amalfi Coast',
  tagline: '3 days of curated luxury across Positano, Ravello, and Capri',
  heroSubtitle: 'Give your creators an interactive, curated trip guide they\'ll actually use — built around Rhode\'s elevated, sun-drenched aesthetic.',
  days: [
    {
      day: 1,
      title: 'Positano Arrival',
      stops: [
        { time: '2:00 PM', name: 'Le Sirenuse', type: 'Hotel', desc: 'Iconic 5-star on the Positano cliffside. Every room overlooks the Tyrrhenian Sea.' },
        { time: '4:00 PM', name: 'La Sponda', type: 'Dining', desc: 'Michelin-starred restaurant lit by 400 candles nightly. Mediterranean tasting menu on the terrace.' },
        { time: '6:30 PM', name: 'Private Boat Tour', type: 'Experience', desc: 'Golden hour cruise along the Amalfi coastline. Li Galli islands, hidden coves, champagne on deck.' },
        { time: '8:30 PM', name: 'Franco\'s Bar', type: 'Sunset', desc: 'Rooftop cocktail terrace at Le Sirenuse with panoramic sea views. The content writes itself.' },
        { time: '10:00 PM', name: 'Il San Pietro di Positano', type: 'Dining', desc: 'Cliffside fine dining carved into the rock. Candlelit tables suspended over the Mediterranean.' },
      ],
    },
    {
      day: 2,
      title: 'Ravello & Adventure',
      stops: [
        { time: '9:00 AM', name: 'Villa Cimbrone Gardens', type: 'Experience', desc: 'The Terrace of Infinity — voted the most beautiful viewpoint in the world. Iconic photo moment.' },
        { time: '11:00 AM', name: 'Belmond Hotel Caruso', type: 'Brunch', desc: 'Infinity pool terrace overlooking the coast. Brunch with prosecco and the most photographed pool in Italy.' },
        { time: '1:30 PM', name: 'Path of the Gods Hike', type: 'Adventure', desc: 'Dramatic coastal trail between Agerola and Positano. 7.8km of cliffside views, wildflowers, and sea panoramas.' },
        { time: '4:30 PM', name: 'Amalfi Town', type: 'Explore', desc: 'Wander the cathedral square, artisan paper shops, and gelato along the harbor promenade.' },
        { time: '8:00 PM', name: 'Rossellinis', type: 'Dining', desc: '2 Michelin stars at Palazzo Avino, Ravello. Chef Nino Di Costanzo\'s contemporary Neapolitan tasting menu.' },
      ],
    },
    {
      day: 3,
      title: 'Capri Day',
      stops: [
        { time: '9:30 AM', name: 'Ferry to Capri', type: 'Transit', desc: 'High-speed hydrofoil from Positano. 30 minutes across turquoise water to the island.' },
        { time: '10:30 AM', name: 'Blue Grotto & Faraglioni', type: 'Experience', desc: 'Private boat tour through the luminous Blue Grotto, then around the iconic Faraglioni sea stacks.' },
        { time: '1:00 PM', name: 'Il Riccio', type: 'Dining', desc: 'Michelin-starred beach club restaurant. Seafood crudo, lemon pasta, and Aperol spritzes on the terrace.' },
        { time: '3:30 PM', name: 'Via Camerelle', type: 'Shopping', desc: 'Capri\'s luxury shopping street. Dior, Prada, Ferragamo, and local artisan sandal makers.' },
        { time: '6:00 PM', name: 'La Fontelina', type: 'Sunset', desc: 'The legendary Capri beach club. Sunset dinner on the rocks with the Faraglioni as your backdrop.' },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Tarte x Bora Bora
// ---------------------------------------------------------------------------
const tarte: BrandTrip = {
  slug: 'tarte',
  brandName: 'Tarte Cosmetics',
  destination: 'Bora Bora',
  tagline: '3 days of tropical luxury across the world\'s most iconic lagoon',
  heroSubtitle: 'Give your creators an interactive, curated trip guide they\'ll actually use — designed for Tarte\'s signature tropical glamour.',
  days: [
    {
      day: 1,
      title: 'Lagoon Arrival',
      stops: [
        { time: '12:00 PM', name: 'Four Seasons Bora Bora', type: 'Hotel', desc: 'Overwater bungalow with glass floor panels. Private deck, plunge pool, and direct lagoon access.' },
        { time: '2:30 PM', name: 'Lagoon by Jean-Georges', type: 'Dining', desc: 'Michelin-pedigree restaurant on stilts over turquoise water. French-Polynesian fusion with lagoon views.' },
        { time: '4:30 PM', name: 'Private Lagoon Kayak Tour', type: 'Experience', desc: 'Crystal-clear water kayaking through coral gardens. Sea turtles, tropical fish, and Mount Otemanu as backdrop.' },
        { time: '6:30 PM', name: 'St. Regis Sunset Bar', type: 'Sunset', desc: 'Champagne and cocktails on the St. Regis overwater terrace. Golden hour over the lagoon.' },
        { time: '8:30 PM', name: 'Bloody Mary\'s', type: 'Dining', desc: 'Legendary open-air restaurant with sand floors. Pick your fresh catch from ice, grilled to order under the stars.' },
      ],
    },
    {
      day: 2,
      title: 'Ocean Adventure',
      stops: [
        { time: '8:30 AM', name: 'Coral Gardens Snorkeling', type: 'Adventure', desc: 'World-class snorkeling in the shallow coral gardens. Parrotfish, clownfish, and giant clams in crystal water.' },
        { time: '11:00 AM', name: 'Conrad Bora Bora', type: 'Brunch', desc: 'Overwater infinity pool and brunch buffet. Panoramic views of Mount Otemanu from every angle.' },
        { time: '1:30 PM', name: 'Shark & Ray Excursion', type: 'Adventure', desc: 'Swim with blacktip reef sharks and stingrays in their natural habitat. Guided by local Polynesian experts.' },
        { time: '4:00 PM', name: 'Mount Otemanu Viewpoint', type: 'Experience', desc: 'Boat to the best vantage point of Bora Bora\'s extinct volcano. The most iconic photo spot in French Polynesia.' },
        { time: '7:30 PM', name: 'Villa Mahana', type: 'Dining', desc: 'The most exclusive restaurant in Bora Bora — only 5 tables. French-Polynesian tasting menu by Chef Damien.' },
      ],
    },
    {
      day: 3,
      title: 'Island Bliss',
      stops: [
        { time: '9:00 AM', name: 'Deep Ocean Spa', type: 'Wellness', desc: 'InterContinental\'s overwater spa using deep-sea water from 900m below. Polynesian rituals and lagoon views.' },
        { time: '11:30 AM', name: 'Matira Beach', type: 'Beach', desc: 'The only public beach on Bora Bora — and consistently rated one of the world\'s most beautiful. White sand, calm turquoise water.' },
        { time: '1:30 PM', name: 'Private Motu Picnic', type: 'Experience', desc: 'Boat to your own private island. Champagne lunch on a sandbar surrounded by endless turquoise lagoon.' },
        { time: '4:00 PM', name: 'Robert Wan Pearl Museum', type: 'Culture', desc: 'Tour the pearl farm and museum. Learn how Tahitian black pearls are cultivated in the lagoon.' },
        { time: '7:00 PM', name: 'Overwater Farewell Dinner', type: 'Dining', desc: 'Private candlelit dinner on your bungalow deck. Chef-prepared Polynesian feast with lagoon reflections.' },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Fenty Beauty x Barbados
// ---------------------------------------------------------------------------
const fenty: BrandTrip = {
  slug: 'fenty',
  brandName: 'Fenty Beauty',
  destination: 'Barbados',
  tagline: '3 days of Caribbean luxury across Rihanna\'s homeland',
  heroSubtitle: 'Give your creators an interactive, curated trip guide they\'ll actually use — infused with Fenty\'s bold, unapologetic Caribbean energy.',
  days: [
    {
      day: 1,
      title: 'West Coast Arrival',
      stops: [
        { time: '1:00 PM', name: 'Sandy Lane Hotel', type: 'Hotel', desc: 'The most legendary hotel in the Caribbean. Coral stone estate on a pristine white sand beach. Where royalty stays.' },
        { time: '3:30 PM', name: 'Carlisle Bay Beach', type: 'Beach', desc: 'Calm turquoise waters on the island\'s west coast. Snorkel over shipwrecks just 30 meters from shore.' },
        { time: '5:30 PM', name: 'The Cliff', type: 'Dining', desc: 'Dramatic cliffside restaurant with torchlit terraces cascading down to the Caribbean Sea. Fine dining with ocean spray.' },
        { time: '8:00 PM', name: 'Cin Cin by the Sea', type: 'Sunset', desc: 'Barefoot elegance on the waterfront. Cocktails and Mediterranean-Caribbean fusion as the sun drops into the sea.' },
        { time: '10:00 PM', name: 'Champers Wine Bar', type: 'Dining', desc: 'Upscale beachfront restaurant on the south coast. Fresh lobster, island wines, and ocean breezes.' },
      ],
    },
    {
      day: 2,
      title: 'Island Adventure',
      stops: [
        { time: '9:00 AM', name: 'Harrison\'s Cave', type: 'Adventure', desc: 'Underground tram tour through crystallized limestone caverns. Stalactites, waterfalls, and emerald pools.' },
        { time: '11:30 AM', name: 'Bathsheba Beach', type: 'Experience', desc: 'The wild east coast. Dramatic rock formations, Atlantic swells, and the famous Soup Bowl surf break.' },
        { time: '1:30 PM', name: 'Oistins Fish Fry', type: 'Culture', desc: 'The heart of Bajan culture. Freshly grilled flying fish, rum punch, and live music on the beach.' },
        { time: '4:00 PM', name: 'Atlantis Submarine', type: 'Experience', desc: 'Dive 150 feet below the surface in a real submarine. Coral reefs, sea turtles, and shipwrecks through panoramic windows.' },
        { time: '7:30 PM', name: 'The Lone Star', type: 'Dining', desc: 'Beachfront boutique hotel restaurant. Fresh catches of the day, Bajan spices, and the most chic outdoor dining on the island.' },
      ],
    },
    {
      day: 3,
      title: 'Platinum Coast',
      stops: [
        { time: '9:30 AM', name: 'Catamaran Cruise', type: 'Adventure', desc: 'Sail along the platinum coast. Swim with sea turtles, snorkel over coral, and sip rum punch on deck.' },
        { time: '12:30 PM', name: 'Nikki Beach Barbados', type: 'Beach', desc: 'The iconic beach club on the island\'s south coast. DJ sets, champagne showers, and ocean-view daybeds.' },
        { time: '3:00 PM', name: 'Limegrove Lifestyle Centre', type: 'Shopping', desc: 'Luxury shopping in Holetown. Designer boutiques, local artisan jewelry, and Bajan art galleries.' },
        { time: '5:30 PM', name: 'The Crane', type: 'Sunset', desc: 'Historic resort perched on a cliff above Crane Beach. Infinity pool overlooking pink-tinged Atlantic waves.' },
        { time: '8:00 PM', name: 'Tapas at Naru', type: 'Dining', desc: 'Asian-Caribbean fusion at Sandy Lane. Omakase-style tasting menu with sake pairings and garden views.' },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Summer Fridays x Tulum
// ---------------------------------------------------------------------------
const summerFridays: BrandTrip = {
  slug: 'summer-fridays',
  brandName: 'Summer Fridays',
  destination: 'Tulum',
  tagline: '3 days of bohemian luxury across Tulum\'s jungle and coastline',
  heroSubtitle: 'Give your creators an interactive, curated trip guide they\'ll actually use — matching Summer Fridays\' effortless, sun-kissed aesthetic.',
  days: [
    {
      day: 1,
      title: 'Jungle Arrival',
      stops: [
        { time: '1:00 PM', name: 'Azulik', type: 'Hotel', desc: 'Treehouse resort suspended in the jungle canopy. No wifi, no electricity in rooms — just nature, wood, and ocean views.' },
        { time: '3:30 PM', name: 'Kin Toh', type: 'Dining', desc: 'Nest-shaped restaurant perched above the treetops at Azulik. Mayan-inspired cuisine with panoramic jungle views.' },
        { time: '5:30 PM', name: 'Private Cenote Swim', type: 'Experience', desc: 'Exclusive access to a hidden cenote. Crystal-clear underground pool surrounded by stalactites and jungle roots.' },
        { time: '7:00 PM', name: 'SFER IK Museion', type: 'Culture', desc: 'Eduardo Neri\'s immersive art museum. Organic architecture, living installations, and jungle-meets-art spaces.' },
        { time: '9:00 PM', name: 'Gitano', type: 'Sunset', desc: 'Jungle cocktail bar lit by candles and string lights. Mezcal flights, live music, and bohemian elegance under the stars.' },
      ],
    },
    {
      day: 2,
      title: 'Ruins & Cenotes',
      stops: [
        { time: '7:00 AM', name: 'Tulum Ruins at Sunrise', type: 'Experience', desc: 'First entry to the Mayan clifftop ruins before the crowds. The only ancient city overlooking the Caribbean Sea.' },
        { time: '10:00 AM', name: 'Be Tulum Beach Club', type: 'Brunch', desc: 'Boutique hotel\'s oceanfront restaurant. Acai bowls, fresh ceviche, and champagne with toes in the white sand.' },
        { time: '12:30 PM', name: 'Mayan Ruins Bike Tour', type: 'Adventure', desc: 'Guided bicycle tour through the Tulum archaeological zone. Winding jungle paths and ancient Mayan history.' },
        { time: '3:00 PM', name: 'Gran Cenote', type: 'Adventure', desc: 'One of the most famous cenotes in the Riviera Maya. Swim through crystal caves, spot turtles, and snorkel over underwater formations.' },
        { time: '7:30 PM', name: 'Hartwood', type: 'Dining', desc: 'Open-fire, farm-to-table dining under the stars. No electricity — everything cooked over wood flame with locally sourced ingredients.' },
      ],
    },
    {
      day: 3,
      title: 'Beach Day',
      stops: [
        { time: '10:00 AM', name: 'Papaya Playa Project', type: 'Beach', desc: 'The original Tulum beach club. DJ sets, cacao ceremonies, and barefoot dancing on the Caribbean shore.' },
        { time: '12:30 PM', name: 'Nomade Tulum', type: 'Brunch', desc: 'Bohemian-chic hotel and beach club. Oceanfront daybeds, crystal sound baths, and the best smoothie bowls in Tulum.' },
        { time: '2:30 PM', name: 'Sian Ka\'an Biosphere', type: 'Adventure', desc: 'UNESCO World Heritage boat tour through mangrove channels. Dolphins, manatees, and floating through ancient Mayan canals.' },
        { time: '5:30 PM', name: 'Casa Malca', type: 'Experience', desc: 'Pablo Escobar\'s former mansion turned art hotel. Kaws sculptures, Bansky originals, and a private beach.' },
        { time: '8:00 PM', name: 'Taboo Tulum', type: 'Dining', desc: 'Mediterranean-Mexican fine dining on the beach. Fire-roasted seafood, candlelit tables, and the sound of waves.' },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Glossier x Tokyo
// ---------------------------------------------------------------------------
const glossier: BrandTrip = {
  slug: 'glossier',
  brandName: 'Glossier',
  destination: 'Tokyo',
  tagline: '3 days of modern luxury across Tokyo\'s most iconic neighborhoods',
  heroSubtitle: 'Give your creators an interactive, curated trip guide they\'ll actually use — reflecting Glossier\'s clean, modern, effortlessly cool aesthetic.',
  days: [
    {
      day: 1,
      title: 'Modern Tokyo',
      stops: [
        { time: '2:00 PM', name: 'Aman Tokyo', type: 'Hotel', desc: 'Minimalist luxury in the Otemachi Tower. Floor-to-ceiling windows, cypress wood soaking tubs, and skyline views from the 33rd floor.' },
        { time: '4:30 PM', name: 'Sukiyabashi Jiro', type: 'Dining', desc: 'The world\'s most famous sushi counter. 20-piece omakase by the master himself in a 10-seat basement in Ginza.' },
        { time: '6:30 PM', name: 'teamLab Borderless', type: 'Experience', desc: 'Immersive digital art museum with no boundaries. Rooms of flowing light, infinite mirrors, and interactive installations.' },
        { time: '8:30 PM', name: 'Park Hyatt New York Bar', type: 'Sunset', desc: 'The Lost in Translation bar. Live jazz, craft cocktails, and floor-to-ceiling views of the Tokyo skyline from the 52nd floor.' },
        { time: '10:00 PM', name: 'Ginza Six', type: 'Shopping', desc: 'Tokyo\'s most architecturally stunning luxury mall. Concept stores, art installations, and a rooftop garden above the Ginza district.' },
      ],
    },
    {
      day: 2,
      title: 'Culture & Street Style',
      stops: [
        { time: '8:00 AM', name: 'Meiji Shrine', type: 'Culture', desc: 'Walk through the towering torii gates in the forest. Peaceful morning ritual at Tokyo\'s most sacred Shinto shrine.' },
        { time: '10:30 AM', name: 'Harajuku & Omotesando', type: 'Explore', desc: 'Tokyo\'s fashion epicenter. Takeshita Street, Omotesando Hills, and Japan\'s most creative street style.' },
        { time: '1:00 PM', name: 'Narisawa', type: 'Dining', desc: '2 Michelin stars. Chef Yoshihiro Narisawa\'s "innovative satoyama cuisine" — nature-inspired tasting menu with forest, soil, and sea elements.' },
        { time: '3:30 PM', name: 'Shibuya Sky', type: 'Experience', desc: '360-degree observation deck above the world\'s busiest intersection. Outdoor rooftop 230 meters above Shibuya Crossing.' },
        { time: '7:00 PM', name: 'Den', type: 'Dining', desc: 'Asia\'s most playful fine dining. Chef Zaiyu Hasegawa\'s innovative kaiseki with a sense of humor — including the famous "Den-tucky Fried Chicken."' },
      ],
    },
    {
      day: 3,
      title: 'Tradition Meets Future',
      stops: [
        { time: '7:30 AM', name: 'Tsukiji Outer Market', type: 'Explore', desc: 'The original Tokyo fish market district. Fresh sashimi breakfast, tamagoyaki, and matcha from century-old stalls.' },
        { time: '10:00 AM', name: 'Senso-ji Temple', type: 'Culture', desc: 'Tokyo\'s oldest temple in Asakusa. Incense smoke, Nakamise-dori shopping street, and the iconic Thunder Gate.' },
        { time: '12:30 PM', name: 'Hoshinoya Tokyo', type: 'Wellness', desc: 'Hot spring onsen experience in the heart of the city. Traditional Japanese bathing ritual in a ryokan 17 stories above Otemachi.' },
        { time: '3:00 PM', name: 'Roppongi Art Triangle', type: 'Culture', desc: 'Three world-class museums in one district. Mori Art Museum, National Art Center, and Suntory Museum of Art.' },
        { time: '7:00 PM', name: 'Florilege', type: 'Dining', desc: '2 Michelin stars. French-Japanese fusion by Chef Hiroyasu Kawate. Sustainable, seasonal tasting menu with open-kitchen theater.' },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Sol de Janeiro x Rio de Janeiro
// ---------------------------------------------------------------------------
const solDeJaneiro: BrandTrip = {
  slug: 'sol-de-janeiro',
  brandName: 'Sol de Janeiro',
  destination: 'Rio de Janeiro',
  tagline: '3 days of vibrant luxury across Rio\'s beaches, mountains, and culture',
  heroSubtitle: 'Give your creators an interactive, curated trip guide they\'ll actually use — capturing Sol de Janeiro\'s joyful, sun-soaked Brazilian spirit.',
  days: [
    {
      day: 1,
      title: 'Copacabana & Cristo',
      stops: [
        { time: '12:00 PM', name: 'Copacabana Palace', type: 'Hotel', desc: 'The grand dame of Rio since 1923. Art deco elegance on Copacabana Beach. Where celebrities and royalty have stayed for a century.' },
        { time: '2:30 PM', name: 'Christ the Redeemer', type: 'Experience', desc: 'Private guided tour to the iconic statue atop Corcovado Mountain. 360-degree views of Rio from 700 meters above sea level.' },
        { time: '5:00 PM', name: 'Aprazivel', type: 'Dining', desc: 'Treehouse restaurant in the Santa Teresa hills. Brazilian-fusion cuisine surrounded by tropical gardens with city views below.' },
        { time: '7:00 PM', name: 'Sugarloaf Mountain', type: 'Sunset', desc: 'Cable car to the summit of Pao de Acucar. Golden hour views of Guanabara Bay, the city, and the mountains.' },
        { time: '9:00 PM', name: 'Marius Degustare', type: 'Dining', desc: 'Legendary Brazilian churrascaria and seafood palace. Endless courses of grilled meats and fresh seafood in an oceanfront setting.' },
      ],
    },
    {
      day: 2,
      title: 'Beach & Culture',
      stops: [
        { time: '8:00 AM', name: 'Ipanema Beach', type: 'Beach', desc: 'The world\'s most famous urban beach. Morning light on Dois Irmaos mountains, beach vendors, and the iconic mosaic boardwalk.' },
        { time: '11:00 AM', name: 'Escadaria Selaron', type: 'Culture', desc: 'Jorge Selaron\'s mosaic staircase — 250 steps covered in colorful tiles from 60 countries. One of Rio\'s most Instagrammed spots.' },
        { time: '1:00 PM', name: 'Botequim Informal', type: 'Dining', desc: 'Chef Thomas Troisgros\' modern Brazilian bistro. Creative small plates with local ingredients in a relaxed Leblon setting.' },
        { time: '3:30 PM', name: 'Santa Teresa', type: 'Explore', desc: 'Rio\'s bohemian hilltop neighborhood. Colonial mansions, street art, artist studios, and panoramic views of the bay.' },
        { time: '7:30 PM', name: 'Lasai', type: 'Dining', desc: '1 Michelin star. Chef Rafa Costa e Silva\'s hyper-seasonal tasting menu. Only 8 tables, showcasing Brazilian terroir.' },
      ],
    },
    {
      day: 3,
      title: 'Jungle & Leblon',
      stops: [
        { time: '8:00 AM', name: 'Tijuca Forest Hike', type: 'Adventure', desc: 'The world\'s largest urban rainforest. Hike to Pico da Tijuca through waterfalls, wildlife, and dense tropical canopy.' },
        { time: '11:00 AM', name: 'Jardim Botanico', type: 'Experience', desc: 'Rio\'s 200-year-old botanical garden. 6,500 species, the iconic Avenue of Royal Palms, and toucans in the canopy.' },
        { time: '1:30 PM', name: 'Leblon Beach', type: 'Beach', desc: 'The upscale local\'s beach. Beach volleyball, caipirinhas from kiosks, and the most relaxed vibe in Rio.' },
        { time: '4:00 PM', name: 'Shopping Leblon', type: 'Shopping', desc: 'Rio\'s chicest luxury mall. Brazilian designers, Osklen, Farm, and the best havaianas selection in the city.' },
        { time: '7:00 PM', name: 'CT Boucherie', type: 'Dining', desc: 'Claude Troisgros\' legendary steakhouse. Dry-aged Brazilian beef, wood-fired cooking, and the best sunset terrace in Leblon.' },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Export all brands keyed by slug
// ---------------------------------------------------------------------------
export const BRAND_TRIPS: Record<string, BrandTrip> = {
  rhode,
  tarte,
  fenty,
  'summer-fridays': summerFridays,
  glossier,
  'sol-de-janeiro': solDeJaneiro,
};
