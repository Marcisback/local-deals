import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DealCard } from './components/DealCard';
import { useLocation } from './hooks/useLocation';
import { useNearbyDeals } from './hooks/useNearbyDeals';
import type { LocationDetails, LocationStatus } from './hooks/useLocation';
import type { NearbyDealsStatus } from './hooks/useNearbyDeals';
import type { NearbyDeal } from './types';

export default function App() {
  const { status: locationStatus, coordinates, locationDetails, errorMessage: locationErrorMessage } = useLocation();
  const { status: nearbyDealsStatus, deals, errorMessage: nearbyDealsErrorMessage } = useNearbyDeals(coordinates);

  const locationContent = renderLocationContent(locationStatus, coordinates, locationDetails, locationErrorMessage);
  const dealsContent = renderDealsContent(nearbyDealsStatus, deals, nearbyDealsErrorMessage);

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
  coordinates: { latitude: number; longitude: number } | null,
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

function renderDealsContent(status: NearbyDealsStatus, deals: NearbyDeal[], errorMessage: string) {
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
      {deals.map((deal) => (
        <DealCard key={deal.deal.id} deal={deal} />
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
  }
});
