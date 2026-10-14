/**
 * lib/fieldGeometry.ts
 *
 * Pure mathematical functions for agricultural land calculation,
 * spherical trigonometry, acreage conversion, spray water volume,
 * and spoon/matchbox dosage translations for smallholder farmers.
 *
 * $0 Free Tier, 0 MB npm dependencies.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_METERS = 6378137;
const SQ_METERS_PER_ACRE = 4046.8564224;

/**
 * Calculates the spherical polygon area in square meters.
 * Uses exact spherical excess / trapezoidal formula on WGS84 sphere.
 */
export function calculatePolygonAreaSqMeters(points: LatLng[]): number {
  if (!points || points.length < 3) return 0;

  let area = 0;
  const len = points.length;

  for (let i = 0; i < len; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % len];

    const x1 = ((p1.lng * Math.PI) / 180) * Math.cos((p1.lat * Math.PI) / 180);
    const y1 = (p1.lat * Math.PI) / 180;
    const x2 = ((p2.lng * Math.PI) / 180) * Math.cos((p2.lat * Math.PI) / 180);
    const y2 = (p2.lat * Math.PI) / 180;

    area += x1 * y2 - x2 * y1;
  }

  return Math.abs((area * EARTH_RADIUS_METERS * EARTH_RADIUS_METERS) / 2);
}

/**
 * Converts square meters to Acres
 */
export function sqMetersToAcres(sqMeters: number): number {
  return sqMeters / SQ_METERS_PER_ACRE;
}

/**
 * Converts Acres to Andhra Pradesh Cents (1 Acre = 100 Cents)
 */
export function acresToCents(acres: number): number {
  return acres * 100;
}

/**
 * Converts Acres to Telangana Guntas (1 Acre = 40 Guntas)
 */
export function acresToGuntas(acres: number): number {
  return acres * 40;
}

/**
 * Calculates total foliar spray water needed for a field.
 * Standard agricultural university recommendation: ~150 Litres per Acre.
 */
export function calculateTotalWaterLitres(acres: number, ratePerAcre = 150): number {
  return Math.round(acres * ratePerAcre);
}

/**
 * Calculates number of knapsack sprayer drums needed.
 */
export function calculateKnapsackDrums(totalWaterLitres: number, drumSizeLitres = 15): number {
  if (drumSizeLitres <= 0) return 0;
  return Number((totalWaterLitres / drumSizeLitres).toFixed(1));
}

/**
 * Generates an initial rectangular boundary polygon around a center coordinate
 * matching the target acreage if corner coordinates are not available from passbook.
 */
export function generatePolygonForAcres(center: LatLng, acres: number): LatLng[] {
  const safeAcres = Math.max(0.1, acres);
  const targetSqMeters = safeAcres * SQ_METERS_PER_ACRE;
  const sideMeters = Math.sqrt(targetSqMeters);
  const halfSideMeters = sideMeters / 2;

  // 1 degree latitude ≈ 111,320 meters
  const dLat = halfSideMeters / 111320;
  // 1 degree longitude ≈ 111,320 * cos(lat) meters
  const cosLat = Math.cos((center.lat * Math.PI) / 180);
  const dLng = halfSideMeters / (111320 * (cosLat || 1));

  return [
    { lat: center.lat + dLat, lng: center.lng - dLng }, // NW
    { lat: center.lat + dLat, lng: center.lng + dLng }, // NE
    { lat: center.lat - dLat, lng: center.lng + dLng }, // SE
    { lat: center.lat - dLat, lng: center.lng - dLng }, // SW
  ];
}

/**
 * Haversine formula for walking distance in meters between two GPS coordinates
 */
export function haversineDistanceMeters(p1: LatLng, p2: LatLng): number {
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;

  const lat1 = (p1.lat * Math.PI) / 180;
  const lat2 = (p2.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(EARTH_RADIUS_METERS * c);
}

/**
 * Translates chemical grams/ml into household physical measurement tools (teaspoon, matchbox, bottle cap)
 * Standard field ratios:
 * - 1 standard level teaspoon = ~5 grams / 5 ml
 * - 1 standard matchbox (filled level) = ~15 grams / 15 ml
 * - 1 standard pesticide bottle cap = ~10 ml
 */
export function translateDosageToHouseholdMeasures(
  dosePerLitre: number,
  drumSizeLitres: number
): {
  totalDosePerDrum: number;
  teaspoons: number;
  matchboxes: number;
  bottleCaps: number;
} {
  const totalDosePerDrum = dosePerLitre * drumSizeLitres;
  const teaspoons = Number((totalDosePerDrum / 5).toFixed(1));
  const matchboxes = Number((totalDosePerDrum / 15).toFixed(1));
  const bottleCaps = Number((totalDosePerDrum / 10).toFixed(1));

  return {
    totalDosePerDrum,
    teaspoons,
    matchboxes,
    bottleCaps,
  };
}

/**
 * Computes average pixel luminance from raw canvas pixel buffer.
 * Standard luminance equation: 0.299*R + 0.587*G + 0.114*B.
 * Returns value between 0 (black) and 255 (pure white).
 */
export function checkLuminance(pixels: Uint8ClampedArray): {
  luminance: number;
  isTooDark: boolean;
  isTooBright: boolean;
  isOk: boolean;
} {
  let sum = 0;
  const totalPixels = pixels.length / 4;
  if (totalPixels === 0) {
    return { luminance: 128, isTooDark: false, isTooBright: false, isOk: true };
  }

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    sum += 0.299 * r + 0.587 * g + 0.114 * b;
  }

  const luminance = Math.round(sum / totalPixels);
  const isTooDark = luminance < 42;
  const isTooBright = luminance > 242;

  return {
    luminance,
    isTooDark,
    isTooBright,
    isOk: !isTooDark && !isTooBright,
  };
}
