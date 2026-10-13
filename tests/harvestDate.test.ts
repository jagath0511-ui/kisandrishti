import { describe, it, expect } from 'vitest';
import {
  calculateHarvestDate,
  formatFriendlyDate,
  getDaysUntilHarvest,
} from '../lib/harvestDate';

describe('Safe Harvest Date Calculations (lib/harvestDate.ts)', () => {
  it('correctly adds interval days to spray date', () => {
    expect(calculateHarvestDate('2026-10-13', 7)).toBe('2026-10-20');
    expect(calculateHarvestDate('2026-10-13', 14)).toBe('2026-10-27');
    expect(calculateHarvestDate('2026-10-13', 0)).toBe('2026-10-13');
  });

  it('handles month crossovers correctly', () => {
    // 31 days in October
    expect(calculateHarvestDate('2026-10-25', 7)).toBe('2026-11-01');
    expect(calculateHarvestDate('2026-10-25', 10)).toBe('2026-11-04');
    expect(calculateHarvestDate('2026-10-31', 1)).toBe('2026-11-01');
  });

  it('handles year crossovers correctly', () => {
    expect(calculateHarvestDate('2026-12-28', 5)).toBe('2027-01-02');
    expect(calculateHarvestDate('2026-12-31', 14)).toBe('2027-01-14');
  });

  it('handles leap years correctly', () => {
    // 2028 is a leap year (February has 29 days)
    expect(calculateHarvestDate('2028-02-25', 4)).toBe('2028-02-29');
    expect(calculateHarvestDate('2028-02-25', 5)).toBe('2028-03-01');

    // 2027 is a non-leap year (February has 28 days)
    expect(calculateHarvestDate('2027-02-25', 3)).toBe('2027-02-28');
    expect(calculateHarvestDate('2027-02-25', 4)).toBe('2027-03-01');
  });

  it('accepts Date objects directly', () => {
    const d = new Date(2026, 9, 15); // Oct 15 2026
    expect(calculateHarvestDate(d, 5)).toBe('2026-10-20');
  });

  it('throws an error for negative intervals', () => {
    expect(() => calculateHarvestDate('2026-10-13', -3)).toThrow(
      'intervalDays cannot be negative'
    );
  });

  it('throws an error for invalid date format strings', () => {
    expect(() => calculateHarvestDate('invalid-date', 7)).toThrow();
  });

  it('calculates days until harvest correctly', () => {
    expect(getDaysUntilHarvest('2026-10-20', '2026-10-13')).toBe(7);
    expect(getDaysUntilHarvest('2026-10-13', '2026-10-13')).toBe(0);
    expect(getDaysUntilHarvest('2026-10-10', '2026-10-13')).toBe(-3);
  });

  it('formats dates in a friendly format', () => {
    const formatted = formatFriendlyDate('2026-10-15');
    expect(formatted).toContain('15');
    expect(formatted).toContain('Oct');
    expect(formatted).toContain('2026');
  });
});

