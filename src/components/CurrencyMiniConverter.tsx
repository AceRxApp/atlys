import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchExchangeRate, detectLocaleCurrency, getCityCurrency, CURRENCY_FLAGS, CURRENCY_NAMES, CURRENCY_SEARCH_TERMS } from '../utils/currency';

const POPULAR_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'MXN', 'BRL', 'KRW', 'THB', 'SGD', 'NZD'];

export default function CurrencyMiniConverter({
  cityName,
  onClose,
}: {
  cityName?: string;
  onClose: () => void;
}) {
  const homeCurrency = detectLocaleCurrency();
  const cityCurrencyInfo = cityName ? getCityCurrency(cityName) : null;
  const destinationCurrency = cityCurrencyInfo?.code || 'USD';

  const [from, setFrom] = useState(destinationCurrency);
  const [to, setTo] = useState(homeCurrency === destinationCurrency ? 'EUR' : homeCurrency);
  const [amount, setAmount] = useState('100');
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const loadRate = useCallback(async () => {
    if (from === to) { setRate(1); return; }
    setLoading(true);
    const r = await fetchExchangeRate(from, to);
    setRate(r);
    setLoading(false);
  }, [from, to]);

  useEffect(() => { loadRate(); }, [loadRate]);

  const converted = rate && amount ? (parseFloat(amount) * rate) : null;

  const swapCurrencies = () => {
    setFrom(to);
    setTo(from);
  };

  const CurrencyPicker = ({ current, onSelect, onCancel }: { current: string; onSelect: (c: string) => void; onCancel: () => void }) => {
    const [search, setSearch] = useState('');
    const filtered = useMemo(() => {
      const q = search.toLowerCase().trim();
      if (!q) {
        // No search — show popular first, then all remaining
        const rest = Object.keys(CURRENCY_NAMES).filter(c => !POPULAR_CURRENCIES.includes(c));
        return [...POPULAR_CURRENCIES, ...rest];
      }
      return Object.keys(CURRENCY_NAMES).filter(code => {
        const name = CURRENCY_NAMES[code] || '';
        const terms = CURRENCY_SEARCH_TERMS[code] || '';
        return (
          code.toLowerCase().includes(q) ||
          name.toLowerCase().includes(q) ||
          terms.toLowerCase().includes(q)
        );
      });
    }, [search]);

    return (
      <div className="absolute inset-0 z-10 bg-bg-body rounded-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <span className="text-sm font-semibold text-text-primary">Select Currency</span>
          <button onClick={onCancel} className="text-xs text-text-tertiary bg-transparent border-none cursor-pointer">Cancel</button>
        </div>
        <div className="px-3 py-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search country, city, or currency..."
            className="input-field w-full text-sm"
            autoFocus
          />
        </div>
        <div className="flex-1 overflow-auto px-2 pb-2">
          {filtered.slice(0, 40).map(code => (
            <button
              key={code}
              onClick={() => onSelect(code)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-none cursor-pointer text-left mb-0.5 ${
                code === current ? 'bg-amber-tint-bg15 text-accent-amber' : 'bg-transparent text-text-primary'
              }`}
            >
              <span className="text-base">{CURRENCY_FLAGS[code] || '\u{1F4B1}'}</span>
              <span className="text-sm font-medium">{code}</span>
              <span className="text-xs text-text-tertiary flex-1 truncate">{CURRENCY_NAMES[code] || ''}</span>
              {code === current && <span className="text-accent-amber text-sm">{'\u2713'}</span>}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-text-muted text-center py-6">No currencies found</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative card p-4 border border-amber-tint-border20" style={{ background: 'linear-gradient(135deg, var(--amber-tint-bg06), var(--bg-subtle))' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-base">{'\u{1F4B1}'}</span>
          <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">Quick Convert</span>
        </div>
        <button onClick={onClose} className="text-[11px] text-text-tertiary bg-transparent border-none cursor-pointer p-1">
          {'\u2715'}
        </button>
      </div>

      {/* Currency selectors */}
      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => setShowFromPicker(true)}
          className="flex-1 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border-medium bg-bg-subtle cursor-pointer">
          <span className="text-sm">{CURRENCY_FLAGS[from] || '\u{1F4B1}'}</span>
          <span className="text-sm font-semibold text-text-primary">{from}</span>
        </button>
        <button onClick={swapCurrencies}
          className="w-8 h-8 rounded-full bg-amber-tint-bg15 border border-amber-tint-border20 text-accent-amber text-sm cursor-pointer flex items-center justify-center shrink-0">
          {'\u21C4'}
        </button>
        <button onClick={() => setShowToPicker(true)}
          className="flex-1 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border-medium bg-bg-subtle cursor-pointer">
          <span className="text-sm">{CURRENCY_FLAGS[to] || '\u{1F4B1}'}</span>
          <span className="text-sm font-semibold text-text-primary">{to}</span>
        </button>
      </div>

      {/* Amount input + result */}
      <div className="flex items-stretch gap-2 mb-2">
        <div className="flex-1">
          <div className="text-[11px] text-text-tertiary mb-1">{from}</div>
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="input-field w-full text-base font-bold py-2"
            placeholder="0"
          />
        </div>
        <div className="flex items-center text-text-tertiary text-lg pt-4">=</div>
        <div className="flex-1">
          <div className="text-[11px] text-text-tertiary mb-1">{to}</div>
          <div className="px-3 py-2 rounded-xl border border-border-medium bg-bg-subtle text-base font-bold text-accent-amber min-h-[42px] flex items-center">
            {loading ? (
              <div className="w-4 h-4 border-2 border-accent-amber border-t-transparent rounded-full animate-spin" />
            ) : converted !== null ? (
              converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            ) : (
              <span className="text-text-muted text-sm">--</span>
            )}
          </div>
        </div>
      </div>

      {/* Rate info */}
      {rate && !loading && (
        <div className="text-[11px] text-text-tertiary text-center">
          1 {from} = {rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {to}
        </div>
      )}

      {/* Quick amounts */}
      <div className="flex gap-1.5 mt-2.5">
        {['10', '50', '100', '500'].map(v => (
          <button key={v} onClick={() => setAmount(v)}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium cursor-pointer border ${
              amount === v
                ? 'border-accent-amber bg-amber-tint-bg15 text-accent-amber'
                : 'border-border-subtle bg-transparent text-text-secondary'
            }`}>
            {v}
          </button>
        ))}
      </div>

      {/* Currency Pickers (overlay) */}
      {showFromPicker && (
        <CurrencyPicker current={from} onSelect={c => { setFrom(c); setShowFromPicker(false); }} onCancel={() => setShowFromPicker(false)} />
      )}
      {showToPicker && (
        <CurrencyPicker current={to} onSelect={c => { setTo(c); setShowToPicker(false); }} onCancel={() => setShowToPicker(false)} />
      )}
    </div>
  );
}
