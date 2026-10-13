import { z } from 'zod';
import treatmentsData from '../data/treatments.json';

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export const LocalizedTextSchema = z.object({
  en: z.string(),
  te: z.string(),
  hi: z.string(),
});
export type LocalizedText = z.infer<typeof LocalizedTextSchema>;

export const ToxicityClassSchema = z.enum([
  'extremely_toxic', // Red
  'highly_toxic',    // Yellow
  'moderately_toxic',// Blue
  'slightly_toxic',  // Green
  'TODO_VERIFY',
]);
export type ToxicityClass = z.infer<typeof ToxicityClassSchema>;

export const ChemicalTreatmentSchema = z.object({
  chemical_name: z.string(),
  dose_per_litre: z.string(),
  pre_harvest_interval_days: z.number().nullable(),
  toxicity_class: ToxicityClassSchema,
  ppe: z.array(z.string()),
  source_url: z.string(),
  source_note: z.string(),
  verified: z.boolean(),
});
export type ChemicalTreatment = z.infer<typeof ChemicalTreatmentSchema>;

export const TreatmentTypeSchema = z.enum([
  'fungal',
  'bacterial',
  'viral',
  'pest',
  'nutrient_deficiency',
  'environmental',
  'healthy',
  'unknown',
]);
export type TreatmentType = z.infer<typeof TreatmentTypeSchema>;

export const TreatmentEntrySchema = z.object({
  key: z.string(),
  crop: z.string(),
  type: TreatmentTypeSchema,
  name: LocalizedTextSchema,
  symptoms: LocalizedTextSchema,
  stage1_organic: z.array(LocalizedTextSchema),
  stage2_chemical: z.array(ChemicalTreatmentSchema),
});
export type TreatmentEntry = z.infer<typeof TreatmentEntrySchema>;

// Validate the static JSON data at module evaluation time
const rawTreatments: TreatmentEntry[] = TreatmentEntrySchema.array().parse(treatmentsData);

/**
 * Returns the list of all valid treatment keys known to the system.
 * Gemini diagnosis may choose treatment_key ONLY from this list, or null.
 */
export function getAllowedKeys(): string[] {
  return rawTreatments.map((t) => t.key);
}

/**
 * Resolves a confidence score or level into 'low' | 'medium' | 'high'
 * Enforcing SPEC.md Section 4, Safety Rule 5:
 * - score below 0.5 = low
 * - 0.5 to 0.75 = medium
 * - above 0.75 = high
 */
export function resolveConfidence(confidence: ConfidenceLevel | number): ConfidenceLevel {
  if (typeof confidence === 'number') {
    if (confidence < 0.5) return 'low';
    if (confidence <= 0.75) return 'medium';
    return 'high';
  }
  return confidence;
}

/**
 * Retrieves a treatment entry by key and applies strict safety filtering:
 * 1. Unknown key returns null (Safety Rule 4).
 * 2. Unverified chemical items or chemical items without source_url are completely removed (Safety Rules 2, 3).
 * 3. Medium confidence removes the chemical stage completely (Safety Rule 5).
 * 4. Low confidence removes both organic and chemical stages (Safety Rule 5).
 */
export function getTreatment(
  key: string,
  confidence: ConfidenceLevel | number
): TreatmentEntry | null {
  const match = rawTreatments.find((t) => t.key === key);
  if (!match) {
    return null;
  }

  const level = resolveConfidence(confidence);
  // Deep clone to prevent any mutation of in-memory data
  const result: TreatmentEntry = JSON.parse(JSON.stringify(match));

  if (level === 'low') {
    // Safety Rule 5: score below 0.5 = low: no treatment, ask for a better photo.
    result.stage1_organic = [];
    result.stage2_chemical = [];
    return result;
  }

  if (level === 'medium') {
    // Safety Rule 5: 0.5 to 0.75 = medium: show organic steps only. Do not show chemical stage.
    result.stage2_chemical = [];
    return result;
  }

  // Safety Rule 2, 3: A chemical entry is shown ONLY if verified: true AND source_url is not empty.
  // Unverified chemical fields must never be sent to the browser at all (filtered here on server).
  result.stage2_chemical = result.stage2_chemical.filter(
    (chem) => chem.verified === true && typeof chem.source_url === 'string' && chem.source_url.trim().length > 0
  );

  return result;
}
