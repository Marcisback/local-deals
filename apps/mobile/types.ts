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
  availability: DealAvailability;
  schedule: Schedule;
};

export type DealAvailability = 'active_now' | 'later_today';

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
  items: DealItem[];
  source: DealSource | null;
  lastVerifiedAt: string | null;
};

export type DealItem = {
  name: string;
  category: string | null;
  description: string | null;
  dealPrice: number | null;
  regularPrice: number | null;
  discountText: string | null;
};

export type DealSource = {
  type: DealSourceType;
  url: string | null;
  label: string | null;
};

export type DealSourceType =
  | 'official_website'
  | 'instagram'
  | 'facebook'
  | 'phone'
  | 'business_submission'
  | 'user_submission'
  | 'manual'
  | 'other'
  | 'seed';

export type Schedule = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};
