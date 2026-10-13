/**
 * lib/weather.ts
 *
 * Open-Meteo Weather API client (free, no API key required).
 * Fetches 48 hours of hourly forecasts for temperature, humidity, precipitation probability, and wind speed.
 * Adheres to SPEC.md Section 3 & Section 5 (F6).
 */

import { HourlyDataPoint } from './sprayRules';

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
}

export interface WeatherFetchError {
  success: false;
  error: string;
  errorType: 'network' | 'timeout' | 'invalid_response' | 'invalid_coords';
}

export type WeatherFetchResult = WeatherFetchSuccess | WeatherFetchError;

/**
 * Fetches hourly weather forecast from Open-Meteo for the given coordinates.
 */
export async function fetchHourlyWeather(
  latitude: number,
  longitude: number,
  timeoutMs: number = 10000
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
      return {
        success: false,
        error: `Weather service responded with status ${response.status}`,
        errorType: 'invalid_response',
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
        success: false,
        error: 'Incomplete or malformed weather response structure.',
        errorType: 'invalid_response',
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
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof Error && err.name === 'AbortError') {
      return {
        success: false,
        error: 'Weather service request timed out. Please check your connection and retry.',
        errorType: 'timeout',
      };
    }

    return {
      success: false,
      error: 'Cannot connect to weather service. Please check your internet connection.',
      errorType: 'network',
    };
  }
}
