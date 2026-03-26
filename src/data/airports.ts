export interface Airport {
  iata: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
}

export const AIRPORTS: Airport[] = [
  // ─── United States ───────────────────────────────────────────────
  { iata: 'JFK', name: 'John F. Kennedy International', city: 'New York', country: 'US', lat: 40.6413, lng: -73.7781 },
  { iata: 'EWR', name: 'Newark Liberty International', city: 'Newark', country: 'US', lat: 40.6895, lng: -74.1745 },
  { iata: 'LGA', name: 'LaGuardia', city: 'New York', country: 'US', lat: 40.7769, lng: -73.8740 },
  { iata: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', country: 'US', lat: 33.9425, lng: -118.4081 },
  { iata: 'SFO', name: 'San Francisco International', city: 'San Francisco', country: 'US', lat: 37.6213, lng: -122.3790 },
  { iata: 'ORD', name: "O'Hare International", city: 'Chicago', country: 'US', lat: 41.9742, lng: -87.9073 },
  { iata: 'ATL', name: 'Hartsfield-Jackson Atlanta International', city: 'Atlanta', country: 'US', lat: 33.6407, lng: -84.4277 },
  { iata: 'MIA', name: 'Miami International', city: 'Miami', country: 'US', lat: 25.7959, lng: -80.2870 },
  { iata: 'DFW', name: 'Dallas/Fort Worth International', city: 'Dallas', country: 'US', lat: 32.8998, lng: -97.0403 },
  { iata: 'SEA', name: 'Seattle-Tacoma International', city: 'Seattle', country: 'US', lat: 47.4502, lng: -122.3088 },
  { iata: 'BOS', name: 'Boston Logan International', city: 'Boston', country: 'US', lat: 42.3656, lng: -71.0096 },
  { iata: 'DEN', name: 'Denver International', city: 'Denver', country: 'US', lat: 39.8561, lng: -104.6737 },
  { iata: 'IAH', name: 'George Bush Intercontinental', city: 'Houston', country: 'US', lat: 29.9902, lng: -95.3368 },
  { iata: 'IAD', name: 'Washington Dulles International', city: 'Washington', country: 'US', lat: 38.9531, lng: -77.4565 },
  { iata: 'DCA', name: 'Ronald Reagan Washington National', city: 'Washington', country: 'US', lat: 38.8512, lng: -77.0402 },
  { iata: 'PHL', name: 'Philadelphia International', city: 'Philadelphia', country: 'US', lat: 39.8744, lng: -75.2424 },
  { iata: 'MSP', name: 'Minneapolis-Saint Paul International', city: 'Minneapolis', country: 'US', lat: 44.8848, lng: -93.2223 },
  { iata: 'DTW', name: 'Detroit Metropolitan Wayne County', city: 'Detroit', country: 'US', lat: 42.2124, lng: -83.3534 },
  { iata: 'CLT', name: 'Charlotte Douglas International', city: 'Charlotte', country: 'US', lat: 35.2140, lng: -80.9431 },
  { iata: 'MCO', name: 'Orlando International', city: 'Orlando', country: 'US', lat: 28.4312, lng: -81.3081 },
  { iata: 'FLL', name: 'Fort Lauderdale-Hollywood International', city: 'Fort Lauderdale', country: 'US', lat: 26.0742, lng: -80.1506 },
  { iata: 'SAN', name: 'San Diego International', city: 'San Diego', country: 'US', lat: 32.7338, lng: -117.1933 },
  { iata: 'TPA', name: 'Tampa International', city: 'Tampa', country: 'US', lat: 27.9755, lng: -82.5332 },
  { iata: 'PDX', name: 'Portland International', city: 'Portland', country: 'US', lat: 45.5898, lng: -122.5951 },
  { iata: 'BWI', name: 'Baltimore/Washington International', city: 'Baltimore', country: 'US', lat: 39.1754, lng: -76.6684 },
  { iata: 'SLC', name: 'Salt Lake City International', city: 'Salt Lake City', country: 'US', lat: 40.7899, lng: -111.9791 },
  { iata: 'HNL', name: 'Daniel K. Inouye International', city: 'Honolulu', country: 'US', lat: 21.3187, lng: -157.9225 },
  { iata: 'AUS', name: 'Austin-Bergstrom International', city: 'Austin', country: 'US', lat: 30.1975, lng: -97.6664 },
  { iata: 'MSY', name: 'Louis Armstrong New Orleans International', city: 'New Orleans', country: 'US', lat: 29.9934, lng: -90.2580 },
  { iata: 'RDU', name: 'Raleigh-Durham International', city: 'Raleigh', country: 'US', lat: 35.8801, lng: -78.7880 },
  { iata: 'BNA', name: 'Nashville International', city: 'Nashville', country: 'US', lat: 36.1263, lng: -86.6774 },
  { iata: 'STL', name: 'St. Louis Lambert International', city: 'St. Louis', country: 'US', lat: 38.7487, lng: -90.3700 },
  { iata: 'ANC', name: 'Ted Stevens Anchorage International', city: 'Anchorage', country: 'US', lat: 61.1743, lng: -149.9963 },

  // ─── Canada ──────────────────────────────────────────────────────
  { iata: 'YYZ', name: 'Toronto Pearson International', city: 'Toronto', country: 'CA', lat: 43.6777, lng: -79.6248 },
  { iata: 'YVR', name: 'Vancouver International', city: 'Vancouver', country: 'CA', lat: 49.1967, lng: -123.1815 },
  { iata: 'YUL', name: 'Montréal-Trudeau International', city: 'Montreal', country: 'CA', lat: 45.4706, lng: -73.7408 },
  { iata: 'YOW', name: 'Ottawa Macdonald-Cartier International', city: 'Ottawa', country: 'CA', lat: 45.3225, lng: -75.6692 },
  { iata: 'YYC', name: 'Calgary International', city: 'Calgary', country: 'CA', lat: 51.1215, lng: -114.0076 },

  // ─── Mexico & Central America ────────────────────────────────────
  { iata: 'MEX', name: 'Mexico City International', city: 'Mexico City', country: 'MX', lat: 19.4363, lng: -99.0721 },
  { iata: 'CUN', name: 'Cancún International', city: 'Cancún', country: 'MX', lat: 21.0365, lng: -86.8771 },
  { iata: 'GDL', name: 'Guadalajara International', city: 'Guadalajara', country: 'MX', lat: 20.5218, lng: -103.3111 },
  { iata: 'SJO', name: 'Juan Santamaría International', city: 'San José', country: 'CR', lat: 9.9939, lng: -84.2088 },
  { iata: 'PTY', name: 'Tocumen International', city: 'Panama City', country: 'PA', lat: 9.0714, lng: -79.3835 },

  // ─── Caribbean ───────────────────────────────────────────────────
  { iata: 'SJU', name: 'Luis Muñoz Marín International', city: 'San Juan', country: 'PR', lat: 18.4394, lng: -66.0018 },
  { iata: 'NAS', name: 'Lynden Pindling International', city: 'Nassau', country: 'BS', lat: 25.0390, lng: -77.4662 },
  { iata: 'MBJ', name: 'Sangster International', city: 'Montego Bay', country: 'JM', lat: 18.5037, lng: -77.9134 },

  // ─── South America ───────────────────────────────────────────────
  { iata: 'GIG', name: 'Rio de Janeiro-Galeão International', city: 'Rio de Janeiro', country: 'BR', lat: -22.8100, lng: -43.2506 },
  { iata: 'GRU', name: 'São Paulo-Guarulhos International', city: 'São Paulo', country: 'BR', lat: -23.4356, lng: -46.4731 },
  { iata: 'EZE', name: 'Ministro Pistarini International', city: 'Buenos Aires', country: 'AR', lat: -34.8222, lng: -58.5358 },
  { iata: 'SCL', name: 'Arturo Merino Benítez International', city: 'Santiago', country: 'CL', lat: -33.3930, lng: -70.7858 },
  { iata: 'BOG', name: 'El Dorado International', city: 'Bogotá', country: 'CO', lat: 4.7016, lng: -74.1469 },
  { iata: 'CTG', name: 'Rafael Núñez International', city: 'Cartagena', country: 'CO', lat: 10.4424, lng: -75.5130 },
  { iata: 'LIM', name: 'Jorge Chávez International', city: 'Lima', country: 'PE', lat: -12.0219, lng: -77.1143 },
  { iata: 'UIO', name: 'Mariscal Sucre International', city: 'Quito', country: 'EC', lat: -0.1292, lng: -78.3575 },
  { iata: 'MVD', name: 'Carrasco International', city: 'Montevideo', country: 'UY', lat: -34.8384, lng: -56.0308 },
  { iata: 'CCS', name: 'Simón Bolívar International', city: 'Caracas', country: 'VE', lat: 10.6012, lng: -66.9912 },
  { iata: 'MDE', name: 'José María Córdova International', city: 'Medellín', country: 'CO', lat: 6.1645, lng: -75.4231 },

  // ─── United Kingdom & Ireland ────────────────────────────────────
  { iata: 'LHR', name: 'London Heathrow', city: 'London', country: 'GB', lat: 51.4700, lng: -0.4543 },
  { iata: 'LGW', name: 'London Gatwick', city: 'London', country: 'GB', lat: 51.1537, lng: -0.1821 },
  { iata: 'STN', name: 'London Stansted', city: 'London', country: 'GB', lat: 51.8860, lng: 0.2389 },
  { iata: 'MAN', name: 'Manchester', city: 'Manchester', country: 'GB', lat: 53.3537, lng: -2.2750 },
  { iata: 'EDI', name: 'Edinburgh', city: 'Edinburgh', country: 'GB', lat: 55.9500, lng: -3.3725 },
  { iata: 'DUB', name: 'Dublin', city: 'Dublin', country: 'IE', lat: 53.4264, lng: -6.2499 },

  // ─── France ──────────────────────────────────────────────────────
  { iata: 'CDG', name: 'Paris Charles de Gaulle', city: 'Paris', country: 'FR', lat: 49.0097, lng: 2.5479 },
  { iata: 'ORY', name: 'Paris Orly', city: 'Paris', country: 'FR', lat: 48.7233, lng: 2.3794 },
  { iata: 'NCE', name: 'Nice Côte d\'Azur', city: 'Nice', country: 'FR', lat: 43.6584, lng: 7.2159 },

  // ─── Germany ─────────────────────────────────────────────────────
  { iata: 'FRA', name: 'Frankfurt am Main', city: 'Frankfurt', country: 'DE', lat: 50.0379, lng: 8.5622 },
  { iata: 'MUC', name: 'Munich', city: 'Munich', country: 'DE', lat: 48.3537, lng: 11.7750 },
  { iata: 'BER', name: 'Berlin Brandenburg', city: 'Berlin', country: 'DE', lat: 52.3667, lng: 13.5033 },
  { iata: 'DUS', name: 'Düsseldorf', city: 'Düsseldorf', country: 'DE', lat: 51.2895, lng: 6.7668 },
  { iata: 'HAM', name: 'Hamburg', city: 'Hamburg', country: 'DE', lat: 53.6304, lng: 9.9882 },

  // ─── Netherlands & Belgium ───────────────────────────────────────
  { iata: 'AMS', name: 'Amsterdam Schiphol', city: 'Amsterdam', country: 'NL', lat: 52.3105, lng: 4.7683 },
  { iata: 'BRU', name: 'Brussels', city: 'Brussels', country: 'BE', lat: 50.9014, lng: 4.4844 },

  // ─── Spain & Portugal ────────────────────────────────────────────
  { iata: 'MAD', name: 'Adolfo Suárez Madrid-Barajas', city: 'Madrid', country: 'ES', lat: 40.4983, lng: -3.5676 },
  { iata: 'BCN', name: 'Barcelona-El Prat', city: 'Barcelona', country: 'ES', lat: 41.2971, lng: 2.0785 },
  { iata: 'LIS', name: 'Lisbon Humberto Delgado', city: 'Lisbon', country: 'PT', lat: 38.7813, lng: -9.1359 },
  { iata: 'OPO', name: 'Porto Francisco Sá Carneiro', city: 'Porto', country: 'PT', lat: 41.2481, lng: -8.6814 },

  // ─── Italy ───────────────────────────────────────────────────────
  { iata: 'FCO', name: 'Rome Leonardo da Vinci-Fiumicino', city: 'Rome', country: 'IT', lat: 41.8003, lng: 12.2389 },
  { iata: 'MXP', name: 'Milan Malpensa', city: 'Milan', country: 'IT', lat: 45.6306, lng: 8.7281 },
  { iata: 'VCE', name: 'Venice Marco Polo', city: 'Venice', country: 'IT', lat: 45.5053, lng: 12.3519 },
  { iata: 'NAP', name: 'Naples International', city: 'Naples', country: 'IT', lat: 40.8860, lng: 14.2908 },

  // ─── Switzerland & Austria ───────────────────────────────────────
  { iata: 'ZRH', name: 'Zurich', city: 'Zurich', country: 'CH', lat: 47.4647, lng: 8.5492 },
  { iata: 'GVA', name: 'Geneva', city: 'Geneva', country: 'CH', lat: 46.2381, lng: 6.1090 },
  { iata: 'VIE', name: 'Vienna International', city: 'Vienna', country: 'AT', lat: 48.1103, lng: 16.5697 },

  // ─── Scandinavia ─────────────────────────────────────────────────
  { iata: 'CPH', name: 'Copenhagen Kastrup', city: 'Copenhagen', country: 'DK', lat: 55.6180, lng: 12.6508 },
  { iata: 'ARN', name: 'Stockholm Arlanda', city: 'Stockholm', country: 'SE', lat: 59.6519, lng: 17.9186 },
  { iata: 'OSL', name: 'Oslo Gardermoen', city: 'Oslo', country: 'NO', lat: 60.1976, lng: 11.1004 },
  { iata: 'HEL', name: 'Helsinki-Vantaa', city: 'Helsinki', country: 'FI', lat: 60.3172, lng: 24.9633 },
  { iata: 'KEF', name: 'Keflavík International', city: 'Reykjavik', country: 'IS', lat: 63.9850, lng: -22.6056 },

  // ─── Eastern Europe ──────────────────────────────────────────────
  { iata: 'WAW', name: 'Warsaw Chopin', city: 'Warsaw', country: 'PL', lat: 52.1657, lng: 20.9671 },
  { iata: 'PRG', name: 'Václav Havel Prague', city: 'Prague', country: 'CZ', lat: 50.1008, lng: 14.2600 },
  { iata: 'BUD', name: 'Budapest Ferenc Liszt', city: 'Budapest', country: 'HU', lat: 47.4369, lng: 19.2556 },
  { iata: 'OTP', name: 'Henri Coandă International', city: 'Bucharest', country: 'RO', lat: 44.5711, lng: 26.0850 },
  { iata: 'ATH', name: 'Athens Eleftherios Venizelos', city: 'Athens', country: 'GR', lat: 37.9364, lng: 23.9445 },

  // ─── Turkey ──────────────────────────────────────────────────────
  { iata: 'IST', name: 'Istanbul', city: 'Istanbul', country: 'TR', lat: 41.2753, lng: 28.7519 },
  { iata: 'SAW', name: 'Istanbul Sabiha Gökçen', city: 'Istanbul', country: 'TR', lat: 40.8986, lng: 29.3092 },
  { iata: 'AYT', name: 'Antalya', city: 'Antalya', country: 'TR', lat: 36.8987, lng: 30.8005 },

  // ─── Russia ──────────────────────────────────────────────────────
  { iata: 'SVO', name: 'Moscow Sheremetyevo', city: 'Moscow', country: 'RU', lat: 55.9726, lng: 37.4146 },
  { iata: 'DME', name: 'Moscow Domodedovo', city: 'Moscow', country: 'RU', lat: 55.4088, lng: 37.9063 },
  { iata: 'LED', name: 'Pulkovo', city: 'Saint Petersburg', country: 'RU', lat: 59.8003, lng: 30.2625 },

  // ─── Middle East ─────────────────────────────────────────────────
  { iata: 'DXB', name: 'Dubai International', city: 'Dubai', country: 'AE', lat: 25.2532, lng: 55.3657 },
  { iata: 'AUH', name: 'Abu Dhabi International', city: 'Abu Dhabi', country: 'AE', lat: 24.4331, lng: 54.6511 },
  { iata: 'DOH', name: 'Hamad International', city: 'Doha', country: 'QA', lat: 25.2731, lng: 51.6081 },
  { iata: 'RUH', name: 'King Khalid International', city: 'Riyadh', country: 'SA', lat: 24.9576, lng: 46.6988 },
  { iata: 'JED', name: 'King Abdulaziz International', city: 'Jeddah', country: 'SA', lat: 21.6796, lng: 39.1565 },
  { iata: 'BAH', name: 'Bahrain International', city: 'Manama', country: 'BH', lat: 26.2708, lng: 50.6336 },
  { iata: 'MCT', name: 'Muscat International', city: 'Muscat', country: 'OM', lat: 23.5933, lng: 58.2844 },
  { iata: 'AMM', name: 'Queen Alia International', city: 'Amman', country: 'JO', lat: 31.7226, lng: 35.9932 },
  { iata: 'TLV', name: 'Ben Gurion', city: 'Tel Aviv', country: 'IL', lat: 32.0055, lng: 34.8854 },
  { iata: 'KWI', name: 'Kuwait International', city: 'Kuwait City', country: 'KW', lat: 29.2266, lng: 47.9689 },

  // ─── South Asia ──────────────────────────────────────────────────
  { iata: 'DEL', name: 'Indira Gandhi International', city: 'Delhi', country: 'IN', lat: 28.5562, lng: 77.1000 },
  { iata: 'BOM', name: 'Chhatrapati Shivaji Maharaj International', city: 'Mumbai', country: 'IN', lat: 19.0896, lng: 72.8656 },
  { iata: 'BLR', name: 'Kempegowda International', city: 'Bangalore', country: 'IN', lat: 13.1986, lng: 77.7066 },
  { iata: 'MAA', name: 'Chennai International', city: 'Chennai', country: 'IN', lat: 12.9941, lng: 80.1709 },
  { iata: 'HYD', name: 'Rajiv Gandhi International', city: 'Hyderabad', country: 'IN', lat: 17.2403, lng: 78.4294 },
  { iata: 'CCU', name: 'Netaji Subhas Chandra Bose International', city: 'Kolkata', country: 'IN', lat: 22.6547, lng: 88.4467 },
  { iata: 'CMB', name: 'Bandaranaike International', city: 'Colombo', country: 'LK', lat: 7.1808, lng: 79.8841 },
  { iata: 'DAC', name: 'Hazrat Shahjalal International', city: 'Dhaka', country: 'BD', lat: 23.8433, lng: 90.3978 },
  { iata: 'ISB', name: 'Islamabad International', city: 'Islamabad', country: 'PK', lat: 33.5605, lng: 72.8526 },
  { iata: 'KHI', name: 'Jinnah International', city: 'Karachi', country: 'PK', lat: 24.9065, lng: 67.1609 },
  { iata: 'KTM', name: 'Tribhuvan International', city: 'Kathmandu', country: 'NP', lat: 27.6966, lng: 85.3591 },
  { iata: 'MLE', name: 'Velana International', city: 'Malé', country: 'MV', lat: 4.1918, lng: 73.5290 },

  // ─── Southeast Asia ──────────────────────────────────────────────
  { iata: 'BKK', name: 'Suvarnabhumi', city: 'Bangkok', country: 'TH', lat: 13.6900, lng: 100.7501 },
  { iata: 'DMK', name: 'Don Mueang International', city: 'Bangkok', country: 'TH', lat: 13.9126, lng: 100.6068 },
  { iata: 'SIN', name: 'Singapore Changi', city: 'Singapore', country: 'SG', lat: 1.3644, lng: 103.9915 },
  { iata: 'KUL', name: 'Kuala Lumpur International', city: 'Kuala Lumpur', country: 'MY', lat: 2.7456, lng: 101.7099 },
  { iata: 'CGK', name: 'Soekarno-Hatta International', city: 'Jakarta', country: 'ID', lat: -6.1256, lng: 106.6559 },
  { iata: 'DPS', name: 'Ngurah Rai International', city: 'Bali', country: 'ID', lat: -8.7482, lng: 115.1672 },
  { iata: 'MNL', name: 'Ninoy Aquino International', city: 'Manila', country: 'PH', lat: 14.5086, lng: 121.0198 },
  { iata: 'SGN', name: 'Tan Son Nhat International', city: 'Ho Chi Minh City', country: 'VN', lat: 10.8188, lng: 106.6520 },
  { iata: 'HAN', name: 'Noi Bai International', city: 'Hanoi', country: 'VN', lat: 21.2212, lng: 105.8070 },
  { iata: 'RGN', name: 'Yangon International', city: 'Yangon', country: 'MM', lat: 16.9073, lng: 96.1332 },
  { iata: 'PNH', name: 'Phnom Penh International', city: 'Phnom Penh', country: 'KH', lat: 11.5466, lng: 104.8441 },
  { iata: 'REP', name: 'Siem Reap-Angkor International', city: 'Siem Reap', country: 'KH', lat: 13.4107, lng: 103.8128 },

  // ─── East Asia ───────────────────────────────────────────────────
  { iata: 'NRT', name: 'Narita International', city: 'Tokyo', country: 'JP', lat: 35.7647, lng: 140.3864 },
  { iata: 'HND', name: 'Tokyo Haneda', city: 'Tokyo', country: 'JP', lat: 35.5494, lng: 139.7798 },
  { iata: 'KIX', name: 'Kansai International', city: 'Osaka', country: 'JP', lat: 34.4347, lng: 135.2441 },
  { iata: 'ICN', name: 'Incheon International', city: 'Seoul', country: 'KR', lat: 37.4602, lng: 126.4407 },
  { iata: 'GMP', name: 'Gimpo International', city: 'Seoul', country: 'KR', lat: 37.5583, lng: 126.7906 },
  { iata: 'PEK', name: 'Beijing Capital International', city: 'Beijing', country: 'CN', lat: 40.0799, lng: 116.6031 },
  { iata: 'PKX', name: 'Beijing Daxing International', city: 'Beijing', country: 'CN', lat: 39.5098, lng: 116.4105 },
  { iata: 'PVG', name: 'Shanghai Pudong International', city: 'Shanghai', country: 'CN', lat: 31.1443, lng: 121.8083 },
  { iata: 'SHA', name: 'Shanghai Hongqiao International', city: 'Shanghai', country: 'CN', lat: 31.1979, lng: 121.3363 },
  { iata: 'CAN', name: 'Guangzhou Baiyun International', city: 'Guangzhou', country: 'CN', lat: 23.3924, lng: 113.2988 },
  { iata: 'HKG', name: 'Hong Kong International', city: 'Hong Kong', country: 'HK', lat: 22.3080, lng: 113.9185 },
  { iata: 'TPE', name: 'Taiwan Taoyuan International', city: 'Taipei', country: 'TW', lat: 25.0777, lng: 121.2330 },
  { iata: 'SZX', name: 'Shenzhen Bao\'an International', city: 'Shenzhen', country: 'CN', lat: 22.6393, lng: 113.8107 },
  { iata: 'CTU', name: 'Chengdu Tianfu International', city: 'Chengdu', country: 'CN', lat: 30.3197, lng: 104.4412 },
  { iata: 'CKG', name: 'Chongqing Jiangbei International', city: 'Chongqing', country: 'CN', lat: 29.7192, lng: 106.6417 },
  { iata: 'ULN', name: 'Chinggis Khaan International', city: 'Ulaanbaatar', country: 'MN', lat: 47.8431, lng: 106.7667 },

  // ─── Africa ──────────────────────────────────────────────────────
  { iata: 'ACC', name: 'Kotoka International', city: 'Accra', country: 'GH', lat: 5.6052, lng: -0.1668 },
  { iata: 'CPT', name: 'Cape Town International', city: 'Cape Town', country: 'ZA', lat: -33.9715, lng: 18.6022 },
  { iata: 'JNB', name: 'O.R. Tambo International', city: 'Johannesburg', country: 'ZA', lat: -26.1392, lng: 28.2460 },
  { iata: 'NBO', name: 'Jomo Kenyatta International', city: 'Nairobi', country: 'KE', lat: -1.3192, lng: 36.9278 },
  { iata: 'CAI', name: 'Cairo International', city: 'Cairo', country: 'EG', lat: 30.1219, lng: 31.4056 },
  { iata: 'RAK', name: 'Marrakech Menara', city: 'Marrakech', country: 'MA', lat: 31.6069, lng: -8.0363 },
  { iata: 'CMN', name: 'Mohammed V International', city: 'Casablanca', country: 'MA', lat: 33.3675, lng: -7.5898 },
  { iata: 'LOS', name: 'Murtala Muhammed International', city: 'Lagos', country: 'NG', lat: 6.5774, lng: 3.3212 },
  { iata: 'ABJ', name: 'Félix-Houphouët-Boigny International', city: 'Abidjan', country: 'CI', lat: 5.2614, lng: -3.9263 },
  { iata: 'ADD', name: 'Addis Ababa Bole International', city: 'Addis Ababa', country: 'ET', lat: 8.9779, lng: 38.7993 },
  { iata: 'DSS', name: 'Blaise Diagne International', city: 'Dakar', country: 'SN', lat: 14.6707, lng: -17.0735 },
  { iata: 'DAR', name: 'Julius Nyerere International', city: 'Dar es Salaam', country: 'TZ', lat: -6.8781, lng: 39.2026 },
  { iata: 'EBB', name: 'Entebbe International', city: 'Entebbe', country: 'UG', lat: 0.0424, lng: 32.4435 },
  { iata: 'ALG', name: 'Houari Boumediene', city: 'Algiers', country: 'DZ', lat: 36.6910, lng: 3.2154 },
  { iata: 'TUN', name: 'Tunis-Carthage International', city: 'Tunis', country: 'TN', lat: 36.8510, lng: 10.2272 },
  { iata: 'KGL', name: 'Kigali International', city: 'Kigali', country: 'RW', lat: -1.9686, lng: 30.1395 },
  { iata: 'MRU', name: 'Sir Seewoosagur Ramgoolam International', city: 'Mauritius', country: 'MU', lat: -20.4302, lng: 57.6836 },
  { iata: 'SEZ', name: 'Seychelles International', city: 'Mahé', country: 'SC', lat: -4.6743, lng: 55.5218 },
  { iata: 'ZNZ', name: 'Abeid Amani Karume International', city: 'Zanzibar', country: 'TZ', lat: -6.2220, lng: 39.2249 },

  // ─── Oceania ─────────────────────────────────────────────────────
  { iata: 'SYD', name: 'Sydney Kingsford Smith', city: 'Sydney', country: 'AU', lat: -33.9461, lng: 151.1772 },
  { iata: 'MEL', name: 'Melbourne Tullamarine', city: 'Melbourne', country: 'AU', lat: -37.6690, lng: 144.8410 },
  { iata: 'BNE', name: 'Brisbane', city: 'Brisbane', country: 'AU', lat: -27.3842, lng: 153.1175 },
  { iata: 'PER', name: 'Perth', city: 'Perth', country: 'AU', lat: -31.9403, lng: 115.9670 },
  { iata: 'AKL', name: 'Auckland', city: 'Auckland', country: 'NZ', lat: -37.0082, lng: 174.7850 },
  { iata: 'CHC', name: 'Christchurch International', city: 'Christchurch', country: 'NZ', lat: -43.4894, lng: 172.5322 },
  { iata: 'NAN', name: 'Nadi International', city: 'Nadi', country: 'FJ', lat: -17.7554, lng: 177.4431 },
  { iata: 'PPT', name: 'Faa\'a International', city: 'Papeete', country: 'PF', lat: -17.5537, lng: -149.6073 },
  { iata: 'ADL', name: 'Adelaide', city: 'Adelaide', country: 'AU', lat: -34.9461, lng: 138.5310 },
  { iata: 'WLG', name: 'Wellington International', city: 'Wellington', country: 'NZ', lat: -41.3272, lng: 174.8053 },

  // ─── Additional coverage ─────────────────────────────────────────
  { iata: 'OAK', name: 'Oakland International', city: 'Oakland', country: 'US', lat: 37.7213, lng: -122.2208 },
  { iata: 'SJC', name: 'San José Mineta International', city: 'San Jose', country: 'US', lat: 37.3639, lng: -121.9289 },
  { iata: 'PIT', name: 'Pittsburgh International', city: 'Pittsburgh', country: 'US', lat: 40.4957, lng: -80.2413 },
  { iata: 'MKE', name: 'Milwaukee Mitchell International', city: 'Milwaukee', country: 'US', lat: 42.9472, lng: -87.8966 },
  { iata: 'IND', name: 'Indianapolis International', city: 'Indianapolis', country: 'US', lat: 39.7173, lng: -86.2944 },
  { iata: 'CVG', name: 'Cincinnati/Northern Kentucky International', city: 'Cincinnati', country: 'US', lat: 39.0488, lng: -84.6678 },
  { iata: 'CLE', name: 'Cleveland Hopkins International', city: 'Cleveland', country: 'US', lat: 41.4058, lng: -81.8540 },
  { iata: 'SMF', name: 'Sacramento International', city: 'Sacramento', country: 'US', lat: 38.6954, lng: -121.5908 },
  { iata: 'LAS', name: 'Harry Reid International', city: 'Las Vegas', country: 'US', lat: 36.0840, lng: -115.1537 },
  { iata: 'PHX', name: 'Phoenix Sky Harbor International', city: 'Phoenix', country: 'US', lat: 33.4373, lng: -112.0078 },
  { iata: 'MDW', name: 'Chicago Midway International', city: 'Chicago', country: 'US', lat: 41.7868, lng: -87.7522 },
  { iata: 'JAX', name: 'Jacksonville International', city: 'Jacksonville', country: 'US', lat: 30.4941, lng: -81.6879 },
  { iata: 'LUX', name: 'Luxembourg Findel', city: 'Luxembourg', country: 'LU', lat: 49.6233, lng: 6.2044 },
  { iata: 'TBS', name: 'Tbilisi International', city: 'Tbilisi', country: 'GE', lat: 41.6692, lng: 44.9547 },
  { iata: 'EVN', name: 'Zvartnots International', city: 'Yerevan', country: 'AM', lat: 40.1473, lng: 44.3959 },
  { iata: 'GYD', name: 'Heydar Aliyev International', city: 'Baku', country: 'AZ', lat: 40.4675, lng: 50.0467 },
  { iata: 'LPB', name: 'El Alto International', city: 'La Paz', country: 'BO', lat: -16.5133, lng: -68.1923 },
  { iata: 'ASU', name: 'Silvio Pettirossi International', city: 'Asunción', country: 'PY', lat: -25.2400, lng: -57.5191 },
  { iata: 'HAV', name: 'José Martí International', city: 'Havana', country: 'CU', lat: 22.9892, lng: -82.4091 },
  { iata: 'SDQ', name: 'Las Américas International', city: 'Santo Domingo', country: 'DO', lat: 18.4297, lng: -69.6689 },
  { iata: 'DUR', name: 'King Shaka International', city: 'Durban', country: 'ZA', lat: -29.6144, lng: 31.1197 },
  { iata: 'MPM', name: 'Maputo International', city: 'Maputo', country: 'MZ', lat: -25.9208, lng: 32.5726 },
  { iata: 'WDH', name: 'Hosea Kutako International', city: 'Windhoek', country: 'NA', lat: -22.4799, lng: 17.4709 },
];

/**
 * Haversine formula: calculates great-circle distance between two points in km.
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Returns the nearest airport to the given coordinates.
 */
export function findNearestAirport(lat: number, lng: number): Airport {
  let nearest = AIRPORTS[0];
  let minDist = Infinity;
  for (const airport of AIRPORTS) {
    const d = haversineDistance(lat, lng, airport.lat, airport.lng);
    if (d < minDist) {
      minDist = d;
      nearest = airport;
    }
  }
  return nearest;
}

/**
 * Finds an airport by fuzzy city name match.
 * Matches if the search term is contained in the airport city or vice versa (case-insensitive).
 * Prefers exact matches, then substring matches.
 */
export function findAirportByCity(cityName: string): Airport | undefined {
  const query = cityName.toLowerCase().trim();
  if (!query) return undefined;

  // Exact match first
  const exact = AIRPORTS.find((a) => a.city.toLowerCase() === query);
  if (exact) return exact;

  // Query is contained in the city name, or city name is contained in query
  const partial = AIRPORTS.find(
    (a) =>
      a.city.toLowerCase().includes(query) || query.includes(a.city.toLowerCase()),
  );
  if (partial) return partial;

  // Fuzzy: check if all words in the query appear somewhere in the city name
  const queryWords = query.split(/\s+/);
  const fuzzy = AIRPORTS.find((a) => {
    const city = a.city.toLowerCase();
    return queryWords.every((w) => city.includes(w));
  });
  if (fuzzy) return fuzzy;

  // Try matching against common alternate names / aliases
  const aliases: Record<string, string> = {
    'nyc': 'new york',
    'sf': 'san francisco',
    'la': 'los angeles',
    'dc': 'washington',
    'rio': 'rio de janeiro',
    'sao paulo': 'são paulo',
    'montreal': 'montreal',
    'dusseldorf': 'düsseldorf',
    'ho chi minh': 'ho chi minh city',
    'saigon': 'ho chi minh city',
    'bombay': 'mumbai',
    'calcutta': 'kolkata',
    'madras': 'chennai',
    'peking': 'beijing',
    'male': 'malé',
    'ulaanbaatar': 'ulaanbaatar',
    'ulan bator': 'ulaanbaatar',
  };

  const aliasMatch = aliases[query];
  if (aliasMatch) {
    return AIRPORTS.find((a) => a.city.toLowerCase() === aliasMatch);
  }

  return undefined;
}
