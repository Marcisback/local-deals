import { StyleSheet, Text, View } from 'react-native';

import { formatTimeRange, formatTimeValue } from '../lib/formatTime';
import type { NearbyDeal } from '../types';

type DealCardProps = {
  deal: NearbyDeal;
};

export function DealCard({ deal }: DealCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <Text style={styles.dealTitle}>{deal.deal.title}</Text>
        <Text style={styles.venueName}>{deal.venue.name}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaPill}>
            <Text style={styles.metaPillText}>{formatVenueType(deal.venue.venueType)}</Text>
          </View>
          <Text style={styles.distanceText}>{deal.distanceMiles.toFixed(1)} mi away</Text>
        </View>

        <Text style={styles.timeText}>{formatScheduleLabel(deal)}</Text>
        <Text style={styles.locationText}>{formatVenueLocation(deal.venue.city, deal.venue.region)}</Text>

        {deal.deal.description ? (
          <Text style={styles.dealDescription} numberOfLines={3}>
            {deal.deal.description}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function formatScheduleLabel(deal: NearbyDeal) {
  if (deal.availability === 'later_today') {
    return `Starts at ${formatTimeValue(deal.schedule.startTime)}`;
  }

  return formatTimeRange(deal.schedule.startTime, deal.schedule.endTime);
}

function formatVenueLocation(city: string | null, region: string | null) {
  return [city, region].filter(Boolean).join(', ') || 'Location unavailable';
}

function formatVenueType(value: string) {
  if (value.length === 0) {
    return value;
  }

  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

const styles = StyleSheet.create({
  card: {
    marginTop: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 8
    },
    elevation: 2
  },
  content: {
    paddingVertical: 16,
    paddingHorizontal: 16
  },
  dealTitle: {
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 24,
    color: '#0F172A'
  },
  venueName: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '700',
    color: '#334155'
  },
  metaRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  metaPill: {
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
    paddingVertical: 6,
    paddingHorizontal: 10
  },
  metaPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A'
  },
  distanceText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569'
  },
  timeText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A'
  },
  locationText: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 18,
    color: '#64748B'
  },
  dealDescription: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 19,
    color: '#475569'
  }
});
