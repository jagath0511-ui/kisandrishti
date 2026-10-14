'use client';

import { useState, useEffect } from 'react';
import { HourlyDataPoint } from './sprayRules';

// ============================================================================
// 🛡️ BULLETPROOF WEATHER & VOICE FALLBACK SHIELD FOR KISANDRISHTI
//    - Handles offline network failures gracefully
//    - Provides safe static weather fallbacks if Open-Meteo rate-limits or CORS errors occur
//    - Manages browser speech recognition permissions & errors across all mobile browsers
// ============================================================================

export interface SafeWeatherState {
  tempC: number;
  humidity: number;
  windKmh: number;
  rainProb6h: number;
  cloudCover: number;
  soilMoisture0to1cm: number;
  sprayVerdict: 'GOOD' | 'WAIT_WIND' | 'WAIT_RAIN' | 'WAIT_HEAT';
  bestWindowText: string;
  isOfflineFallback: boolean;
}

/**
 * Generates 48 hours of realistic static fallback hourly weather data for Surampalem, AP.
 * Anchored to the current date and time so evaluations (spray safety, disease radar) never break.
 */
export function getSurampalemFallbackHourly(): HourlyDataPoint[] {
  const points: HourlyDataPoint[] = [];
  const now = new Date();
  // Round down to current hour
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0);

  for (let i = 0; i < 48; i++) {
    const d = new Date(start.getTime() + i * 3600000);
    const hour = d.getHours();
    const iso = d.toISOString().slice(0, 16);

    // Diurnal cycle for coastal/east Godavari (Surampalem)
    let temp = 27;
    let hum = 78;
    let wind = 9;
    let rainProb = 10;

    if (hour >= 6 && hour < 11) {
      temp = 28 + (hour - 6) * 1.0;
      hum = 80 - (hour - 6) * 3;
      wind = 8;
    } else if (hour >= 11 && hour < 16) {
      temp = 32 + (hour - 11) * 0.4;
      hum = 68;
      wind = 12;
      rainProb = 15;
    } else if (hour >= 16 && hour < 20) {
      temp = 30 - (hour - 16) * 1.0;
      hum = 75;
      wind = 9;
      rainProb = 10;
    } else {
      temp = 26;
      hum = 82;
      wind = 7;
      rainProb = 5;
    }

    points.push({
      time: iso,
      temperature: Number(temp.toFixed(1)),
      humidity: Math.round(hum),
      rainProbability: Math.round(rainProb),
      windSpeed: Number(wind.toFixed(1)),
    });
  }

  return points;
}

export function useResilientWeather(lat: number, lng: number) {
  const [weather, setWeather] = useState<SafeWeatherState>({
    tempC: 31,
    humidity: 78,
    windKmh: 12,
    rainProb6h: 15,
    cloudCover: 20,
    soilMoisture0to1cm: 0.22,
    sprayVerdict: 'GOOD',
    bestWindowText: 'Safe to spray now until 6:30 PM',
    isOfflineFallback: false,
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const controller = new AbortController();
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,cloud_cover&hourly=precipitation_probability,soil_moisture_0_to_1cm&timezone=auto&forecast_days=1`;

    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('Network response failed');
        return res.json();
      })
      .then((data) => {
        const curTemp = Math.round(data?.current?.temperature_2m ?? 31);
        const curHum = Math.round(data?.current?.relative_humidity_2m ?? 76);
        const curWind = Math.round(data?.current?.wind_speed_10m ?? 11);
        const curCloud = Math.round(data?.current?.cloud_cover ?? 20);
        const maxRain6h = Math.max(...(data?.hourly?.precipitation_probability?.slice(0, 6) ?? [10]), 0);
        const soilMoist = data?.hourly?.soil_moisture_0_to_1cm?.[0] ?? 0.22;

        let verdict: SafeWeatherState['sprayVerdict'] = 'GOOD';
        if (maxRain6h >= 40) verdict = 'WAIT_RAIN';
        else if (curWind >= 15) verdict = 'WAIT_WIND';
        else if (curTemp >= 33) verdict = 'WAIT_HEAT';

        setWeather({
          tempC: curTemp,
          humidity: curHum,
          windKmh: curWind,
          rainProb6h: maxRain6h,
          cloudCover: curCloud,
          soilMoisture0to1cm: soilMoist,
          sprayVerdict: verdict,
          bestWindowText: verdict === 'GOOD' ? 'Safe to spray until 6:30 PM' : 'Wait for safe wind/rain conditions',
          isOfflineFallback: false,
        });
        setLoading(false);
      })
      .catch(() => {
        // GRACEFUL OFFLINE FALLBACK: Never break the UI if network drops or API rate limits
        setWeather({
          tempC: 32,
          humidity: 75,
          windKmh: 10,
          rainProb6h: 10,
          cloudCover: 15,
          soilMoisture0to1cm: 0.24,
          sprayVerdict: 'GOOD',
          bestWindowText: 'Offline Mode: Surampalem Standard Safe Window Active',
          isOfflineFallback: true,
        });
        setLoading(false);
      });

    return () => controller.abort();
  }, [lat, lng]);

  return { weather, loading };
}

/** Resilient Voice Mic Assistant with automatic browser fallback messaging */
export function useResilientVoiceAssistant(
  lang: 'te' | 'hi' | 'en',
  onCommandMatched: (intent: string) => void
) {
  const [listening, setListening] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const startListening = () => {
    setErrorMessage(null);
    if (typeof window === 'undefined') return;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setErrorMessage(
        lang === 'te'
          ? 'వాయిస్ సెర్చ్ కోసం గూగుల్ క్రోమ్ (Google Chrome) వాడండి. మీరు నేరుగా బటన్లను కూడా నొక్కవచ్చు!'
          : lang === 'hi'
          ? 'वॉयस सर्च के लिए गूगल क्रोम (Google Chrome) का उपयोग करें। आप सीधे बटन भी दबा सकते हैं!'
          : 'Voice search needs Google Chrome on Android. You can also tap the buttons directly!'
      );
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = lang === 'te' ? 'te-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
      rec.interimResults = false;
      setListening(true);

      rec.onresult = (event: any) => {
        const spoken = (event.results?.[0]?.[0]?.transcript || '').toLowerCase();
        setListening(false);
        onCommandMatched(spoken);
      };

      rec.onerror = (e: any) => {
        setListening(false);
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          setErrorMessage(
            lang === 'te'
              ? 'మైక్రోఫోన్ అనుమతి నిరాకరించబడింది. బ్రౌజర్ సెట్టింగ్స్‌లో మైక్ యాక్సెస్ అనుమతించండి లేదా బటన్లను నొక్కండి.'
              : lang === 'hi'
              ? 'माइक्रोफ़ोन अनुमति अवरुद्ध है। कृपया ब्राउज़र सेटिंग्स में माइक एक्सेस दें या सीधे बटन दबाएं।'
              : 'Microphone permission blocked. Please allow mic access in browser settings, or tap buttons directly.'
          );
        } else {
          setErrorMessage(
            lang === 'te'
              ? 'వాయిస్ సెర్చ్ కోసం గూగుల్ క్రోమ్ (Google Chrome) వాడండి. మీరు నేరుగా బటన్లను కూడా నొక్కవచ్చు!'
              : 'Voice search needs Google Chrome on Android. You can also tap the buttons directly!'
          );
        }
      };

      rec.onend = () => setListening(false);
      rec.start();
    } catch {
      setListening(false);
      setErrorMessage(
        lang === 'te'
          ? 'వాయిస్ సెర్చ్ కోసం గూగుల్ క్రోమ్ (Google Chrome) వాడండి. మీరు నేరుగా బటన్లను కూడా నొక్కవచ్చు!'
          : 'Voice search needs Google Chrome on Android. You can also tap the buttons directly!'
      );
    }
  };

  return { listening, errorMessage, setErrorMessage, startListening };
}

