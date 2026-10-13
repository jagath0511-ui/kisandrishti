/**
 * config/spray-rules.ts
 *
 * Spray safety rules and thresholds based on SPEC.md Section 6.3.
 *
 * IMPORTANT NOTE FOR AGRICULTURE EXPERTS:
 * These threshold values are starting baselines from standard agronomic practice.
 * They must be verified, calibrated, and signed off by an agriculture extension officer
 * or university entomologist/pathologist before production deployment in each agro-climatic zone.
 */

export interface SprayRuleThresholds {
  /** Rain chance threshold (%) within the next 6 hours that triggers WAIT */
  rainProbabilityWaitPercent: number;
  /** Lookahead window in hours for precipitation check */
  rainLookaheadHours: number;

  /** Wind speed threshold (km/h) that triggers DO_NOT_SPRAY due to chemical drift risk */
  windSpeedDoNotSprayKmh: number;

  /** High temperature threshold (°C) that triggers heat avoidance (spray early morning/evening) */
  temperatureMaxCelsius: number;

  /** High humidity threshold (%) indicating high fungal spore germination risk */
  humidityHighPercent: number;
  /** Minimum temperature (°C) defining warm weather alongside high humidity */
  warmWeatherMinTempCelsius: number;

  /** Preferred morning spraying window (hours in 24h format) */
  morningWindowStartHour: number;
  morningWindowEndHour: number;

  /** Preferred late afternoon/evening spraying window (hours in 24h format) */
  afternoonWindowStartHour: number;
  afternoonWindowEndHour: number;
}

export const SPRAY_THRESHOLDS: SprayRuleThresholds = {
  // Rain chance of 40% or more in the next 6 hours: WAIT
  rainProbabilityWaitPercent: 40,
  rainLookaheadHours: 6,

  // Wind speed of 15 km/h or more: DO NOT SPRAY
  windSpeedDoNotSprayKmh: 15,

  // Temperature of 32°C or more: avoid; spray early morning or evening
  temperatureMaxCelsius: 32,

  // Humidity of 85% or more with warm weather: tell farmer fungal disease spreads fast, re-check in 2 days
  humidityHighPercent: 85,
  warmWeatherMinTempCelsius: 25,

  // Best spraying hours: early morning (06:00 - 10:00) and late afternoon (16:00 - 19:00)
  morningWindowStartHour: 6,
  morningWindowEndHour: 10,
  afternoonWindowStartHour: 16,
  afternoonWindowEndHour: 19,
};
