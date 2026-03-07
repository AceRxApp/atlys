import { useState, useCallback, useEffect } from 'react';
import type { TripLogistics, Reservation } from '../types';

const EMPTY_LOGISTICS: TripLogistics = {
  reservations: [],
  tickets: [],
  hotel: null,
  transitPass: null,
};

export function useTripLogistics(citySlug: string) {
  const storageKey = `nxstops_logistics_${citySlug}`;

  const [logistics, setLogistics] = useState<TripLogistics>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : EMPTY_LOGISTICS;
    } catch {
      return EMPTY_LOGISTICS;
    }
  });

  // Re-load when citySlug changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setLogistics(saved ? JSON.parse(saved) : EMPTY_LOGISTICS);
    } catch {
      setLogistics(EMPTY_LOGISTICS);
    }
  }, [storageKey]);

  // Persist on every change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(logistics));
    } catch { /* storage full */ }
  }, [logistics, storageKey]);

  // --- Reservations ---

  const addReservation = useCallback((
    name: string,
    dateTime: string,
    confirmationNumber: string,
    notes?: string,
  ) => {
    const reservation: Reservation = {
      id: crypto.randomUUID(),
      name,
      dateTime,
      confirmationNumber,
      notes,
    };
    setLogistics(prev => ({
      ...prev,
      reservations: [...prev.reservations, reservation],
    }));
  }, []);

  const removeReservation = useCallback((id: string) => {
    setLogistics(prev => ({
      ...prev,
      reservations: prev.reservations.filter(r => r.id !== id),
    }));
  }, []);

  // --- Tickets ---

  const addTicket = useCallback((
    name: string,
    url?: string,
    reference?: string,
  ) => {
    const ticket = {
      id: crypto.randomUUID(),
      name,
      url,
      reference,
    };
    setLogistics(prev => ({
      ...prev,
      tickets: [...prev.tickets, ticket],
    }));
  }, []);

  const removeTicket = useCallback((id: string) => {
    setLogistics(prev => ({
      ...prev,
      tickets: prev.tickets.filter(t => t.id !== id),
    }));
  }, []);

  // --- Hotel ---

  const setHotel = useCallback((
    hotel: { name: string; address: string; checkIn: string; checkOut: string } | null,
  ) => {
    setLogistics(prev => ({ ...prev, hotel }));
  }, []);

  // --- Transit Pass ---

  const setTransitPass = useCallback((
    transitPass: { type: string; reference: string } | null,
  ) => {
    setLogistics(prev => ({ ...prev, transitPass }));
  }, []);

  // --- Clear All ---

  const clearLogistics = useCallback(() => {
    setLogistics(EMPTY_LOGISTICS);
    try {
      localStorage.removeItem(storageKey);
    } catch { /* ignore */ }
  }, [storageKey]);

  return {
    // State
    reservations: logistics.reservations,
    tickets: logistics.tickets,
    hotel: logistics.hotel,
    transitPass: logistics.transitPass,

    // Handlers
    addReservation,
    removeReservation,
    addTicket,
    removeTicket,
    setHotel,
    setTransitPass,
    clearLogistics,
  };
}
