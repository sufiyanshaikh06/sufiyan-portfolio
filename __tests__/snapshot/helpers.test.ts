import { describe, it, expect } from 'vitest';
import { normalizeRoutePath, IsoDateStringSchema, IsoTimestampSchema } from '@/lib/schemas/helpers';

describe('Shared Snapshot Helpers', () => {
  describe('normalizeRoutePath', () => {
    it('normalizes root path variants', () => {
      expect(normalizeRoutePath('/')).toBe('/');
      expect(normalizeRoutePath('///')).toBe('/');
      expect(normalizeRoutePath('')).toBe('/');
    });

    it('normalizes casing and duplicate/trailing slashes', () => {
      expect(normalizeRoutePath('/projects/integrum/')).toBe('/projects/integrum');
      expect(normalizeRoutePath('/PROJECTS/INTEGRUM')).toBe('/projects/integrum');
      expect(normalizeRoutePath('//projects///integrum//')).toBe('/projects/integrum');
      expect(normalizeRoutePath('projects/integrum')).toBe('/projects/integrum');
    });
  });

  describe('IsoDateStringSchema', () => {
    it('accepts valid YYYY-MM-DD dates', () => {
      expect(() => IsoDateStringSchema.parse('2026-09-20')).not.toThrow();
      expect(() => IsoDateStringSchema.parse('1999-01-01')).not.toThrow();
    });

    it('rejects timestamps, invalid formats, or non-dates', () => {
      expect(() => IsoDateStringSchema.parse('2026-09-20T00:00:00Z')).toThrow();
      expect(() => IsoDateStringSchema.parse('20-09-2026')).toThrow();
      expect(() => IsoDateStringSchema.parse('2026/09/20')).toThrow();
      expect(() => IsoDateStringSchema.parse('invalid-date')).toThrow();
    });
  });

  describe('IsoTimestampSchema', () => {
    it('accepts valid ISO datetimes with Z and timezone offsets', () => {
      expect(() => IsoTimestampSchema.parse('2026-09-20T10:00:00Z')).not.toThrow();
      expect(() => IsoTimestampSchema.parse('2026-09-20T15:30:00+05:30')).not.toThrow();
      expect(() => IsoTimestampSchema.parse('2026-09-20T02:00:00-07:00')).not.toThrow();
    });

    it('rejects plain dates or malformed strings', () => {
      expect(() => IsoTimestampSchema.parse('2026-09-20')).toThrow();
      expect(() => IsoTimestampSchema.parse('not-a-timestamp')).toThrow();
    });
  });
});
