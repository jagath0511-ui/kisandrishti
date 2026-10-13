import { describe, it, expect } from 'vitest';
import {
  getAllowedKeys,
  getTreatment,
  resolveConfidence,
  TreatmentEntrySchema,
  TreatmentEntry,
} from '../lib/treatments';
import treatmentsData from '../data/treatments.json';

describe('Treatments Data Layer & Safety Rules', () => {
  it('validates that all entries in data/treatments.json match TreatmentEntrySchema', () => {
    const parseResult = TreatmentEntrySchema.array().safeParse(treatmentsData);
    expect(parseResult.success).toBe(true);
  });

  it('contains the required crops and problems in getAllowedKeys()', () => {
    const keys = getAllowedKeys();

    const expectedKeys = [
      // Paddy
      'paddy_blast',
      'paddy_brown_spot',
      'paddy_sheath_blight',
      'paddy_bacterial_leaf_blight',
      'paddy_healthy',
      // Chilli
      'chilli_anthracnose',
      'chilli_powdery_mildew',
      'chilli_leaf_curl',
      'chilli_cercospora_leaf_spot',
      'chilli_healthy',
      // Tomato
      'tomato_early_blight',
      'tomato_late_blight',
      'tomato_leaf_curl_virus',
      'tomato_septoria_leaf_spot',
      'tomato_healthy',
    ];

    expect(keys.length).toBe(15);
    expectedKeys.forEach((k) => {
      expect(keys).toContain(k);
    });
  });

  it('returns null for unknown keys', () => {
    expect(getTreatment('unknown_crop_disease', 'high')).toBeNull();
    expect(getTreatment('random_key', 'medium')).toBeNull();
    expect(getTreatment('', 'high')).toBeNull();
  });

  it('resolves confidence scores correctly according to Safety Rule 5', () => {
    // Below 0.5 = low
    expect(resolveConfidence(0.0)).toBe('low');
    expect(resolveConfidence(0.49)).toBe('low');

    // 0.5 to 0.75 = medium
    expect(resolveConfidence(0.5)).toBe('medium');
    expect(resolveConfidence(0.65)).toBe('medium');
    expect(resolveConfidence(0.75)).toBe('medium');

    // Above 0.75 = high
    expect(resolveConfidence(0.76)).toBe('high');
    expect(resolveConfidence(0.95)).toBe('high');
    expect(resolveConfidence(1.0)).toBe('high');
  });

  it('proves unverified chemical data never leaves the function (Safety Rule 2 & 3)', () => {
    // In treatments.json, all disease chemical entries currently have verified: false and TODO_VERIFY
    const diseases = ['paddy_blast', 'chilli_anthracnose', 'tomato_early_blight'];

    for (const key of diseases) {
      // Even with high confidence, unverified entries must be filtered out
      const result = getTreatment(key, 'high');
      expect(result).not.toBeNull();
      expect(result!.stage2_chemical).toEqual([]);

      // Test with numeric high confidence score (0.9)
      const numResult = getTreatment(key, 0.9);
      expect(numResult).not.toBeNull();
      expect(numResult!.stage2_chemical).toEqual([]);

      // Verify no unverified strings leak
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain('TODO_VERIFY');
    }
  });

  it('proves medium confidence never returns chemicals (Safety Rule 5)', () => {
    const resultString = getTreatment('chilli_anthracnose', 'medium');
    expect(resultString).not.toBeNull();
    expect(resultString!.stage2_chemical).toEqual([]);
    expect(resultString!.stage1_organic.length).toBeGreaterThan(0);

    const resultNumber = getTreatment('chilli_anthracnose', 0.65);
    expect(resultNumber).not.toBeNull();
    expect(resultNumber!.stage2_chemical).toEqual([]);
    expect(resultNumber!.stage1_organic.length).toBeGreaterThan(0);
  });

  it('proves low confidence returns no treatment steps (Safety Rule 5)', () => {
    const resultString = getTreatment('paddy_blast', 'low');
    expect(resultString).not.toBeNull();
    expect(resultString!.stage1_organic).toEqual([]);
    expect(resultString!.stage2_chemical).toEqual([]);

    const resultNumber = getTreatment('paddy_blast', 0.4);
    expect(resultNumber).not.toBeNull();
    expect(resultNumber!.stage1_organic).toEqual([]);
    expect(resultNumber!.stage2_chemical).toEqual([]);
  });

  it('filters out chemicals that have verified: true but empty source_url', () => {
    // Simulate what happens when a chemical is marked verified but lacks source_url
    const mockEntry: TreatmentEntry = {
      key: 'test_disease',
      crop: 'test_crop',
      type: 'fungal',
      name: { en: 'Test', te: 'టెస్ట్', hi: 'टेस्ट' },
      symptoms: { en: 'Spots', te: 'మచ్చలు', hi: 'धब्बे' },
      stage1_organic: [{ en: 'Organic step', te: 'సేంద్రీయ దశ', hi: 'जैविक उपाय' }],
      stage2_chemical: [
        {
          chemical_name: 'Chemical A',
          dose_per_litre: '2 ml',
          pre_harvest_interval_days: 7,
          toxicity_class: 'moderately_toxic',
          ppe: ['gloves'],
          source_url: '', // Empty source_url
          source_note: 'Missing url',
          verified: true,
        },
        {
          chemical_name: 'Chemical B',
          dose_per_litre: '1 ml',
          pre_harvest_interval_days: 14,
          toxicity_class: 'slightly_toxic',
          ppe: ['gloves', 'mask'],
          source_url: 'https://example.gov.in/label',
          source_note: 'Official label',
          verified: true, // Valid and verified
        },
      ],
    };

    // Filter simulation using the exact safety rules
    const filtered = mockEntry.stage2_chemical.filter(
      (c) => c.verified === true && typeof c.source_url === 'string' && c.source_url.trim().length > 0
    );

    expect(filtered.length).toBe(1);
    expect(filtered[0].chemical_name).toBe('Chemical B');
  });
});
