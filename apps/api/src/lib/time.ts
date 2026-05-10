/** Parse strings like 15m, 7d into milliseconds. */
export function parseTtlToMs(ttl: string): number {
  const match = ttl.trim().match(/^(\d+)(s|m|h|d)$/);
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }
  const n = parseInt(match[1], 10);
  const u = match[2];
  const mult = u === 's' ? 1000 : u === 'm' ? 60_000 : u === 'h' ? 3_600_000 : 86_400_000;
  return n * mult;
}
