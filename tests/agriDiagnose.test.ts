import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveConfidence, getTreatment, getAllowedKeys } from '../lib/treatments';
import { checkRateLimit, _resetRateLimits } from '../lib/rateLimit';
import { DiagnosisOutputSchema } from '../lib/gemini';

describe('Agri-Diagnose Confidence Logic & Safety Rule 5', () => {
  it('correctly maps confidence_score to low / medium / high', () => {
    // Low: strictly below 0.5
    expect(resolveConfidence(0.0)).toBe('low');
    expect(resolveConfidence(0.2)).toBe('low');
    expect(resolveConfidence(0.49)).toBe('low');
    expect(resolveConfidence(0.4999)).toBe('low');

    // Medium: 0.5 to 0.75 inclusive
    expect(resolveConfidence(0.5)).toBe('medium');
    expect(resolveConfidence(0.6)).toBe('medium');
    expect(resolveConfidence(0.75)).toBe('medium');

    // High: strictly above 0.75
    expect(resolveConfidence(0.7501)).toBe('high');
    expect(resolveConfidence(0.8)).toBe('high');
    expect(resolveConfidence(0.99)).toBe('high');
    expect(resolveConfidence(1.0)).toBe('high');
  });

  it('guarantees medium confidence never receives chemical treatments', () => {
    const allowed = getAllowedKeys();
    for (const key of allowed) {
      const treatment = getTreatment(key, 0.65);
      if (treatment) {
        expect(treatment.stage2_chemical).toEqual([]);
      }
    }
  });

  it('guarantees low confidence receives neither organic nor chemical treatments', () => {
    const allowed = getAllowedKeys();
    for (const key of allowed) {
      const treatment = getTreatment(key, 0.3);
      if (treatment) {
        expect(treatment.stage1_organic).toEqual([]);
        expect(treatment.stage2_chemical).toEqual([]);
      }
    }
  });

  it('validates DiagnosisOutput schema correctly', () => {
    const validOutput = {
      is_plant_photo: true,
      image_quality: 'good',
      crop: 'chilli',
      problem_type: 'fungal',
      problem_name: 'Chilli Anthracnose',
      treatment_key: 'chilli_anthracnose',
      confidence_score: 0.88,
      affected_area_range: '10_to_30',
      visible_symptoms: ['Circular sunken spots', 'Concentric rings'],
      reasoning: 'The leaves show typical anthracnose spots.',
      retake_advice: null,
    };

    const result = DiagnosisOutputSchema.safeParse(validOutput);
    expect(result.success).toBe(true);
  });

  it('rejects invalid DiagnosisOutput schema', () => {
    const invalidOutput = {
      is_plant_photo: 'yes', // Should be boolean
      confidence_score: 1.5, // Should be <= 1.0
    };

    const result = DiagnosisOutputSchema.safeParse(invalidOutput);
    expect(result.success).toBe(false);
  });
});

describe('In-Memory Rate Limiter (lib/rateLimit.ts)', () => {
  beforeEach(() => {
    _resetRateLimits();
    delete process.env.EVAL_MODE;
  });

  afterEach(() => {
    _resetRateLimits();
    delete process.env.EVAL_MODE;
  });

  it('allows up to 10 requests per IP and blocks the 11th', () => {
    const testIp = '192.168.1.100';

    for (let i = 1; i <= 10; i++) {
      const res = checkRateLimit(testIp);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(10 - i);
    }

    const blocked = checkRateLimit(testIp);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetInSeconds).toBeGreaterThan(0);
  });

  it('bypasses rate limiting when EVAL_MODE is set to true', () => {
    process.env.EVAL_MODE = 'true';
    const testIp = '192.168.1.200';

    for (let i = 0; i < 25; i++) {
      const res = checkRateLimit(testIp);
      expect(res.allowed).toBe(true);
    }
  });
});
