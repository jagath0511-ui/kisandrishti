import { describe, it, expect } from 'vitest';
import { checkMixCompatibility, getWaleStepsGuide, getJarTestGuide } from '../lib/compatibility';

describe('Chemical Compatibility & Jar Mix Checker (lib/compatibility.ts)', () => {
  it('flags Copper + EC as INCOMPATIBLE due to crop burn and curdling', () => {
    const result = checkMixCompatibility('COPPER', 'EC', 'Copper Oxychloride', 'Profenofos EC', 'en');
    expect(result.status).toBe('INCOMPATIBLE');
    expect(result.isHazardous).toBe(true);
    expect(result.reason).toContain('Copper compounds degrade oil emulsions');
  });

  it('flags Sulphur + EC as INCOMPATIBLE', () => {
    const result = checkMixCompatibility('SULPHUR', 'EC', 'Sulphur 80% WDG', 'Chlorpyrifos EC', 'te');
    expect(result.status).toBe('INCOMPATIBLE');
    expect(result.isHazardous).toBe(true);
    expect(result.reason).toContain('గంధకం');
  });

  it('orders WP before EC according to W-A-L-E rules', () => {
    const result = checkMixCompatibility('EC', 'WP', 'Dimethoate EC', 'Mancozeb WP', 'en');
    expect(result.status).toBe('COMPATIBLE_WITH_WALE');
    expect(result.mixingOrder).toHaveLength(2);
    // WP must be step 1, EC must be step 2
    expect(result.mixingOrder[0].chemical).toBe('Mancozeb WP');
    expect(result.mixingOrder[0].letter).toBe('W');
    expect(result.mixingOrder[1].chemical).toBe('Dimethoate EC');
    expect(result.mixingOrder[1].letter).toBe('E');
  });

  it('provides safe default for compatible chemicals', () => {
    const result = checkMixCompatibility('SC', 'SL', 'Azoxystrobin SC', 'Validamycin SL', 'en');
    expect(result.status).toBe('SAFE_TO_MIX');
    expect(result.isHazardous).toBe(false);
  });

  it('returns valid WALE and Jar test guidelines', () => {
    const wale = getWaleStepsGuide();
    expect(wale).toHaveLength(4);
    expect(wale[0].letter).toBe('W');
    expect(wale[3].letter).toBe('E');

    const jar = getJarTestGuide();
    expect(jar.steps.length).toBeGreaterThan(0);
    expect(jar.bad_signs.length).toBeGreaterThan(0);
  });
});

