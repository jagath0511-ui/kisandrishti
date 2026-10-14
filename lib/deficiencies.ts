/**
 * lib/deficiencies.ts
 *
 * Stage-of-Crop Micronutrient & Deficiency Diagnostic Engine.
 * Implements 2-tap Leaf Position Key: Top/New Leaves vs. Bottom/Old Leaves.
 * $0 Free Tier, 0 MB npm dependencies.
 */

import { z } from 'zod';
import deficienciesData from '../data/deficiencies.json';

export const LocalizedTextSchema = z.object({
  en: z.string(),
  te: z.string(),
  hi: z.string(),
});
export type LocalizedText = z.infer<typeof LocalizedTextSchema>;

export const DeficiencySchema = z.object({
  key: z.string(),
  nutrient: LocalizedTextSchema,
  leaf_position: z.enum(['top_new', 'bottom_old']),
  crops: z.array(z.string()),
  visual_marker: LocalizedTextSchema,
  symptoms: LocalizedTextSchema,
  foliar_remedy: LocalizedTextSchema,
  soil_remedy: LocalizedTextSchema,
});
export type DeficiencyEntry = z.infer<typeof DeficiencySchema>;

const rawDeficiencies: DeficiencyEntry[] = DeficiencySchema.array().parse(deficienciesData);

export function getAllDeficiencies(): DeficiencyEntry[] {
  return rawDeficiencies;
}

export function getDeficienciesByPosition(position: 'top_new' | 'bottom_old'): DeficiencyEntry[] {
  return rawDeficiencies.filter((d) => d.leaf_position === position);
}

export function getDeficienciesByCrop(crop: string): DeficiencyEntry[] {
  const norm = crop.trim().toLowerCase();
  return rawDeficiencies.filter((d) => d.crops.includes(norm));
}

export function getDeficiencyByKey(key: string): DeficiencyEntry | null {
  return rawDeficiencies.find((d) => d.key === key) || null;
}

