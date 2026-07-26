export type NearbyDealsResponse = {
  deals: NearbyDeal[];
};

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
