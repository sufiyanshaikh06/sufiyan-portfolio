/**
 * Formats a YYYY-MM-DD ISO date string as "Mon YYYY" (e.g. "Jan 2024").
 *
 * Parses the date components directly and constructs a UTC midnight instant
 * to prevent timezone-induced day drift in non-UTC Node environments during
 * static site generation.
 */
export function formatIsoDate(isoDate: string): string {
  const [yearStr, monthStr] = isoDate.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr) - 1; // Intl month is 0-indexed
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month, 1)));
}
