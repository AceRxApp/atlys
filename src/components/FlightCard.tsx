import { memo } from 'react';
import type { FlightOffer } from '../hooks/useFlights';

// Airline code to display name mapping (common carriers)
const AIRLINE_NAMES: Record<string, string> = {
  AA: 'American', DL: 'Delta', UA: 'United', WN: 'Southwest', B6: 'JetBlue',
  AS: 'Alaska', NK: 'Spirit', F9: 'Frontier', HA: 'Hawaiian', SY: 'Sun Country',
  BA: 'British Airways', AF: 'Air France', LH: 'Lufthansa', KL: 'KLM',
  IB: 'Iberia', AZ: 'ITA Airways', SK: 'SAS', AY: 'Finnair', OS: 'Austrian',
  LX: 'Swiss', TP: 'TAP', EI: 'Aer Lingus', FR: 'Ryanair', U2: 'easyJet',
  EK: 'Emirates', QR: 'Qatar', EY: 'Etihad', TK: 'Turkish', SV: 'Saudia',
  SQ: 'Singapore', CX: 'Cathay Pacific', QF: 'Qantas', NZ: 'Air New Zealand',
  NH: 'ANA', JL: 'JAL', KE: 'Korean Air', OZ: 'Asiana', BR: 'EVA Air',
  CI: 'China Airlines', MH: 'Malaysia', TG: 'Thai Airways', GA: 'Garuda',
  ET: 'Ethiopian', SA: 'South African', KQ: 'Kenya Airways', MS: 'EgyptAir',
  AM: 'Aeromexico', AV: 'Avianca', LA: 'LATAM', CM: 'Copa', G3: 'GOL',
  AC: 'Air Canada', WS: 'WestJet', VS: 'Virgin Atlantic', DY: 'Norwegian',
  W6: 'Wizz Air', VY: 'Vueling', PC: 'Pegasus', '6E': 'IndiGo',
};

function getAirlineName(code: string): string {
  return AIRLINE_NAMES[code] || code;
}

interface FlightCardProps {
  flights: FlightOffer[];
  originAirport: string;
  destinationAirport: string;
  googleFlightsUrl: string | null;
  compact?: boolean;
}

/** Full flight card for HomeScreen */
export const FlightCard = memo(function FlightCard({
  flights,
  originAirport,
  destinationAirport,
  googleFlightsUrl,
}: FlightCardProps) {
  if (flights.length === 0) return null;

  const cheapest = flights[0];

  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-elevated overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--amber-tint-bg15)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.8.3 1.1L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.7 5.3c.3.4.7.5 1.1.3l.5-.3c.4-.2.6-.6.5-1.1z" />
            </svg>
          </div>
          <div>
            <div className="text-[13px] font-semibold text-text-primary">
              Flights from {originAirport}
            </div>
            <div className="text-[11px] text-text-tertiary">
              {originAirport} → {destinationAirport}
            </div>
          </div>
        </div>
        {googleFlightsUrl && (
          <a
            href={googleFlightsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] text-accent-amber font-medium no-underline"
          >
            See all →
          </a>
        )}
      </div>

      {/* Flight rows */}
      <div className="px-4 pb-3">
        {flights.map((flight, i) => (
          <a
            key={i}
            href={flight.deepLink || flight.bookingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between py-2.5 no-underline border-t border-border-subtle first:border-t-0"
            aria-label={`Book ${getAirlineName(flight.airline)} flight for $${flight.price}, ${flight.duration}, ${flight.stopsLabel}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="text-[13px] font-semibold text-text-primary w-[80px] truncate">
                {getAirlineName(flight.airline)}
              </div>
              <div className="text-[12px] text-text-secondary">
                {flight.duration}
              </div>
              <div className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
                flight.stops === 0
                  ? 'text-status-green bg-green-tint-bg'
                  : 'text-text-tertiary bg-bg-subtle'
              }`}>
                {flight.stopsLabel}
              </div>
            </div>
            <div className="text-[15px] font-bold text-text-primary shrink-0 ml-3">
              ${flight.price}
            </div>
          </a>
        ))}
      </div>

      {/* Book button */}
      {cheapest.deepLink && (
        <div className="px-4 pb-3.5">
          <a
            href={cheapest.deepLink || googleFlightsUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-2.5 rounded-xl text-center text-[13px] font-semibold no-underline border border-accent-amber text-accent-amber active:scale-[0.98] transition-transform"
            style={{ background: 'var(--amber-tint-bg06)' }}
          >
            Book from ${cheapest.price} →
          </a>
        </div>
      )}
    </div>
  );
});

/** Compact single-line flight display for PlanScreen */
export const FlightLine = memo(function FlightLine({
  flights,
  originAirport,
  destinationAirport,
  googleFlightsUrl,
}: FlightCardProps) {
  if (flights.length === 0) return null;

  const cheapest = flights[0];

  return (
    <a
      href={cheapest.deepLink || googleFlightsUrl || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-border-subtle bg-bg-elevated no-underline active:scale-[0.98] transition-transform"
      aria-label={`Book flight from ${originAirport} to ${destinationAirport} from $${cheapest.price}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.8.3 1.1L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.7 5.3c.3.4.7.5 1.1.3l.5-.3c.4-.2.6-.6.5-1.1z" />
      </svg>
      <span className="text-[12px] text-text-secondary">
        From <span className="font-semibold text-text-primary">${cheapest.price}</span>
        {' · '}{originAirport} → {destinationAirport}
        {' · '}{cheapest.duration} {cheapest.stopsLabel.toLowerCase()}
      </span>
      <span className="text-[11px] text-accent-amber font-medium ml-auto shrink-0">Book →</span>
    </a>
  );
});

/** Loading skeleton for flight card */
export const FlightCardSkeleton = memo(function FlightCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-elevated overflow-hidden animate-pulse">
      <div className="px-4 pt-3.5 pb-2 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-bg-subtle" />
        <div>
          <div className="w-32 h-3.5 rounded bg-bg-subtle mb-1" />
          <div className="w-20 h-3 rounded bg-bg-subtle" />
        </div>
      </div>
      <div className="px-4 pb-3.5 space-y-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-16 h-3.5 rounded bg-bg-subtle" />
              <div className="w-12 h-3 rounded bg-bg-subtle" />
              <div className="w-14 h-4 rounded bg-bg-subtle" />
            </div>
            <div className="w-10 h-4 rounded bg-bg-subtle" />
          </div>
        ))}
      </div>
    </div>
  );
});
