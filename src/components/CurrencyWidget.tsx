import { useState, useEffect } from 'react';
import { getCityCurrency, fetchExchangeRate, CURRENCY_NAMES } from '../utils/currency';

interface Props {
  cityName: string;
  theme: Record<string, any>;
  cardStyle: React.CSSProperties;
}

const QUICK_AMOUNTS = [1, 10, 50, 100];

export default function CurrencyWidget({ cityName, theme, cardStyle }: Props) {
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
    <div style={{
      ...cardStyle,
      display: 'flex', flexDirection: 'column', gap: '12px',
      border: `1px solid ${theme.border.subtle}`,
      background: theme.bg.surfaceAlpha,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '12px',
            background: theme.accent.amberGradient,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px',
          }}>
            {'\u{1F4B1}'}
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: theme.text.primary }}>
              {displayName} ({code})
            </div>
            {tip && (
              <div style={{ fontSize: '11px', color: theme.text.tertiary }}>{tip}</div>
            )}
          </div>
        </div>
        {loading && (
          <div style={{ fontSize: '11px', color: theme.text.tertiary }}>Loading...</div>
        )}
      </div>

      {rate !== null && (
        <>
          {/* Main conversion */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: theme.bg.elevated, borderRadius: '12px', padding: '12px',
            border: `1px solid ${theme.border.subtle}`,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', color: theme.text.tertiary, marginBottom: '4px' }}>USD</div>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(Math.max(0, Number(e.target.value)))}
                style={{
                  width: '100%', background: 'none', border: 'none', outline: 'none',
                  color: theme.text.primary, fontSize: '20px', fontWeight: 700,
                  fontFamily: 'inherit',
                }}
              />
            </div>
            <div style={{ fontSize: '20px', color: theme.text.tertiary }}>{'\u2192'}</div>
            <div style={{ flex: 1, textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: theme.text.tertiary, marginBottom: '4px' }}>{code}</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: theme.accent.amber }}>
                {formatConverted(amount)}
              </div>
            </div>
          </div>

          {/* Quick amounts */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {QUICK_AMOUNTS.map(amt => (
              <button
                key={amt}
                onClick={() => setAmount(amt)}
                style={{
                  flex: 1, padding: '8px 4px', borderRadius: '10px',
                  background: amount === amt ? theme.amberTint.bg10 : theme.bg.elevated,
                  border: `1px solid ${amount === amt ? theme.amberTint.border20 : theme.border.subtle}`,
                  color: amount === amt ? theme.accent.amber : theme.text.secondary,
                  fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '2px',
                }}
              >
                <span>${amt}</span>
                <span style={{ fontSize: '10px', opacity: 0.7 }}>{formatConverted(amt)}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
