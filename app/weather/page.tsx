'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  CloudSun,
  Navigation,
  MapPin,
  CheckCircle2,
  Clock,
  ShieldAlert,
  AlertTriangle,
  Thermometer,
  Droplets,
  CloudRain,
  Wind,
  RotateCcw,
  ArrowLeft,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useI18n, SupportedLocale } from '../../lib/i18n';
import { ListenButton } from '../../components/ListenButton';
import { fetchHourlyWeather } from '../../lib/weather';
import {
  evaluateSpraySafety,
  SpraySafetyResult,
  SprayStatus,
  LocalizedText,
} from '../../lib/sprayRules';
import {
  evaluateDiseaseRadar,
  DiseaseRadarResult,
} from '../../lib/diseaseRadar';
import ChemicalCompatibilityChecker from '../../components/ChemicalCompatibilityChecker';
import KisanSatelliteWeatherHub from '../../components/KisanSatelliteWeatherHub';
import districtsData from '../../data/districts.json';

interface DistrictItem {
  id: string;
  name: {
    en: string;
    te: string;
    hi: string;
  };
  state: string;
  latitude: number;
  longitude: number;
}

const districts = districtsData as DistrictItem[];

const STORAGE_KEY = 'kisandrishti_weather_location';

function getLocalized(text: LocalizedText, loc: SupportedLocale): string {
  return text[loc] || text.en;
}

export default function WeatherPage() {
  const { t, locale } = useI18n();

  const [activeTab, setActiveTab] = useState<'satellite' | 'forecast'>('satellite');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('');

  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState<boolean>(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [safetyResult, setSafetyResult] = useState<SpraySafetyResult | null>(null);
  const [radarResult, setRadarResult] = useState<DiseaseRadarResult | null>(null);

  // Load saved location on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.lat === 'number' && typeof parsed.lon === 'number') {
          setLatitude(parsed.lat);
          setLongitude(parsed.lon);
          setLocationName(parsed.name || '');
          if (parsed.districtId) {
            setSelectedDistrictId(parsed.districtId);
          }
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const loadWeather = useCallback(
    async (lat: number, lon: number, name: string, districtId?: string) => {
      setIsLoadingWeather(true);
      setWeatherError(null);

      const res = await fetchHourlyWeather(lat, lon);

      if (!res.success) {
        setWeatherError(res.error);
        setIsLoadingWeather(false);
        return;
      }

      const evaluation = evaluateSpraySafety(res.hourly);
      setSafetyResult(evaluation);
      const radar = evaluateDiseaseRadar(res.hourly);
      setRadarResult(radar);
      setLatitude(lat);
      setLongitude(lon);
      setLocationName(name);
      if (districtId) {
        setSelectedDistrictId(districtId);
      }

      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            lat,
            lon,
            name,
            districtId: districtId || '',
          })
        );
      } catch {
        // Ignore localStorage quota errors
      }

      setIsLoadingWeather(false);
    },
    []
  );

  // Trigger weather load whenever lat/lon changes initially
  useEffect(() => {
    if (latitude !== null && longitude !== null && !safetyResult && !isLoadingWeather && !weatherError) {
      loadWeather(latitude, longitude, locationName, selectedDistrictId);
    }
  }, [latitude, longitude, safetyResult, isLoadingWeather, weatherError, locationName, selectedDistrictId, loadWeather]);

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setGpsError(t('weather.gpsDenied'));
      return;
    }

    setIsLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const gpsLabel = locale === 'te' ? 'ప్రస్తుత లొకేషన్ (GPS)' : locale === 'hi' ? 'वर्तमान स्थान (GPS)' : 'Current Location (GPS)';
        setSelectedDistrictId('');
        loadWeather(lat, lon, gpsLabel);
      },
      () => {
        setIsLocating(false);
        setGpsError(t('weather.gpsDenied'));
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const distId = e.target.value;
    setSelectedDistrictId(distId);
    setGpsError(null);

    const found = districts.find((d) => d.id === distId);
    if (found) {
      const distName = getLocalized(found.name, locale);
      loadWeather(found.latitude, found.longitude, `${distName} (${found.state})`, distId);
    }
  };

  const handleChangeLocation = () => {
    setSafetyResult(null);
    setWeatherError(null);
  };

  // Build spoken text for ListenButton
  const getSpeechSummary = (): string => {
    if (!safetyResult) return '';

    const statusWord =
      safetyResult.status === 'GOOD'
        ? t('weather.status.GOOD')
        : safetyResult.status === 'WAIT'
        ? t('weather.status.WAIT')
        : t('weather.status.DO_NOT_SPRAY');

    const firstReason =
      safetyResult.reasons.length > 0
        ? getLocalized(safetyResult.reasons[0], locale)
        : '';

    let diseaseSpoken = '';
    if (safetyResult.diseaseRiskNote) {
      diseaseSpoken = getLocalized(safetyResult.diseaseRiskNote, locale);
    }

    let bestSpoken = '';
    if (safetyResult.bestSprayWindows.length > 0) {
      const firstWin = getLocalized(safetyResult.bestSprayWindows[0].displayTime, locale);
      const prefix = locale === 'te' ? 'ఉత్తమ సమయం: ' : locale === 'hi' ? 'सर्वोत्तम समय: ' : 'Best upcoming time: ';
      bestSpoken = `${prefix} ${firstWin}`;
    }

    return `${statusWord}. ${firstReason}. ${diseaseSpoken} ${bestSpoken}`.trim();
  };

  const renderStatusCard = (status: SprayStatus) => {
    switch (status) {
      case 'GOOD':
        return (
          <div className="p-5 bg-green-50 border-3 border-green-700 rounded-2xl shadow-sm space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-700 text-white flex items-center justify-center flex-shrink-0 shadow">
                <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
              </div>
              <div>
                <span className="inline-block px-2.5 py-0.5 text-xs font-black uppercase tracking-wider bg-green-200 text-green-950 rounded-full mb-1">
                  {locale === 'te' ? 'అనుకూలం' : locale === 'hi' ? 'अनुकूल' : 'FAVORABLE'}
                </span>
                <h2 className="text-xl font-black text-green-950">
                  {t('weather.status.GOOD')}
                </h2>
              </div>
            </div>
          </div>
        );
      case 'WAIT':
        return (
          <div className="p-5 bg-amber-50 border-3 border-amber-600 rounded-2xl shadow-sm space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-600 text-white flex items-center justify-center flex-shrink-0 shadow">
                <Clock className="w-8 h-8" aria-hidden="true" />
              </div>
              <div>
                <span className="inline-block px-2.5 py-0.5 text-xs font-black uppercase tracking-wider bg-amber-200 text-amber-950 rounded-full mb-1">
                  {locale === 'te' ? 'ఆగండి' : locale === 'hi' ? 'रुकें' : 'CAUTION'}
                </span>
                <h2 className="text-xl font-black text-amber-950">
                  {t('weather.status.WAIT')}
                </h2>
              </div>
            </div>
          </div>
        );
      case 'DO_NOT_SPRAY':
        return (
          <div className="p-5 bg-red-50 border-3 border-red-700 rounded-2xl shadow-sm space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-700 text-white flex items-center justify-center flex-shrink-0 shadow">
                <ShieldAlert className="w-8 h-8" aria-hidden="true" />
              </div>
              <div>
                <span className="inline-block px-2.5 py-0.5 text-xs font-black uppercase tracking-wider bg-red-200 text-red-950 rounded-full mb-1">
                  {locale === 'te' ? 'ప్రమాదం' : locale === 'hi' ? 'खतरा' : 'HIGH RISK'}
                </span>
                <h2 className="text-xl font-black text-red-950">
                  {t('weather.status.DO_NOT_SPRAY')}
                </h2>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="w-full pb-12">
      {/* 2-Tab Switcher at Top */}
      <div className="p-3 max-w-lg mx-auto">
        <div className="flex bg-slate-200 p-1.5 rounded-2xl shadow-inner border border-slate-300">
          <button
            type="button"
            onClick={() => setActiveTab('satellite')}
            className={`flex-1 py-3 px-2 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all min-h-[48px] ${
              activeTab === 'satellite'
                ? 'bg-emerald-700 text-white shadow-md'
                : 'text-slate-700 hover:text-slate-950 hover:bg-slate-300/60'
            }`}
          >
            <span>🛰️</span>
            <span>
              {locale === 'te'
                ? 'ఉపగ్రహ స్కై హబ్'
                : locale === 'hi'
                ? 'उपग्रह स्काई हब'
                : 'Satellite Sky Hub'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('forecast')}
            className={`flex-1 py-3 px-2 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all min-h-[48px] ${
              activeTab === 'forecast'
                ? 'bg-sky-700 text-white shadow-md'
                : 'text-slate-700 hover:text-slate-950 hover:bg-slate-300/60'
            }`}
          >
            <span>🌦️</span>
            <span>
              {locale === 'te'
                ? 'స్ప్రే వాతావరణం'
                : locale === 'hi'
                ? 'स्प्रे मौसम'
                : 'Spray Weather'}
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'satellite' ? (
        <KisanSatelliteWeatherHub />
      ) : (
        <div className="p-4 space-y-5 max-w-lg mx-auto">
          {/* Top Bar */}
          <div className="flex items-center justify-between gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 min-h-[48px] px-3 py-2 text-base font-bold text-sky-950 bg-sky-100 hover:bg-sky-200 rounded-lg border border-sky-300"
            >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          <span>{locale === 'te' ? 'హోమ్' : locale === 'hi' ? 'होम' : 'Home'}</span>
        </Link>
        {safetyResult && <ListenButton text={getSpeechSummary()} />}
      </div>

      {/* Page Header */}
      <div className="p-4 bg-sky-50 border-2 border-sky-700 rounded-2xl space-y-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-700 text-white flex items-center justify-center flex-shrink-0">
            <CloudSun className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-black text-sky-950 leading-tight">
              {t('weather.title')}
            </h1>
            <p className="text-xs text-sky-800 font-medium">
              {t('weather.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Location Selection Block (Shown if no result or if user taps Change) */}
      {(!safetyResult || isLoadingWeather || weatherError) && (
        <div className="p-5 bg-white border-2 border-stone-300 rounded-2xl space-y-4 shadow-sm">
          {/* Explanation Why */}
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm font-medium text-blue-950 leading-snug">
              {t('weather.locationPrompt')}
            </p>
          </div>

          {/* GPS Button */}
          <button
            type="button"
            onClick={handleUseGps}
            disabled={isLocating || isLoadingWeather}
            className="w-full min-h-[52px] px-4 py-3 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 disabled:opacity-60 text-white text-base font-bold rounded-xl flex items-center justify-center gap-2 shadow"
          >
            <Navigation className={`w-5 h-5 ${isLocating ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{isLocating ? t('weather.locating') : t('weather.useGps')}</span>
          </button>

          {/* GPS Denied Message */}
          {gpsError && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2 text-sm font-medium text-amber-950">
              <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>{gpsError}</span>
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 text-xs uppercase font-bold text-stone-500">
            <div className="flex-1 h-px bg-stone-300" />
            <span>{t('weather.orPickDistrict')}</span>
            <div className="flex-1 h-px bg-stone-300" />
          </div>

          {/* District Dropdown */}
          <div className="space-y-1.5">
            <label htmlFor="district-select" className="block text-sm font-bold text-stone-900">
              {t('weather.orPickDistrict')}
            </label>
            <div className="relative">
              <select
                id="district-select"
                value={selectedDistrictId}
                onChange={handleDistrictChange}
                disabled={isLoadingWeather}
                className="w-full min-h-[50px] px-3.5 py-2.5 text-base font-medium text-stone-950 bg-stone-50 border-2 border-stone-400 focus:border-emerald-700 rounded-xl focus:outline-none appearance-none"
              >
                <option value="">{t('weather.selectDistrictPlaceholder')}</option>
                <optgroup label="Andhra Pradesh">
                  {districts
                    .filter((d) => d.state === 'Andhra Pradesh')
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {getLocalized(d.name, locale)}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Telangana">
                  {districts
                    .filter((d) => d.state === 'Telangana')
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {getLocalized(d.name, locale)}
                      </option>
                    ))}
                </optgroup>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-stone-600">
                <MapPin className="w-5 h-5" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoadingWeather && (
        <div className="p-8 bg-white border-2 border-emerald-600 rounded-2xl text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 mx-auto rounded-full border-4 border-emerald-200 border-t-emerald-700 animate-spin" />
          <p className="text-base font-bold text-emerald-950">
            {t('weather.loading')}
          </p>
          <p className="text-xs text-stone-500">
            Open-Meteo (24-48h forecast)
          </p>
        </div>
      )}

      {/* Unreachable / Error State */}
      {weatherError && !isLoadingWeather && (
        <div className="p-5 bg-red-50 border-2 border-red-600 rounded-2xl space-y-4 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <h2 className="text-lg font-black text-red-950">
                {t('weather.errorTitle')}
              </h2>
              <p className="text-sm font-medium text-red-900 leading-relaxed">
                {weatherError || t('weather.errorMsg')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (latitude !== null && longitude !== null) {
                loadWeather(latitude, longitude, locationName, selectedDistrictId);
              }
            }}
            className="w-full min-h-[48px] px-4 py-2 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" aria-hidden="true" />
            <span>{t('weather.retry')}</span>
          </button>
        </div>
      )}

      {/* Safety Results View */}
      {safetyResult && !isLoadingWeather && (
        <div className="space-y-5">
          {/* Active Location Header & Change Pill */}
          <div className="flex items-center justify-between p-3 bg-stone-100 border border-stone-300 rounded-xl">
            <div className="flex items-center gap-2 overflow-hidden">
              <MapPin className="w-5 h-5 text-emerald-800 flex-shrink-0" aria-hidden="true" />
              <span className="text-sm font-bold text-stone-900 truncate">
                {locationName || 'Field Location'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleChangeLocation}
              className="text-xs font-bold text-emerald-800 hover:underline px-2 py-1 bg-white border border-stone-300 rounded-lg flex-shrink-0"
            >
              {t('weather.changeLocation')}
            </button>
          </div>

          {/* Big Colored Status Banner */}
          {renderStatusCard(safetyResult.status)}

          {/* Live Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Temperature */}
            <div className="p-3 bg-white border border-stone-300 rounded-xl flex items-center gap-2.5 shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-orange-100 text-orange-800 flex items-center justify-center flex-shrink-0">
                <Thermometer className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-stone-600 font-semibold">{t('weather.metrics.temperature')}</p>
                <p className="text-base font-black text-stone-950">
                  {safetyResult.currentMetrics.temperature.toFixed(1)}°C
                </p>
              </div>
            </div>

            {/* Wind Speed */}
            <div className="p-3 bg-white border border-stone-300 rounded-xl flex items-center gap-2.5 shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-cyan-100 text-cyan-800 flex items-center justify-center flex-shrink-0">
                <Wind className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-stone-600 font-semibold">{t('weather.metrics.windSpeed')}</p>
                <p className="text-base font-black text-stone-950">
                  {safetyResult.currentMetrics.windSpeed.toFixed(1)} km/h
                </p>
              </div>
            </div>

            {/* Rain Chance */}
            <div className="p-3 bg-white border border-stone-300 rounded-xl flex items-center gap-2.5 shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center flex-shrink-0">
                <CloudRain className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-stone-600 font-semibold">{t('weather.metrics.rainChance')}</p>
                <p className="text-base font-black text-stone-950">
                  {Math.round(safetyResult.currentMetrics.rainProbability)}%
                </p>
              </div>
            </div>

            {/* Humidity */}
            <div className="p-3 bg-white border border-stone-300 rounded-xl flex items-center gap-2.5 shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center flex-shrink-0">
                <Droplets className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-stone-600 font-semibold">{t('weather.metrics.humidity')}</p>
                <p className="text-base font-black text-stone-950">
                  {Math.round(safetyResult.currentMetrics.humidity)}%
                </p>
              </div>
            </div>
          </div>

          {/* Reasons List */}
          <div className="p-4 bg-white border-2 border-stone-300 rounded-2xl space-y-2.5 shadow-sm">
            <h3 className="text-base font-black text-stone-950 flex items-center gap-2">
              <span>{t('weather.reasonsTitle')}</span>
            </h3>
            <ul className="space-y-2">
              {safetyResult.reasons.map((reason, idx) => (
                <li
                  key={idx}
                  className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium text-stone-900 leading-relaxed"
                >
                  {getLocalized(reason, locale)}
                </li>
              ))}
            </ul>
          </div>

          {/* Fungal Disease Warning (if humidity >= 85% with warm weather) */}
          {safetyResult.diseaseRiskNote && (
            <div className="p-4 bg-purple-50 border-2 border-purple-700 rounded-2xl space-y-2 shadow-sm">
              <div className="flex items-center gap-2 text-purple-950">
                <AlertTriangle className="w-5 h-5 text-purple-700 flex-shrink-0" aria-hidden="true" />
                <h3 className="text-base font-black">
                  {t('weather.diseaseRiskTitle')}
                </h3>
              </div>
              <p className="text-sm font-medium text-purple-950 leading-relaxed">
                {getLocalized(safetyResult.diseaseRiskNote, locale)}
              </p>
            </div>
          )}

          {/* Best Upcoming Spraying Hours */}
          <div className="p-4 bg-white border-2 border-stone-300 rounded-2xl space-y-3 shadow-sm">
            <h3 className="text-base font-black text-stone-950 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-700" aria-hidden="true" />
              <span>{t('weather.bestHoursTitle')}</span>
            </h3>

            {safetyResult.bestSprayWindows.length === 0 ? (
              <p className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium text-stone-700">
                {t('weather.noBestHours')}
              </p>
            ) : (
              <div className="space-y-2">
                {safetyResult.bestSprayWindows.map((win, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-emerald-50 border-2 border-emerald-600 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <p className="text-base font-black text-emerald-950">
                        {getLocalized(win.displayTime, locale)}
                      </p>
                      <p className="text-xs font-semibold text-emerald-800">
                        {locale === 'te'
                          ? `సగటు ఉష్ణోగ్రత: ${win.temperatureAvg}°C • గరిష్ట గాలి: ${win.windSpeedMax} km/h`
                          : locale === 'hi'
                          ? `औसत तापमान: ${win.temperatureAvg}°C • अधिकतम हवा: ${win.windSpeedMax} km/h`
                          : `Avg Temp: ${win.temperatureAvg}°C • Max Wind: ${win.windSpeedMax} km/h`}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-black uppercase bg-emerald-200 text-emerald-950 rounded-lg">
                      {locale === 'te' ? 'సిఫార్సు' : locale === 'hi' ? 'सुझाव' : 'IDEAL'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 48-Hour Disease & Pest Outbreak Radar */}
          {radarResult && radarResult.hasAlerts && (
            <div className="p-4 bg-purple-50 border-2 border-purple-800 rounded-2xl space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-950">
                  <AlertTriangle className="w-5 h-5 text-purple-800 shrink-0" aria-hidden="true" />
                  <h3 className="text-base font-black">
                    {locale === 'te'
                      ? '🦠 రాబోయే 48-గంటల తెగుళ్లు & పురుగుల ముందస్తు రాడార్'
                      : locale === 'hi'
                      ? '🦠 आगामी 48-घंटे कीट व रोग पूर्व चेतावनी रडार'
                      : '🦠 48-Hour Disease & Pest Outbreak Radar'}
                  </h3>
                </div>
                <span className="px-2 py-0.5 bg-purple-200 text-purple-950 rounded text-xs font-black">
                  {radarResult.alerts.length} {locale === 'te' ? 'హెచ్చరికలు' : locale === 'hi' ? 'अलर्ट' : 'Alerts'}
                </span>
              </div>

              <p className="text-xs text-purple-900 font-medium leading-relaxed">
                {locale === 'te'
                  ? 'రాబోయే 48 గంటల వాతావరణ అంచనా ఆధారంగా సూక్ష్మజీవులు మరియు పురుగులు వృద్ధి చెందే ప్రమాదం ఉంది. రసాయన మందుల ఖర్చు లేకుండా ముందస్తు సేంద్రీయ చర్యలు తీసుకోండి.'
                  : locale === 'hi'
                  ? 'मौसम के आधार पर कीट और फफूंद पनपने का खतरा है। बिना रासायनिक खर्च के समय रहते जैविक निवारक कदम उठाएं।'
                  : 'Based on 48h microclimate conditions. Apply Stage 1 Preventive Organic Sprays before chemical intervention is needed.'}
              </p>

              <div className="space-y-3 pt-1">
                {radarResult.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3.5 bg-white border border-purple-300 rounded-xl space-y-2 text-xs text-slate-800"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-sm text-purple-950">
                        {alert.diseaseName[locale as 'en' | 'te' | 'hi'] || alert.diseaseName.en}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          alert.severity === 'HIGH'
                            ? 'bg-red-100 text-red-900 border border-red-400'
                            : 'bg-amber-100 text-amber-900 border border-amber-400'
                        }`}
                      >
                        {alert.severity} RISK
                      </span>
                    </div>

                    <p className="text-slate-700 leading-relaxed">
                      {alert.conditionSummary[locale as 'en' | 'te' | 'hi'] || alert.conditionSummary.en}
                    </p>

                    <div className="p-2 bg-purple-50 rounded-lg border border-purple-200 text-purple-950 space-y-0.5">
                      <span className="font-bold block">
                        {locale === 'te' ? 'ముందస్తు పరిశీలన:' : locale === 'hi' ? 'खेत में जांच:' : 'Scouting Action:'}
                      </span>
                      <p>{alert.preventiveAction[locale as 'en' | 'te' | 'hi'] || alert.preventiveAction.en}</p>
                    </div>

                    <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-300 text-emerald-950 space-y-0.5">
                      <span className="font-bold block">
                        {locale === 'te' ? '🌿 సేంద్రీయ ముందస్తు పిచికారీ:' : locale === 'hi' ? '🌿 जैविक निवारक छिड़काव:' : '🌿 Stage 1 Organic Spray:'}
                      </span>
                      <p className="font-medium">
                        {alert.organicSpray[locale as 'en' | 'te' | 'hi'] || alert.organicSpray.en}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chemical Compatibility & Jar Mix Checker */}
          <ChemicalCompatibilityChecker />

          {/* Quick link to Crop Doctor */}
          <Link
            href="/doctor"
            className="w-full min-h-[48px] px-4 py-3 bg-stone-100 hover:bg-stone-200 text-stone-900 border border-stone-300 font-bold text-sm rounded-xl flex items-center justify-center gap-2"
          >
            <span>
              {locale === 'te'
                ? 'పంట తెగులును గుర్తించాలా? పంట డాక్టర్‌కు వెళ్ళండి'
                : locale === 'hi'
                ? 'फसल में रोग है? फसल डॉक्टर पर जाएं'
                : 'Need to diagnose a sick crop? Go to Crop Doctor'}
            </span>
          </Link>
        </div>
      )}
        </div>
      )}
    </div>
  );
}
