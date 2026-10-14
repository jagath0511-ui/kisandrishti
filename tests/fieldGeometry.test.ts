import { describe, it, expect } from 'vitest';
import {
  calculatePolygonAreaSqMeters,
  sqMetersToAcres,
  acresToCents,
  acresToGuntas,
  calculateTotalWaterLitres,
  calculateKnapsackDrums,
  generatePolygonForAcres,
  haversineDistanceMeters,
  translateDosageToHouseholdMeasures,
  checkLuminance,
} from '../lib/fieldGeometry';

describe('Field Geometry & Acreage Calculations', () => {
  // 100m x 100m approx square at 17.0899N (Surampalem, AP)
  // 10,000 sq meters ≈ 2.471 Acres
  const center = { lat: 17.0899, lng: 82.0668 };

  it('calculates polygon area accurately for 3+ points and 0 for < 3 points', () => {
    expect(calculatePolygonAreaSqMeters([])).toBe(0);
    expect(calculatePolygonAreaSqMeters([{ lat: 17.0, lng: 82.0 }])).toBe(0);

    const square1Acre = generatePolygonForAcres(center, 1.0);
    expect(square1Acre.length).toBe(4);
    const area = calculatePolygonAreaSqMeters(square1Acre);
    const acres = sqMetersToAcres(area);
    expect(acres).toBeGreaterThan(0.95);
    expect(acres).toBeLessThan(1.05);
  });

  it('converts acres to Andhra Cents and Telangana Guntas correctly', () => {
    const acres = 1.4;
    expect(acresToCents(acres)).toBe(140);
    expect(acresToGuntas(acres)).toBe(56);
  });

  it('calculates spray water and 15L knapsack drums volume accurately', () => {
    const acres = 1.4;
    const water = calculateTotalWaterLitres(acres, 150);
    expect(water).toBe(210); // 1.4 * 150 = 210 L
    const drums = calculateKnapsackDrums(water, 15);
    expect(drums).toBe(14.0); // 210 / 15 = 14 drums
  });

  it('measures Haversine walking distance between coordinates', () => {
    const p1 = { lat: 17.0899, lng: 82.0668 };
    const p2 = { lat: 17.0908, lng: 82.0668 }; // ~100 meters north
    const dist = haversineDistanceMeters(p1, p2);
    expect(dist).toBeGreaterThan(90);
    expect(dist).toBeLessThan(115);
  });

  it('translates chemical grams to physical spoons, matchboxes, and caps', () => {
    // 2 grams per litre in a 15L drum = 30 grams total
    const result = translateDosageToHouseholdMeasures(2.0, 15);
    expect(result.totalDosePerDrum).toBe(30);
    expect(result.teaspoons).toBe(6.0); // 30g / 5g = 6 teaspoons
    expect(result.matchboxes).toBe(2.0); // 30g / 15g = 2 matchboxes
    expect(result.bottleCaps).toBe(3.0); // 30ml / 10ml = 3 caps
  });

  it('analyzes image luminance and warns if too dark or washed out', () => {
    // Pure dark pixels (luminance 10)
    const darkPixels = new Uint8ClampedArray(400);
    for (let i = 0; i < 400; i += 4) {
      darkPixels[i] = 10;
      darkPixels[i + 1] = 10;
      darkPixels[i + 2] = 10;
      darkPixels[i + 3] = 255;
    }
    const darkCheck = checkLuminance(darkPixels);
    expect(darkCheck.isTooDark).toBe(true);
    expect(darkCheck.isOk).toBe(false);

    // Balanced daylight pixels (luminance 140)
    const balancedPixels = new Uint8ClampedArray(400);
    for (let i = 0; i < 400; i += 4) {
      balancedPixels[i] = 140;
      balancedPixels[i + 1] = 140;
      balancedPixels[i + 2] = 140;
      balancedPixels[i + 3] = 255;
    }
    const balancedCheck = checkLuminance(balancedPixels);
    expect(balancedCheck.isOk).toBe(true);
    expect(balancedCheck.isTooDark).toBe(false);
    expect(balancedCheck.isTooBright).toBe(false);
  });
});
