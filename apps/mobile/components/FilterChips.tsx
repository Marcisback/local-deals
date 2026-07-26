import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type FilterOption<T extends string | number> = {
  label: string;
  value: T;
};

type FilterChipsProps<T extends string | number> = {
  label: string;
  options: FilterOption<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
  horizontal?: boolean;
};

export function FilterChips<T extends string | number>({
  label,
  options,
  selectedValue,
  onSelect,
  horizontal = false
}: FilterChipsProps<T>) {
  const content = (
    <View style={[styles.chipGroup, horizontal ? styles.chipGroupHorizontal : null]}>
      {options.map((option) => {
        const isSelected = option.value === selectedValue;

        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${option.label}`}
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(option.value)}
            style={[styles.chip, isSelected ? styles.chipSelected : null]}
          >
            <Text style={[styles.chipText, isSelected ? styles.chipTextSelected : null]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      {horizontal ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 10
  },
  label: {
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    letterSpacing: 0.1
  },
  scrollContent: {
    paddingRight: 8
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  chipGroupHorizontal: {
    flexWrap: 'nowrap'
  },
  chip: {
    minHeight: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D7DEE8',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center'
  },
  chipSelected: {
    borderColor: '#0F172A',
    backgroundColor: '#0F172A'
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155'
  },
  chipTextSelected: {
    color: '#FFFFFF'
  }
});
