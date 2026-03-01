import { CITY_CULTURE } from '../data/cityCulture';
import { API_URL } from './api';

/** Extract 3-letter ISO currency code from CITY_CULTURE currency field */
export function extractCurrencyCode(currencyField: string): string | null {
  const match = currencyField.match(/^([A-Z]{3})\b/);
  return match ? match[1] : null;
}

/** Get currency info for a city */
export function getCityCurrency(cityName: string): { code: string; tip: string } | null {
  const key = cityName.toLowerCase();
  const culture = CITY_CULTURE[key];
  if (!culture?.currency) return null;
  const code = extractCurrencyCode(culture.currency);
  if (!code) return null;
  const tip = culture.currency.replace(/^[A-Z]{3}[.\s]*/, '').trim();
  return { code, tip };
}

const CACHE_KEY = 'nxstops_fx_cache';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/** Fetch exchange rate for a single pair (uses the all-rates endpoint) */
export async function fetchExchangeRate(from: string, to: string): Promise<number | null> {
  if (from === to) return 1;
  const allRates = await fetchAllRates(from);
  return allRates?.[to] ?? null;
}

/** Fetch ALL exchange rates from a base currency (160+ currencies, one API call) */
export async function fetchAllRates(base: string): Promise<Record<string, number> | null> {
  const cacheKey = `${CACHE_KEY}_all_${base}`;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const entry = JSON.parse(cached);
      if (Date.now() - entry.timestamp < CACHE_TTL) return entry.rates;
    }
  } catch { /* ignore */ }

  try {
    const res = await fetch(`${API_URL}/api/currency?from=${base}`);
    if (!res.ok) return null;
    const data = await res.json();
    const rates = data.rates as Record<string, number>;
    if (!rates || typeof rates !== 'object') return null;
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify({ rates, timestamp: Date.now() }));
    } catch { /* storage full */ }
    return rates;
  } catch {
    return null;
  }
}

/** Fetch specific exchange rates (picks from all-rates cache) */
export async function fetchBatchRates(from: string, to: string[]): Promise<Record<string, number> | null> {
  if (to.length === 0) return {};
  const allRates = await fetchAllRates(from);
  if (!allRates) return null;
  const result: Record<string, number> = {};
  for (const code of to) {
    if (allRates[code] != null) result[code] = allRates[code];
  }
  return result;
}

/** Detect user's likely currency from browser locale */
export function detectLocaleCurrency(): string {
  try {
    const locale = navigator.language || 'en-US';
    const region = locale.split('-')[1]?.toUpperCase() || '';
    const map: Record<string, string> = {
      US: 'USD', GB: 'GBP', CA: 'CAD', AU: 'AUD', NZ: 'NZD',
      EU: 'EUR', DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR', PT: 'EUR', IE: 'EUR', FI: 'EUR', GR: 'EUR',
      JP: 'JPY', CN: 'CNY', KR: 'KRW', IN: 'INR', BR: 'BRL',
      MX: 'MXN', AR: 'ARS', CO: 'COP', CL: 'CLP', PE: 'PEN',
      RU: 'RUB', TR: 'TRY', SA: 'SAR', AE: 'AED', EG: 'EGP',
      ZA: 'ZAR', NG: 'NGN', KE: 'KES', GH: 'GHS',
      TH: 'THB', VN: 'VND', PH: 'PHP', MY: 'MYR', SG: 'SGD', ID: 'IDR',
      PK: 'PKR', BD: 'BDT', LK: 'LKR',
      SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', CZ: 'CZK', HU: 'HUF', RO: 'RON',
      CH: 'CHF', IL: 'ILS', HK: 'HKD', TW: 'TWD',
      JM: 'JMD', TT: 'TTD', BB: 'BBD',
    };
    return map[region] || 'USD';
  } catch {
    return 'USD';
  }
}

export const CURRENCY_FLAGS: Record<string, string> = {
  AED: '\u{1F1E6}\u{1F1EA}', AFN: '\u{1F1E6}\u{1F1EB}', ALL: '\u{1F1E6}\u{1F1F1}', AMD: '\u{1F1E6}\u{1F1F2}',
  ARS: '\u{1F1E6}\u{1F1F7}', AUD: '\u{1F1E6}\u{1F1FA}', AZN: '\u{1F1E6}\u{1F1FF}', BAM: '\u{1F1E7}\u{1F1E6}',
  BBD: '\u{1F1E7}\u{1F1E7}', BDT: '\u{1F1E7}\u{1F1E9}', BGN: '\u{1F1E7}\u{1F1EC}', BHD: '\u{1F1E7}\u{1F1ED}',
  BRL: '\u{1F1E7}\u{1F1F7}', BSD: '\u{1F1E7}\u{1F1F8}', CAD: '\u{1F1E8}\u{1F1E6}', CHF: '\u{1F1E8}\u{1F1ED}',
  CLP: '\u{1F1E8}\u{1F1F1}', CNY: '\u{1F1E8}\u{1F1F3}', COP: '\u{1F1E8}\u{1F1F4}', CRC: '\u{1F1E8}\u{1F1F7}',
  CZK: '\u{1F1E8}\u{1F1FF}', DKK: '\u{1F1E9}\u{1F1F0}', DOP: '\u{1F1E9}\u{1F1F4}', EGP: '\u{1F1EA}\u{1F1EC}',
  EUR: '\u{1F1EA}\u{1F1FA}', GBP: '\u{1F1EC}\u{1F1E7}', GEL: '\u{1F1EC}\u{1F1EA}', GHS: '\u{1F1EC}\u{1F1ED}',
  HKD: '\u{1F1ED}\u{1F1F0}', HUF: '\u{1F1ED}\u{1F1FA}', IDR: '\u{1F1EE}\u{1F1E9}', ILS: '\u{1F1EE}\u{1F1F1}',
  INR: '\u{1F1EE}\u{1F1F3}', ISK: '\u{1F1EE}\u{1F1F8}', JMD: '\u{1F1EF}\u{1F1F2}', JOD: '\u{1F1EF}\u{1F1F4}',
  JPY: '\u{1F1EF}\u{1F1F5}', KES: '\u{1F1F0}\u{1F1EA}', KRW: '\u{1F1F0}\u{1F1F7}', KWD: '\u{1F1F0}\u{1F1FC}',
  MAD: '\u{1F1F2}\u{1F1E6}', MXN: '\u{1F1F2}\u{1F1FD}', MYR: '\u{1F1F2}\u{1F1FE}', NGN: '\u{1F1F3}\u{1F1EC}',
  NOK: '\u{1F1F3}\u{1F1F4}', NZD: '\u{1F1F3}\u{1F1FF}', PEN: '\u{1F1F5}\u{1F1EA}', PHP: '\u{1F1F5}\u{1F1ED}',
  PKR: '\u{1F1F5}\u{1F1F0}', PLN: '\u{1F1F5}\u{1F1F1}', QAR: '\u{1F1F6}\u{1F1E6}', RON: '\u{1F1F7}\u{1F1F4}',
  RUB: '\u{1F1F7}\u{1F1FA}', SAR: '\u{1F1F8}\u{1F1E6}', SEK: '\u{1F1F8}\u{1F1EA}', SGD: '\u{1F1F8}\u{1F1EC}',
  THB: '\u{1F1F9}\u{1F1ED}', TRY: '\u{1F1F9}\u{1F1F7}', TWD: '\u{1F1F9}\u{1F1FC}', UAH: '\u{1F1FA}\u{1F1E6}',
  USD: '\u{1F1FA}\u{1F1F8}', UYU: '\u{1F1FA}\u{1F1FE}', VND: '\u{1F1FB}\u{1F1F3}', ZAR: '\u{1F1FF}\u{1F1E6}',
};

export const CURRENCY_NAMES: Record<string, string> = {
  AED: 'UAE Dirham', AFN: 'Afghani', ALL: 'Albanian Lek', AMD: 'Armenian Dram',
  ANG: 'Guilder', AOA: 'Kwanza', ARS: 'Argentine Peso', AUD: 'Australian Dollar',
  AWG: 'Aruban Florin', AZN: 'Manat', BAM: 'Convertible Mark', BBD: 'Barbados Dollar',
  BDT: 'Taka', BGN: 'Bulgarian Lev', BHD: 'Bahraini Dinar', BIF: 'Burundi Franc',
  BMD: 'Bermudian Dollar', BND: 'Brunei Dollar', BOB: 'Boliviano', BRL: 'Brazilian Real',
  BSD: 'Bahamian Dollar', BTN: 'Ngultrum', BWP: 'Pula', BYN: 'Belarusian Ruble',
  BZD: 'Belize Dollar', CAD: 'Canadian Dollar', CDF: 'Congolese Franc', CHF: 'Swiss Franc',
  CLP: 'Chilean Peso', CNY: 'Chinese Yuan', COP: 'Colombian Peso', CRC: 'Costa Rican Colón',
  CUP: 'Cuban Peso', CVE: 'Cape Verdean Escudo', CZK: 'Czech Koruna', DJF: 'Djibouti Franc',
  DKK: 'Danish Krone', DOP: 'Dominican Peso', DZD: 'Algerian Dinar', EGP: 'Egyptian Pound',
  ERN: 'Nakfa', ETB: 'Ethiopian Birr', EUR: 'Euro', FJD: 'Fiji Dollar',
  GBP: 'British Pound', GEL: 'Georgian Lari', GHS: 'Ghana Cedi', GMD: 'Dalasi',
  GNF: 'Guinean Franc', GTQ: 'Quetzal', GYD: 'Guyana Dollar', HKD: 'Hong Kong Dollar',
  HNL: 'Lempira', HRK: 'Croatian Kuna', HTG: 'Gourde', HUF: 'Hungarian Forint',
  IDR: 'Indonesian Rupiah', ILS: 'Israeli Shekel', INR: 'Indian Rupee', IQD: 'Iraqi Dinar',
  IRR: 'Iranian Rial', ISK: 'Icelandic Króna', JMD: 'Jamaican Dollar', JOD: 'Jordanian Dinar',
  JPY: 'Japanese Yen', KES: 'Kenyan Shilling', KGS: 'Kyrgyz Som', KHR: 'Cambodian Riel',
  KMF: 'Comorian Franc', KRW: 'South Korean Won', KWD: 'Kuwaiti Dinar', KZT: 'Kazakhstani Tenge',
  LAK: 'Lao Kip', LBP: 'Lebanese Pound', LKR: 'Sri Lankan Rupee', LRD: 'Liberian Dollar',
  MAD: 'Moroccan Dirham', MDL: 'Moldovan Leu', MGA: 'Malagasy Ariary', MKD: 'Macedonian Denar',
  MMK: 'Myanmar Kyat', MNT: 'Mongolian Tugrik', MOP: 'Macanese Pataca', MRU: 'Ouguiya',
  MUR: 'Mauritian Rupee', MVR: 'Maldivian Rufiyaa', MWK: 'Malawian Kwacha', MXN: 'Mexican Peso',
  MYR: 'Malaysian Ringgit', MZN: 'Mozambican Metical', NAD: 'Namibian Dollar', NGN: 'Nigerian Naira',
  NIO: 'Córdoba', NOK: 'Norwegian Krone', NPR: 'Nepalese Rupee', NZD: 'New Zealand Dollar',
  OMR: 'Omani Rial', PAB: 'Balboa', PEN: 'Peruvian Sol', PGK: 'Kina',
  PHP: 'Philippine Peso', PKR: 'Pakistani Rupee', PLN: 'Polish Złoty', PYG: 'Guarani',
  QAR: 'Qatari Riyal', RON: 'Romanian Leu', RSD: 'Serbian Dinar', RUB: 'Russian Ruble',
  RWF: 'Rwandan Franc', SAR: 'Saudi Riyal', SCR: 'Seychellois Rupee', SDG: 'Sudanese Pound',
  SEK: 'Swedish Krona', SGD: 'Singapore Dollar', SLL: 'Sierra Leonean Leone', SOS: 'Somali Shilling',
  SRD: 'Surinamese Dollar', STN: 'São Tomé Dobra', SYP: 'Syrian Pound', SZL: 'Lilangeni',
  THB: 'Thai Baht', TJS: 'Somoni', TMT: 'Turkmen Manat', TND: 'Tunisian Dinar',
  TOP: 'Tongan Paʻanga', TRY: 'Turkish Lira', TTD: 'Trinidad Dollar', TWD: 'Taiwan Dollar',
  TZS: 'Tanzanian Shilling', UAH: 'Ukrainian Hryvnia', UGX: 'Ugandan Shilling', USD: 'US Dollar',
  UYU: 'Uruguayan Peso', UZS: 'Uzbek Som', VES: 'Venezuelan Bolívar', VND: 'Vietnamese Đồng',
  VUV: 'Vanuatu Vatu', WST: 'Samoan Tala', XAF: 'CFA Franc (Central)', XCD: 'East Caribbean Dollar',
  XOF: 'CFA Franc (West)', XPF: 'CFP Franc', YER: 'Yemeni Rial', ZAR: 'South African Rand',
  ZMW: 'Zambian Kwacha', ZWL: 'Zimbabwean Dollar',
};

/** Country & city names for each currency — enables search by country/city */
export const CURRENCY_SEARCH_TERMS: Record<string, string> = {
  USD: 'United States America USA New York Los Angeles Chicago Miami Houston Dallas San Francisco Seattle Las Vegas Boston Washington DC Hawaii Guam Puerto Rico',
  EUR: 'Europe EU Eurozone Germany France Italy Spain Netherlands Belgium Austria Portugal Ireland Finland Greece Luxembourg Malta Estonia Latvia Lithuania Slovakia Slovenia Cyprus Paris Berlin Rome Madrid Amsterdam Barcelona Vienna Lisbon Dublin Helsinki Athens Munich Milan',
  GBP: 'United Kingdom England Britain Scotland Wales Northern Ireland London Manchester Liverpool Birmingham Edinburgh Glasgow Bristol',
  JPY: 'Japan Tokyo Osaka Kyoto Nagoya Fukuoka Sapporo Hiroshima Yokohama Kobe Nara',
  CAD: 'Canada Toronto Vancouver Montreal Ottawa Calgary Edmonton Quebec Halifax Victoria Winnipeg',
  AUD: 'Australia Sydney Melbourne Brisbane Perth Adelaide Gold Coast Cairns Canberra Darwin Hobart',
  CHF: 'Switzerland Zurich Geneva Basel Bern Lucerne Liechtenstein',
  CNY: 'China Beijing Shanghai Guangzhou Shenzhen Chengdu Hangzhou Xian Nanjing Wuhan Tianjin',
  INR: 'India Mumbai Delhi Bangalore Hyderabad Chennai Kolkata Pune Jaipur Ahmedabad Goa Agra Udaipur Kerala',
  MXN: 'Mexico Mexico City Cancun Cabo San Lucas Playa del Carmen Tulum Guadalajara Oaxaca Puerto Vallarta Merida Tijuana',
  BRL: 'Brazil São Paulo Rio de Janeiro Brasilia Salvador Fortaleza Recife Curitiba Manaus Belo Horizonte',
  KRW: 'South Korea Seoul Busan Jeju Incheon Daegu Gwangju',
  THB: 'Thailand Bangkok Phuket Chiang Mai Pattaya Krabi Koh Samui Koh Phangan Hua Hin',
  SGD: 'Singapore',
  NZD: 'New Zealand Auckland Wellington Christchurch Queenstown Rotorua Cook Islands',
  AED: 'UAE United Arab Emirates Dubai Abu Dhabi Sharjah Ajman',
  AFN: 'Afghanistan Kabul',
  ALL: 'Albania Tirana',
  AMD: 'Armenia Yerevan',
  ANG: 'Curaçao Sint Maarten Netherlands Antilles',
  AOA: 'Angola Luanda',
  ARS: 'Argentina Buenos Aires Mendoza Patagonia Bariloche Córdoba',
  AWG: 'Aruba',
  AZN: 'Azerbaijan Baku',
  BAM: 'Bosnia Herzegovina Sarajevo Mostar',
  BBD: 'Barbados Bridgetown',
  BDT: 'Bangladesh Dhaka Chittagong',
  BGN: 'Bulgaria Sofia Plovdiv Varna',
  BHD: 'Bahrain Manama',
  BIF: 'Burundi Bujumbura',
  BMD: 'Bermuda Hamilton',
  BND: 'Brunei Bandar Seri Begawan',
  BOB: 'Bolivia La Paz Santa Cruz Sucre',
  BSD: 'Bahamas Nassau',
  BTN: 'Bhutan Thimphu',
  BWP: 'Botswana Gaborone',
  BYN: 'Belarus Minsk',
  BZD: 'Belize Belize City',
  CDF: 'Congo Kinshasa',
  CLP: 'Chile Santiago Valparaiso',
  COP: 'Colombia Bogota Medellin Cartagena Cali Barranquilla',
  CRC: 'Costa Rica San Jose',
  CUP: 'Cuba Havana Varadero',
  CVE: 'Cape Verde Cabo Verde',
  CZK: 'Czech Republic Czechia Prague Brno',
  DJF: 'Djibouti',
  DKK: 'Denmark Copenhagen Aarhus Greenland Faroe Islands',
  DOP: 'Dominican Republic Santo Domingo Punta Cana',
  DZD: 'Algeria Algiers',
  EGP: 'Egypt Cairo Alexandria Luxor Sharm El Sheikh Hurghada Aswan',
  ERN: 'Eritrea Asmara',
  ETB: 'Ethiopia Addis Ababa',
  FJD: 'Fiji Suva Nadi',
  GEL: 'Georgia Tbilisi Batumi',
  GHS: 'Ghana Accra Kumasi',
  GMD: 'Gambia Banjul',
  GNF: 'Guinea Conakry',
  GTQ: 'Guatemala Guatemala City Antigua',
  GYD: 'Guyana Georgetown',
  HKD: 'Hong Kong Kowloon',
  HNL: 'Honduras Tegucigalpa',
  HRK: 'Croatia Zagreb Dubrovnik Split',
  HTG: 'Haiti Port-au-Prince',
  HUF: 'Hungary Budapest',
  IDR: 'Indonesia Bali Jakarta Yogyakarta Ubud Lombok Komodo',
  ILS: 'Israel Tel Aviv Jerusalem Haifa Eilat Palestine',
  IQD: 'Iraq Baghdad Erbil',
  IRR: 'Iran Tehran Isfahan Shiraz',
  ISK: 'Iceland Reykjavik',
  JMD: 'Jamaica Kingston Montego Bay',
  JOD: 'Jordan Amman Petra',
  KES: 'Kenya Nairobi Mombasa',
  KGS: 'Kyrgyzstan Bishkek',
  KHR: 'Cambodia Phnom Penh Siem Reap Angkor Wat',
  KMF: 'Comoros',
  KWD: 'Kuwait Kuwait City',
  KZT: 'Kazakhstan Almaty Astana Nur-Sultan',
  LAK: 'Laos Vientiane Luang Prabang',
  LBP: 'Lebanon Beirut',
  LKR: 'Sri Lanka Colombo Kandy Galle',
  LRD: 'Liberia Monrovia',
  MAD: 'Morocco Marrakech Casablanca Fez Tangier Rabat Chefchaouen',
  MDL: 'Moldova Chisinau',
  MGA: 'Madagascar Antananarivo',
  MKD: 'North Macedonia Skopje Ohrid',
  MMK: 'Myanmar Burma Yangon Mandalay Bagan',
  MNT: 'Mongolia Ulaanbaatar',
  MOP: 'Macau Macao',
  MRU: 'Mauritania Nouakchott',
  MUR: 'Mauritius Port Louis',
  MVR: 'Maldives Male',
  MWK: 'Malawi Lilongwe',
  MYR: 'Malaysia Kuala Lumpur Penang Langkawi Borneo',
  MZN: 'Mozambique Maputo',
  NAD: 'Namibia Windhoek',
  NGN: 'Nigeria Lagos Abuja',
  NIO: 'Nicaragua Managua',
  NOK: 'Norway Oslo Bergen Tromsø Svalbard',
  NPR: 'Nepal Kathmandu Pokhara',
  OMR: 'Oman Muscat',
  PAB: 'Panama Panama City',
  PEN: 'Peru Lima Cusco Machu Picchu',
  PGK: 'Papua New Guinea Port Moresby',
  PHP: 'Philippines Manila Cebu Boracay Palawan',
  PKR: 'Pakistan Karachi Lahore Islamabad',
  PLN: 'Poland Warsaw Krakow Gdansk Wroclaw',
  PYG: 'Paraguay Asuncion',
  QAR: 'Qatar Doha',
  RON: 'Romania Bucharest Cluj-Napoca Brasov',
  RSD: 'Serbia Belgrade Novi Sad',
  RUB: 'Russia Moscow Saint Petersburg',
  RWF: 'Rwanda Kigali',
  SAR: 'Saudi Arabia Riyadh Jeddah Mecca Medina',
  SCR: 'Seychelles Victoria',
  SDG: 'Sudan Khartoum',
  SEK: 'Sweden Stockholm Gothenburg Malmö',
  SLL: 'Sierra Leone Freetown',
  SOS: 'Somalia Mogadishu',
  SRD: 'Suriname Paramaribo',
  STN: 'São Tomé and Príncipe',
  SYP: 'Syria Damascus',
  SZL: 'Eswatini Swaziland Mbabane',
  TJS: 'Tajikistan Dushanbe',
  TMT: 'Turkmenistan Ashgabat',
  TND: 'Tunisia Tunis',
  TOP: 'Tonga Nukualofa',
  TRY: 'Turkey Türkiye Istanbul Ankara Antalya Cappadocia Izmir Bodrum',
  TTD: 'Trinidad Tobago Port of Spain',
  TWD: 'Taiwan Taipei',
  TZS: 'Tanzania Dar es Salaam Zanzibar Kilimanjaro',
  UAH: 'Ukraine Kyiv Lviv Odessa',
  UGX: 'Uganda Kampala',
  UYU: 'Uruguay Montevideo Punta del Este',
  UZS: 'Uzbekistan Tashkent Samarkand Bukhara',
  VES: 'Venezuela Caracas',
  VND: 'Vietnam Ho Chi Minh City Hanoi Da Nang Hoi An',
  VUV: 'Vanuatu Port Vila',
  WST: 'Samoa Apia',
  XAF: 'Central Africa Cameroon Gabon Chad Congo Brazzaville',
  XCD: 'East Caribbean Antigua Dominica Grenada Saint Kitts Saint Lucia Saint Vincent',
  XOF: 'West Africa Senegal Côte d\'Ivoire Ivory Coast Burkina Faso Mali Niger Togo Benin Dakar',
  XPF: 'French Polynesia New Caledonia Tahiti Bora Bora Noumea',
  YER: 'Yemen Sana\'a',
  ZAR: 'South Africa Cape Town Johannesburg Durban',
  ZMW: 'Zambia Lusaka Livingstone',
  ZWL: 'Zimbabwe Harare Victoria Falls',
};
