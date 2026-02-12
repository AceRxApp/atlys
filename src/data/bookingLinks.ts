export interface BookingService {
  id: string;
  name: string;
  emoji: string;
  category: 'flights' | 'hotels' | 'experiences';
  description: string;
  buildUrl: (cityName: string) => string;
}

export const BOOKING_SERVICES: BookingService[] = [
  {
    id: 'google-flights',
    name: 'Google Flights',
    emoji: '\u2708\uFE0F',
    category: 'flights',
    description: 'Search flights',
    buildUrl: (city) => `https://www.google.com/travel/flights?q=flights+to+${encodeURIComponent(city)}`,
  },
  {
    id: 'skyscanner',
    name: 'Skyscanner',
    emoji: '\u2708\uFE0F',
    category: 'flights',
    description: 'Compare flights',
    buildUrl: (city) => `https://www.skyscanner.com/transport/flights-to/${encodeURIComponent(city)}/`,
  },
  {
    id: 'booking',
    name: 'Booking.com',
    emoji: '\u{1F3E8}',
    category: 'hotels',
    description: 'Hotels & stays',
    buildUrl: (city) => `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city)}`,
  },
  {
    id: 'airbnb',
    name: 'Airbnb',
    emoji: '\u{1F3E0}',
    category: 'hotels',
    description: 'Homes & apartments',
    buildUrl: (city) => `https://www.airbnb.com/s/${encodeURIComponent(city)}/homes`,
  },
  {
    id: 'hostelworld',
    name: 'Hostelworld',
    emoji: '\u{1F6CC}',
    category: 'hotels',
    description: 'Budget stays',
    buildUrl: (city) => `https://www.hostelworld.com/s?q=${encodeURIComponent(city)}`,
  },
  {
    id: 'getyourguide',
    name: 'GetYourGuide',
    emoji: '\u{1F3AF}',
    category: 'experiences',
    description: 'Tours & activities',
    buildUrl: (city) => `https://www.getyourguide.com/s/?q=${encodeURIComponent(city)}`,
  },
];
