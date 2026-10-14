import { describe, it, expect } from 'vitest';
import { evaluateDiseaseRadar } from '../lib/diseaseRadar';
import { HourlyDataPoint } from '../lib/sprayRules';

describe('Pest & Disease Outbreak Radar', () => {
  it('returns no alerts for normal benign weather', () => {
    const normalHours: HourlyDataPoint[] = Array.from({ length: 48 }, (_, i) => ({
      time: `2026-10-14T${String(i % 24).padStart(2, '0')}:00`,
      temperature: 28,
      humidity: 60,
      rainProbability: 10,
      windSpeed: 8,
    }));

    const result = evaluateDiseaseRadar(normalHours);
    expect(result.hasAlerts).toBe(false);
    expect(result.alerts.length).toBe(0);
    expect(result.evaluatedHours).toBe(48);
  });

  it('triggers Paddy Blast alert when night temp <= 22°C and humidity >= 85%', () => {
    const blastHours: HourlyDataPoint[] = Array.from({ length: 48 }, (_, i) => ({
      time: `2026-10-14T${String(i % 24).padStart(2, '0')}:00`,
      temperature: i < 8 ? 20 : 28, // 8 hours at 20°C
      humidity: i < 8 ? 92 : 65,    // 8 hours at 92%
      rainProbability: 10,
      windSpeed: 5,
    }));

    const result = evaluateDiseaseRadar(blastHours);
    expect(result.hasAlerts).toBe(true);
    const blast = result.alerts.find((a) => a.id === 'paddy_blast');
    expect(blast).toBeDefined();
    expect(blast?.crop).toBe('paddy');
    expect(blast?.severity).toBe('HIGH');
    expect(blast?.preventiveAction.en).toContain('Scout leaf tips');
    expect(blast?.organicSpray.en).toContain('Pseudomonas fluorescens');
  });

  it('triggers Chilli Thrips & Mites alert during dry heat spell (temp >= 33°C, 0-10% rain)', () => {
    const hotDryHours: HourlyDataPoint[] = Array.from({ length: 48 }, (_, i) => ({
      time: `2026-10-14T${String(i % 24).padStart(2, '0')}:00`,
      temperature: i >= 10 && i <= 16 ? 35 : 29, // 7 hours of 35°C
      humidity: 45,
      rainProbability: 5,
      windSpeed: 7,
    }));

    const result = evaluateDiseaseRadar(hotDryHours);
    expect(result.hasAlerts).toBe(true);
    const thrips = result.alerts.find((a) => a.id === 'chilli_thrips');
    expect(thrips).toBeDefined();
    expect(thrips?.crop).toBe('chilli');
    expect(thrips?.organicSpray.en).toContain('Neem Seed Kernel Extract');
    expect(thrips?.conditionSummary.te).toContain('తామర మరియు నల్లి పురుగులు');
  });

  it('triggers Tomato Late Blight alert during cool wet weather (temp 18-25°C, humidity >= 85%, rain >= 30%)', () => {
    const blightHours: HourlyDataPoint[] = Array.from({ length: 48 }, (_, i) => ({
      time: `2026-10-14T${String(i % 24).padStart(2, '0')}:00`,
      temperature: 21,
      humidity: 90,
      rainProbability: 50,
      windSpeed: 10,
    }));

    const result = evaluateDiseaseRadar(blightHours);
    expect(result.hasAlerts).toBe(true);
    const lateBlight = result.alerts.find((a) => a.id === 'tomato_late_blight');
    expect(lateBlight).toBeDefined();
    expect(lateBlight?.crop).toBe('tomato');
    expect(lateBlight?.organicSpray.en).toContain('Trichoderma harzianum');
  });
});
