import { CITY_CULTURE } from '../data/cityCulture';

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

interface CacheEntry {
  rate: number;
  timestamp: number;
}

/** Fetch exchange rate using frankfurter.app (free, no API key) with 1h cache */
export async function fetchExchangeRate(from: string, to: string): Promise<number | null> {
  if (from === to) return 1;

  const cacheKey = `${CACHE_KEY}_${from}_${to}`;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const entry: CacheEntry = JSON.parse(cached);
      if (Date.now() - entry.timestamp < CACHE_TTL) return entry.rate;
    }
  } catch { /* ignore */ }

  try {
    const res = await fetch(`/api/currency?from=${from}&to=${to}`);
    if (!res.ok) return null;
    const data = await res.json();
    const rate = data.rates?.[to];
    if (typeof rate !== 'number') return null;

    try {
      sessionStorage.setItem(cacheKey, JSON.stringify({ rate, timestamp: Date.now() }));
    } catch { /* storage full */ }

    return rate;
  } catch {
    return null;
  }
}

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
