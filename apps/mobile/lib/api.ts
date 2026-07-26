import type { Deal, NearbyDeal, NearbyDealsResponse, RadiusMiles, Schedule, Venue, VenueType } from '../types';

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

  return isVenue(value.venue) && isDeal(value.deal) && isSchedule(value.schedule);
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
    (typeof value.description === 'string' || value.description === null)
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
