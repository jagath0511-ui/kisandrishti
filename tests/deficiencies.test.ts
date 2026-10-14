import { describe, it, expect } from 'vitest';
import {
  getAllDeficiencies,
  getDeficienciesByPosition,
  getDeficienciesByCrop,
  getDeficiencyByKey,
} from '../lib/deficiencies';

describe('Crop Nutrient Deficiency Diagnostic Key', () => {
  it('loads all validated deficiencies', () => {
    const list = getAllDeficiencies();
    expect(list.length).toBeGreaterThanOrEqual(6);
  });

  it('filters deficiencies on Top / New leaves correctly', () => {
    const topLeaves = getDeficienciesByPosition('top_new');
    const keys = topLeaves.map((d) => d.key);
    expect(keys).toContain('zinc_khaira');
    expect(keys).toContain('iron');
    expect(keys).toContain('boron');
    // Top leaves should NOT have Nitrogen or Potassium
    expect(keys).not.toContain('nitrogen');
    expect(keys).not.toContain('potassium');
  });

  it('filters deficiencies on Bottom / Old leaves correctly', () => {
    const bottomLeaves = getDeficienciesByPosition('bottom_old');
    const keys = bottomLeaves.map((d) => d.key);
    expect(keys).toContain('nitrogen');
    expect(keys).toContain('potassium');
    expect(keys).toContain('magnesium');
    // Bottom leaves should NOT have Zinc or Iron
    expect(keys).not.toContain('zinc_khaira');
    expect(keys).not.toContain('iron');
  });

  it('filters deficiencies for Paddy crop including Zinc (Khaira disease)', () => {
    const paddyDeficiencies = getDeficienciesByCrop('paddy');
    const keys = paddyDeficiencies.map((d) => d.key);
    expect(keys).toContain('zinc_khaira');
    expect(keys).toContain('nitrogen');
  });

  it('retrieves single deficiency by key', () => {
    const zinc = getDeficiencyByKey('zinc_khaira');
    expect(zinc).not.toBeNull();
    expect(zinc?.nutrient.en).toContain('Zinc');
    expect(zinc?.foliar_remedy.en).toContain('Zinc Sulphate');
  });
});

