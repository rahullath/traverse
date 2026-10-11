export type TimeFormat = 'clock' | 'chunks';

const CHUNKS: Array<[number, string]> = [
  [5, 'night'],
  [12, 'morning'],
  [17, 'afternoon'],
  [21, 'evening'],
  [24, 'night'],
];

export function formatTime(date: Date | string, format: TimeFormat = 'clock'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (format === 'chunks') {
    const h = d.getHours();
    return CHUNKS.find(([upTo]) => h < upTo)?.[1] ?? 'night';
  }
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}
