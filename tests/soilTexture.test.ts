import { describe, it, expect } from 'vitest';
import {
  evaluateSoilTexture,
  classifySoilTexture,
  normalizeSoilFractions,
  calculateTriangleCoordinates,
} from '../lib/soilTexture';

describe('lib/soilTexture - Unit Tests', () => {
  describe('USDA Texture Class Requirements (SPEC.md Section 10)', () => {
    it('40/40/20 sand/silt/clay classifies as loam', () => {
      const result = evaluateSoilTexture(40, 40, 20);
      expect(result.textureClass).toBe('loam');
      expect(result.fractions.sand + result.fractions.silt + result.fractions.clay).toBe(100);
      expect(result.info.name.en).toBe('Loam Soil');
    });

    it('90/5/5 sand/silt/clay classifies as sand', () => {
      const result = evaluateSoilTexture(90, 5, 5);
      expect(result.textureClass).toBe('sand');
      expect(result.fractions.sand + result.fractions.silt + result.fractions.clay).toBe(100);
      expect(result.info.name.en).toBe('Sandy Soil');
    });

    it('20/20/60 sand/silt/clay classifies as clay', () => {
      const result = evaluateSoilTexture(20, 20, 60);
      expect(result.textureClass).toBe('clay');
      expect(result.fractions.sand + result.fractions.silt + result.fractions.clay).toBe(100);
      expect(result.info.name.en).toBe('Clay Soil');
    });

    it('65/25/10 sand/silt/clay classifies as sandy loam', () => {
      const result = evaluateSoilTexture(65, 25, 10);
      expect(result.textureClass).toBe('sandy_loam');
      expect(result.fractions.sand + result.fractions.silt + result.fractions.clay).toBe(100);
      expect(result.info.name.en).toBe('Sandy Loam Soil');
    });

    it('10/85/5 sand/silt/clay classifies as silt', () => {
      const result = evaluateSoilTexture(10, 85, 5);
      expect(result.textureClass).toBe('silt');
      expect(result.fractions.sand + result.fractions.silt + result.fractions.clay).toBe(100);
      expect(result.info.name.en).toBe('Silt Soil');
    });
  });

  describe('Fractions Normalization & Edge Cases', () => {
    it('normalizes unnormalized values to sum strictly to 100', () => {
      // 80 + 40 + 40 = 160 total -> 50 / 25 / 25
      const norm = normalizeSoilFractions(80, 40, 40);
      expect(norm.sand + norm.silt + norm.clay).toBe(100);
      expect(norm.sand).toBe(50);
      expect(norm.silt).toBe(25);
      expect(norm.clay).toBe(25);
    });

    it('handles zero total input with safe fallback summing to 100', () => {
      const norm = normalizeSoilFractions(0, 0, 0);
      expect(norm.sand + norm.silt + norm.clay).toBe(100);
    });

    it('handles negative numbers safely without NaN', () => {
      const norm = normalizeSoilFractions(-10, 50, 50);
      expect(norm.sand + norm.silt + norm.clay).toBe(100);
      expect(norm.sand).toBe(0);
      expect(norm.silt).toBe(50);
      expect(norm.clay).toBe(50);
    });
  });

  describe('Ternary Triangle Coordinates', () => {
    it('calculates triangle coordinates within [0, 1] range', () => {
      const coords = calculateTriangleCoordinates(40, 40, 20);
      expect(coords.x).toBeGreaterThanOrEqual(0);
      expect(coords.x).toBeLessThanOrEqual(1);
      expect(coords.y).toBeGreaterThanOrEqual(0);
      expect(coords.y).toBeLessThanOrEqual(1);
    });

    it('places 100% clay at the top apex (x=0.5, y=0)', () => {
      const coords = calculateTriangleCoordinates(0, 0, 100);
      expect(coords.x).toBe(0.5);
      expect(coords.y).toBe(0);
    });

    it('places 100% sand at bottom-left (x=0, y=1)', () => {
      const coords = calculateTriangleCoordinates(100, 0, 0);
      expect(coords.x).toBe(0);
      expect(coords.y).toBe(1);
    });

    it('places 100% silt at bottom-right (x=1, y=1)', () => {
      const coords = calculateTriangleCoordinates(0, 100, 0);
      expect(coords.x).toBe(1);
      expect(coords.y).toBe(1);
    });
  });
});

