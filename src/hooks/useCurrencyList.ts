import { useState, useEffect, useCallback } from 'react';
import { fetchAllRates, detectLocaleCurrency } from '../utils/currency';
import { hapticSelection, hapticNotification } from '../utils/haptics';

const STORAGE_KEY = 'nxstops_currency_list';
const BASE_KEY = 'nxstops_base_currency';
const DEFAULT_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD'];

export function useCurrencyList() {
  const [baseCurrency, setBaseCurrencyRaw] = useState<string>(() => {
    const saved = localStorage.getItem(BASE_KEY);
    if (saved) return saved;
    // Auto-detect from locale on first load
    return detectLocaleCurrency();
  });
  const [currencies, setCurrencies] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    // Default list includes detected locale currency
    const detected = detectLocaleCurrency();
    const defaults = [...DEFAULT_CURRENCIES];
    if (!defaults.includes(detected)) {
      defaults.unshift(detected);
    }
    return defaults;
  });
  // allRates stores ALL rates from base (160+ currencies)
  const [allRates, setAllRates] = useState<Record<string, number>>({});
  const [rates, setRates] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currencies));
  }, [currencies]);

  useEffect(() => {
    localStorage.setItem(BASE_KEY, baseCurrency);
  }, [baseCurrency]);

  const setBaseCurrency = useCallback((code: string) => {
    hapticSelection();
    setBaseCurrencyRaw(code);
  }, []);

  // Fetch ALL rates from base currency (one API call for 160+ currencies)
  const fetchRates = useCallback(async () => {
    setLoading(true);
    const fetched = await fetchAllRates(baseCurrency);
    if (fetched) {
      setAllRates(fetched);
      // Extract rates for user's currency list
      const newRates: Record<string, number | null> = { [baseCurrency]: 1 };
      for (const code of currencies) {
        if (code === baseCurrency) continue;
        newRates[code] = fetched[code] ?? null;
      }
      setRates(newRates);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } else {
      // If fetch fails, set all to null
      const newRates: Record<string, number | null> = { [baseCurrency]: 1 };
      for (const code of currencies) {
        if (code !== baseCurrency) newRates[code] = null;
      }
      setRates(newRates);
    }
    setLoading(false);
  }, [baseCurrency, currencies]);

  useEffect(() => { fetchRates(); }, [fetchRates]);

  // When currencies change but allRates already fetched, update rates immediately
  useEffect(() => {
    if (Object.keys(allRates).length === 0) return;
    const newRates: Record<string, number | null> = { [baseCurrency]: 1 };
    for (const code of currencies) {
      if (code === baseCurrency) continue;
      newRates[code] = allRates[code] ?? null;
    }
    setRates(newRates);
  }, [currencies, allRates, baseCurrency]);

  const addCurrency = (code: string) => {
    if (!currencies.includes(code)) {
      hapticSelection();
      setCurrencies(prev => [...prev, code]);
    }
  };

  const removeCurrency = (code: string) => {
    hapticNotification('Warning');
    setCurrencies(prev => prev.filter(c => c !== code));
  };

  const reorderCurrencies = (oldIndex: number, newIndex: number) => {
    if (oldIndex === newIndex) return;
    hapticSelection();
    setCurrencies(prev => {
      const result = [...prev];
      const [removed] = result.splice(oldIndex, 1);
      result.splice(newIndex, 0, removed);
      return result;
    });
  };

  // Convert any amount between any two currencies using allRates
  const convert = useCallback((amount: number, from: string, to: string): number | null => {
    if (from === to) return amount;
    if (from === baseCurrency) {
      // Direct: base → target
      const rate = allRates[to];
      return rate != null ? amount * rate : null;
    }
    if (to === baseCurrency) {
      // Inverse: source → base
      const rate = allRates[from];
      return rate != null ? amount / rate : null;
    }
    // Cross: source → base → target
    const rateFrom = allRates[from];
    const rateTo = allRates[to];
    if (rateFrom == null || rateTo == null) return null;
    return amount * (rateTo / rateFrom);
  }, [allRates, baseCurrency]);

  // Get rate for any currency relative to base
  const getRate = useCallback((code: string): number | null => {
    if (code === baseCurrency) return 1;
    return allRates[code] ?? null;
  }, [allRates, baseCurrency]);

  return {
    baseCurrency, setBaseCurrency,
    currencies, rates, loading,
    addCurrency, removeCurrency, reorderCurrencies,
    selectedCurrency, setSelectedCurrency,
    refreshRates: fetchRates,
    convert, getRate, lastUpdated,
    allRates,
  };
}
