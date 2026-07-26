import { StyleSheet, Text, View } from 'react-native';

import { formatTimeRange } from '../lib/formatTime';
import type { NearbyDeal } from '../types';

type DealCardProps = {
  deal: NearbyDeal;
};

export function DealCard({ deal }: DealCardProps) {
  return (
    <View style={styles.dealItem}>
      <Text style={styles.dealTitle}>{deal.deal.title}</Text>
      <Text style={styles.dealMeta}>
        {deal.venue.name} · {deal.venue.venueType}
      </Text>
      <Text style={styles.dealMeta}>
        {formatVenueLocation(deal.venue.city, deal.venue.region)} · {deal.distanceMiles.toFixed(2)} mi
      </Text>
      <Text style={styles.dealMeta}>
        {formatTimeRange(deal.schedule.startTime, deal.schedule.endTime)}
      </Text>
      {deal.deal.description ? <Text style={styles.dealDescription}>{deal.deal.description}</Text> : null}
    </View>
  );
}

function formatVenueLocation(city: string | null, region: string | null) {
  return [city, region].filter(Boolean).join(', ') || 'Location unavailable';
}

const styles = StyleSheet.create({
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
