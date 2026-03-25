import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTripLogistics } from '../hooks/useTripLogistics';
import { buildMapsUrl } from '../utils/transport';

export default function LogisticsPanel() {
  const { citySlug, showToast } = useApp();
  const {
    reservations,
    tickets,
    hotel,
    transitPass,
    addReservation,
    removeReservation,
    addTicket,
    removeTicket,
    setHotel,
    setTransitPass,
  } = useTripLogistics(citySlug);

  const [expanded, setExpanded] = useState(false);

  // Form visibility toggles
  const [showHotelForm, setShowHotelForm] = useState(false);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [showTransitForm, setShowTransitForm] = useState(false);

  // Hotel form state
  const [hotelName, setHotelName] = useState('');
  const [hotelAddress, setHotelAddress] = useState('');
  const [hotelCheckIn, setHotelCheckIn] = useState('');
  const [hotelCheckOut, setHotelCheckOut] = useState('');

  // Reservation form state
  const [resName, setResName] = useState('');
  const [resDateTime, setResDateTime] = useState('');
  const [resConfirmation, setResConfirmation] = useState('');
  const [resNotes, setResNotes] = useState('');

  // Ticket form state
  const [ticketName, setTicketName] = useState('');
  const [ticketUrl, setTicketUrl] = useState('');
  const [ticketRef, setTicketRef] = useState('');

  // Transit form state
  const [transitType, setTransitType] = useState('');
  const [transitRef, setTransitRef] = useState('');

  const itemCount = reservations.length + tickets.length + (hotel ? 1 : 0) + (transitPass ? 1 : 0);

  const handleSaveHotel = () => {
    if (!hotelName.trim()) return;
    setHotel({
      name: hotelName.trim(),
      address: hotelAddress.trim(),
      checkIn: hotelCheckIn,
      checkOut: hotelCheckOut,
    });
    setHotelName('');
    setHotelAddress('');
    setHotelCheckIn('');
    setHotelCheckOut('');
    setShowHotelForm(false);
    showToast('Hotel saved');
  };

  const handleSaveReservation = () => {
    if (!resName.trim() || !resDateTime) return;
    addReservation(resName.trim(), resDateTime, resConfirmation.trim(), resNotes.trim() || undefined);
    setResName('');
    setResDateTime('');
    setResConfirmation('');
    setResNotes('');
    setShowReservationForm(false);
    showToast('Reservation added');
  };

  const handleSaveTicket = () => {
    if (!ticketName.trim()) return;
    addTicket(ticketName.trim(), ticketUrl.trim() || undefined, ticketRef.trim() || undefined);
    setTicketName('');
    setTicketUrl('');
    setTicketRef('');
    setShowTicketForm(false);
    showToast('Ticket added');
  };

  const handleSaveTransit = () => {
    if (!transitType.trim()) return;
    setTransitPass({ type: transitType.trim(), reference: transitRef.trim() });
    setTransitType('');
    setTransitRef('');
    setShowTransitForm(false);
    showToast('Transit pass saved');
  };

  const formatDateTime = (dt: string): string => {
    try {
      const d = new Date(dt);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return dt;
    }
  };

  const formatDate = (d: string): string => {
    try {
      return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return d;
    }
  };

  const getDirectionsUrl = (address: string): string => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  return (
    <>
      {/* Backdrop when expanded */}
      {expanded && (
        <div
          className="fixed inset-0 bg-black/40 z-[149]"
          onClick={() => setExpanded(false)}
        />
      )}

      <div
        className="fixed left-0 right-0 z-[150] max-w-[430px] mx-auto transition-all duration-300 ease-out"
        style={{
          bottom: 'env(safe-area-inset-bottom, 0px)',
          maxHeight: expanded ? '70vh' : 'auto',
        }}
      >
        {/* Collapsed footer bar */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-3 px-4 border-none cursor-pointer flex items-center justify-between rounded-t-2xl"
          style={{ background: 'var(--bg-elevated)', borderTop: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{'\u{1F9F3}'}</span>
            <span className="text-sm font-semibold text-text-primary">Trip Info</span>
          </div>
          <div className="flex items-center gap-2">
            {itemCount > 0 && (
              <span className="text-xs font-semibold py-0.5 px-2 rounded-[10px] bg-amber-tint-bg10 text-accent-amber">
                {itemCount}
              </span>
            )}
            <span
              className="text-text-tertiary text-sm transition-transform duration-200"
              style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              {'\u{25B2}'}
            </span>
          </div>
        </button>

        {expanded && (
          <div className="px-4 pb-4 overflow-auto" style={{ background: 'var(--bg-elevated)', maxHeight: 'calc(70vh - 48px)' }}>
          {/* ---- HOTEL SECTION ---- */}
          <div className="mb-4">
            <div className="text-xs text-text-tertiary font-semibold mb-2 uppercase tracking-[0.05em]">
              {'\u{1F3E8}'} Hotel
            </div>

            {hotel ? (
              <div className="p-3 rounded-xl bg-bg-elevated border border-border-subtle">
                <div className="text-[14px] font-semibold text-text-primary">{hotel.name}</div>
                {hotel.address && (
                  <p className="text-xs text-text-secondary mt-1">{hotel.address}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5">
                  {hotel.checkIn && (
                    <span className="text-[11px] text-text-tertiary">
                      Check-in: {formatDate(hotel.checkIn)}
                    </span>
                  )}
                  {hotel.checkOut && (
                    <span className="text-[11px] text-text-tertiary">
                      Check-out: {formatDate(hotel.checkOut)}
                    </span>
                  )}
                </div>
                <div className="flex gap-2 mt-2.5">
                  {hotel.address && (
                    <a
                      href={getDirectionsUrl(hotel.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-[5px] px-2.5 rounded-lg text-xs bg-amber-tint-bg10 text-accent-amber no-underline flex items-center gap-1 font-medium"
                    >
                      {'\u{1F4CD}'} Get Directions
                    </a>
                  )}
                  <button
                    onClick={() => { setHotel(null); showToast('Hotel removed'); }}
                    className="py-[5px] px-2.5 rounded-lg text-xs bg-red-tint-bg text-status-red border border-red-tint-border cursor-pointer font-medium"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : showHotelForm ? (
              <div className="p-3 rounded-xl bg-bg-elevated border border-border-subtle">
                <input
                  type="text"
                  placeholder="Hotel name"
                  value={hotelName}
                  onChange={e => setHotelName(e.target.value)}
                  className="input-field w-full mb-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="Address"
                  value={hotelAddress}
                  onChange={e => setHotelAddress(e.target.value)}
                  className="input-field w-full mb-2 text-sm"
                />
                <div className="flex gap-2 mb-2">
                  <div className="flex-1">
                    <label className="text-[11px] text-text-tertiary mb-0.5 block">Check-in</label>
                    <input
                      type="date"
                      value={hotelCheckIn}
                      onChange={e => setHotelCheckIn(e.target.value)}
                      className="input-field w-full text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] text-text-tertiary mb-0.5 block">Check-out</label>
                    <input
                      type="date"
                      value={hotelCheckOut}
                      onChange={e => setHotelCheckOut(e.target.value)}
                      className="input-field w-full text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowHotelForm(false)}
                    className="flex-1 py-2 px-3 rounded-lg text-xs font-medium bg-transparent border border-border-medium text-text-secondary cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveHotel}
                    disabled={!hotelName.trim()}
                    className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold bg-accent-gradient text-text-on-accent border-none cursor-pointer disabled:opacity-40"
                  >
                    Save Hotel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowHotelForm(true)}
                className="w-full py-2.5 px-3 rounded-xl border border-dashed border-border-dashed bg-transparent text-text-tertiary text-xs font-medium cursor-pointer"
              >
                + Add Hotel
              </button>
            )}
          </div>

          {/* ---- RESERVATIONS SECTION ---- */}
          <div className="mb-4">
            <div className="text-xs text-text-tertiary font-semibold mb-2 uppercase tracking-[0.05em]">
              {'\u{1F4CB}'} Reservations
            </div>

            {reservations.length > 0 ? (
              <div className="flex flex-col gap-2">
                {reservations.map(res => (
                  <div
                    key={res.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-bg-elevated border border-border-subtle"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-text-primary truncate">{res.name}</div>
                      <div className="text-[11px] text-text-secondary mt-0.5">{formatDateTime(res.dateTime)}</div>
                      {res.confirmationNumber && (
                        <div className="text-[11px] text-text-tertiary mt-0.5">
                          Conf: {res.confirmationNumber}
                        </div>
                      )}
                      {res.notes && (
                        <div className="text-[11px] text-text-tertiary mt-0.5 italic">{res.notes}</div>
                      )}
                    </div>
                    <button
                      onClick={() => { removeReservation(res.id); showToast('Reservation removed'); }}
                      aria-label={`Remove ${res.name} reservation`}
                      className="shrink-0 w-8 h-8 rounded-lg bg-red-tint-bg border border-red-tint-border text-status-red text-xs font-bold cursor-pointer flex items-center justify-center min-h-[32px] min-w-[32px]"
                    >
                      {'\u2715'}
                    </button>
                  </div>
                ))}
              </div>
            ) : !showReservationForm ? (
              <p className="text-xs text-text-tertiary mb-2">No reservations added</p>
            ) : null}

            {showReservationForm ? (
              <div className="mt-2 p-3 rounded-xl bg-bg-elevated border border-border-subtle">
                <input
                  type="text"
                  placeholder="Restaurant / venue name"
                  value={resName}
                  onChange={e => setResName(e.target.value)}
                  className="input-field w-full mb-2 text-sm"
                />
                <input
                  type="datetime-local"
                  value={resDateTime}
                  onChange={e => setResDateTime(e.target.value)}
                  className="input-field w-full mb-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="Confirmation # (optional)"
                  value={resConfirmation}
                  onChange={e => setResConfirmation(e.target.value)}
                  className="input-field w-full mb-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="Notes (optional)"
                  value={resNotes}
                  onChange={e => setResNotes(e.target.value)}
                  className="input-field w-full mb-2 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowReservationForm(false)}
                    className="flex-1 py-2 px-3 rounded-lg text-xs font-medium bg-transparent border border-border-medium text-text-secondary cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveReservation}
                    disabled={!resName.trim() || !resDateTime}
                    className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold bg-accent-gradient text-text-on-accent border-none cursor-pointer disabled:opacity-40"
                  >
                    Add Reservation
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowReservationForm(true)}
                className="mt-2 w-full py-2.5 px-3 rounded-xl border border-dashed border-border-dashed bg-transparent text-text-tertiary text-xs font-medium cursor-pointer"
              >
                + Add Reservation
              </button>
            )}
          </div>

          {/* ---- TICKETS SECTION ---- */}
          <div className="mb-4">
            <div className="text-xs text-text-tertiary font-semibold mb-2 uppercase tracking-[0.05em]">
              {'\u{1F3AB}'} Tickets
            </div>

            {tickets.length > 0 ? (
              <div className="flex flex-col gap-2">
                {tickets.map(ticket => (
                  <div
                    key={ticket.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-bg-elevated border border-border-subtle"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-text-primary truncate">{ticket.name}</div>
                      {ticket.reference && (
                        <div className="text-[11px] text-text-tertiary mt-0.5">
                          Ref: {ticket.reference}
                        </div>
                      )}
                      {ticket.url && (
                        <a
                          href={ticket.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-accent-amber no-underline mt-0.5 inline-block font-medium"
                        >
                          Open Ticket {'\u2192'}
                        </a>
                      )}
                    </div>
                    <button
                      onClick={() => { removeTicket(ticket.id); showToast('Ticket removed'); }}
                      aria-label={`Remove ${ticket.name} ticket`}
                      className="shrink-0 w-8 h-8 rounded-lg bg-red-tint-bg border border-red-tint-border text-status-red text-xs font-bold cursor-pointer flex items-center justify-center min-h-[32px] min-w-[32px]"
                    >
                      {'\u2715'}
                    </button>
                  </div>
                ))}
              </div>
            ) : !showTicketForm ? (
              <p className="text-xs text-text-tertiary mb-2">No tickets added</p>
            ) : null}

            {showTicketForm ? (
              <div className="mt-2 p-3 rounded-xl bg-bg-elevated border border-border-subtle">
                <input
                  type="text"
                  placeholder="Ticket name (e.g., Museum pass)"
                  value={ticketName}
                  onChange={e => setTicketName(e.target.value)}
                  className="input-field w-full mb-2 text-sm"
                />
                <input
                  type="url"
                  placeholder="Ticket URL (optional)"
                  value={ticketUrl}
                  onChange={e => setTicketUrl(e.target.value)}
                  className="input-field w-full mb-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="Reference # (optional)"
                  value={ticketRef}
                  onChange={e => setTicketRef(e.target.value)}
                  className="input-field w-full mb-2 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowTicketForm(false)}
                    className="flex-1 py-2 px-3 rounded-lg text-xs font-medium bg-transparent border border-border-medium text-text-secondary cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveTicket}
                    disabled={!ticketName.trim()}
                    className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold bg-accent-gradient text-text-on-accent border-none cursor-pointer disabled:opacity-40"
                  >
                    Add Ticket
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowTicketForm(true)}
                className="mt-2 w-full py-2.5 px-3 rounded-xl border border-dashed border-border-dashed bg-transparent text-text-tertiary text-xs font-medium cursor-pointer"
              >
                + Add Ticket
              </button>
            )}
          </div>

          {/* ---- TRANSIT PASS SECTION ---- */}
          <div>
            <div className="text-xs text-text-tertiary font-semibold mb-2 uppercase tracking-[0.05em]">
              {'\u{1F68C}'} Transit Pass
            </div>

            {transitPass ? (
              <div className="p-3 rounded-xl bg-bg-elevated border border-border-subtle">
                <div className="text-[13px] font-semibold text-text-primary">{transitPass.type}</div>
                {transitPass.reference && (
                  <div className="text-[11px] text-text-tertiary mt-0.5">
                    Ref: {transitPass.reference}
                  </div>
                )}
                <button
                  onClick={() => { setTransitPass(null); showToast('Transit pass removed'); }}
                  className="mt-2 py-[5px] px-2.5 rounded-lg text-xs bg-red-tint-bg text-status-red border border-red-tint-border cursor-pointer font-medium"
                >
                  Remove
                </button>
              </div>
            ) : showTransitForm ? (
              <div className="p-3 rounded-xl bg-bg-elevated border border-border-subtle">
                <input
                  type="text"
                  placeholder="Pass type (e.g., Metro card, Day pass)"
                  value={transitType}
                  onChange={e => setTransitType(e.target.value)}
                  className="input-field w-full mb-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="Reference / card # (optional)"
                  value={transitRef}
                  onChange={e => setTransitRef(e.target.value)}
                  className="input-field w-full mb-2 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowTransitForm(false)}
                    className="flex-1 py-2 px-3 rounded-lg text-xs font-medium bg-transparent border border-border-medium text-text-secondary cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveTransit}
                    disabled={!transitType.trim()}
                    className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold bg-accent-gradient text-text-on-accent border-none cursor-pointer disabled:opacity-40"
                  >
                    Save Transit Pass
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowTransitForm(true)}
                className="w-full py-2.5 px-3 rounded-xl border border-dashed border-border-dashed bg-transparent text-text-tertiary text-xs font-medium cursor-pointer"
              >
                + Add Transit Pass
              </button>
            )}
          </div>
        </div>
      )}
      </div>
    </>
  );
}
