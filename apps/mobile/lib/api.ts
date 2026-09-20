import type {
  Deal,
  DealItem,
  DealSource,
  DealSourceType,
  NearbyDeal,
  NearbyDealsResponse,
  RadiusMiles,
  Schedule,
  Venue,
  VenueType
} from '../types';

export const DEFAULT_DISCOVERY_RADIUS_MILES: RadiusMiles = 25;

export function getNearbyDealsApiUrl() {
  return process.env.EXPO_PUBLIC_API_URL?.trim() ?? null;
}

export async function fetchNearbyDeals(
  apiUrl: string,
  latitude: number,
  longitude: number,
  radiusMiles: RadiusMiles = DEFAULT_DISCOVERY_RADIUS_MILES,
  venueType?: VenueType
): Promise<NearbyDealsResponse> {
  const url = buildNearbyDealsUrl(apiUrl, latitude, longitude, radiusMiles, venueType);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Nearby deals are unavailable right now.');
  }

  const data: unknown = await response.json();

  if (!isNearbyDealsResponse(data)) {
    throw new Error('Received an invalid nearby deals response.');
  }

  return data;
}

function buildNearbyDealsUrl(
  apiUrl: string,
  latitude: number,
  longitude: number,
  radiusMiles: RadiusMiles,
  venueType?: VenueType
): string {
  const url = new URL(apiUrl);
  const basePath = url.pathname.replace(/\/$/, '');
  const searchParams = new URLSearchParams({
    lat: latitude.toString(),
    lng: longitude.toString(),
    radiusMiles: radiusMiles.toString()
  });

  if (venueType) {
    searchParams.set('venueType', venueType);
  }

  url.pathname = `${basePath}/deals/nearby`;
  url.search = searchParams.toString();

  return url.toString();
}

function isNearbyDealsResponse(value: unknown): value is NearbyDealsResponse {
  if (!isRecord(value) || !Array.isArray(value.deals)) {
    return false;
  }

  return value.deals.every(isNearbyDeal);
}

function isNearbyDeal(value: unknown): value is NearbyDeal {
  if (!isRecord(value) || typeof value.distanceMiles !== 'number') {
    return false;
  }

  return (
    isVenue(value.venue) &&
    isDeal(value.deal) &&
    (value.availability === 'active_now' || value.availability === 'later_today') &&
    isSchedule(value.schedule)
  );
}

function isVenue(value: unknown): value is Venue {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.venueType === 'string' &&
    (typeof value.city === 'string' || value.city === null) &&
    (typeof value.region === 'string' || value.region === null)
  );
}

function isDeal(value: unknown): value is Deal {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    (typeof value.description === 'string' || value.description === null) &&
    Array.isArray(value.items) &&
    value.items.every(isDealItem) &&
    (value.source === null || isDealSource(value.source)) &&
    (typeof value.lastVerifiedAt === 'string' || value.lastVerifiedAt === null)
  );
}

function isDealItem(value: unknown): value is DealItem {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.name === 'string' &&
    (typeof value.category === 'string' || value.category === null) &&
    (typeof value.description === 'string' || value.description === null) &&
    (typeof value.dealPrice === 'number' || value.dealPrice === null) &&
    (typeof value.regularPrice === 'number' || value.regularPrice === null) &&
    (typeof value.discountText === 'string' || value.discountText === null)
  );
}

function isDealSource(value: unknown): value is DealSource {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isDealSourceType(value.type) &&
    (typeof value.url === 'string' || value.url === null) &&
    (typeof value.label === 'string' || value.label === null)
  );
}

function isDealSourceType(value: unknown): value is DealSourceType {
  return (
    value === 'official_website' ||
    value === 'phone' ||
    value === 'business_submission' ||
    value === 'user_submission' ||
    value === 'manual' ||
    value === 'seed'
  );
}

function isSchedule(value: unknown): value is Schedule {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.dayOfWeek === 'number' &&
    typeof value.startTime === 'string' &&
    typeof value.endTime === 'string'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
