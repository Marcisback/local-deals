import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

type LocationStatus = 'loading' | 'success' | 'denied' | 'error';

type Coordinates = {
  latitude: number;
  longitude: number;
};

export default function App() {
  const [status, setStatus] = useState<LocationStatus>('loading');
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

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

        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setStatus('success');
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

  const locationContent = renderLocationContent(status, coordinates, errorMessage);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.title}>Local Deals</Text>
      <Text style={styles.subtitle}>Find what's happening near you right now.</Text>
      {locationContent}
    </View>
  );
}

function renderLocationContent(status: LocationStatus, coordinates: Coordinates | null, errorMessage: string) {
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
        <Text style={styles.cardTitle}>Current Location</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  cardText: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: '#334155',
    textAlign: 'center'
  }
});
