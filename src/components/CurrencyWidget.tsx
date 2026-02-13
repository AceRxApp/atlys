import { useState, useEffect } from 'react';
import { getCityCurrency, fetchExchangeRate, CURRENCY_NAMES } from '../utils/currency';

interface Props {
  cityName: string;
}

const QUICK_AMOUNTS = [1, 10, 50, 100];

export default function CurrencyWidget({ cityName }: Props) {
  const [amount, setAmount] = useState(10);
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const currencyInfo = getCityCurrency(cityName);

  useEffect(() => {
    if (!currencyInfo || currencyInfo.code === 'USD') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setRate(null);
    fetchExchangeRate('USD', currencyInfo.code).then(r => {
      setRate(r);
      setLoading(false);
    });
  }, [currencyInfo?.code]);

  if (!currencyInfo || currencyInfo.code === 'USD') return null;

  const { code, tip } = currencyInfo;
  const displayName = CURRENCY_NAMES[code] || code;

  const formatConverted = (usd: number) => {
    if (rate === null) return '—';
    const converted = usd * rate;
    return converted >= 100
      ? Math.round(converted).toLocaleString()
      : converted.toFixed(2);
  };

  return (
    <div className="card flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-accent-gradient flex items-center justify-center text-xl">
            {'\u{1F4B1}'}
          </div>
          <div>
            <div className="text-sm font-semibold text-text-primary">
              {displayName} ({code})
            </div>
            {tip && (
              <div className="text-[11px] text-text-tertiary">{tip}</div>
            )}
          </div>
        </div>
        {loading && (
          <div className="text-[11px] text-text-tertiary">Loading...</div>
        )}
      </div>

      {rate !== null && (
        <>
          {/* Main conversion */}
          <div className="flex items-center gap-2.5 bg-bg-elevated rounded-xl p-3 border border-border-subtle">
            <div className="flex-1">
              <div className="text-[11px] text-text-tertiary mb-1">USD</div>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(Math.max(0, Number(e.target.value)))}
                className="w-full bg-transparent border-none outline-none text-text-primary text-xl font-bold font-[inherit]"
              />
            </div>
            <div className="text-xl text-text-tertiary">{'\u2192'}</div>
            <div className="flex-1 text-right">
              <div className="text-[11px] text-text-tertiary mb-1">{code}</div>
              <div className="text-xl font-bold text-accent-amber">
                {formatConverted(amount)}
              </div>
            </div>
          </div>

          {/* Quick amounts */}
          <div className="flex gap-1.5">
            {QUICK_AMOUNTS.map(amt => (
              <button
                key={amt}
                onClick={() => setAmount(amt)}
                className={`flex-1 py-2 px-1 rounded-[10px] text-xs font-medium cursor-pointer flex flex-col items-center gap-0.5 border ${
                  amount === amt
                    ? 'bg-amber-tint-bg10 border-amber-tint-border20 text-accent-amber'
                    : 'bg-bg-elevated border-border-subtle text-text-secondary'
                }`}
              >
                <span>${amt}</span>
                <span className="text-[10px] opacity-70">{formatConverted(amt)}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
