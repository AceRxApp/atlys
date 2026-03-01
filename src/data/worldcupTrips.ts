// ---------------------------------------------------------------------------
// FIFA World Cup 2026 — Partner Trip Data for cold outreach
// City tourism boards + brand sponsors
// ---------------------------------------------------------------------------

export interface WCStop {
  time: string;
  name: string;
  type: string;
  desc: string;
}

export interface WCDay {
  day: number;
  title: string;
  stops: WCStop[];
}

export interface WCPartner {
  slug: string;
  partnerType: 'city' | 'brand';
  partnerName: string;
  city: string;
  venue: string;
  tagline: string;
  heroSubtitle: string;
  days: WCDay[];
}

export const WC_TYPE_COLORS: Record<string, string> = {
  Hotel: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Match: 'bg-green-500/10 text-green-400 border-green-500/20',
  'Fan Zone': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Dining: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Nightlife: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  Culture: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  Experience: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Beach: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  Shopping: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  Explore: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  Adventure: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Brunch: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

// ---------------------------------------------------------------------------
// CITIES — Tourism Board Partners
// ---------------------------------------------------------------------------

const miami: WCPartner = {
  slug: 'miami',
  partnerType: 'city',
  partnerName: 'Visit Miami',
  city: 'Miami',
  venue: 'Hard Rock Stadium',
  tagline: '3 days of match-day energy, beach culture, and Miami nightlife',
  heroSubtitle: 'Help millions of World Cup visitors navigate Miami with interactive city guides — from Hard Rock Stadium to South Beach.',
  days: [
    {
      day: 1,
      title: 'Match Day',
      stops: [
        { time: '11:00 AM', name: 'Faena Hotel Miami Beach', type: 'Hotel', desc: 'Art-deco luxury on Collins Avenue. Gold-leaf theater, Damien Hirst installations, and a private beach on Millionaire\'s Row.' },
        { time: '2:00 PM', name: 'Hard Rock Stadium', type: 'Match', desc: '65,000-seat venue in Miami Gardens. Home to 6 World Cup group stage matches and one Round of 16 match.' },
        { time: '6:00 PM', name: 'Bayfront Park FIFA Fan Fest', type: 'Fan Zone', desc: 'Official FIFA Fan Festival on Biscayne Bay. Giant screens, live music, and 30,000+ fans watching together in downtown Miami.' },
        { time: '8:30 PM', name: 'KYU Miami', type: 'Dining', desc: 'Wood-fired Asian cuisine in the heart of Wynwood. Roasted cauliflower, coconut tiger prawns, and craft cocktails in an open-air warehouse.' },
        { time: '11:00 PM', name: 'LIV Miami', type: 'Nightlife', desc: 'The most iconic nightclub in the US, inside the Fontainebleau. Where every World Cup after-party will happen.' },
      ],
    },
    {
      day: 2,
      title: 'City Exploration',
      stops: [
        { time: '9:00 AM', name: 'Versailles Restaurant', type: 'Culture', desc: 'The beating heart of Little Havana since 1971. Cuban coffee, croquetas, and the most authentic Cuban experience outside Havana.' },
        { time: '11:00 AM', name: 'Wynwood Walls', type: 'Experience', desc: 'World-famous outdoor street art museum. 80,000 sq ft of murals by artists from 16 countries — the perfect content backdrop.' },
        { time: '1:30 PM', name: 'Design District', type: 'Shopping', desc: 'Miami\'s luxury open-air retail neighborhood. Dior, Louis Vuitton, Prada, plus galleries and public art installations.' },
        { time: '4:00 PM', name: 'South Beach', type: 'Beach', desc: 'The most famous beach strip in America. Art Deco buildings, turquoise water, and the energy of Ocean Drive steps away.' },
        { time: '8:00 PM', name: 'Joe\'s Stone Crab', type: 'Dining', desc: 'A Miami institution since 1913. The legendary stone crab claws, key lime pie, and the most iconic restaurant in South Beach.' },
      ],
    },
    {
      day: 3,
      title: 'Culture & Nightlife',
      stops: [
        { time: '10:00 AM', name: 'Perez Art Museum Miami', type: 'Culture', desc: 'Waterfront contemporary art museum overlooking Biscayne Bay. Hanging gardens, Herzog & de Meuron architecture, and world-class exhibitions.' },
        { time: '12:30 PM', name: 'Mandolin Aegean Bistro', type: 'Dining', desc: 'Hidden Mediterranean gem in the Design District. Outdoor garden dining with Turkish and Greek flavors in a bungalow courtyard.' },
        { time: '3:00 PM', name: 'Key Biscayne Beach', type: 'Beach', desc: 'Pristine beach away from the crowds. Crandon Park with calm waters, nature trails, and views of the Miami skyline across the bay.' },
        { time: '6:00 PM', name: 'Swan Miami', type: 'Dining', desc: 'Pharrell\'s Design District restaurant with David Grutman. Mediterranean-meets-Miami cuisine, bold interiors, and rooftop with skyline views.' },
        { time: '10:00 PM', name: 'E11EVEN Miami', type: 'Nightlife', desc: '24-hour ultraclub in downtown Miami. The wildest nightlife venue in America — cirque performances, world-class DJs, and non-stop energy.' },
      ],
    },
  ],
};

const losAngeles: WCPartner = {
  slug: 'los-angeles',
  partnerType: 'city',
  partnerName: 'Discover Los Angeles',
  city: 'Los Angeles',
  venue: 'SoFi Stadium',
  tagline: '3 days of stadium action, Hollywood glamour, and Pacific sunsets',
  heroSubtitle: 'Help millions of World Cup visitors navigate LA with interactive city guides — from SoFi Stadium to Santa Monica Pier.',
  days: [
    {
      day: 1,
      title: 'Match Day',
      stops: [
        { time: '10:00 AM', name: 'The Beverly Hills Hotel', type: 'Hotel', desc: 'The Pink Palace on Sunset Boulevard since 1912. Where every celebrity has stayed — banana leaf wallpaper, pool cabanas, and legendary Polo Lounge.' },
        { time: '1:00 PM', name: 'SoFi Stadium', type: 'Match', desc: 'The most expensive stadium ever built — $5.5 billion. 70,000 seats with an oculus video board the size of a football field.' },
        { time: '5:30 PM', name: 'LA Live Fan Festival', type: 'Fan Zone', desc: 'Official FIFA Fan Fest at the downtown entertainment district. Giant screens, food trucks, and 40,000 fans outside Crypto.com Arena.' },
        { time: '8:00 PM', name: 'Bestia', type: 'Dining', desc: 'Industrial-chic Italian in the Arts District. Handmade pasta, whole-animal cooking, and the hardest reservation in LA.' },
        { time: '11:00 PM', name: 'Highlight Room', type: 'Nightlife', desc: 'Rooftop pool bar at the Dream Hollywood. Panoramic views of the Hollywood sign, craft cocktails, and the city lights below.' },
      ],
    },
    {
      day: 2,
      title: 'City Exploration',
      stops: [
        { time: '9:00 AM', name: 'Griffith Observatory', type: 'Experience', desc: 'Iconic hilltop observatory overlooking all of LA. Free admission, planetarium shows, and the best panoramic views of the city and Hollywood sign.' },
        { time: '11:30 AM', name: 'The Getty Center', type: 'Culture', desc: 'Richard Meier\'s hilltop masterpiece. World-class art collection, architecture, and gardens with views from the mountains to the Pacific.' },
        { time: '1:30 PM', name: 'Grand Central Market', type: 'Dining', desc: 'Historic downtown food hall since 1917. Eggslut, Tacos Tumbras a Tomas, and 40+ vendors under one roof.' },
        { time: '4:00 PM', name: 'Venice Beach Boardwalk', type: 'Beach', desc: 'Muscle Beach, street performers, skate parks, and the bohemian heart of LA. A 2.5-mile ocean-front walk of pure culture.' },
        { time: '7:30 PM', name: 'Nobu Malibu', type: 'Dining', desc: 'The original oceanfront Nobu on Carbon Beach. Japanese-Peruvian omakase with waves crashing under your table.' },
      ],
    },
    {
      day: 3,
      title: 'Culture & Content',
      stops: [
        { time: '10:00 AM', name: 'The Broad', type: 'Culture', desc: 'Contemporary art museum with Kusama\'s Infinity Mirrored Room, Koons, and Basquiat. Free admission, iconic architecture.' },
        { time: '12:00 PM', name: 'Rodeo Drive', type: 'Shopping', desc: 'The most famous luxury shopping street in the world. 3 blocks of Chanel, Gucci, Tiffany, and the iconic Beverly Wilshire hotel.' },
        { time: '2:30 PM', name: 'Catch LA', type: 'Dining', desc: 'Rooftop seafood restaurant with sweeping views of West Hollywood. Asian-influenced dishes, vegan options, and LA\'s chicest outdoor dining.' },
        { time: '5:00 PM', name: 'Santa Monica Pier', type: 'Experience', desc: 'Iconic Pacific pier with Pacific Park, ferris wheel, and the best sunset in LA. End of Route 66 and the ultimate California photo moment.' },
        { time: '9:00 PM', name: 'Skybar at Mondrian', type: 'Nightlife', desc: 'Legendary poolside lounge on the Sunset Strip. Where Hollywood comes to see and be seen — white curtains, palm trees, and velvet ropes.' },
      ],
    },
  ],
};

const newYork: WCPartner = {
  slug: 'new-york',
  partnerType: 'city',
  partnerName: 'NYC Tourism',
  city: 'New York',
  venue: 'MetLife Stadium',
  tagline: '3 days of world-class matches, Manhattan energy, and Brooklyn cool',
  heroSubtitle: 'Help millions of World Cup visitors navigate NYC with interactive city guides — from MetLife Stadium to Times Square.',
  days: [
    {
      day: 1,
      title: 'Match Day',
      stops: [
        { time: '10:00 AM', name: 'The Plaza Hotel', type: 'Hotel', desc: 'Iconic 5-star at the corner of Central Park. The most famous hotel in America since 1907 — gold leaf, crystal chandeliers, and the Palm Court.' },
        { time: '1:00 PM', name: 'MetLife Stadium', type: 'Match', desc: 'The largest venue in the 2026 World Cup — 82,500 seats. Hosting group stages, Round of 16, quarterfinals, and the semifinal.' },
        { time: '5:30 PM', name: 'Times Square FIFA Fan Fest', type: 'Fan Zone', desc: 'Official FIFA Fan Festival in the heart of Manhattan. Giant LED screens, live performances, and the energy of 50,000+ fans.' },
        { time: '8:00 PM', name: 'Peter Luger Steak House', type: 'Dining', desc: 'Brooklyn\'s legendary steakhouse since 1887. Cash-only, no-frills, and the best porterhouse steak in America. Period.' },
        { time: '11:00 PM', name: 'Marquee New York', type: 'Nightlife', desc: 'Chelsea\'s premier nightclub. Two floors, world-class DJs, and the kind of NYC nightlife that makes headlines.' },
      ],
    },
    {
      day: 2,
      title: 'Manhattan Exploration',
      stops: [
        { time: '9:00 AM', name: 'Statue of Liberty & Ellis Island', type: 'Experience', desc: 'The most iconic landmark in America. Crown access, museum tour, and the skyline ferry ride that every visitor must experience.' },
        { time: '12:00 PM', name: 'The High Line', type: 'Culture', desc: 'Elevated park on former railway tracks through Chelsea. Public art, gardens, and views of the Hudson River from 30 feet above the streets.' },
        { time: '1:30 PM', name: 'Chelsea Market', type: 'Dining', desc: 'Artisan food hall in the Meatpacking District. Los Tacos No. 1, Lobster Place, and Doughnuttery under one historic roof.' },
        { time: '4:00 PM', name: 'Central Park', type: 'Experience', desc: '843 acres in the heart of Manhattan. Bethesda Fountain, Bow Bridge, the Reservoir, and the Ramble — an entire world within the city.' },
        { time: '7:30 PM', name: 'Le Bernardin', type: 'Dining', desc: '3 Michelin stars. The pinnacle of seafood in America. Chef Eric Ripert\'s tasting menu is a once-in-a-lifetime culinary experience.' },
      ],
    },
    {
      day: 3,
      title: 'Brooklyn & Beyond',
      stops: [
        { time: '9:30 AM', name: 'DUMBO', type: 'Experience', desc: 'Brooklyn\'s waterfront neighborhood with the iconic Manhattan Bridge view. Cobblestone streets, Jane\'s Carousel, and the Brooklyn Bridge Park.' },
        { time: '11:30 AM', name: 'Smorgasburg', type: 'Dining', desc: 'Brooklyn\'s legendary outdoor food market — 100+ vendors. The best food market in America, every Saturday and Sunday on the Williamsburg waterfront.' },
        { time: '2:00 PM', name: 'Brooklyn Bridge Walk', type: 'Experience', desc: 'Walk the 1.1-mile iconic suspension bridge from Brooklyn to Manhattan. Possibly the most photographed bridge in the world.' },
        { time: '5:00 PM', name: 'Balthazar', type: 'Dining', desc: 'SoHo\'s iconic French brasserie since 1997. Steak frites, raw bar, and the bustling Parisian energy that defines downtown dining.' },
        { time: '9:00 PM', name: 'Brooklyn Mirage', type: 'Nightlife', desc: 'NYC\'s premier outdoor mega-venue in East Williamsburg. Open-air dance floor, world-class DJs, and 5,000-person capacity under the stars.' },
      ],
    },
  ],
};

const dallas: WCPartner = {
  slug: 'dallas',
  partnerType: 'city',
  partnerName: 'Visit Dallas',
  city: 'Dallas',
  venue: 'AT&T Stadium',
  tagline: '3 days of Texas-sized matches, BBQ, and cowboy culture',
  heroSubtitle: 'Help millions of World Cup visitors navigate Dallas with interactive city guides — from AT&T Stadium to Deep Ellum.',
  days: [
    {
      day: 1,
      title: 'Match Day',
      stops: [
        { time: '10:00 AM', name: 'The Adolphus Hotel', type: 'Hotel', desc: 'Historic Beaux-Arts luxury in downtown Dallas since 1912. Ornate lobby, rooftop pool, and the grandeur of old Texas hospitality.' },
        { time: '1:00 PM', name: 'AT&T Stadium', type: 'Match', desc: '80,000-seat mega-venue in Arlington. Home of the Dallas Cowboys and the world\'s largest column-free interior with a 160-foot video board.' },
        { time: '5:30 PM', name: 'Klyde Warren Park Fan Zone', type: 'Fan Zone', desc: 'Official FIFA Fan Fest on the urban deck park over a freeway. Food trucks, live screens, and the energy of downtown Dallas.' },
        { time: '8:00 PM', name: 'Pecan Lodge', type: 'Dining', desc: 'The best BBQ in Dallas, period. Legendary brisket, beef ribs, and the Hot Mess — a loaded baked potato that changed the game.' },
        { time: '10:30 PM', name: 'Happiest Hour', type: 'Nightlife', desc: 'Dallas\'s largest outdoor patio bar in Uptown. 3 levels, frozen cocktails, and a rooftop with skyline views. The ultimate post-match hangout.' },
      ],
    },
    {
      day: 2,
      title: 'City Exploration',
      stops: [
        { time: '9:30 AM', name: 'Dallas Arboretum', type: 'Experience', desc: '66-acre botanical garden on the shores of White Rock Lake. Seasonal gardens, the Rory Meyers Children\'s Garden, and lakeside views.' },
        { time: '12:00 PM', name: 'Bishop Arts District', type: 'Explore', desc: 'Eclectic neighborhood in Oak Cliff with indie shops, galleries, murals, and some of the best tacos in Texas.' },
        { time: '2:30 PM', name: 'Uchi Dallas', type: 'Dining', desc: 'Award-winning Japanese farmhouse dining by Tyson Cole. Creative sushi, hot pots, and the best omakase experience in Dallas.' },
        { time: '5:00 PM', name: 'Reunion Tower GeO-Deck', type: 'Experience', desc: '470-foot observation deck with 360-degree views of the Dallas skyline. Interactive displays and the iconic ball-shaped tower.' },
        { time: '8:00 PM', name: 'The Mansion on Turtle Creek', type: 'Dining', desc: 'Dallas\'s most legendary fine dining in a restored 1920s Sheppard King estate. The tortilla soup alone is worth the trip.' },
      ],
    },
    {
      day: 3,
      title: 'Deep Ellum & Culture',
      stops: [
        { time: '10:00 AM', name: 'Nasher Sculpture Center', type: 'Culture', desc: 'Renzo Piano-designed museum in the Arts District. World-class sculpture collection and a serene garden in the middle of downtown.' },
        { time: '12:00 PM', name: 'Deep Ellum', type: 'Explore', desc: 'Dallas\'s art and music district. 40+ murals, live music venues, vintage shops, and the creative soul of the city.' },
        { time: '2:00 PM', name: 'Terry Black\'s BBQ', type: 'Dining', desc: 'Classic Texas BBQ in Deep Ellum. Post oak-smoked brisket, house-made sausage, and all the fixings on the patio.' },
        { time: '4:30 PM', name: 'Katy Trail', type: 'Experience', desc: '3.5-mile urban trail through Uptown Dallas. Jogging, biking, and a cold beer at the Katy Trail Ice House at the end.' },
        { time: '8:00 PM', name: 'Midnight Rambler', type: 'Nightlife', desc: 'Speakeasy-style cocktail bar beneath The Joule Hotel. Craft cocktails, vintage decor, and live music in a subterranean lounge.' },
      ],
    },
  ],
};

const houston: WCPartner = {
  slug: 'houston',
  partnerType: 'city',
  partnerName: 'Visit Houston',
  city: 'Houston',
  venue: 'NRG Stadium',
  tagline: '3 days of match-day excitement, Space City culture, and world-class dining',
  heroSubtitle: 'Help millions of World Cup visitors navigate Houston with interactive city guides — from NRG Stadium to the Museum District.',
  days: [
    {
      day: 1,
      title: 'Match Day',
      stops: [
        { time: '10:00 AM', name: 'Hotel Granduca Houston', type: 'Hotel', desc: 'Italian Renaissance villa in the Uptown/Galleria area. Old-world European elegance, courtyard gardens, and Ristorante Cavour.' },
        { time: '1:00 PM', name: 'NRG Stadium', type: 'Match', desc: '72,000-seat retractable-roof venue. Climate-controlled comfort in Houston\'s heat — one of the most advanced stadiums in the World Cup.' },
        { time: '5:30 PM', name: 'Discovery Green Fan Zone', type: 'Fan Zone', desc: 'Official FIFA Fan Fest at the 12-acre downtown park. Giant screens, food vendors, and the multicultural energy of America\'s most diverse city.' },
        { time: '8:00 PM', name: 'Underbelly Hospitality', type: 'Dining', desc: 'James Beard Award-winning Houston cuisine by Chris Shepherd. The story of Houston told through food — every dish celebrates a different immigrant community.' },
        { time: '11:00 PM', name: 'Clé Houston', type: 'Nightlife', desc: 'Massive open-air nightclub complex in Midtown. Multiple rooms, world-class DJs, and Houston\'s biggest post-match party destination.' },
      ],
    },
    {
      day: 2,
      title: 'Space City Exploration',
      stops: [
        { time: '9:00 AM', name: 'Space Center Houston', type: 'Experience', desc: 'NASA\'s official visitor center. Touch a real moon rock, tour Mission Control, see the Space Shuttle replica, and walk under a Saturn V rocket.' },
        { time: '12:30 PM', name: 'Museum District', type: 'Culture', desc: '19 museums in one walkable district. The Museum of Fine Arts, Contemporary Arts Museum, and Holocaust Museum — all within blocks of each other.' },
        { time: '2:30 PM', name: 'Xochi', type: 'Dining', desc: 'Oaxacan-inspired fine dining by James Beard winner Hugo Ortega. Mole negro, chocolate, and mezcal in the most beautiful restaurant in Houston.' },
        { time: '5:00 PM', name: 'Buffalo Bayou Park', type: 'Experience', desc: '160-acre waterfront park along the bayou. Kayaking, bike paths, the Cistern underground art space, and sunset views of the skyline.' },
        { time: '8:00 PM', name: 'Pappas Bros Steakhouse', type: 'Dining', desc: 'Prime dry-aged steaks in a classic American steakhouse. 45-day aged USDA Prime, legendary sides, and an award-winning wine list.' },
      ],
    },
    {
      day: 3,
      title: 'Culture & Heights',
      stops: [
        { time: '10:00 AM', name: 'Menil Collection', type: 'Culture', desc: 'World-class free art museum with Warhol, Magritte, and Ernst. The nearby Rothko Chapel is one of the most contemplative spaces in America.' },
        { time: '12:00 PM', name: 'Heights District', type: 'Explore', desc: 'Historic neighborhood with Victorian homes, vintage shops, craft breweries, and the 19th Street shopping corridor.' },
        { time: '2:00 PM', name: 'Truth BBQ', type: 'Dining', desc: 'Houston\'s BBQ sensation. James Beard semifinalist brisket, loaded baked potatoes, and banana pudding that sells out daily.' },
        { time: '4:30 PM', name: 'Saint Arnold Brewing', type: 'Experience', desc: 'Texas\'s oldest craft brewery. Tours, tastings, and a massive beer garden — the perfect afternoon hangout in the Houston heat.' },
        { time: '8:00 PM', name: 'Present Company', type: 'Nightlife', desc: 'Craft cocktail bar in Montrose, Houston\'s most eclectic neighborhood. Inventive drinks, moody lighting, and a curated vinyl soundtrack.' },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// BRANDS — World Cup Sponsor/Activation Partners
// ---------------------------------------------------------------------------

const adidas: WCPartner = {
  slug: 'adidas',
  partnerType: 'brand',
  partnerName: 'Adidas',
  city: 'New York',
  venue: 'MetLife Stadium',
  tagline: '3 days of Adidas x FIFA activation across Manhattan and Brooklyn',
  heroSubtitle: 'Give your creators an interactive World Cup activation guide — built around Adidas\'s role as the official FIFA partner.',
  days: [
    {
      day: 1,
      title: 'Brand Activation',
      stops: [
        { time: '10:00 AM', name: 'Adidas NYC Flagship', type: 'Experience', desc: '5th Avenue flagship — 4 floors of customization, creator studios, and the latest World Cup boot releases. Your creators\' home base.' },
        { time: '1:00 PM', name: 'MetLife Stadium VIP Suite', type: 'Match', desc: 'Private Adidas suite at the 82,500-seat venue. Group Stage viewing with hospitality, behind-the-scenes access, and pitch-side warmup views.' },
        { time: '5:00 PM', name: 'Times Square FIFA Fan Zone', type: 'Fan Zone', desc: 'Adidas activation tent at the official FIFA Fan Fest. Custom boot personalization, jersey printing, and photo moments for 50,000 fans.' },
        { time: '8:00 PM', name: 'Carbone', type: 'Dining', desc: 'NYC\'s hottest Italian restaurant in Greenwich Village. Red-sauce classics, tableside Caesar, and the veal parm that launched a thousand Instagrams.' },
        { time: '11:00 PM', name: 'The Standard Rooftop', type: 'Nightlife', desc: 'Le Bain rooftop at The Standard, High Line. Panoramic views, DJs, and a plunge pool — the ultimate NYC after-party.' },
      ],
    },
    {
      day: 2,
      title: 'Content Creation',
      stops: [
        { time: '7:00 AM', name: 'Brooklyn Bridge Sunrise', type: 'Experience', desc: 'Golden hour content on the iconic bridge before the crowds. Manhattan skyline, DUMBO cobblestones, and the best natural light in NYC.' },
        { time: '10:00 AM', name: 'Adidas Creators Hub', type: 'Experience', desc: 'Pop-up creator studio in SoHo. Custom World Cup kit design, boot wall, content production suite, and athlete meet-and-greets.' },
        { time: '1:00 PM', name: 'The Mercer Kitchen', type: 'Dining', desc: 'Jean-Georges\' underground restaurant in the heart of SoHo. Industrial-chic dining beneath the legendary Mercer Hotel.' },
        { time: '3:30 PM', name: 'Governors Island', type: 'Experience', desc: 'Car-free island in New York Harbor. Manhattan skyline views, art installations, and the Hills — a sculptural landscape 70 feet above the bay.' },
        { time: '8:00 PM', name: 'Beauty & Essex', type: 'Nightlife', desc: 'Lower East Side speakeasy hidden behind a pawn shop. Small plates, craft cocktails, and the kind of secret entrance that makes great content.' },
      ],
    },
    {
      day: 3,
      title: 'VIP & Culture',
      stops: [
        { time: '9:30 AM', name: 'MoMA', type: 'Culture', desc: 'Museum of Modern Art — private early-access tour. Starry Night, Warhol, and the sculpture garden before the public arrives.' },
        { time: '12:00 PM', name: 'Via Carota', type: 'Dining', desc: 'West Village\'s beloved Italian trattoria. Garden dining, handmade pasta, and the cacio e pepe that every food creator posts about.' },
        { time: '3:00 PM', name: 'Hudson River Sunset Cruise', type: 'Experience', desc: 'Private boat along the Hudson at golden hour. Statue of Liberty, Brooklyn Bridge, and the Manhattan skyline from the water.' },
        { time: '6:30 PM', name: 'Eleven Madison Park', type: 'Dining', desc: 'Formerly the world\'s #1 restaurant. Multi-course tasting menu in a stunning Art Deco space overlooking Madison Square Park.' },
        { time: '10:00 PM', name: 'Up&Down', type: 'Nightlife', desc: 'Celebrity-filled two-floor club in the West Village. Rihanna, Drake, and every major athlete have been spotted here.' },
      ],
    },
  ],
};

const nike: WCPartner = {
  slug: 'nike',
  partnerType: 'brand',
  partnerName: 'Nike',
  city: 'Los Angeles',
  venue: 'SoFi Stadium',
  tagline: '3 days of Nike World Cup activation across LA\'s most iconic spots',
  heroSubtitle: 'Give your creators an interactive World Cup activation guide — designed for Nike\'s bold, athlete-first energy in Los Angeles.',
  days: [
    {
      day: 1,
      title: 'Brand Activation',
      stops: [
        { time: '10:00 AM', name: 'Nike LA Flagship', type: 'Experience', desc: 'Melrose Avenue flagship — 3 floors of innovation, customization studios, and the latest World Cup national team kits on display.' },
        { time: '1:00 PM', name: 'SoFi Stadium VIP Suite', type: 'Match', desc: 'Private Nike suite at the $5.5B mega-venue. Group Stage match viewing, behind-the-scenes tunnel access, and pitch-level hospitality.' },
        { time: '5:30 PM', name: 'LA Live Fan Festival', type: 'Fan Zone', desc: 'Nike activation zone at the official FIFA Fan Fest. Jersey customization, penalty shootout challenge, and athlete appearances.' },
        { time: '8:30 PM', name: 'Catch LA', type: 'Dining', desc: 'Rooftop seafood restaurant with sweeping views of West Hollywood. Sushi, truffle fries, and LA\'s most Instagram-worthy outdoor dining.' },
        { time: '11:00 PM', name: 'Highlight Room Grill', type: 'Nightlife', desc: 'Rooftop pool bar at Dream Hollywood. Hollywood sign views, bottle service, and the post-match afterparty scene.' },
      ],
    },
    {
      day: 2,
      title: 'Content Creation',
      stops: [
        { time: '7:30 AM', name: 'Venice Beach', type: 'Beach', desc: 'Muscle Beach workout, ocean-front run, and the boardwalk at golden hour. The ultimate Nike content location — sport meets culture.' },
        { time: '10:30 AM', name: 'Nike Creators Lounge', type: 'Experience', desc: 'Pop-up creator space in the Arts District. Custom World Cup kits, athlete photography sessions, and a content production studio.' },
        { time: '1:00 PM', name: 'Gjelina', type: 'Dining', desc: 'Venice\'s most sought-after restaurant. Wood-fired California cuisine, market-driven menu, and an effortlessly cool patio scene.' },
        { time: '4:00 PM', name: 'LACMA Urban Lights', type: 'Culture', desc: 'Chris Burden\'s iconic 202-lamp installation. The most photographed art piece in LA — golden hour here is content gold.' },
        { time: '8:00 PM', name: 'Soho House West Hollywood', type: 'Nightlife', desc: 'Private members club on Sunset. Rooftop pool, screening room, and the creative industry\'s unofficial living room.' },
      ],
    },
    {
      day: 3,
      title: 'VIP & Closing',
      stops: [
        { time: '8:00 AM', name: 'Runyon Canyon', type: 'Adventure', desc: 'LA\'s most famous hike. Hollywood sign views, canyon trails, and the morning workout that every creator in LA has posted.' },
        { time: '11:00 AM', name: 'The Getty Villa', type: 'Culture', desc: 'Roman-inspired art museum overlooking the Pacific in Malibu. Ancient artifacts, manicured gardens, and coastal views.' },
        { time: '1:30 PM', name: 'Providence', type: 'Dining', desc: '2 Michelin stars. The finest seafood in Los Angeles. Chef Michael Cimarusti\'s tasting menu is LA fine dining at its best.' },
        { time: '5:00 PM', name: 'Santa Monica Pier Sunset', type: 'Experience', desc: 'Golden hour at the iconic Pacific pier. Ferris wheel, ocean views, and the end of Route 66 — LA\'s ultimate closing shot.' },
        { time: '9:00 PM', name: 'Skybar at Mondrian', type: 'Nightlife', desc: 'The legendary poolside lounge on Sunset Strip. White curtains, palm trees, city lights, and the farewell party LA deserves.' },
      ],
    },
  ],
};

const cocaCola: WCPartner = {
  slug: 'coca-cola',
  partnerType: 'brand',
  partnerName: 'Coca-Cola',
  city: 'Miami',
  venue: 'Hard Rock Stadium',
  tagline: '3 days of Coca-Cola World Cup activation across Miami\'s best venues',
  heroSubtitle: 'Give your creators an interactive World Cup activation guide — capturing Coca-Cola\'s global energy in the heart of Miami.',
  days: [
    {
      day: 1,
      title: 'Brand Activation',
      stops: [
        { time: '11:00 AM', name: 'Faena Hotel Miami Beach', type: 'Hotel', desc: 'Art-deco luxury on Collins Avenue. Gold-leaf Faena Theater, mammoth by Damien Hirst in the lobby, and a private beach.' },
        { time: '2:00 PM', name: 'Hard Rock Stadium VIP Suite', type: 'Match', desc: 'Premium Coca-Cola suite at the 65,000-seat venue. Group Stage match with full hospitality, lounge access, and branded activations.' },
        { time: '5:30 PM', name: 'Bayfront Park FIFA Fan Fest', type: 'Fan Zone', desc: 'Coca-Cola activation at the official Fan Festival on Biscayne Bay. Custom bottle station, photo moments, and sampling for 30,000+ fans.' },
        { time: '8:30 PM', name: 'Cvi.che 105', type: 'Dining', desc: 'Downtown Miami\'s legendary Peruvian restaurant. The best ceviche in Florida, tiraditos, and pisco sours in a vibrant setting.' },
        { time: '11:00 PM', name: 'LIV Miami', type: 'Nightlife', desc: 'The most iconic nightclub in America, inside the Fontainebleau. The official Coca-Cola World Cup after-party destination.' },
      ],
    },
    {
      day: 2,
      title: 'Content Creation',
      stops: [
        { time: '9:00 AM', name: 'Wynwood Walls', type: 'Experience', desc: 'World-famous street art museum — Coca-Cola mural activation with custom World Cup artwork by local artists.' },
        { time: '11:30 AM', name: 'Coca-Cola Creator Lounge', type: 'Experience', desc: 'Pop-up creator space in the Design District. Custom Coca-Cola x World Cup bottles, content studio, and mixology bar.' },
        { time: '1:30 PM', name: 'Mandolin Aegean Bistro', type: 'Dining', desc: 'Hidden Mediterranean garden restaurant in the Design District. Turkish and Greek flavors in a bungalow courtyard.' },
        { time: '4:00 PM', name: 'South Beach Art Deco Walk', type: 'Culture', desc: 'Guided walk along Ocean Drive\'s iconic pastel Art Deco buildings. 800+ preserved buildings from the 1930s — the most Instagrammed strip in Miami.' },
        { time: '7:30 PM', name: 'The Surf Club Restaurant', type: 'Dining', desc: 'Thomas Keller\'s oceanfront restaurant at the Four Seasons. French-American fine dining in a restored 1930s beach club.' },
      ],
    },
    {
      day: 3,
      title: 'VIP & Culture',
      stops: [
        { time: '9:30 AM', name: 'Key Biscayne Beach', type: 'Beach', desc: 'Pristine morning beach session away from the South Beach crowds. Crandon Park — calm waters, nature trails, and skyline views.' },
        { time: '12:00 PM', name: 'Vizcaya Museum', type: 'Culture', desc: 'Italian Renaissance villa on Biscayne Bay. 34-room mansion, formal gardens, and one of the most stunning estates in America.' },
        { time: '2:30 PM', name: 'KYU Miami', type: 'Dining', desc: 'Wood-fired Asian cuisine in Wynwood. Coconut tiger prawns, whole roasted cauliflower, and cocktails in an open-air warehouse.' },
        { time: '5:00 PM', name: 'Little Havana', type: 'Culture', desc: 'Walking tour of Calle Ocho — domino park, cigar rolling, Cuban coffee, and the cultural heartbeat of Miami\'s Cuban community.' },
        { time: '9:00 PM', name: 'E11EVEN Miami', type: 'Nightlife', desc: '24-hour ultraclub in downtown. The farewell party to end all farewell parties — performances, DJs, and non-stop Miami energy.' },
      ],
    },
  ],
};

const budweiser: WCPartner = {
  slug: 'budweiser',
  partnerType: 'brand',
  partnerName: 'Budweiser',
  city: 'Houston',
  venue: 'NRG Stadium',
  tagline: '3 days of Budweiser World Cup activation across Houston\'s best venues',
  heroSubtitle: 'Give your creators an interactive World Cup activation guide — built around Budweiser\'s bold, all-American energy in Houston.',
  days: [
    {
      day: 1,
      title: 'Brand Activation',
      stops: [
        { time: '10:00 AM', name: 'Hotel Granduca Houston', type: 'Hotel', desc: 'Italian Renaissance villa in the Uptown district. Old-world European elegance, courtyard gardens, and Ristorante Cavour.' },
        { time: '1:00 PM', name: 'NRG Stadium VIP Suite', type: 'Match', desc: 'Budweiser premium suite at the 72,000-seat retractable-roof venue. Match viewing with full hospitality and branded experiences.' },
        { time: '5:30 PM', name: 'Discovery Green Fan Zone', type: 'Fan Zone', desc: 'Budweiser activation at the FIFA Fan Fest. Beer garden, live music stage, and sampling for thousands of fans in downtown Houston.' },
        { time: '8:00 PM', name: 'Killen\'s Steakhouse', type: 'Dining', desc: 'Legendary Texas steakhouse in Pearland. USDA Prime beef, Wagyu options, and the most celebrated steaks in the Houston area.' },
        { time: '11:00 PM', name: 'Clé Houston', type: 'Nightlife', desc: 'Massive open-air nightclub complex in Midtown. Multiple rooms, a pool, and Houston\'s biggest post-match party venue.' },
      ],
    },
    {
      day: 2,
      title: 'Content Creation',
      stops: [
        { time: '10:00 AM', name: 'Saint Arnold Brewing', type: 'Experience', desc: 'Texas\'s oldest craft brewery — Budweiser x Saint Arnold creator collaboration. Brewery tours, beer tastings, and a massive beer garden.' },
        { time: '12:30 PM', name: 'Budweiser Creator Lounge', type: 'Experience', desc: 'Pop-up creator space in EaDo (East Downtown). Custom Bud x World Cup content studio, sampling bar, and photo activations.' },
        { time: '2:30 PM', name: 'Xochi', type: 'Dining', desc: 'Oaxacan-inspired fine dining by James Beard winner Hugo Ortega. Mole negro, chocolate desserts, and mezcal pairings.' },
        { time: '5:00 PM', name: 'Buffalo Bayou Park Cistern', type: 'Culture', desc: 'Underground art space in a 1920s drinking water reservoir. 87,500 sq ft of immersive installations in a cavernous, column-lined space.' },
        { time: '8:00 PM', name: 'Johnny\'s Gold Brick', type: 'Nightlife', desc: 'Intimate craft cocktail bar in the Heights. Classic and inventive cocktails in a vintage-inspired space with a hidden patio.' },
      ],
    },
    {
      day: 3,
      title: 'VIP & Farewell',
      stops: [
        { time: '9:30 AM', name: 'Hermann Park', type: 'Experience', desc: '445-acre park in the heart of the Museum District. Japanese Garden, Miller Outdoor Theatre, and the iconic reflection pool.' },
        { time: '12:00 PM', name: 'Menil Collection', type: 'Culture', desc: 'World-class free art museum — Warhol, Magritte, Max Ernst. The nearby Rothko Chapel is one of the most contemplative spaces in America.' },
        { time: '2:00 PM', name: 'Truth BBQ', type: 'Dining', desc: 'Houston\'s BBQ sensation and James Beard semifinalist. Brisket, loaded baked potatoes, and banana pudding — get there before it sells out.' },
        { time: '5:00 PM', name: 'Bravery Chef Hall', type: 'Dining', desc: 'Gourmet food hall in downtown Houston. 8 chef-driven concepts under one roof — from Vietnamese pho to Neapolitan pizza.' },
        { time: '8:30 PM', name: 'Present Company', type: 'Nightlife', desc: 'Craft cocktails in Montrose. Inventive drinks, vinyl records, and the moody, creative vibe of Houston\'s most eclectic neighborhood.' },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Export all partners keyed by slug
// ---------------------------------------------------------------------------
export const WC_PARTNERS: Record<string, WCPartner> = {
  miami,
  'los-angeles': losAngeles,
  'new-york': newYork,
  dallas,
  houston,
  adidas,
  nike,
  'coca-cola': cocaCola,
  budweiser,
};

// All host cities for the generic landing page
export const HOST_CITIES = [
  { city: 'Miami', state: 'Florida', venue: 'Hard Rock Stadium' },
  { city: 'Los Angeles', state: 'California', venue: 'SoFi Stadium' },
  { city: 'New York', state: 'New Jersey', venue: 'MetLife Stadium' },
  { city: 'Dallas', state: 'Texas', venue: 'AT&T Stadium' },
  { city: 'Houston', state: 'Texas', venue: 'NRG Stadium' },
  { city: 'Atlanta', state: 'Georgia', venue: 'Mercedes-Benz Stadium' },
  { city: 'Philadelphia', state: 'Pennsylvania', venue: 'Lincoln Financial Field' },
  { city: 'Seattle', state: 'Washington', venue: 'Lumen Field' },
  { city: 'San Francisco', state: 'California', venue: 'Levi\'s Stadium' },
  { city: 'Kansas City', state: 'Missouri', venue: 'Arrowhead Stadium' },
  { city: 'Boston', state: 'Massachusetts', venue: 'Gillette Stadium' },
];
