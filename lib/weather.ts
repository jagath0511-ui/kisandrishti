/**
 * lib/weather.ts
 *
 * Open-Meteo Weather API client (free, no API key required).
 * Fetches 48 hours of hourly forecasts for temperature, humidity, precipitation probability, and wind speed.
 * Adheres to SPEC.md Section 3 & Section 5 (F6).
 */

import { HourlyDataPoint } from './sprayRules';
import { getSurampalemFallbackHourly } from './resilientFallback';

export interface OpenMeteoHourlyResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  hourly: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    precipitation_probability: number[];
    wind_speed_10m: number[];
  };
}

export interface WeatherFetchSuccess {
  success: true;
  latitude: number;
  longitude: number;
  timezone: string;
  hourly: HourlyDataPoint[];
  isFallback?: boolean;
}

export interface WeatherFetchError {
  success: false;
  error: string;
  errorType: 'network' | 'timeout' | 'invalid_response' | 'invalid_coords';
}

export type WeatherFetchResult = WeatherFetchSuccess | WeatherFetchError;

/**
 * Fetches hourly weather forecast from Open-Meteo for the given coordinates.
 * Includes graceful static fallback to Surampalem weather so rate-limits and offline drops never break presentations.
 */
export async function fetchHourlyWeather(
  latitude: number,
  longitude: number,
  timeoutMs: number = 8000
): Promise<WeatherFetchResult> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return {
      success: false,
      error: 'Invalid coordinates provided.',
      errorType: 'invalid_coords',
    };
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,wind_speed_10m&forecast_days=2&timezone=auto`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Graceful fallback on HTTP 429 (rate-limit) or server errors
      return {
        success: true,
        latitude,
        longitude,
        timezone: 'Asia/Kolkata',
        hourly: getSurampalemFallbackHourly(),
        isFallback: true,
      };
    }

    const data = (await response.json()) as OpenMeteoHourlyResponse;

    if (
      !data.hourly ||
      !Array.isArray(data.hourly.time) ||
      !Array.isArray(data.hourly.temperature_2m) ||
      !Array.isArray(data.hourly.relative_humidity_2m) ||
      !Array.isArray(data.hourly.precipitation_probability) ||
      !Array.isArray(data.hourly.wind_speed_10m)
    ) {
      return {
        success: true,
        latitude,
        longitude,
        timezone: 'Asia/Kolkata',
        hourly: getSurampalemFallbackHourly(),
        isFallback: true,
      };
    }

    const hourlyPoints: HourlyDataPoint[] = [];
    const len = data.hourly.time.length;

    for (let i = 0; i < len; i++) {
      hourlyPoints.push({
        time: data.hourly.time[i],
        temperature: Number(data.hourly.temperature_2m[i] ?? 0),
        humidity: Number(data.hourly.relative_humidity_2m[i] ?? 0),
        rainProbability: Number(data.hourly.precipitation_probability[i] ?? 0),
        windSpeed: Number(data.hourly.wind_speed_10m[i] ?? 0),
      });
    }

    return {
      success: true,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone,
      hourly: hourlyPoints,
      isFallback: false,
    };
  } catch (_err: unknown) {
    clearTimeout(timeoutId);

    // Network dropped or timed out: Return safe Surampalem fallback
    return {
      success: true,
      latitude,
      longitude,
      timezone: 'Asia/Kolkata',
      hourly: getSurampalemFallbackHourly(),
      isFallback: true,
    };
  }
}
