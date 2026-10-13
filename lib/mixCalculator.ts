/**
 * lib/mixCalculator.ts
 *
 * Mix Calculator pure calculation engine.
 * Implements SPEC.md Section 5 (F10) & Section 4 (Safety Rules).
 *
 * Calculates the exact amount of chemical to add per tank based on
 * verified dose per litre and farmer's selected tank size.
 */

export interface ParsedDose {
  doseNumber: number;
  unit: string;
}

export interface TankMixResult {
  doseNumber: number;
  unit: string;
  tankSizeLitres: number;
  amount: number;
  formatted: string;
}

/**
 * Attempts to parse a dose string (e.g. "2 ml", "2.5 ml/L", "1.5 g") into a positive number and unit.
 * If the string contains "TODO_VERIFY", unparseable ranges, or missing units, returns null.
 */
export function parseDosePerLitre(doseStr?: string | null): ParsedDose | null {
  if (!doseStr || typeof doseStr !== 'string') {
    return null;
  }

  const cleaned = doseStr.trim();
  if (cleaned.length === 0 || cleaned.toUpperCase().includes('TODO')) {
    return null;
  }

  // Regex matches: "2 ml", "2.5ml", "1.5 g", "2.0 ml/L", "2 ml/litre", "2 gm"
  const match = cleaned.match(
    /^([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z]+)(?:\s*(?:\/|\s+per\s+)\s*(?:l|litre|liter))?$/i
  );

  if (!match) {
    return null;
  }

  const num = parseFloat(match[1]);
  if (!Number.isFinite(num) || num <= 0) {
    return null;
  }

  let unit = match[2].toLowerCase();
  if (unit === 'gm' || unit === 'gms' || unit === 'gram' || unit === 'grams') {
    unit = 'g';
  } else if (unit === 'ml' || unit === 'millilitre' || unit === 'milliliter') {
    unit = 'ml';
  } else if (unit === 'kg' || unit === 'kilogram') {
    unit = 'kg';
  } else if (unit === 'l' || unit === 'litre' || unit === 'liter') {
    unit = 'L';
  }

  // Only permit known physical units for spraying
  if (!['ml', 'g', 'kg', 'L'].includes(unit)) {
    return null;
  }

  return {
    doseNumber: num,
    unit,
  };
}

/**
 * Calculates chemical amount needed for a specified tank size.
 * amount = dose_per_litre * tank_size_litres
 */
export function calculateTankMix(
  doseNumber: number,
  tankSizeLitres: number,
  unit: string
): TankMixResult | null {
  if (
    !Number.isFinite(doseNumber) ||
    doseNumber <= 0 ||
    !Number.isFinite(tankSizeLitres) ||
    tankSizeLitres <= 0 ||
    !unit
  ) {
    return null;
  }

  const amount = Number((doseNumber * tankSizeLitres).toFixed(2));

  return {
    doseNumber,
    unit,
    tankSizeLitres,
    amount,
    formatted: `${amount} ${unit}`,
  };
}

/**
 * High-level helper taking raw dose string and tank size.
 */
export function computeMixAmount(
  doseStr?: string | null,
  tankSizeLitres: number = 16
): TankMixResult | null {
  const parsed = parseDosePerLitre(doseStr);
  if (!parsed) {
    return null;
  }

  return calculateTankMix(parsed.doseNumber, tankSizeLitres, parsed.unit);
}
