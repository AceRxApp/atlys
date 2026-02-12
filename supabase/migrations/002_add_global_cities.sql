-- Migration: Add 141 global cities across all continents, islands, and territories

INSERT INTO cities (name, country, region, slug, timezone, is_active)
SELECT name, country, region, slug, timezone, true
FROM (VALUES
  -- NORTH AMERICA - USA
  ('Albuquerque', 'USA', 'North America', 'albuquerque', 'America/Denver'),
  ('Anchorage', 'USA', 'North America', 'anchorage', 'America/Anchorage'),
  ('Baltimore', 'USA', 'North America', 'baltimore', 'America/New_York'),
  ('Cincinnati', 'USA', 'North America', 'cincinnati', 'America/New_York'),
  ('Cleveland', 'USA', 'North America', 'cleveland', 'America/New_York'),
  ('Columbus', 'USA', 'North America', 'columbus', 'America/New_York'),
  ('Indianapolis', 'USA', 'North America', 'indianapolis', 'America/Indiana/Indianapolis'),
  ('Jacksonville', 'USA', 'North America', 'jacksonville', 'America/New_York'),
  ('Kansas City', 'USA', 'North America', 'kansas-city', 'America/Chicago'),
  ('Louisville', 'USA', 'North America', 'louisville', 'America/Kentucky/Louisville'),
  ('Milwaukee', 'USA', 'North America', 'milwaukee', 'America/Chicago'),
  ('Raleigh', 'USA', 'North America', 'raleigh', 'America/New_York'),
  ('Sacramento', 'USA', 'North America', 'sacramento', 'America/Los_Angeles'),
  ('Salt Lake City', 'USA', 'North America', 'salt-lake-city', 'America/Denver'),
  ('Tucson', 'USA', 'North America', 'tucson', 'America/Phoenix'),

  -- NORTH AMERICA - Canada
  ('Edmonton', 'Canada', 'North America', 'edmonton', 'America/Edmonton'),
  ('Halifax', 'Canada', 'North America', 'halifax', 'America/Halifax'),
  ('Victoria', 'Canada', 'North America', 'victoria', 'America/Vancouver'),
  ('Winnipeg', 'Canada', 'North America', 'winnipeg', 'America/Winnipeg'),

  -- NORTH AMERICA - Mexico
  ('Cabo San Lucas', 'Mexico', 'North America', 'cabo-san-lucas', 'America/Mazatlan'),
  ('Guadalajara', 'Mexico', 'North America', 'guadalajara', 'America/Mexico_City'),
  ('Merida', 'Mexico', 'North America', 'merida', 'America/Merida'),
  ('Monterrey', 'Mexico', 'North America', 'monterrey', 'America/Monterrey'),
  ('Oaxaca', 'Mexico', 'North America', 'oaxaca', 'America/Mexico_City'),
  ('Playa del Carmen', 'Mexico', 'North America', 'playa-del-carmen', 'America/Cancun'),
  ('Puerto Vallarta', 'Mexico', 'North America', 'puerto-vallarta', 'America/Mazatlan'),

  -- CENTRAL AMERICA
  ('Managua', 'Nicaragua', 'Central America', 'managua', 'America/Managua'),
  ('San Salvador', 'El Salvador', 'Central America', 'san-salvador', 'America/El_Salvador'),
  ('Tegucigalpa', 'Honduras', 'Central America', 'tegucigalpa', 'America/Tegucigalpa'),

  -- CARIBBEAN / ISLANDS
  ('Antigua', 'Antigua and Barbuda', 'Caribbean', 'antigua', 'America/Antigua'),
  ('Bermuda', 'Bermuda', 'Caribbean', 'bermuda', 'Atlantic/Bermuda'),
  ('Cozumel', 'Mexico', 'Caribbean', 'cozumel', 'America/Cancun'),
  ('Dominica', 'Dominica', 'Caribbean', 'dominica', 'America/Dominica'),
  ('George Town', 'Cayman Islands', 'Caribbean', 'george-town', 'America/Cayman'),
  ('Grenada', 'Grenada', 'Caribbean', 'grenada', 'America/Grenada'),
  ('Guadeloupe', 'Guadeloupe', 'Caribbean', 'guadeloupe', 'America/Guadeloupe'),
  ('Martinique', 'Martinique', 'Caribbean', 'martinique', 'America/Martinique'),
  ('Providenciales', 'Turks and Caicos', 'Caribbean', 'providenciales', 'America/Grand_Turk'),
  ('St. Croix', 'US Virgin Islands', 'Caribbean', 'st-croix', 'America/Virgin'),
  ('St. Kitts', 'St. Kitts and Nevis', 'Caribbean', 'st-kitts', 'America/St_Kitts'),
  ('St. Thomas', 'US Virgin Islands', 'Caribbean', 'st-thomas', 'America/Virgin'),
  ('St. Vincent', 'St. Vincent', 'Caribbean', 'st-vincent', 'America/St_Vincent'),

  -- SOUTH AMERICA
  ('Asuncion', 'Paraguay', 'South America', 'asuncion', 'America/Asuncion'),
  ('Bariloche', 'Argentina', 'South America', 'bariloche', 'America/Argentina/Buenos_Aires'),
  ('Brasilia', 'Brazil', 'South America', 'brasilia', 'America/Sao_Paulo'),
  ('Cali', 'Colombia', 'South America', 'cali', 'America/Bogota'),
  ('Florianopolis', 'Brazil', 'South America', 'florianopolis', 'America/Sao_Paulo'),
  ('Georgetown', 'Guyana', 'South America', 'georgetown', 'America/Guyana'),
  ('Guayaquil', 'Ecuador', 'South America', 'guayaquil', 'America/Guayaquil'),
  ('Mendoza', 'Argentina', 'South America', 'mendoza', 'America/Argentina/Mendoza'),
  ('Paramaribo', 'Suriname', 'South America', 'paramaribo', 'America/Paramaribo'),
  ('Recife', 'Brazil', 'South America', 'recife', 'America/Recife'),
  ('Salvador', 'Brazil', 'South America', 'salvador', 'America/Bahia'),
  ('Valparaiso', 'Chile', 'South America', 'valparaiso', 'America/Santiago'),

  -- EAST ASIA
  ('Busan', 'South Korea', 'Asia', 'busan', 'Asia/Seoul'),
  ('Chengdu', 'China', 'Asia', 'chengdu', 'Asia/Shanghai'),
  ('Guangzhou', 'China', 'Asia', 'guangzhou', 'Asia/Shanghai'),
  ('Shenzhen', 'China', 'Asia', 'shenzhen', 'Asia/Shanghai'),
  ('Xi''an', 'China', 'Asia', 'xian', 'Asia/Shanghai'),

  -- SOUTHEAST ASIA
  ('Da Nang', 'Vietnam', 'Asia', 'da-nang', 'Asia/Ho_Chi_Minh'),
  ('Koh Samui', 'Thailand', 'Asia', 'koh-samui', 'Asia/Bangkok'),
  ('Langkawi', 'Malaysia', 'Asia', 'langkawi', 'Asia/Kuala_Lumpur'),
  ('Luang Prabang', 'Laos', 'Asia', 'luang-prabang', 'Asia/Vientiane'),
  ('Penang', 'Malaysia', 'Asia', 'penang', 'Asia/Kuala_Lumpur'),
  ('Phuket', 'Thailand', 'Asia', 'phuket', 'Asia/Bangkok'),
  ('Vientiane', 'Laos', 'Asia', 'vientiane', 'Asia/Vientiane'),
  ('Yangon', 'Myanmar', 'Asia', 'yangon', 'Asia/Yangon'),

  -- SOUTH ASIA
  ('Agra', 'India', 'Asia', 'agra', 'Asia/Kolkata'),
  ('Bangalore', 'India', 'Asia', 'bangalore', 'Asia/Kolkata'),
  ('Chennai', 'India', 'Asia', 'chennai', 'Asia/Kolkata'),
  ('Goa', 'India', 'Asia', 'goa', 'Asia/Kolkata'),
  ('Hyderabad', 'India', 'Asia', 'hyderabad', 'Asia/Kolkata'),
  ('Kochi', 'India', 'Asia', 'kochi', 'Asia/Kolkata'),
  ('Kolkata', 'India', 'Asia', 'kolkata', 'Asia/Kolkata'),
  ('Male', 'Maldives', 'Asia', 'male', 'Indian/Maldives'),
  ('Thimphu', 'Bhutan', 'Asia', 'thimphu', 'Asia/Thimphu'),

  -- CENTRAL ASIA & CAUCASUS
  ('Almaty', 'Kazakhstan', 'Asia', 'almaty', 'Asia/Almaty'),
  ('Baku', 'Azerbaijan', 'Asia', 'baku', 'Asia/Baku'),
  ('Bishkek', 'Kyrgyzstan', 'Asia', 'bishkek', 'Asia/Bishkek'),
  ('Tashkent', 'Uzbekistan', 'Asia', 'tashkent', 'Asia/Tashkent'),
  ('Tbilisi', 'Georgia', 'Europe', 'tbilisi', 'Asia/Tbilisi'),
  ('Ulaanbaatar', 'Mongolia', 'Asia', 'ulaanbaatar', 'Asia/Ulaanbaatar'),
  ('Yerevan', 'Armenia', 'Asia', 'yerevan', 'Asia/Yerevan'),

  -- MIDDLE EAST
  ('Aqaba', 'Jordan', 'Middle East', 'aqaba', 'Asia/Amman'),
  ('Jeddah', 'Saudi Arabia', 'Middle East', 'jeddah', 'Asia/Riyadh'),
  ('Kuwait City', 'Kuwait', 'Middle East', 'kuwait-city', 'Asia/Kuwait'),
  ('Manama', 'Bahrain', 'Middle East', 'manama', 'Asia/Bahrain'),

  -- AFRICA - North
  ('Algiers', 'Algeria', 'Africa', 'algiers', 'Africa/Algiers'),
  ('Alexandria', 'Egypt', 'Africa', 'alexandria', 'Africa/Cairo'),
  ('Cairo', 'Egypt', 'Africa', 'cairo', 'Africa/Cairo'),
  ('Fez', 'Morocco', 'Africa', 'fez', 'Africa/Casablanca'),
  ('Luxor', 'Egypt', 'Africa', 'luxor', 'Africa/Cairo'),
  ('Tangier', 'Morocco', 'Africa', 'tangier', 'Africa/Casablanca'),
  ('Tunis', 'Tunisia', 'Africa', 'tunis', 'Africa/Tunis'),

  -- AFRICA - West
  ('Bamako', 'Mali', 'Africa', 'bamako', 'Africa/Bamako'),
  ('Cotonou', 'Benin', 'Africa', 'cotonou', 'Africa/Porto-Novo'),
  ('Lome', 'Togo', 'Africa', 'lome', 'Africa/Lome'),

  -- AFRICA - East
  ('Antananarivo', 'Madagascar', 'Africa', 'antananarivo', 'Indian/Antananarivo'),
  ('Asmara', 'Eritrea', 'Africa', 'asmara', 'Africa/Asmara'),
  ('Djibouti', 'Djibouti', 'Africa', 'djibouti', 'Africa/Djibouti'),
  ('Victoria', 'Seychelles', 'Africa', 'victoria-seychelles', 'Indian/Mahe'),

  -- AFRICA - Central
  ('Douala', 'Cameroon', 'Africa', 'douala', 'Africa/Douala'),
  ('Kinshasa', 'DRC', 'Africa', 'kinshasa', 'Africa/Kinshasa'),
  ('Libreville', 'Gabon', 'Africa', 'libreville', 'Africa/Libreville'),

  -- AFRICA - Southern
  ('Durban', 'South Africa', 'Africa', 'durban', 'Africa/Johannesburg'),
  ('Gaborone', 'Botswana', 'Africa', 'gaborone', 'Africa/Gaborone'),
  ('Harare', 'Zimbabwe', 'Africa', 'harare', 'Africa/Harare'),
  ('Livingstone', 'Zambia', 'Africa', 'livingstone', 'Africa/Lusaka'),
  ('Pretoria', 'South Africa', 'Africa', 'pretoria', 'Africa/Johannesburg'),
  ('Windhoek', 'Namibia', 'Africa', 'windhoek', 'Africa/Windhoek'),

  -- AUSTRALIA & NEW ZEALAND
  ('Adelaide', 'Australia', 'Oceania', 'adelaide', 'Australia/Adelaide'),
  ('Cairns', 'Australia', 'Oceania', 'cairns', 'Australia/Brisbane'),
  ('Canberra', 'Australia', 'Oceania', 'canberra', 'Australia/Sydney'),
  ('Christchurch', 'New Zealand', 'Oceania', 'christchurch', 'Pacific/Auckland'),
  ('Darwin', 'Australia', 'Oceania', 'darwin', 'Australia/Darwin'),
  ('Hobart', 'Australia', 'Oceania', 'hobart', 'Australia/Hobart'),
  ('Rotorua', 'New Zealand', 'Oceania', 'rotorua', 'Pacific/Auckland'),
  ('Wellington', 'New Zealand', 'Oceania', 'wellington', 'Pacific/Auckland'),

  -- PACIFIC ISLANDS
  ('Apia', 'Samoa', 'Oceania', 'apia', 'Pacific/Apia'),
  ('Bora Bora', 'French Polynesia', 'Oceania', 'bora-bora', 'Pacific/Tahiti'),
  ('Guam', 'Guam', 'Oceania', 'guam', 'Pacific/Guam'),
  ('Noumea', 'New Caledonia', 'Oceania', 'noumea', 'Pacific/Noumea'),
  ('Nuku''alofa', 'Tonga', 'Oceania', 'nukualofa', 'Pacific/Tongatapu'),
  ('Palau', 'Palau', 'Oceania', 'palau', 'Pacific/Palau'),
  ('Papeete', 'French Polynesia', 'Oceania', 'papeete', 'Pacific/Tahiti'),
  ('Port Vila', 'Vanuatu', 'Oceania', 'port-vila', 'Pacific/Efate'),
  ('Rarotonga', 'Cook Islands', 'Oceania', 'rarotonga', 'Pacific/Rarotonga'),

  -- EUROPEAN ISLANDS
  ('Azores', 'Portugal', 'Europe', 'azores', 'Atlantic/Azores'),
  ('Cape Verde', 'Cape Verde', 'Africa', 'cape-verde', 'Atlantic/Cape_Verde'),
  ('Corsica', 'France', 'Europe', 'corsica', 'Europe/Paris'),
  ('Crete', 'Greece', 'Europe', 'crete', 'Europe/Athens'),
  ('Ibiza', 'Spain', 'Europe', 'ibiza', 'Europe/Madrid'),
  ('Madeira', 'Portugal', 'Europe', 'madeira', 'Atlantic/Madeira'),
  ('Majorca', 'Spain', 'Europe', 'majorca', 'Europe/Madrid'),
  ('Malta', 'Malta', 'Europe', 'malta', 'Europe/Malta'),
  ('Mykonos', 'Greece', 'Europe', 'mykonos', 'Europe/Athens'),
  ('Nicosia', 'Cyprus', 'Europe', 'nicosia', 'Asia/Nicosia'),
  ('Reunion', 'France', 'Africa', 'reunion', 'Indian/Reunion'),
  ('Sardinia', 'Italy', 'Europe', 'sardinia', 'Europe/Rome'),
  ('Sicily', 'Italy', 'Europe', 'sicily', 'Europe/Rome'),
  ('Tenerife', 'Spain', 'Europe', 'tenerife', 'Atlantic/Canary')
) AS t(name, country, region, slug, timezone)
WHERE NOT EXISTS (SELECT 1 FROM cities c WHERE c.slug = t.slug);
