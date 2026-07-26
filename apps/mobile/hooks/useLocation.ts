import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type LocationStatus = 'loading' | 'success' | 'denied' | 'error';

export type LocationDetails = {
  label: string;
  note: string;
};

type UseLocationResult = {
  status: LocationStatus;
  coordinates: Coordinates | null;
  locationDetails: LocationDetails;
  errorMessage: string;
};

export function useLocation(): UseLocationResult {
  const [status, setStatus] = useState<LocationStatus>('loading');
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [locationDetails, setLocationDetails] = useState<LocationDetails>({
    label: 'Current Location',
    note: ''
  });
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

  return {
    status,
    coordinates,
    locationDetails,
    errorMessage
  };
}

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
