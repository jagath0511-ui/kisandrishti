/**
 * lib/sprayRules.ts
 *
 * Pure evaluation engine for agricultural spray safety.
 * Implements SPEC.md Sections 5 (F6) and 6.3.
 *
 * NO network calls, NO AI calls.
 */

import { SPRAY_THRESHOLDS } from '../config/spray-rules';

export interface HourlyDataPoint {
  time: string; // ISO string e.g. "2026-10-13T08:00"
  temperature: number; // °C
  humidity: number; // %
  rainProbability: number; // %
  windSpeed: number; // km/h
}

export type SprayStatus = 'GOOD' | 'WAIT' | 'DO_NOT_SPRAY';

export interface LocalizedText {
  en: string;
  te: string;
  hi: string;
}

export interface BestSprayWindow {
  startIso: string;
  endIso: string;
  displayTime: LocalizedText;
  temperatureAvg: number;
  windSpeedMax: number;
}

export interface SpraySafetyResult {
  status: SprayStatus;
  currentMetrics: {
    time: string;
    temperature: number;
    humidity: number;
    rainProbability: number;
    windSpeed: number;
  };
  reasons: LocalizedText[];
  diseaseRiskNote: LocalizedText | null;
  bestSprayWindows: BestSprayWindow[];
}

/**
 * Finds the index in hourly data that corresponds to the given reference time.
 * If referenceTime is not provided, defaults to the current clock time.
 */
export function findCurrentHourIndex(
  hourly: HourlyDataPoint[],
  referenceTime?: string | Date
): number {
  if (!hourly || hourly.length === 0) return -1;

  if (typeof referenceTime === 'string') {
    const refPrefix = referenceTime.slice(0, 13);
    const exactIdx = hourly.findIndex((p) => p.time.startsWith(refPrefix));
    if (exactIdx >= 0) return exactIdx;
  }

  if (!referenceTime) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const localPrefix = `${y}-${m}-${d}T${h}`;
    const idx = hourly.findIndex((p) => p.time.startsWith(localPrefix));
    return idx >= 0 ? idx : 0;
  }

  const refDate = typeof referenceTime === 'string' ? new Date(referenceTime) : referenceTime;
  const refTimeMs = refDate.getTime();

  let closestIdx = 0;
  let smallestDiff = Infinity;

  for (let i = 0; i < hourly.length; i++) {
    const ptMs = new Date(hourly[i].time).getTime();
    const diff = Math.abs(ptMs - refTimeMs);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closestIdx = i;
    }
  }

  return closestIdx;
}

/**
 * Pure evaluation function for spray safety.
 * Evaluates wind speed, precipitation probability, and temperature against verified thresholds.
 */
export function evaluateSpraySafety(
  hourly: HourlyDataPoint[],
  referenceTime?: string | Date
): SpraySafetyResult {
  if (!hourly || hourly.length === 0) {
    return {
      status: 'WAIT',
      currentMetrics: {
        time: '',
        temperature: 0,
        humidity: 0,
        rainProbability: 0,
        windSpeed: 0,
      },
      reasons: [
        {
          en: 'Weather data unavailable. Please verify manually before spraying.',
          te: 'వాతావరణ వివరాలు అందుబాటులో లేవు. స్ప్రే చేసే ముందు పరిశీలించండి.',
          hi: 'मौसम की जानकारी उपलब्ध नहीं है। कृपया छिड़काव से पहले जांच लें।',
        },
      ],
      diseaseRiskNote: null,
      bestSprayWindows: [],
    };
  }

  const currentIdx = findCurrentHourIndex(hourly, referenceTime);
  const current = hourly[currentIdx >= 0 ? currentIdx : 0];

  // Look ahead next 6 hours for rain probability
  const lookaheadSlice = hourly.slice(
    currentIdx >= 0 ? currentIdx : 0,
    (currentIdx >= 0 ? currentIdx : 0) + SPRAY_THRESHOLDS.rainLookaheadHours
  );
  const maxRainNext6h = lookaheadSlice.length > 0
    ? Math.max(...lookaheadSlice.map((p) => p.rainProbability))
    : current.rainProbability;

  const reasons: LocalizedText[] = [];
  let isDoNotSpray = false;
  let isWait = false;

  // 1. Wind speed rule: >= 15 km/h -> DO NOT SPRAY
  if (current.windSpeed >= SPRAY_THRESHOLDS.windSpeedDoNotSprayKmh) {
    isDoNotSpray = true;
    reasons.push({
      en: `High wind speed (${current.windSpeed.toFixed(1)} km/h, limit is ${SPRAY_THRESHOLDS.windSpeedDoNotSprayKmh} km/h). Spray drift can blow chemical onto you, other people, and neighboring crops.`,
      te: `గాలి వేగం ఎక్కువగా ఉంది (${current.windSpeed.toFixed(1)} కి.మీ/గం, పరిమితి ${SPRAY_THRESHOLDS.windSpeedDoNotSprayKmh} కి.మీ/గం). మందు గాల్లో కొట్టుకుపోయి ప్రమాదం జరగవచ్చు.`,
      hi: `तेज हवा चल रही है (${current.windSpeed.toFixed(1)} किमी/घंटा, सीमा ${SPRAY_THRESHOLDS.windSpeedDoNotSprayKmh} किमी/घंटा है)। दवा उड़कर आपके ऊपर या दूसरी फसलों पर गिर सकती है।`,
    });
  }

  // 2. Rain rule: >= 40% in next 6h -> WAIT
  if (maxRainNext6h >= SPRAY_THRESHOLDS.rainProbabilityWaitPercent) {
    isWait = true;
    reasons.push({
      en: `High chance of rain (${Math.round(maxRainNext6h)}%, limit is ${SPRAY_THRESHOLDS.rainProbabilityWaitPercent}%) within the next 6 hours. Rain will wash off the chemical before it can protect the crop.`,
      te: `రాబోయే 6 గంటల్లో వర్షం కురిసే అవకాశం (${Math.round(maxRainNext6h)}%, పరిమితి ${SPRAY_THRESHOLDS.rainProbabilityWaitPercent}%) ఉంది. వర్షానికి మందు కొట్టుకుపోతుంది.`,
      hi: `अगले 6 घंटों में बारिश की संभावना (${Math.round(maxRainNext6h)}%, सीमा ${SPRAY_THRESHOLDS.rainProbabilityWaitPercent}%) है। बारिश से दवा धुल जाएगी।`,
    });
  }

  // 3. Temperature rule: >= 32°C -> avoid; spray early morning or evening
  if (current.temperature >= SPRAY_THRESHOLDS.temperatureMaxCelsius) {
    isWait = true;
    reasons.push({
      en: `High temperature (${current.temperature.toFixed(1)}°C, limit is ${SPRAY_THRESHOLDS.temperatureMaxCelsius}°C). Intense heat evaporates chemical droplets quickly and can scorch leaves. Wait for early morning or late afternoon.`,
      te: `ఉష్ణోగ్రత ఎక్కువగా ఉంది (${current.temperature.toFixed(1)}°C, పరిమితి ${SPRAY_THRESHOLDS.temperatureMaxCelsius}°C). ఎండ తీవ్రత వల్ల మందు ఆవిరైపోయి ఆకులు మాడిపోతాయి. ఉదయం లేదా సాయంత్రం స్ప్రే చేయండి.`,
      hi: `तापमान अधिक है (${current.temperature.toFixed(1)}°C, सीमा ${SPRAY_THRESHOLDS.temperatureMaxCelsius}°C है)। तेज धूप में दवा उड़ जाती है और पत्तियां झुलस सकती हैं। सुबह या शाम को छिड़कें।`,
    });
  }

  // Determine overall status
  let status: SprayStatus;
  if (isDoNotSpray) {
    status = 'DO_NOT_SPRAY';
  } else if (isWait) {
    status = 'WAIT';
  } else {
    status = 'GOOD';
    reasons.push({
      en: `Weather is calm and suitable. Wind speed (${current.windSpeed.toFixed(1)} km/h), temperature (${current.temperature.toFixed(1)}°C), and rain chance (${Math.round(current.rainProbability)}%) are all within safe limits.`,
      te: `వాతావరణం అనుకూలంగా ఉంది. గాలి వేగం (${current.windSpeed.toFixed(1)} కి.మీ/గం), ఉష్ణోగ్రత (${current.temperature.toFixed(1)}°C), మరియు వర్షం అవకాశం (${Math.round(current.rainProbability)}%) అన్నీ సురక్షిత పరిమితుల్లో ఉన్నాయి.`,
      hi: `मौसम अनुकूल है। हवा की गति (${current.windSpeed.toFixed(1)} किमी/घंटा), तापमान (${current.temperature.toFixed(1)}°C), और बारिश की संभावना (${Math.round(current.rainProbability)}%) सभी सुरक्षित सीमा में हैं।`,
    });
  }

  // 4. Disease-risk note: Humidity >= 85% with warm weather (temp >= 25°C)
  let diseaseRiskNote: LocalizedText | null = null;
  if (
    current.humidity >= SPRAY_THRESHOLDS.humidityHighPercent &&
    current.temperature >= SPRAY_THRESHOLDS.warmWeatherMinTempCelsius
  ) {
    diseaseRiskNote = {
      en: `High humidity (${Math.round(current.humidity)}%) combined with warm weather (${current.temperature.toFixed(1)}°C) creates ideal conditions for fungal diseases to spread rapidly. Monitor your field closely and re-check crop health in 2 days.`,
      te: `అధిక తేమ (${Math.round(current.humidity)}%) మరియు వెచ్చని వాతావరణం (${current.temperature.toFixed(1)}°C) వల్ల శిలీంధ్ర తెగుళ్లు వేగంగా వ్యాపిస్తాయి. పంటను నిశితంగా పరిశీలించి 2 రోజుల్లో మళ్లీ చూడండి.`,
      hi: `अधिक नमी (${Math.round(current.humidity)}%) और गर्म मौसम (${current.temperature.toFixed(1)}°C) के कारण फफूंद रोग तेजी से फैल सकते हैं। खेत का ध्यानपूर्वक निरीक्षण करें और 2 दिनों में दोबारा जांचें।`,
    };
  }

  // 5. Best spraying hours in the forecast
  const bestSprayWindows = computeBestSprayWindows(hourly, currentIdx >= 0 ? currentIdx : 0);

  return {
    status,
    currentMetrics: {
      time: current.time,
      temperature: current.temperature,
      humidity: current.humidity,
      rainProbability: current.rainProbability,
      windSpeed: current.windSpeed,
    },
    reasons,
    diseaseRiskNote,
    bestSprayWindows,
  };
}

/**
 * Checks whether an hourly point qualifies for safe spraying
 * (within morning 6-10 or afternoon 16-19 windows, and all limits satisfied).
 */
function isSafeWindowHour(point: HourlyDataPoint): boolean {
  const date = new Date(point.time);
  const hour = date.getHours();

  const isMorningWindow =
    hour >= SPRAY_THRESHOLDS.morningWindowStartHour &&
    hour <= SPRAY_THRESHOLDS.morningWindowEndHour;

  const isAfternoonWindow =
    hour >= SPRAY_THRESHOLDS.afternoonWindowStartHour &&
    hour <= SPRAY_THRESHOLDS.afternoonWindowEndHour;

  if (!isMorningWindow && !isAfternoonWindow) {
    return false;
  }

  const isWindOk = point.windSpeed < SPRAY_THRESHOLDS.windSpeedDoNotSprayKmh;
  const isRainOk = point.rainProbability < SPRAY_THRESHOLDS.rainProbabilityWaitPercent;
  const isTempOk = point.temperature < SPRAY_THRESHOLDS.temperatureMaxCelsius;

  return isWindOk && isRainOk && isTempOk;
}

/**
 * Computes contiguous safe spray windows from the forecast.
 */
function computeBestSprayWindows(
  hourly: HourlyDataPoint[],
  startIndex: number
): BestSprayWindow[] {
  const windows: BestSprayWindow[] = [];
  const lookahead = hourly.slice(startIndex, startIndex + 48);

  let currentBlock: HourlyDataPoint[] = [];

  for (let i = 0; i < lookahead.length; i++) {
    const pt = lookahead[i];
    if (isSafeWindowHour(pt)) {
      currentBlock.push(pt);
    } else {
      if (currentBlock.length > 0) {
        windows.push(createWindowObject(currentBlock));
        currentBlock = [];
      }
    }
  }

  if (currentBlock.length > 0) {
    windows.push(createWindowObject(currentBlock));
  }

  // Return up to 3 upcoming best windows
  return windows.slice(0, 3);
}

function createWindowObject(block: HourlyDataPoint[]): BestSprayWindow {
  const first = block[0];
  const last = block[block.length - 1];

  const startDate = new Date(first.time);
  const endDate = new Date(last.time);

  const startHour = startDate.getHours();
  // +1 so if block is 6:00 to 8:00, window displays "06:00 - 09:00"
  const endHour = endDate.getHours() + 1;

  const startHourStr = `${startHour.toString().padStart(2, '0')}:00`;
  const endHourStr = `${endHour.toString().padStart(2, '0')}:00`;

  const temps = block.map((b) => b.temperature);
  const winds = block.map((b) => b.windSpeed);
  const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
  const maxWind = Math.max(...winds);

  const dayLabel = getDayLabel(startDate);

  return {
    startIso: first.time,
    endIso: last.time,
    displayTime: {
      en: `${dayLabel.en} ${startHourStr} - ${endHourStr}`,
      te: `${dayLabel.te} ${startHourStr} - ${endHourStr}`,
      hi: `${dayLabel.hi} ${startHourStr} - ${endHourStr}`,
    },
    temperatureAvg: Math.round(avgTemp),
    windSpeedMax: Math.round(maxWind),
  };
}

function getDayLabel(date: Date): LocalizedText {
  const today = new Date();
  const isSameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    date.getFullYear() === tomorrow.getFullYear() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getDate() === tomorrow.getDate();

  if (isSameDay) {
    return { en: 'Today', te: 'ఈరోజు', hi: 'आज' };
  }
  if (isTomorrow) {
    return { en: 'Tomorrow', te: 'రేపు', hi: 'कल' };
  }

  const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const daysTe = ['ఆదివారం', 'సోమవారం', 'మంగళవారం', 'బుధవారం', 'గురువారం', 'శుక్రవారం', 'శనివారం'];
  const daysHi = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];

  const dayIdx = date.getDay();
  return {
    en: daysEn[dayIdx],
    te: daysTe[dayIdx],
    hi: daysHi[dayIdx],
  };
}
