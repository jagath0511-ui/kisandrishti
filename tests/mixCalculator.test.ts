import { describe, it, expect } from 'vitest';
import {
  parseDosePerLitre,
  calculateTankMix,
  computeMixAmount,
} from '../lib/mixCalculator';

describe('lib/mixCalculator - Unit Tests', () => {
  describe('parseDosePerLitre', () => {
    it('parses standard milliliters ("2 ml")', () => {
      const res = parseDosePerLitre('2 ml');
      expect(res).toEqual({ doseNumber: 2, unit: 'ml' });
    });

    it('parses decimal milliliters with per-litre suffix ("2.5 ml/L")', () => {
      const res = parseDosePerLitre('2.5 ml/L');
      expect(res).toEqual({ doseNumber: 2.5, unit: 'ml' });
    });

    it('parses grams and standardizes gm ("1.5 gm")', () => {
      const res = parseDosePerLitre('1.5 gm');
      expect(res).toEqual({ doseNumber: 1.5, unit: 'g' });
    });

    it('parses grams with per-litre ("3 g/litre")', () => {
      const res = parseDosePerLitre('3 g/litre');
      expect(res).toEqual({ doseNumber: 3, unit: 'g' });
    });

    it('rejects unverified placeholder text ("TODO_VERIFY")', () => {
      expect(parseDosePerLitre('TODO_VERIFY')).toBeNull();
    });

    it('rejects ambiguous ranges ("2-3 ml")', () => {
      expect(parseDosePerLitre('2-3 ml')).toBeNull();
    });

    it('rejects empty or null input', () => {
      expect(parseDosePerLitre('')).toBeNull();
      expect(parseDosePerLitre(null)).toBeNull();
      expect(parseDosePerLitre(undefined)).toBeNull();
    });

    it('rejects non-numeric phrases ("refer product label")', () => {
      expect(parseDosePerLitre('refer product label')).toBeNull();
    });

    it('rejects zero or negative doses', () => {
      expect(parseDosePerLitre('0 ml')).toBeNull();
      expect(parseDosePerLitre('-2 ml')).toBeNull();
    });
  });

  describe('calculateTankMix', () => {
    it('calculates 10L tank: 2 ml/L * 10L = 20 ml', () => {
      const res = calculateTankMix(2, 10, 'ml');
      expect(res?.amount).toBe(20);
      expect(res?.formatted).toBe('20 ml');
    });

    it('calculates 15L tank: 2 ml/L * 15L = 30 ml', () => {
      const res = calculateTankMix(2, 15, 'ml');
      expect(res?.amount).toBe(30);
      expect(res?.formatted).toBe('30 ml');
    });

    it('calculates 16L standard knapsack tank: 2.5 ml/L * 16L = 40 ml', () => {
      const res = calculateTankMix(2.5, 16, 'ml');
      expect(res?.amount).toBe(40);
      expect(res?.formatted).toBe('40 ml');
    });

    it('calculates 20L tank: 1.5 g/L * 20L = 30 g', () => {
      const res = calculateTankMix(1.5, 20, 'g');
      expect(res?.amount).toBe(30);
      expect(res?.formatted).toBe('30 g');
    });

    it('calculates custom tank size (e.g. 12L * 0.75 ml/L = 9 ml)', () => {
      const res = calculateTankMix(0.75, 12, 'ml');
      expect(res?.amount).toBe(9);
      expect(res?.formatted).toBe('9 ml');
    });

    it('rejects invalid or zero tank size', () => {
      expect(calculateTankMix(2, 0, 'ml')).toBeNull();
      expect(calculateTankMix(2, -16, 'ml')).toBeNull();
    });
  });

  describe('computeMixAmount', () => {
    it('end-to-end: computes "2 ml" for 16L tank', () => {
      const res = computeMixAmount('2 ml', 16);
      expect(res?.amount).toBe(32);
      expect(res?.formatted).toBe('32 ml');
      expect(res?.tankSizeLitres).toBe(16);
    });

    it('end-to-end: returns null for "TODO_VERIFY"', () => {
      expect(computeMixAmount('TODO_VERIFY', 16)).toBeNull();
    });
  });
});
