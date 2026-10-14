import { describe, it, expect } from 'vitest';
import { checkMoARotationRisk, ChemicalTreatment } from '../lib/treatments';

describe('Anti-Resistance MoA Rotation Guard', () => {
  const candidate1: ChemicalTreatment = {
    chemical_name: 'Azoxystrobin 23% SC',
    formulation: 'SC',
    irac_frac_group: 'FRAC Group 11',
    cibrc_reg_no: 'CIR-35112/2008-Azoxystrobin(SC)-519',
    dose_per_litre: '1.0 ml',
    pre_harvest_interval_days: 3,
    toxicity_class: 'slightly_toxic',
    ppe: ['gloves', 'face mask'],
    source_url: 'https://cibrc.gov.in/major-uses-of-pesticides/',
    source_note: 'CIBRC registered',
    verified: true,
  };

  const candidate2: ChemicalTreatment = {
    chemical_name: 'Mancozeb 75% WP',
    formulation: 'WP',
    irac_frac_group: 'FRAC Group M03',
    cibrc_reg_no: 'CIR-11024/1998-Mancozeb(WP)-124',
    dose_per_litre: '2.5 g',
    pre_harvest_interval_days: 10,
    toxicity_class: 'slightly_toxic',
    ppe: ['gloves', 'face mask'],
    source_url: 'https://cibrc.gov.in/major-uses-of-pesticides/',
    source_note: 'CIBRC registered',
    verified: true,
  };

  it('returns hasRisk: false when there are no recent sprays', () => {
    const alert = checkMoARotationRisk(candidate1, [], 21, '2026-10-14');
    expect(alert.hasRisk).toBe(false);
    expect(alert.warningBadge).toBeNull();
  });

  it('flags risk when same FRAC group was sprayed 7 days ago', () => {
    const recentSprays = [
      {
        sprayDate: '2026-10-07',
        chemical: 'Pyraclostrobin 20% WG',
        irac_frac_group: 'FRAC Group 11',
      },
    ];

    const alert = checkMoARotationRisk(candidate1, recentSprays, 21, '2026-10-14');
    expect(alert.hasRisk).toBe(true);
    expect(alert.daysAgo).toBe(7);
    expect(alert.matchedGroup).toBe('FRAC Group 11');
    expect(alert.warningBadge?.en).toContain('Resistance Alert');
    expect(alert.warningBadge?.te).toContain('పురుగు/తెగులు నిరోధకత హెచ్చరిక');
    expect(alert.warningBadge?.hi).toContain('प्रतिरोध चेतावनी');
  });

  it('flags risk when identical chemical was sprayed 12 days ago even if group missing in diary', () => {
    const recentSprays = [
      {
        sprayDate: '2026-10-02',
        chemical: 'Azoxystrobin 23% SC',
      },
    ];

    const alert = checkMoARotationRisk(candidate1, recentSprays, 21, '2026-10-14');
    expect(alert.hasRisk).toBe(true);
    expect(alert.daysAgo).toBe(12);
  });

  it('allows spray when previous spray was outside the 21-day window (e.g. 30 days ago)', () => {
    const recentSprays = [
      {
        sprayDate: '2026-09-14',
        chemical: 'Azoxystrobin 23% SC',
        irac_frac_group: 'FRAC Group 11',
      },
    ];

    const alert = checkMoARotationRisk(candidate1, recentSprays, 21, '2026-10-14');
    expect(alert.hasRisk).toBe(false);
  });

  it('allows spray when candidate has a different MoA (e.g. Group M03 after Group 11)', () => {
    const recentSprays = [
      {
        sprayDate: '2026-10-08',
        chemical: 'Azoxystrobin 23% SC',
        irac_frac_group: 'FRAC Group 11',
      },
    ];

    // Testing candidate2 (Mancozeb - FRAC Group M03)
    const alert = checkMoARotationRisk(candidate2, recentSprays, 21, '2026-10-14');
    expect(alert.hasRisk).toBe(false);
    expect(alert.warningBadge).toBeNull();
  });
});

