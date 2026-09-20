import { z } from 'zod';

/**
 * Normalizes an internal route path by removing duplicate slashes,
 * trimming trailing slashes (except for root '/'), converting to lowercase,
 * and ensuring a leading slash.
 */
export function normalizeRoutePath(value: string): string {
  if (!value || typeof value !== 'string') return '/';
  const trimmed = value.trim();
  const normalized = trimmed.toLowerCase().replace(/\/+/g, '/').replace(/\/+$/, '');
  return normalized.startsWith('/') ? normalized || '/' : `/${normalized}`;
}

/**
 * Validates a SQL calendar date in strict YYYY-MM-DD format.
 */
export const IsoDateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a valid date in YYYY-MM-DD format');

/**
 * Validates an ISO 8601 timestamp string with required timezone offset or 'Z'.
 */
export const IsoTimestampSchema = z
  .string()
  .datetime({ offset: true, message: 'Must be an ISO 8601 timestamp with timezone or Z' });
