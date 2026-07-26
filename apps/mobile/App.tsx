import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DealCard } from './components/DealCard';
import { FilterChips } from './components/FilterChips';
import { useLocation } from './hooks/useLocation';
import { useNearbyDeals } from './hooks/useNearbyDeals';
import { DEFAULT_DISCOVERY_RADIUS_MILES } from './lib/api';
import type { LocationDetails, LocationStatus } from './hooks/useLocation';
import type { NearbyDealsStatus } from './hooks/useNearbyDeals';
import type { NearbyDeal, RadiusMiles, VenueFilter } from './types';

const RADIUS_OPTIONS: RadiusMiles[] = [5, 10, 15, 25];

const VENUE_FILTER_OPTIONS: Array<{ label: string; value: VenueFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Restaurants', value: 'restaurant' },
  { label: 'Bars', value: 'bar' },
  { label: 'Breweries', value: 'brewery' },
  { label: 'Cafes', value: 'cafe' }
];

export default function App() {
  const [radiusMiles, setRadiusMiles] = useState<RadiusMiles>(DEFAULT_DISCOVERY_RADIUS_MILES);
  const [venueFilter, setVenueFilter] = useState<VenueFilter>('all');
  const { status: locationStatus, coordinates, locationDetails, errorMessage: locationErrorMessage } = useLocation();
  const { status: nearbyDealsStatus, deals, errorMessage: nearbyDealsErrorMessage } = useNearbyDeals(
    coordinates,
    radiusMiles,
    venueFilter
  );

  const locationContent = renderLocationContent(locationStatus, coordinates, locationDetails, locationErrorMessage);
  const dealsContent = renderDealsContent(nearbyDealsStatus, deals, nearbyDealsErrorMessage);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.brandTitle}>Local Deals</Text>
        {locationContent}
        <Text style={styles.heading}>Find something nearby</Text>
      </View>

      <View style={styles.filtersSection}>
        <FilterChips
          label="Category"
          options={VENUE_FILTER_OPTIONS}
          selectedValue={venueFilter}
          onSelect={setVenueFilter}
          horizontal
        />
        <FilterChips
          label="Distance"
          options={RADIUS_OPTIONS.map((option) => ({ label: `${option} mi`, value: option }))}
          selectedValue={radiusMiles}
          onSelect={setRadiusMiles}
          horizontal
        />
      </View>

      <View style={styles.feedHeader}>
        <Text style={styles.feedTitle}>Nearby right now</Text>
      </View>

      <View style={styles.feedSection}>{dealsContent}</View>
    </ScrollView>
  );
}

function renderLocationContent(
  status: LocationStatus,
  coordinates: { latitude: number; longitude: number } | null,
  locationDetails: LocationDetails,
  errorMessage: string
) {
  if (status === 'loading') {
    return (
      <View style={styles.locationBlock}>
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#0F172A" />
          <Text style={styles.locationSupportText}>Requesting your location...</Text>
        </View>
      </View>
    );
  }

  if (status === 'success' && coordinates) {
    return (
      <View style={styles.locationBlock}>
        <Text style={styles.locationMeta}>Current location</Text>
        <Text style={styles.locationLabel}>{locationDetails.label}</Text>
        {locationDetails.note ? <Text style={styles.locationSupportText}>{locationDetails.note}</Text> : null}
      </View>
    );
  }

  if (status === 'denied') {
    return (
      <View style={styles.locationBlock}>
        <Text style={styles.locationMeta}>Current location</Text>
        <Text style={styles.locationLabel}>Location permission denied</Text>
        <Text style={styles.locationSupportText}>Enable foreground location access to browse nearby deals.</Text>
      </View>
    );
  }

  return (
    <View style={styles.locationBlock}>
      <Text style={styles.locationMeta}>Current location</Text>
      <Text style={styles.locationLabel}>Location unavailable</Text>
      <Text style={styles.locationSupportText}>{errorMessage || 'Unable to retrieve your location.'}</Text>
    </View>
  );
}

function renderDealsContent(status: NearbyDealsStatus, deals: NearbyDeal[], errorMessage: string) {
  if (status === 'idle') {
    return (
      <View style={styles.stateCard}>
        <Text style={styles.stateTitle}>Waiting for your location</Text>
        <Text style={styles.stateText}>Nearby deals will appear once your location is available.</Text>
      </View>
    );
  }

  if (status === 'loading') {
    return (
      <View>
        <View style={styles.loadingCard}>
          <ActivityIndicator color="#0F172A" />
          <Text style={styles.stateTitle}>Loading nearby deals</Text>
          <Text style={styles.stateText}>Finding active spots that match your filters.</Text>
        </View>
        <View style={styles.loadingPreviewCard} />
        <View style={styles.loadingPreviewCardSecondary} />
      </View>
    );
  }

  if (status === 'config-error') {
    return (
      <View style={styles.stateCard}>
        <Text style={styles.stateTitle}>API configuration missing</Text>
        <Text style={styles.stateText}>{errorMessage}</Text>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={styles.stateCard}>
        <Text style={styles.stateTitle}>Unable to load deals</Text>
        <Text style={styles.stateText}>{errorMessage || 'Nearby deals are unavailable right now.'}</Text>
      </View>
    );
  }

  if (deals.length === 0) {
    return (
      <View style={styles.stateCard}>
        <Text style={styles.stateTitle}>No deals found nearby</Text>
        <Text style={styles.stateText}>Try increasing your distance or choosing another category.</Text>
      </View>
    );
  }

  return deals.map((deal) => <DealCard key={deal.deal.id} deal={deal} />);
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F7FB'
  },
  container: {
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 20
  },
  header: {
    paddingTop: 18
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: '#0F172A'
  },
  locationBlock: {
    marginTop: 10
  },
  locationMeta: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B'
  },
  locationLabel: {
    marginTop: 2,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5
  },
  locationSupportText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B'
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  heading: {
    marginTop: 14,
    fontSize: 28,
    lineHeight: 33,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.7
  },
  filtersSection: {
    marginTop: 14
  },
  feedHeader: {
    marginTop: 16,
    marginBottom: 10
  },
  feedTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.4
  },
  feedSection: {
    paddingBottom: 12
  },
  stateCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 18
  },
  loadingCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 18,
    alignItems: 'flex-start'
  },
  loadingPreviewCard: {
    marginTop: 12,
    height: 118,
    borderRadius: 22,
    backgroundColor: '#E8EEF6'
  },
  loadingPreviewCardSecondary: {
    marginTop: 10,
    height: 106,
    borderRadius: 22,
    backgroundColor: '#EEF3F8'
  },
  stateTitle: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A'
  },
  stateText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: '#64748B'
  }
});
