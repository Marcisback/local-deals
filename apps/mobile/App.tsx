import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { NearbyDeal, NearbyDealsResponse } from './types';

const DISCOVERY_RADIUS_MILES = 25;

type LocationStatus = 'loading' | 'success' | 'denied' | 'error';

type Coordinates = {
  latitude: number;
  longitude: number;
};

type LocationDetails = {
  label: string;
  note: string;
};

type DealsStatus = 'idle' | 'loading' | 'success' | 'config-error' | 'error';

export default function App() {
  const [status, setStatus] = useState<LocationStatus>('loading');
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [locationDetails, setLocationDetails] = useState<LocationDetails>({
    label: 'Current Location',
    note: ''
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [dealsStatus, setDealsStatus] = useState<DealsStatus>('idle');
  const [nearbyDeals, setNearbyDeals] = useState<NearbyDeal[]>([]);
  const [dealsErrorMessage, setDealsErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentLocation() {
      try {
        setStatus('loading');
        setErrorMessage('');

        const currentPermission = await Location.getForegroundPermissionsAsync();
        let permissionStatus = currentPermission.status;

        if (permissionStatus !== Location.PermissionStatus.GRANTED) {
          const requestedPermission = await Location.requestForegroundPermissionsAsync();
          permissionStatus = requestedPermission.status;
        }

        if (!isMounted) {
          return;
        }

        if (permissionStatus !== Location.PermissionStatus.GRANTED) {
          setStatus('denied');
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });

        if (!isMounted) {
          return;
        }

        const address = await resolveLocationDetails(position.coords.latitude, position.coords.longitude);

        if (!isMounted) {
          return;
        }

        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setLocationDetails(address);
        setStatus('success');

        const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

        if (!apiUrl) {
          setDealsStatus('config-error');
          setDealsErrorMessage('Set EXPO_PUBLIC_API_URL to load nearby deals.');
          return;
        }

        setDealsStatus('loading');

        try {
          const deals = await fetchNearbyDeals(apiUrl, position.coords.latitude, position.coords.longitude);

          if (!isMounted) {
            return;
          }

          setNearbyDeals(deals);
          setDealsStatus('success');
        } catch (error) {
          if (!isMounted) {
            return;
          }

          setDealsErrorMessage(error instanceof Error ? error.message : 'Unable to load nearby deals.');
          setDealsStatus('error');
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : 'Unable to determine your location.');
        setStatus('error');
      }
    }

    void loadCurrentLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  const locationContent = renderLocationContent(status, coordinates, locationDetails, errorMessage);
  const dealsContent = renderDealsContent(dealsStatus, nearbyDeals, dealsErrorMessage);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.title}>Local Deals</Text>
      <Text style={styles.subtitle}>Find what's happening near you right now.</Text>
      {locationContent}
      {dealsContent}
    </ScrollView>
  );
}

function renderLocationContent(
  status: LocationStatus,
  coordinates: Coordinates | null,
  locationDetails: LocationDetails,
  errorMessage: string
) {
  if (status === 'loading') {
    return (
      <View style={styles.card}>
        <ActivityIndicator color="#0F172A" />
        <Text style={styles.cardText}>Requesting location...</Text>
      </View>
    );
  }

  if (status === 'success' && coordinates) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{locationDetails.label}</Text>
        {locationDetails.note ? <Text style={styles.cardNote}>{locationDetails.note}</Text> : null}
        <Text style={styles.cardText}>Latitude: {coordinates.latitude.toFixed(6)}</Text>
        <Text style={styles.cardText}>Longitude: {coordinates.longitude.toFixed(6)}</Text>
      </View>
    );
  }

  if (status === 'denied') {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Location permission denied</Text>
        <Text style={styles.cardText}>Enable foreground location access to continue.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Location error</Text>
      <Text style={styles.cardText}>{errorMessage || 'Unable to retrieve your location.'}</Text>
    </View>
  );
}

function renderDealsContent(status: DealsStatus, deals: NearbyDeal[], errorMessage: string) {
  if (status === 'idle') {
    return null;
  }

  if (status === 'loading') {
    return (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Nearby Deals</Text>
        <ActivityIndicator color="#0F172A" />
        <Text style={styles.cardText}>Loading nearby deals...</Text>
      </View>
    );
  }

  if (status === 'config-error') {
    return (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Nearby Deals</Text>
        <Text style={styles.cardTitle}>API configuration missing</Text>
        <Text style={styles.cardText}>{errorMessage}</Text>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Nearby Deals</Text>
        <Text style={styles.cardTitle}>Unable to load deals</Text>
        <Text style={styles.cardText}>{errorMessage || 'Nearby deals are unavailable right now.'}</Text>
      </View>
    );
  }

  if (deals.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Nearby Deals</Text>
        <Text style={styles.cardText}>No active deals nearby right now.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Nearby Deals</Text>
      {deals.map((nearbyDeal) => (
        <View key={nearbyDeal.deal.id} style={styles.dealItem}>
          <Text style={styles.dealTitle}>{nearbyDeal.deal.title}</Text>
          <Text style={styles.dealMeta}>
            {nearbyDeal.venue.name} · {nearbyDeal.venue.venueType}
          </Text>
          <Text style={styles.dealMeta}>
            {formatVenueLocation(nearbyDeal.venue)} · {nearbyDeal.distanceMiles.toFixed(2)} mi
          </Text>
          <Text style={styles.dealMeta}>
            {formatTimeRange(nearbyDeal.schedule.startTime, nearbyDeal.schedule.endTime)}
          </Text>
          {nearbyDeal.deal.description ? <Text style={styles.dealDescription}>{nearbyDeal.deal.description}</Text> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    paddingHorizontal: 24,
    backgroundColor: '#F8FAFC'
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.6,
    color: '#0F172A',
    textAlign: 'center'
  },
  subtitle: {
    marginTop: 12,
    fontSize: 17,
    lineHeight: 24,
    color: '#475569',
    textAlign: 'center',
    maxWidth: 320
  },
  card: {
    marginTop: 28,
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 20,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 8
    },
    elevation: 3
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center'
  },
  cardNote: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
    textAlign: 'center'
  },
  cardText: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: '#334155',
    textAlign: 'center'
  },
  sectionTitle: {
    marginBottom: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center'
  },
  dealItem: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 16,
    marginTop: 16
  },
  dealTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'left'
  },
  dealMeta: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: '#475569',
    textAlign: 'left'
  },
  dealDescription: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#334155',
    textAlign: 'left'
  }
});

async function resolveLocationDetails(latitude: number, longitude: number): Promise<LocationDetails> {
  try {
    const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
    const address = addresses[0];

    if (!address) {
      return {
        label: 'Current Location',
        note: 'Human-readable location unavailable'
      };
    }

    const locality = address.city ?? address.district ?? address.subregion ?? '';
    const region = address.region ?? '';
    const label = [locality, region].filter(Boolean).join(', ');

    if (label) {
      return {
        label,
        note: ''
      };
    }

    const fallback = address.name ?? address.country ?? 'Current Location';

    return {
      label: fallback,
      note: 'Human-readable location unavailable'
    };
  } catch {
    return {
      label: 'Current Location',
      note: 'Human-readable location unavailable'
    };
  }
}

async function fetchNearbyDeals(apiUrl: string, latitude: number, longitude: number): Promise<NearbyDeal[]> {
  const url = buildNearbyDealsUrl(apiUrl, latitude, longitude);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Nearby deals are unavailable right now.');
  }

  const data: unknown = await response.json();

  if (!isNearbyDealsResponse(data)) {
    throw new Error('Received an invalid nearby deals response.');
  }

  return data.deals;
}

function buildNearbyDealsUrl(apiUrl: string, latitude: number, longitude: number): string {
  const url = new URL(apiUrl);
  const basePath = url.pathname.replace(/\/$/, '');

  url.pathname = `${basePath}/deals/nearby`;
  url.search = new URLSearchParams({
    lat: latitude.toString(),
    lng: longitude.toString(),
    radiusMiles: DISCOVERY_RADIUS_MILES.toString()
  }).toString();

  return url.toString();
}

function formatVenueLocation(venue: NearbyDeal['venue']) {
  return [venue.city, venue.region].filter(Boolean).join(', ') || 'Location unavailable';
}

function formatTimeRange(startTime: string, endTime: string) {
  return `${formatTimeValue(startTime)} - ${formatTimeValue(endTime)}`;
}

function formatTimeValue(value: string) {
  const parts = value.split(':');

  if (parts.length < 2) {
    return value;
  }

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return value;
  }

  const suffix = hours >= 12 ? 'PM' : 'AM';
  const normalizedHours = hours % 12 || 12;
  const normalizedMinutes = minutes.toString().padStart(2, '0');

  return `${normalizedHours}:${normalizedMinutes} ${suffix}`;
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

function isVenue(value: unknown): value is NearbyDeal['venue'] {
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

function isDeal(value: unknown): value is NearbyDeal['deal'] {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    (typeof value.description === 'string' || value.description === null)
  );
}

function isSchedule(value: unknown): value is NearbyDeal['schedule'] {
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
