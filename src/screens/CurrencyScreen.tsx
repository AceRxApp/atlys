import { useState, useMemo } from 'react';
import { useCurrencyList } from '../hooks/useCurrencyList';
import { CURRENCY_NAMES, CURRENCY_FLAGS, CURRENCY_SEARCH_TERMS } from '../utils/currency';
import { DragHandleIcon } from '../components/icons';
import ContextHint from '../components/ContextHint';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ---------- Sortable currency row ----------
function SortableCurrencyRow({
  code, rate, baseCurrency, onTap, onRemove,
}: {
  code: string; rate: number | null; baseCurrency: string;
  onTap: () => void; onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: code });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const flag = CURRENCY_FLAGS[code] || '\u{1F4B1}';
  const name = CURRENCY_NAMES[code] || code;
  const isBase = code === baseCurrency;

  return (
    <div ref={setNodeRef} style={style} {...attributes}
      className="flex items-center gap-3 py-3 px-3 bg-bg-surface rounded-xl border border-border-subtle mb-2">
      <div {...listeners} className="cursor-grab active:cursor-grabbing touch-none p-1">
        <DragHandleIcon color="var(--text-muted)" />
      </div>
      <button onClick={onTap} className="flex-1 flex items-center gap-3 text-left bg-transparent border-none cursor-pointer p-0">
        <span className="text-2xl">{flag}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-text-primary">{code}</div>
          <div className="text-xs text-text-tertiary truncate">{name}</div>
        </div>
        <div className="text-right">
          {isBase ? (
            <span className="text-xs font-medium text-accent-amber bg-amber-tint-bg10 px-2 py-0.5 rounded-full">Base</span>
          ) : rate != null ? (
            <span className="text-sm font-semibold text-text-primary">{rate < 0.01 ? rate.toFixed(6) : rate < 1 ? rate.toFixed(4) : rate.toFixed(2)}</span>
          ) : (
            <span className="text-xs text-text-muted">--</span>
          )}
        </div>
      </button>
      {!isBase && (
        <button onClick={onRemove} aria-label={`Remove ${code}`}
          className="text-status-red bg-red-tint-bg border border-red-tint-border rounded-lg px-2 py-1 text-xs cursor-pointer">
          ✕
        </button>
      )}
    </div>
  );
}

// ---------- Converter view ----------
function ConverterView({
  code, baseCurrency, rate, onBack,
}: {
  code: string; baseCurrency: string; rate: number | null; onBack: () => void;
}) {
  const [amount, setAmount] = useState('100');
  const flag = CURRENCY_FLAGS[code] || '\u{1F4B1}';
  const baseFlag = CURRENCY_FLAGS[baseCurrency] || '\u{1F4B1}';
  const name = CURRENCY_NAMES[code] || code;
  const numAmount = parseFloat(amount) || 0;
  const converted = rate != null ? numAmount * rate : 0;
  const inverseRate = rate != null && rate > 0 ? 1 / rate : null;
  const quickAmounts = [1, 10, 50, 100, 500, 1000];

  return (
    <div className="pb-36">
      <button onClick={onBack}
        className="flex items-center gap-2 text-accent-amber bg-transparent border-none cursor-pointer p-0 mb-4 text-sm font-medium">
        ← Back to list
      </button>

      <div className="flex items-center gap-3 mb-6">
        <span className="text-4xl">{flag}</span>
        <div>
          <h2 className="text-xl font-bold text-text-primary m-0">{code}</h2>
          <p className="text-sm text-text-secondary m-0">{name}</p>
        </div>
      </div>

      {/* From input */}
      <div className="card mb-3">
        <label className="text-xs text-text-tertiary mb-1 block">{baseCurrency}</label>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{baseFlag}</span>
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="flex-1 text-3xl font-bold text-text-primary bg-transparent border-none outline-none p-0"
            placeholder="0"
          />
        </div>
      </div>

      <div className="flex justify-center my-2">
        <span className="text-text-muted text-lg">↓</span>
      </div>

      {/* To output */}
      <div className="card mb-4" style={{ background: 'linear-gradient(135deg, var(--amber-tint-bg06), var(--bg-subtle))' }}>
        <label className="text-xs text-text-tertiary mb-1 block">{code}</label>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{flag}</span>
          <span className="text-3xl font-bold text-accent-amber">
            {converted < 0.01 && converted > 0 ? converted.toFixed(6) : converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Rate info — both directions */}
      {rate != null && (
        <div className="text-center mb-4">
          <p className="text-xs text-text-muted m-0">
            1 {baseCurrency} = {rate < 0.01 ? rate.toFixed(6) : rate.toFixed(4)} {code}
          </p>
          {inverseRate != null && (
            <p className="text-xs text-text-tertiary m-0 mt-0.5">
              1 {code} = {inverseRate < 0.01 ? inverseRate.toFixed(6) : inverseRate.toFixed(4)} {baseCurrency}
            </p>
          )}
        </div>
      )}

      {/* Quick amounts */}
      <div className="flex flex-wrap gap-2 justify-center">
        {quickAmounts.map(q => (
          <button key={q} onClick={() => setAmount(String(q))}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border ${
              amount === String(q)
                ? 'bg-accent-gradient text-text-on-accent border-transparent'
                : 'bg-bg-subtle border-border-subtle text-text-secondary'
            }`}>
            {q.toLocaleString()}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- Add currency modal ----------
function AddCurrencyModal({
  existing, onAdd, onClose,
}: {
  existing: string[]; onAdd: (code: string) => void; onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return Object.entries(CURRENCY_NAMES)
      .filter(([code, name]) =>
        !existing.includes(code) &&
        (code.toLowerCase().includes(q) || name.toLowerCase().includes(q) || (CURRENCY_SEARCH_TERMS[code] || '').toLowerCase().includes(q))
      )
      .slice(0, 30);
  }, [search, existing]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative w-full max-w-[430px] bg-bg-surface rounded-t-2xl p-4 pb-8 max-h-[70vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-text-primary m-0">Add Currency</h3>
          <button onClick={onClose} className="text-text-muted bg-transparent border-none cursor-pointer text-lg">✕</button>
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search country, city, or currency..."
          className="input-field mb-3"
          autoFocus
        />
        <div className="flex-1 overflow-y-auto">
          {filtered.map(([code, name]) => (
            <button key={code} onClick={() => { onAdd(code); onClose(); }}
              className="flex items-center gap-3 w-full text-left bg-transparent border-none cursor-pointer py-2.5 px-2 rounded-lg hover:bg-bg-subtle">
              <span className="text-xl">{CURRENCY_FLAGS[code] || '\u{1F4B1}'}</span>
              <span className="text-sm font-medium text-text-primary">{code}</span>
              <span className="text-xs text-text-tertiary flex-1">{name}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-text-muted text-center py-6">No currencies found</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Base currency picker modal ----------
function BasePickerModal({
  current, onSelect, onClose,
}: {
  current: string; onSelect: (code: string) => void; onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return Object.entries(CURRENCY_NAMES)
      .filter(([code, name]) =>
        code.toLowerCase().includes(q) || name.toLowerCase().includes(q) || (CURRENCY_SEARCH_TERMS[code] || '').toLowerCase().includes(q)
      )
      .slice(0, 40);
  }, [search]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative w-full max-w-[430px] bg-bg-surface rounded-t-2xl p-4 pb-8 max-h-[70vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-text-primary m-0">Base Currency</h3>
          <button onClick={onClose} className="text-text-muted bg-transparent border-none cursor-pointer text-lg">✕</button>
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search country, city, or currency..."
          className="input-field mb-3"
          autoFocus
        />
        <div className="flex-1 overflow-y-auto">
          {filtered.map(([code, name]) => (
            <button key={code} onClick={() => { onSelect(code); onClose(); }}
              className={`flex items-center gap-3 w-full text-left bg-transparent border-none cursor-pointer py-2.5 px-2 rounded-lg ${
                code === current ? 'bg-amber-tint-bg10' : ''
              }`}>
              <span className="text-xl">{CURRENCY_FLAGS[code] || '\u{1F4B1}'}</span>
              <span className="text-sm font-medium text-text-primary">{code}</span>
              <span className="text-xs text-text-tertiary flex-1">{name}</span>
              {code === current && <span className="text-accent-amber text-xs">✓</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Main Currency Screen ----------
export default function CurrencyScreen() {
  const {
    baseCurrency, setBaseCurrency,
    currencies, rates, loading,
    addCurrency, removeCurrency, reorderCurrencies,
    selectedCurrency, setSelectedCurrency,
    lastUpdated, refreshRates,
  } = useCurrencyList();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showBasePicker, setShowBasePicker] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = currencies.indexOf(active.id as string);
    const newIndex = currencies.indexOf(over.id as string);
    reorderCurrencies(oldIndex, newIndex);
  };

  // Converter view
  if (selectedCurrency) {
    return (
      <div className="px-4 pt-4 pb-36">
        <ConverterView
          code={selectedCurrency}
          baseCurrency={baseCurrency}
          rate={rates[selectedCurrency] ?? null}
          onBack={() => setSelectedCurrency(null)}
        />
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-36">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary m-0">Currencies</h1>
          {lastUpdated && (
            <p className="text-[11px] text-text-tertiary m-0 mt-0.5">
              Updated {lastUpdated}
              <button onClick={refreshRates} className="ml-1 text-accent-amber bg-transparent border-none cursor-pointer text-[11px] underline p-0">
                Refresh
              </button>
            </p>
          )}
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="bg-accent-gradient text-text-on-accent border-none rounded-full w-9 h-9 flex items-center justify-center cursor-pointer text-xl font-bold shadow-md">
          +
        </button>
      </div>

      <ContextHint
        storageKey="currency"
        title="Currency Converter"
        subtitle="Track exchange rates and convert currencies for your trip."
        hints={[
          { emoji: '\u{1F4B1}', title: 'Set your base currency', description: 'Tap "Base" to change your home currency. All rates are shown relative to it.' },
          { emoji: '\u{1F4B0}', title: 'Tap to convert', description: 'Tap any currency to open the full converter with quick amounts ($1, $10, $50, $100, $500).' },
          { emoji: '\u{2795}', title: 'Add currencies', description: 'Tap the + button to add any world currency. Search by country, city, or currency name.' },
          { emoji: '\u{2630}', title: 'Drag to reorder', description: 'Hold the drag handle to rearrange currencies. Remove any currency with the X button.' },
        ]}
      />

      {/* Base currency selector */}
      <button onClick={() => setShowBasePicker(true)}
        className="flex items-center gap-2 mb-4 py-2 px-3 rounded-lg bg-bg-subtle border border-border-subtle cursor-pointer w-full text-left">
        <span className="text-lg">{CURRENCY_FLAGS[baseCurrency] || '\u{1F4B1}'}</span>
        <span className="text-sm font-medium text-text-primary flex-1">Base: {baseCurrency}</span>
        <span className="text-xs text-text-muted">Change ▾</span>
      </button>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-shimmer w-full h-16 rounded-xl bg-bg-subtle" />
        </div>
      )}

      {/* Currency list */}
      {!loading && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={currencies} strategy={verticalListSortingStrategy}>
            {currencies.map(code => (
              <SortableCurrencyRow
                key={code}
                code={code}
                rate={rates[code] ?? null}
                baseCurrency={baseCurrency}
                onTap={() => code !== baseCurrency && setSelectedCurrency(code)}
                onRemove={() => removeCurrency(code)}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      {currencies.length === 0 && !loading && (
        <div className="card text-center py-8">
          <p className="text-text-secondary text-sm">No currencies added. Tap + to add some!</p>
        </div>
      )}

      {/* Add currency modal */}
      {showAddModal && (
        <AddCurrencyModal
          existing={currencies}
          onAdd={addCurrency}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Base currency picker modal (searchable, all currencies) */}
      {showBasePicker && (
        <BasePickerModal
          current={baseCurrency}
          onSelect={(code) => {
            setBaseCurrency(code);
            // Also add to list if not present
            if (!currencies.includes(code)) addCurrency(code);
          }}
          onClose={() => setShowBasePicker(false)}
        />
      )}
    </div>
  );
}
