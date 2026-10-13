import { describe, it, expect } from 'vitest';
import {
  evaluateSpraySafety,
  HourlyDataPoint,
} from '../lib/sprayRules';
import { SPRAY_THRESHOLDS } from '../config/spray-rules';

// Helper to generate a 24-hour sequence of baseline benign weather
function createBaseHourly(
  baseTemp = 26,
  baseHumidity = 60,
  baseRain = 10,
  baseWind = 8,
  startDateStr = '2026-10-14T06:00'
): HourlyDataPoint[] {
  const points: HourlyDataPoint[] = [];
  const [datePart, hourPart] = startDateStr.split('T');
  const startHour = parseInt(hourPart.split(':')[0], 10);
  const baseDay = parseInt(datePart.split('-')[2], 10);

  for (let i = 0; i < 24; i++) {
    const totalHour = startHour + i;
    const dayOffset = Math.floor(totalHour / 24);
    const hourInDay = totalHour % 24;
    const dayStr = String(baseDay + dayOffset).padStart(2, '0');
    const timeStr = `2026-10-${dayStr}T${String(hourInDay).padStart(2, '0')}:00`;

    points.push({
      time: timeStr,
      temperature: baseTemp,
      humidity: baseHumidity,
      rainProbability: baseRain,
      windSpeed: baseWind,
    });
  }

  return points;
}

describe('lib/sprayRules - Unit Tests', () => {
  const refTime = '2026-10-14T06:00';

  describe('Rule 1: Wind Speed (Threshold = 15 km/h)', () => {
    it('below limit (14.9 km/h): does NOT trigger DO_NOT_SPRAY and status is GOOD', () => {
      const data = createBaseHourly(26, 60, 10, 14.9, refTime);
      const result = evaluateSpraySafety(data, refTime);

      expect(result.status).toBe('GOOD');
      expect(result.currentMetrics.windSpeed).toBe(14.9);
      expect(result.reasons[0].en).toContain('Weather is calm and suitable');
    });

    it('at limit (15.0 km/h): triggers DO_NOT_SPRAY', () => {
      const data = createBaseHourly(26, 60, 10, 15.0, refTime);
      const result = evaluateSpraySafety(data, refTime);

      expect(result.status).toBe('DO_NOT_SPRAY');
      expect(result.reasons.some((r) => r.en.includes('High wind speed'))).toBe(true);
      expect(result.reasons.some((r) => r.te.includes('గాలి వేగం'))).toBe(true);
    });

    it('above limit (22.5 km/h): triggers DO_NOT_SPRAY', () => {
      const data = createBaseHourly(26, 60, 10, 22.5, refTime);
      const result = evaluateSpraySafety(data, refTime);

      expect(result.status).toBe('DO_NOT_SPRAY');
      expect(result.reasons[0].en).toContain('High wind speed');
    });
  });

  describe('Rule 2: Rain Probability (Threshold = 40% in next 6 hours)', () => {
    it('below limit (39% max in next 6h): does NOT trigger WAIT', () => {
      const data = createBaseHourly(26, 60, 10, 8, refTime);
      // Set rain probability at hour +3 to 39%
      data[3].rainProbability = 39;

      const result = evaluateSpraySafety(data, refTime);
      expect(result.status).toBe('GOOD');
      expect(result.reasons[0].en).toContain('Weather is calm and suitable');
    });

    it('at limit (40% at hour +2): triggers WAIT', () => {
      const data = createBaseHourly(26, 60, 10, 8, refTime);
      data[2].rainProbability = 40;

      const result = evaluateSpraySafety(data, refTime);
      expect(result.status).toBe('WAIT');
      expect(result.reasons.some((r) => r.en.includes('High chance of rain'))).toBe(true);
      expect(result.reasons.some((r) => r.hi.includes('बारिश की संभावना'))).toBe(true);
    });

    it('above limit (75% at hour +4): triggers WAIT', () => {
      const data = createBaseHourly(26, 60, 10, 8, refTime);
      data[4].rainProbability = 75;

      const result = evaluateSpraySafety(data, refTime);
      expect(result.status).toBe('WAIT');
      expect(result.reasons.some((r) => r.en.includes('High chance of rain'))).toBe(true);
    });

    it('rain spike beyond 6 hours (at hour +7) does not trigger WAIT for current window', () => {
      const data = createBaseHourly(26, 60, 10, 8, refTime);
      data[7].rainProbability = 80; // outside the 6-hour lookahead window

      const result = evaluateSpraySafety(data, refTime);
      expect(result.status).toBe('GOOD');
    });
  });

  describe('Rule 3: Temperature (Threshold = 32°C)', () => {
    it('below limit (31.9°C): does NOT trigger heat avoidance WAIT', () => {
      const data = createBaseHourly(31.9, 60, 10, 8, refTime);
      const result = evaluateSpraySafety(data, refTime);

      expect(result.status).toBe('GOOD');
      expect(result.reasons[0].en).toContain('Weather is calm and suitable');
    });

    it('at limit (32.0°C): triggers WAIT', () => {
      const data = createBaseHourly(32.0, 60, 10, 8, refTime);
      const result = evaluateSpraySafety(data, refTime);

      expect(result.status).toBe('WAIT');
      expect(result.reasons.some((r) => r.en.includes('High temperature'))).toBe(true);
      expect(result.reasons.some((r) => r.te.includes('ఉష్ణోగ్రత ఎక్కువగా ఉంది'))).toBe(true);
    });

    it('above limit (36.5°C): triggers WAIT', () => {
      const data = createBaseHourly(36.5, 60, 10, 8, refTime);
      const result = evaluateSpraySafety(data, refTime);

      expect(result.status).toBe('WAIT');
      expect(result.reasons.some((r) => r.en.includes('High temperature'))).toBe(true);
    });
  });

  describe('Rule 4: Fungal Disease Risk (Humidity >= 85% with Temp >= 25°C)', () => {
    it('below limit (84% humidity at 28°C): diseaseRiskNote is null', () => {
      const data = createBaseHourly(28, 84, 10, 8, refTime);
      const result = evaluateSpraySafety(data, refTime);

      expect(result.diseaseRiskNote).toBeNull();
    });

    it('at limit (85% humidity at 25.0°C): triggers diseaseRiskNote', () => {
      const data = createBaseHourly(25.0, 85, 10, 8, refTime);
      const result = evaluateSpraySafety(data, refTime);

      expect(result.diseaseRiskNote).not.toBeNull();
      expect(result.diseaseRiskNote?.en).toContain('fungal diseases to spread rapidly');
      expect(result.diseaseRiskNote?.te).toContain('శిలీంధ్ర తెగుళ్లు');
      expect(result.diseaseRiskNote?.hi).toContain('फफूंद रोग');
    });

    it('above limit (92% humidity at 29°C): triggers diseaseRiskNote', () => {
      const data = createBaseHourly(29, 92, 10, 8, refTime);
      const result = evaluateSpraySafety(data, refTime);

      expect(result.diseaseRiskNote).not.toBeNull();
      expect(result.diseaseRiskNote?.en).toContain('re-check crop health in 2 days');
    });

    it('high humidity (90%) but cool weather (23°C < 25°C): diseaseRiskNote is null', () => {
      const data = createBaseHourly(23, 90, 10, 8, refTime);
      const result = evaluateSpraySafety(data, refTime);

      expect(result.diseaseRiskNote).toBeNull();
    });
  });

  describe('Rule Precedence & Multi-Condition Scenarios', () => {
    it('both high wind (18 km/h) and rain (60%): status is DO_NOT_SPRAY and reports both reasons', () => {
      const data = createBaseHourly(27, 60, 60, 18, refTime);
      const result = evaluateSpraySafety(data, refTime);

      expect(result.status).toBe('DO_NOT_SPRAY');
      expect(result.reasons.length).toBe(2);
      expect(result.reasons.some((r) => r.en.includes('High wind speed'))).toBe(true);
      expect(result.reasons.some((r) => r.en.includes('High chance of rain'))).toBe(true);
    });

    it('both high heat (34°C) and rain (50%): status is WAIT and reports both reasons', () => {
      const data = createBaseHourly(34, 60, 50, 10, refTime);
      const result = evaluateSpraySafety(data, refTime);

      expect(result.status).toBe('WAIT');
      expect(result.reasons.some((r) => r.en.includes('High temperature'))).toBe(true);
      expect(result.reasons.some((r) => r.en.includes('High chance of rain'))).toBe(true);
    });
  });

  describe('Edge cases and Best Spray Windows', () => {
    it('handles empty hourly array gracefully without throwing', () => {
      const result = evaluateSpraySafety([], refTime);
      expect(result.status).toBe('WAIT');
      expect(result.reasons[0].en).toContain('Weather data unavailable');
      expect(result.bestSprayWindows).toEqual([]);
    });

    it('identifies safe morning spraying window', () => {
      const data = createBaseHourly(25, 55, 5, 8, '2026-10-14T06:00');
      const result = evaluateSpraySafety(data, '2026-10-14T06:00');

      expect(result.bestSprayWindows.length).toBeGreaterThan(0);
      expect(result.bestSprayWindows[0].displayTime.en).toContain('06:00');
    });
  });
});
