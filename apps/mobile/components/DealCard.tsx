import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatTimeRange, formatTimeValue } from '../lib/formatTime';
import type { DealItem, NearbyDeal } from '../types';

const ITEM_PREVIEW_LIMIT = 3;

type DealCardProps = {
  deal: NearbyDeal;
};

export function DealCard({ deal }: DealCardProps) {
  const [itemsExpanded, setItemsExpanded] = useState(false);
  const visibleItems = itemsExpanded ? deal.deal.items : deal.deal.items.slice(0, ITEM_PREVIEW_LIMIT);
  const hiddenItemCount = deal.deal.items.length - ITEM_PREVIEW_LIMIT;
  const verificationLabel = formatVerificationLabel(deal.deal.lastVerifiedAt);
  const sourceLabel = formatSourceLabel(deal);
  const metadataLabel = [verificationLabel, sourceLabel].filter(Boolean).join(' · ');

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

        {visibleItems.length > 0 ? (
          <View style={styles.itemsSection}>
            {visibleItems.map((item, index) => {
              const offer = formatItemOffer(item);

              return (
                <View key={`${item.name}-${index}`} style={styles.itemRow}>
                  <Text style={styles.itemBullet}>•</Text>
                  <View style={styles.itemContent}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {offer ? <Text style={styles.itemOffer}>{offer}</Text> : null}
                  </View>
                </View>
              );
            })}

            {hiddenItemCount > 0 ? (
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setItemsExpanded((expanded) => !expanded)}
                style={styles.itemsToggle}
              >
                <Text style={styles.itemsToggleText}>
                  {itemsExpanded ? 'Show less' : `Show ${hiddenItemCount} more`}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {metadataLabel ? (
          <Text style={styles.verificationText} numberOfLines={1}>
            {metadataLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function formatItemOffer(item: DealItem) {
  const prices = [
    item.dealPrice === null ? null : formatPrice(item.dealPrice),
    item.regularPrice === null ? null : `was ${formatPrice(item.regularPrice)}`
  ].filter(Boolean);

  return [item.discountText, ...prices].filter(Boolean).join(' · ');
}

function formatPrice(value: number) {
  return `$${Number.isInteger(value) ? value.toString() : value.toFixed(2)}`;
}

function formatVerificationLabel(lastVerifiedAt: string | null) {
  if (!lastVerifiedAt) {
    return null;
  }

  const verifiedAt = new Date(lastVerifiedAt);
  if (Number.isNaN(verifiedAt.getTime())) {
    return 'Verified';
  }

  return `Verified ${verifiedAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

function formatSourceLabel(deal: NearbyDeal) {
  if (!deal.deal.source) {
    return null;
  }

  if (deal.deal.source.label) {
    return deal.deal.source.label;
  }

  switch (deal.deal.source.type) {
    case 'official_website':
      return 'Official website';
    case 'phone':
      return 'Phone confirmed';
    case 'business_submission':
      return 'Business provided';
    case 'user_submission':
      return 'Community submitted';
    default:
      return null;
  }
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
  },
  itemsSection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
    gap: 7
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  itemBullet: {
    width: 14,
    fontSize: 14,
    lineHeight: 19,
    color: '#64748B'
  },
  itemContent: {
    flex: 1
  },
  itemName: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
    color: '#334155'
  },
  itemOffer: {
    marginTop: 1,
    fontSize: 12,
    lineHeight: 16,
    color: '#64748B'
  },
  itemsToggle: {
    alignSelf: 'flex-start',
    paddingVertical: 3
  },
  itemsToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A'
  },
  verificationText: {
    marginTop: 11,
    fontSize: 12,
    lineHeight: 16,
    color: '#94A3B8'
  }
});
