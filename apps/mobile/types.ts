export type NearbyDealsResponse = {
  deals: NearbyDeal[];
};

export type RadiusMiles = 5 | 10 | 15 | 25;

export type VenueType = 'restaurant' | 'bar' | 'brewery' | 'cafe';

export type VenueFilter = 'all' | VenueType;

export type NearbyDeal = {
  venue: Venue;
  deal: Deal;
  distanceMiles: number;
  schedule: Schedule;
};

export type Venue = {
  id: string;
  name: string;
  venueType: string;
  city: string | null;
  region: string | null;
};

export type Deal = {
  id: string;
  title: string;
  description: string | null;
};

export type Schedule = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};
