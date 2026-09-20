export function formatTimeRange(startTime: string, endTime: string) {
  return `${formatTimeValue(startTime)} - ${formatTimeValue(endTime)}`;
}

export function formatTimeValue(value: string) {
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
