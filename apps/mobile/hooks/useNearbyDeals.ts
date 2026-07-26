import { useEffect, useState } from 'react';

import type { NearbyDeal } from '../types';
import { DISCOVERY_RADIUS_MILES, fetchNearbyDeals, getNearbyDealsApiUrl } from '../lib/api';
import type { Coordinates } from './useLocation';

export type NearbyDealsStatus = 'idle' | 'loading' | 'success' | 'config-error' | 'error';

type UseNearbyDealsResult = {
  status: NearbyDealsStatus;
  deals: NearbyDeal[];
  errorMessage: string;
};

export function useNearbyDeals(coordinates: Coordinates | null): UseNearbyDealsResult {
  const [status, setStatus] = useState<NearbyDealsStatus>('idle');
  const [deals, setDeals] = useState<NearbyDeal[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    if (!coordinates) {
      setStatus('idle');
      setDeals([]);
      setErrorMessage('');
      return () => {
        isMounted = false;
      };
    }

    const { latitude, longitude } = coordinates;

    async function loadNearbyDeals() {
      const apiUrl = getNearbyDealsApiUrl();

      if (!apiUrl) {
        if (!isMounted) {
          return;
        }

        setStatus('config-error');
        setErrorMessage('Set EXPO_PUBLIC_API_URL to load nearby deals.');
        return;
      }

      try {
        setErrorMessage('');
        setStatus('loading');

        const response = await fetchNearbyDeals(
          apiUrl,
          latitude,
          longitude,
          DISCOVERY_RADIUS_MILES
        );

        if (!isMounted) {
          return;
        }

        setDeals(response.deals);
        setStatus('success');
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : 'Unable to load nearby deals.');
        setStatus('error');
      }
    }

    void loadNearbyDeals();

    return () => {
      isMounted = false;
    };
  }, [coordinates?.latitude, coordinates?.longitude]);

  return {
    status,
    deals,
    errorMessage
  };
}
