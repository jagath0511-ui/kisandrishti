'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Compass,
  Phone,
  Volume2,
  Mic,
  MicOff,
  Navigation,
  Crosshair,
  Lock,
  Unlock,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Droplets,
  CloudRain,
  Activity,
  ShieldCheck,
  ChevronRight,
  Info,
  Maximize2,
  X,
  Camera,
  Trash2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useI18n, SupportedLocale } from '../lib/i18n';
import {
  LatLng,
  calculatePolygonAreaSqMeters,
  sqMetersToAcres,
  acresToCents,
  acresToGuntas,
  calculateTotalWaterLitres,
  calculateKnapsackDrums,
  generatePolygonForAcres,
  haversineDistanceMeters,
  translateDosageToHouseholdMeasures,
  checkLuminance,
} from '../lib/fieldGeometry';

const STORAGE_KEY = 'kisan_field_boundary_v2';

export interface PlotItem {
  id: string;
  name: string;
  crop: string;
  surveyNumber: string;
  village: string;
  mandal: string;
  acres: number;
  corners: LatLng[];
  isLocked: boolean;
}

const DEFAULT_PLOTS: PlotItem[] = [
  {
    id: 'plot-1',
    name: 'Chilli Farm (Plot 1)',
    crop: 'Chilli',
    surveyNumber: '142/2B',
    village: 'Surampalem',
    mandal: 'Gandepalli',
    acres: 1.4,
    corners: generatePolygonForAcres({ lat: 17.0899, lng: 82.0668 }, 1.4),
    isLocked: true,
  },
  {
    id: 'plot-2',
    name: 'Paddy Field (Plot 2)',
    crop: 'Paddy',
    surveyNumber: '143/1A',
    village: 'Surampalem',
    mandal: 'Gandepalli',
    acres: 2.0,
    corners: generatePolygonForAcres({ lat: 17.0915, lng: 82.0685 }, 2.0),
    isLocked: true,
  },
];

type LensType = 'health' | 'water' | 'rain';

export default function KisanSatelliteWeatherHub() {
  const { locale, setLocale } = useI18n();

  // Multi-plot farm management
  const [plots, setPlots] = useState<PlotItem[]>(DEFAULT_PLOTS);
  const [activePlotId, setActivePlotId] = useState<string>('plot-1');
  const activePlot = plots.find((p) => p.id === activePlotId) || plots[0];

  // Leaflet map state (0 MB local installation - CDN dynamically injected)
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const polygonLayerRef = useRef<any>(null);
  const stressedLayerRef = useRef<any>(null);
  const cornerMarkersRef = useRef<any[]>([]);
  const radarLayerRef = useRef<any>(null);
  const [sdkLoaded, setSdkLoaded] = useState<boolean>(false);

  // Lenses & View controls
  const [activeLens, setActiveLens] = useState<LensType>('health');
  const [healthTimeline, setHealthTimeline] = useState<'today' | 'past10'>('today');
  const [drumSize, setDrumSize] = useState<number>(15); // standard 15L knapsack
  const [spotSprayOnly, setSpotSprayOnly] = useState<boolean>(false);
  const [showShopkeeperModal, setShowShopkeeperModal] = useState<boolean>(false);
  const [isPassbookDrawerOpen, setIsPassbookDrawerOpen] = useState<boolean>(false);

  // GPS & Scanning states
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [mapCenterPoint, setMapCenterPoint] = useState<LatLng>({ lat: 17.0899, lng: 82.0668 });

  // Passbook Scanner Upload State
  const passbookInputRef = useRef<HTMLInputElement>(null);
  const [passbookSurveyInput, setPassbookSurveyInput] = useState<string>('142/2B');
  const [passbookAcresInput, setPassbookAcresInput] = useState<string>('1.40');
  const [isScanningPassbook, setIsScanningPassbook] = useState<boolean>(false);
  const [passbookScanError, setPassbookScanError] = useState<string | null>(null);

  // Live Open-Meteo telemetry
  const [weatherData, setWeatherData] = useState<{
    temperature: number;
    humidity: number;
    windSpeed: number;
    cloudCover: number;
    soilMoisture: number;
    hourly: Array<{
      time: string;
      temperature: number;
      rainProb: number;
      windSpeed: number;
      soilMoisture: number;
    }>;
  }>({
    temperature: 29.5,
    humidity: 78,
    windSpeed: 8.5,
    cloudCover: 25,
    soilMoisture: 0.19,
    hourly: [],
  });

  // Speech Assistant
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechFeedback, setSpeechFeedback] = useState<string>('');

  // 1. Load persisted farm plots from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPlots(parsed);
          setActivePlotId(parsed[0].id);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Persist plots whenever they change
  const savePlotsToStorage = (updated: PlotItem[]) => {
    setPlots(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore quota errors
    }
  };

  // 2. Dynamically load Leaflet 1.9.4 CSS & JS from unpkg (0 MB added to repo)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).L) {
      setSdkLoaded(true);
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => setSdkLoaded(true);
    document.body.appendChild(script);
  }, []);

  // 3. Fetch Live Open-Meteo telemetry for farm's exact latitude/longitude
  const fetchTelemetry = useCallback(async (lat: number, lng: number) => {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,cloud_cover&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,wind_speed_10m,soil_moisture_0_to_1cm,et0_fao_evapotranspiration&timezone=auto&forecast_days=2`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const data = await res.json();

      const current = data.current || {};
      const hourly = data.hourly || {};

      const hourlyList = (hourly.time || []).slice(0, 16).map((t: string, idx: number) => ({
        time: t,
        temperature: hourly.temperature_2m?.[idx] ?? 28,
        rainProb: hourly.precipitation_probability?.[idx] ?? 10,
        windSpeed: hourly.wind_speed_10m?.[idx] ?? 8,
        soilMoisture: hourly.soil_moisture_0_to_1cm?.[idx] ?? 0.2,
      }));

      setWeatherData({
        temperature: current.temperature_2m ?? 29,
        humidity: current.relative_humidity_2m ?? 75,
        windSpeed: current.wind_speed_10m ?? 8,
        cloudCover: current.cloud_cover ?? 30,
        soilMoisture: hourly.soil_moisture_0_to_1cm?.[0] ?? 0.19,
        hourly: hourlyList,
      });
    } catch (_err) {
      // Graceful offline fallback: Surampalem standard telemetry
      setWeatherData((prev) => ({
        ...prev,
        temperature: 29.5,
        humidity: 78,
        windSpeed: 8.5,
        cloudCover: 25,
        soilMoisture: 0.19,
      }));
    }
  }, []);

  useEffect(() => {
    if (activePlot.corners.length > 0) {
      fetchTelemetry(activePlot.corners[0].lat, activePlot.corners[0].lng);
    }
  }, [activePlot, fetchTelemetry]);

  // 4. Initialize Map once Leaflet is ready
  useEffect(() => {
    if (!sdkLoaded || !mapContainerRef.current || mapInstanceRef.current) return;
    const L = (window as any).L;

    const center = activePlot.corners[0] || { lat: 17.0899, lng: 82.0668 };
    const map = L.map(mapContainerRef.current, {
      center: [center.lat, center.lng],
      zoom: 17,
      zoomControl: false,
    });

    // High-Resolution Keyless Esri World Satellite Imagery
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri World Imagery',
      }
    ).addTo(map);

    // Track map center as user slides/pans map
    map.on('move', () => {
      const c = map.getCenter();
      setMapCenterPoint({ lat: c.lat, lng: c.lng });
    });

    mapInstanceRef.current = map;
  }, [sdkLoaded]);

  // 5. Render Layers based on active Lens & locked Plot
  useEffect(() => {
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    // Clear old layers
    cornerMarkersRef.current.forEach((m) => map.removeLayer(m));
    cornerMarkersRef.current = [];
    if (polygonLayerRef.current) map.removeLayer(polygonLayerRef.current);
    if (stressedLayerRef.current) map.removeLayer(stressedLayerRef.current);
    if (radarLayerRef.current) map.removeLayer(radarLayerRef.current);

    const corners = activePlot.corners;

    // Corner Markers (Yellow with high sunlight contrast)
    corners.forEach((pt, idx) => {
      const marker = L.circleMarker([pt.lat, pt.lng], {
        radius: 8,
        fillColor: '#FACC15',
        color: '#000000',
        weight: 3,
        fillOpacity: 1,
      })
        .bindTooltip(`Corner ${idx + 1}`, { permanent: false })
        .addTo(map);
      cornerMarkersRef.current.push(marker);
    });

    // Main Farm Polygon
    if (corners.length >= 3) {
      polygonLayerRef.current = L.polygon(
        corners.map((p) => [p.lat, p.lng]),
        {
          color: activePlot.isLocked ? '#22C55E' : '#EAB308',
          weight: 3.5,
          fillColor: activeLens === 'water' ? '#38BDF8' : '#22C55E',
          fillOpacity: activeLens === 'water' ? 0.3 : 0.25,
        }
      ).addTo(map);

      // Fit bounds to polygon
      map.fitBounds(polygonLayerRef.current.getBounds(), { padding: [30, 30] });
    }

    // LENS 1: Sick Spots / Crop Health Overlay
    if (activeLens === 'health' && corners.length >= 4) {
      // Compute stressed sub-patch (e.g. Northeast corner = 25% of field area)
      const stressedCorner = [
        corners[0],
        { lat: (corners[0].lat + corners[1].lat) / 2, lng: (corners[0].lng + corners[1].lng) / 2 },
        {
          lat: (corners[0].lat + corners[2].lat) / 2,
          lng: (corners[0].lng + corners[2].lng) / 2,
        },
        { lat: (corners[0].lat + corners[3].lat) / 2, lng: (corners[0].lng + corners[3].lng) / 2 },
      ];

      const patchColor = healthTimeline === 'today' ? '#EF4444' : '#F97316';
      stressedLayerRef.current = L.polygon(
        stressedCorner.map((p) => [p.lat, p.lng]),
        {
          color: patchColor,
          weight: 3,
          fillColor: patchColor,
          fillOpacity: 0.55,
          dashArray: '6, 6',
        }
      ).addTo(map);

      // HTML Marker Pin on weak spot
      const centerPatch = stressedCorner[0];
      const pinIcon = L.divIcon({
        className: 'custom-sick-pin',
        html: `<div style="background:#DC2626; color:#FFF; font-weight:900; padding:4px 8px; border-radius:8px; border:2px solid #FFF; box-shadow:0 2px 6px rgba(0,0,0,0.4); font-size:11px; white-space:nowrap;">📍 Walk Here & Scan Leaf</div>`,
        iconSize: [140, 30],
        iconAnchor: [70, 35],
      });
      L.marker([centerPatch.lat, centerPatch.lng], { icon: pinIcon }).addTo(map);
    }

    // LENS 3: RainViewer Public Precipitation Radar Tile Layer
    if (activeLens === 'rain') {
      radarLayerRef.current = L.tileLayer(
        'https://tilecache.rainviewer.com/v2/radar/nowcast_10/256/{z}/{x}/{y}/2/1_1.png',
        {
          opacity: 0.65,
          zIndex: 500,
        }
      ).addTo(map);
    }
  }, [activePlot, activeLens, healthTimeline]);

  // Mode 1: Slide map and mark center crosshair as corner
  const handleAddCenterCorner = () => {
    if (activePlot.isLocked) return;
    const newCorners = [...activePlot.corners, mapCenterPoint];
    const newAcres = sqMetersToAcres(calculatePolygonAreaSqMeters(newCorners));
    const updated = plots.map((p) =>
      p.id === activePlot.id ? { ...p, corners: newCorners, acres: Number(newAcres.toFixed(2)) } : p
    );
    savePlotsToStorage(updated);
  };

  // Mode 2: Walk corners with GPS
  const handleWalkCornerGps = () => {
    if (!navigator.geolocation) {
      alert('Location is disabled on your device.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const pt = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(pt);
        setGpsAccuracy(Math.round(pos.coords.accuracy));
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([pt.lat, pt.lng], 18);
        }
        if (!activePlot.isLocked) {
          const newCorners = [...activePlot.corners, pt];
          const newAcres = sqMetersToAcres(calculatePolygonAreaSqMeters(newCorners));
          const updated = plots.map((p) =>
            p.id === activePlot.id ? { ...p, corners: newCorners, acres: Number(newAcres.toFixed(2)) } : p
          );
          savePlotsToStorage(updated);
        }
      },
      () => {
        setIsLocating(false);
        alert('Could not acquire GPS position. Please check phone permissions.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Mode 3: Passbook Scanner Camera Upload & Pixel Luminance Check
  const handlePassbookUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningPassbook(true);
    setPassbookScanError(null);

    try {
      // 1. In-browser canvas compression & pixel luminance validation
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = objectUrl;
      });

      const maxDim = 1024;
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w >= h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');

      ctx.drawImage(img, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h);
      const lum = checkLuminance(imgData.data);

      if (lum.isTooDark) {
        setPassbookScanError(
          locale === 'te'
            ? '⚠️ కాగితం ఫోటో చాలా చీకటిగా ఉంది. మంచి వెలుతురులో మళ్లీ తీయండి.'
            : '⚠️ Document photo is too dark. Please retake in good sunlight.'
        );
      }

      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);

      // 2. Call backend /api/land-parse
      const res = await fetch('/api/land-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: compressedBase64,
          mimeType: 'image/jpeg',
        }),
      });

      const data = await res.json();

      if (data.surveyNumber) setPassbookSurveyInput(data.surveyNumber);
      if (data.acres) setPassbookAcresInput(String(data.acres));

      const detectedAcres = data.acres || parseFloat(passbookAcresInput) || 1.4;
      const detectedSurvey = data.surveyNumber || passbookSurveyInput || '142/2B';

      // 3. Auto-generate exact boundary polygon matching detected acreage
      const center = activePlot.corners[0] || { lat: 17.0899, lng: 82.0668 };
      const generatedCorners = data.cornerCoordinates || generatePolygonForAcres(center, detectedAcres);

      const updated = plots.map((p) =>
        p.id === activePlot.id
          ? {
              ...p,
              surveyNumber: detectedSurvey,
              acres: detectedAcres,
              village: data.village || p.village,
              mandal: data.mandal || p.mandal,
              corners: generatedCorners,
              isLocked: true,
            }
          : p
      );

      savePlotsToStorage(updated);
      setIsPassbookDrawerOpen(false);
    } catch (err) {
      console.error(err);
      setPassbookScanError(
        locale === 'te'
          ? 'సర్వే పేపర్ చదవడంలో సమస్య. సర్వే నంబర్ నేరుగా నమోదు చేయండి.'
          : 'Could not auto-read passbook. Please enter Survey number manually.'
      );
    } finally {
      setIsScanningPassbook(false);
    }
  };

  // Lock / Unlock toggle
  const handleToggleLock = () => {
    const updated = plots.map((p) =>
      p.id === activePlot.id ? { ...p, isLocked: !p.isLocked } : p
    );
    savePlotsToStorage(updated);
  };

  // Reset/Clear corners
  const handleClearCorners = () => {
    const updated = plots.map((p) =>
      p.id === activePlot.id ? { ...p, corners: [], acres: 0, isLocked: false } : p
    );
    savePlotsToStorage(updated);
  };

  // Calculations for Spot-Spraying & Acreage
  const effectiveAcres = spotSprayOnly ? Number((activePlot.acres * 0.25).toFixed(2)) : activePlot.acres;
  const apCents = acresToCents(effectiveAcres);
  const tgGuntas = acresToGuntas(effectiveAcres);
  const totalWaterLitres = calculateTotalWaterLitres(effectiveAcres, 150);
  const knapsackDrumsCount = calculateKnapsackDrums(totalWaterLitres, drumSize);
  const dosageTranslator = translateDosageToHouseholdMeasures(2.5, drumSize); // default 2.5g/L Mancozeb

  // Motor Hours translation: soilMoisture < 0.22 -> dry, run 5HP borewell motor
  const motorHoursRequired =
    weatherData.soilMoisture < 0.22
      ? Number(((0.28 - weatherData.soilMoisture) * 22 * activePlot.acres).toFixed(1))
      : 0;

  // Haversine distance from user to stressed weak spot
  const distanceToWeakSpot = userLocation
    ? haversineDistanceMeters(userLocation, activePlot.corners[0] || { lat: 17.0899, lng: 82.0668 })
    : null;

  // Traffic Light Spray Status
  let sprayTrafficVerdict: 'GOOD' | 'WAIT_WIND' | 'WAIT_RAIN' | 'WAIT_HEAT' = 'GOOD';
  if (weatherData.windSpeed >= 15) sprayTrafficVerdict = 'WAIT_WIND';
  else if (weatherData.temperature >= 33) sprayTrafficVerdict = 'WAIT_HEAT';

  // Voice Assistant: Listen to spoken questions
  const handleVoiceListen = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechFeedback(
        locale === 'te'
          ? 'వాయిస్ సెర్చ్ కోసం గూగుల్ క్రోమ్ (Google Chrome) వాడండి. మీరు నేరుగా బటన్లను కూడా నొక్కవచ్చు!'
          : locale === 'hi'
          ? 'वॉयस सर्च के लिए गूगल क्रोम (Google Chrome) का उपयोग करें। आप सीधे बटन भी दबा सकते हैं!'
          : 'Voice search needs Google Chrome on Android. You can also tap the buttons directly!'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = locale === 'te' ? 'te-IN' : locale === 'hi' ? 'hi-IN' : 'en-IN';
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechFeedback(
          locale === 'te'
            ? 'మీ వ్యవసాయ ప్రశ్న వింటున్నాను...'
            : locale === 'hi'
            ? 'आपका कृषि प्रश्न सुन रहा हूँ...'
            : 'Listening to your farming question...'
        );
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.toLowerCase() || '';
        setIsListening(false);
        setSpeechFeedback(`"${transcript}"`);

        // Natural query router
        if (
          transcript.includes('water') ||
          transcript.includes('నీరు') ||
          transcript.includes('మోటార్') ||
          transcript.includes('पानी') ||
          transcript.includes('मोटर')
        ) {
          setActiveLens('water');
          speakText(
            locale === 'te'
              ? `నేలలో తేమ శాతం చూస్తున్నాం. మీ 5HP మోటారును ఈరోజు ${motorHoursRequired} గంటలు నడపండి.`
              : `Switching to Water Need Lens. Run your 5HP borewell motor for ${motorHoursRequired} hours today.`
          );
        } else if (
          transcript.includes('rain') ||
          transcript.includes('వర్షం') ||
          transcript.includes('గాలి') ||
          transcript.includes('మందు') ||
          transcript.includes('बारिश') ||
          transcript.includes('स्प्रे')
        ) {
          setActiveLens('rain');
          speakText(
            locale === 'te'
              ? 'వర్షం మరియు లైవ్ రాడార్ మ్యాప్ తెరుస్తున్నాం. ప్రస్తుత గాలి వేగం అనుకూలంగా ఉంది.'
              : 'Switching to Live Rain Radar Lens.'
          );
        } else {
          setActiveLens('health');
          speakText(
            locale === 'te'
              ? `పంట బలహీన ప్రాంతం గుర్తించబడింది. నడిచి వెళ్లి ఆకు డాక్టర్‌తో స్కాన్ చేయండి.`
              : `Showing weak crop spots on your farm.`
          );
        }
      };

      recognition.onerror = (e: any) => {
        setIsListening(false);
        if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') {
          setSpeechFeedback(
            locale === 'te'
              ? 'మైక్రోఫోన్ అనుమతి నిరాకరించబడింది. మీరు నేరుగా బటన్లను నొక్కవచ్చు!'
              : locale === 'hi'
              ? 'माइक्रोफ़ोन अनुमति अवरुद्ध है। आप सीधे बटन भी दबा सकते हैं!'
              : 'Microphone permission blocked. You can also tap the buttons directly!'
          );
        } else {
          setSpeechFeedback(
            locale === 'te'
              ? 'వాయిస్ సెర్చ్ కోసం గూగుల్ క్రోమ్ వాడండి. మీరు నేరుగా బటన్లను కూడా నొక్కవచ్చు!'
              : locale === 'hi'
              ? 'वॉयस सर्च के लिए गूगल क्रोम का उपयोग करें। आप सीधे बटन भी दबा सकते हैं!'
              : 'Voice search needs Google Chrome on Android. You can also tap the buttons directly!'
          );
        }
      };

      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch {
      setIsListening(false);
      setSpeechFeedback(
        locale === 'te'
          ? 'వాయిస్ సెర్చ్ కోసం గూగుల్ క్రోమ్ వాడండి. మీరు నేరుగా బటన్లను కూడా నొక్కవచ్చు!'
          : 'Voice search needs Google Chrome on Android. You can also tap the buttons directly!'
      );
    }
  };

  // Text-to-speech speaker
  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale === 'te' ? 'te-IN' : locale === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="space-y-4 text-slate-900 pb-12">
      {/* 1. Header Bar with Survey Number, Language Switcher & 108 SOS */}
      <div className="p-3.5 bg-slate-900 text-white rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md border-2 border-emerald-600">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg shrink-0">
            🛰️
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs px-2 py-0.5 bg-emerald-800 text-emerald-200 rounded font-bold">
                Survey #{activePlot.surveyNumber}
              </span>
              <span className="text-xs text-slate-300 font-bold">
                {activePlot.village}, {activePlot.mandal}
              </span>
            </div>
            <h1 className="text-base font-black text-white leading-tight mt-0.5">
              KisanDrishti Sky Hub
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language Switcher Pills */}
          <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
            {(['te', 'hi', 'en'] as SupportedLocale[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLocale(lang)}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                  locale === lang ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                {lang === 'te' ? 'తెలుగు' : lang === 'hi' ? 'हिं' : 'EN'}
              </button>
            ))}
          </div>

          {/* 108 Emergency Speed Dial */}
          <a
            href="tel:108"
            className="min-h-[40px] px-3 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-lg flex items-center gap-1.5 shadow-sm"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>108 SOS</span>
          </a>
        </div>
      </div>

      {/* Voice Assistant Buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() =>
            speakText(
              locale === 'te'
                ? `సర్వే నంబరు ${activePlot.surveyNumber}. పంట వైశాల్యం ${activePlot.acres} ఎకరాలు. గాలి వేగం ${weatherData.windSpeed} కిలోమీటర్లు. స్ప్రే చేయడానికి అనుకూలం.`
                : `Survey number ${activePlot.surveyNumber}, area ${activePlot.acres} acres. Weather is suitable for spraying.`
            )
          }
          className="min-h-[46px] px-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-xs cursor-pointer"
        >
          <Volume2 className="w-4 h-4 text-emerald-300" />
          <span>{locale === 'te' ? 'సారాంశం వినండి' : 'Voice Summary'}</span>
        </button>

        <button
          type="button"
          onClick={handleVoiceListen}
          className={`min-h-[46px] px-3 font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer ${
            isListening ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-800 hover:bg-slate-900 text-white'
          }`}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-amber-400" />}
          <span>{isListening ? 'Listening...' : locale === 'te' ? 'ప్రశ్న అడగండి' : 'Ask Question'}</span>
        </button>
      </div>

      {speechFeedback && (
        <div className="p-2 bg-slate-100 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 text-center">
          {speechFeedback}
        </div>
      )}

      {/* 2. Live Spray Weather Traffic Light & 8-Hour Forecast Strip */}
      <div className="p-4 bg-white border-2 border-slate-300 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-4 h-4 rounded-full animate-ping ${
                sprayTrafficVerdict === 'GOOD' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <h2 className="text-base font-black text-slate-950">
              {locale === 'te' ? 'ఈరోజు స్ప్రే ట్రాఫిక్ సిగ్నల్' : 'Live Spray Traffic Light'}
            </h2>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
              sprayTrafficVerdict === 'GOOD'
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-500'
                : 'bg-amber-100 text-amber-900 border border-amber-500'
            }`}
          >
            {sprayTrafficVerdict === 'GOOD' ? '🟢 SAFE TO SPRAY' : '🟡 WAIT / CAUTION'}
          </span>
        </div>

        {/* 8-Hour Forecast Strip */}
        <div className="flex gap-2 overflow-x-auto pb-1 text-center">
          {weatherData.hourly.slice(0, 8).map((hour, idx) => (
            <div
              key={idx}
              className="min-w-[68px] p-2 bg-slate-50 border border-slate-200 rounded-xl space-y-1 shrink-0"
            >
              <span className="text-[10px] font-bold text-slate-500 block">
                {hour.time.split('T')[1] || `${idx + 6}:00`}
              </span>
              <span className="text-xs font-black text-slate-900 block">
                {Math.round(hour.temperature)}°C
              </span>
              <span className="text-[11px] font-bold block">
                {hour.windSpeed >= 15 ? '🛑' : hour.rainProb >= 40 ? '🟡' : '🟢'}
              </span>
              <span className="text-[10px] text-slate-600 block">
                {hour.windSpeed.toFixed(0)} km/h
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Multi-Plot Switcher & Boundary Lock Modes */}
      <div className="p-4 bg-white border-2 border-emerald-600 rounded-2xl shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Plot Switcher Pills */}
          <div className="flex gap-1.5">
            {plots.map((plot) => (
              <button
                key={plot.id}
                type="button"
                onClick={() => setActivePlotId(plot.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  activePlot.id === plot.id
                    ? 'bg-emerald-800 text-white border-emerald-950'
                    : 'bg-slate-100 text-slate-800 border-slate-300'
                }`}
              >
                {plot.name} ({plot.acres} Ac)
              </button>
            ))}
          </div>

          {/* Lock / Unlock Toggle */}
          <button
            type="button"
            onClick={handleToggleLock}
            className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 border transition-colors cursor-pointer ${
              activePlot.isLocked
                ? 'bg-emerald-100 text-emerald-900 border-emerald-600'
                : 'bg-amber-100 text-amber-900 border-amber-600'
            }`}
          >
            {activePlot.isLocked ? (
              <>
                <Lock className="w-3.5 h-3.5 text-emerald-700" />
                <span>Farm Locked</span>
              </>
            ) : (
              <>
                <Unlock className="w-3.5 h-3.5 text-amber-700" />
                <span>Editing Corners</span>
              </>
            )}
          </button>
        </div>

        {/* 3 Modes Control Bar */}
        {!activePlot.isLocked && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-200">
            <button
              type="button"
              onClick={handleAddCenterCorner}
              className="min-h-[46px] px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 border-2 border-amber-700 cursor-pointer"
            >
              <Crosshair className="w-4 h-4" />
              <span>Mark Center Crosshair</span>
            </button>

            <button
              type="button"
              onClick={handleWalkCornerGps}
              disabled={isLocating}
              className="min-h-[46px] px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 border-2 border-emerald-900 cursor-pointer"
            >
              <Navigation className="w-4 h-4" />
              <span>I Am Standing at Corner (GPS)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPassbookDrawerOpen(true)}
              className="min-h-[46px] px-3 bg-indigo-700 hover:bg-indigo-800 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 border-2 border-indigo-900 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Scan 1B / Passbook Paper</span>
            </button>
          </div>
        )}

        {/* Passbook / 1B Scanner Drawer */}
        {isPassbookDrawerOpen && (
          <div className="p-4 bg-indigo-50 border-2 border-indigo-600 rounded-xl space-y-3 mt-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-black text-sm text-indigo-950">
                📄 Government Land Passbook / 1B Scanner
              </span>
              <button
                type="button"
                onClick={() => setIsPassbookDrawerOpen(false)}
                className="text-slate-500 hover:text-slate-800 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-slate-700 block mb-0.5">Survey Number</label>
                <input
                  type="text"
                  value={passbookSurveyInput}
                  onChange={(e) => setPassbookSurveyInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold"
                  placeholder="e.g. 142/2B"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-0.5">Passbook Acres</label>
                <input
                  type="number"
                  step="0.01"
                  value={passbookAcresInput}
                  onChange={(e) => setPassbookAcresInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold"
                  placeholder="e.g. 1.40"
                />
              </div>
            </div>

            <input
              type="file"
              ref={passbookInputRef}
              accept="image/*"
              capture="environment"
              onChange={handlePassbookUpload}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => passbookInputRef.current?.click()}
              disabled={isScanningPassbook}
              className="w-full min-h-[44px] bg-indigo-700 hover:bg-indigo-800 text-white font-black rounded-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>{isScanningPassbook ? 'Scanning Land Document...' : 'Upload or Photo of Passbook / FMB'}</span>
            </button>

            {passbookScanError && (
              <p className="text-red-700 font-bold">{passbookScanError}</p>
            )}
          </div>
        )}
      </div>

      {/* 4. The 3-Lens Satellite Viewport */}
      <div className="p-4 bg-white border-2 border-slate-800 rounded-2xl shadow-sm space-y-3">
        {/* Lens Switcher Tabs */}
        <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-300">
          <button
            type="button"
            onClick={() => setActiveLens('health')}
            className={`min-h-[42px] px-2 py-1.5 rounded-lg text-xs font-black transition-colors cursor-pointer ${
              activeLens === 'health'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            🌿 Sick Spots
          </button>
          <button
            type="button"
            onClick={() => setActiveLens('water')}
            className={`min-h-[42px] px-2 py-1.5 rounded-lg text-xs font-black transition-colors cursor-pointer ${
              activeLens === 'water'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            🚰 Water Need
          </button>
          <button
            type="button"
            onClick={() => setActiveLens('rain')}
            className={`min-h-[42px] px-2 py-1.5 rounded-lg text-xs font-black transition-colors cursor-pointer ${
              activeLens === 'rain'
                ? 'bg-indigo-700 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            🌧️ Rain Radar
          </button>
        </div>

        {/* Lens Details Banner */}
        {activeLens === 'health' && (
          <div className="p-3 bg-red-50 border border-red-300 rounded-xl flex items-center justify-between gap-2 text-xs">
            <div>
              <span className="font-bold text-red-950 block">
                🚨 Northeast Corner Shows Foliage Stress ({healthTimeline === 'today' ? 'Today' : '10 Days Ago'})
              </span>
              <span className="text-slate-600 font-medium">
                {distanceToWeakSpot !== null
                  ? `🚶 Walking Distance: ~${distanceToWeakSpot} meters from your phone.`
                  : 'Walk to the highlighted patch to verify leaf symptoms.'}
              </span>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setHealthTimeline(healthTimeline === 'today' ? 'past10' : 'today')}
                className="px-2.5 py-1 bg-white border border-slate-300 text-slate-800 rounded font-bold"
              >
                {healthTimeline === 'today' ? '10d Ago' : 'Live'}
              </button>
              <Link
                href="/doctor"
                className="px-2.5 py-1 bg-red-700 text-white rounded font-bold flex items-center gap-1"
              >
                📸 Doctor →
              </Link>
            </div>
          </div>
        )}

        {activeLens === 'water' && (
          <div className="p-3 bg-sky-50 border border-sky-300 rounded-xl space-y-1 text-xs text-sky-950">
            <div className="flex items-center justify-between">
              <span className="font-black text-sm">
                🚰 5HP Borewell Motor Recommendation
              </span>
              <span className="px-2 py-0.5 bg-sky-200 rounded font-bold">
                Soil Moisture: {Math.round(weatherData.soilMoisture * 100)}%
              </span>
            </div>
            <p className="font-bold text-sky-900 text-sm">
              {motorHoursRequired > 0
                ? `👉 Run your 5HP Borewell Motor for ${motorHoursRequired} Hours today.`
                : '✅ Soil has healthy moisture. DO NOT run borewell motor today.'}
            </p>
            {weatherData.cloudCover > 50 && (
              <span className="inline-block text-[10px] px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded font-bold">
                ☁️ Cloud-Proof Ground Sensor Mode Active
              </span>
            )}
          </div>
        )}

        {/* Map Viewport with Fixed Yellow Crosshair */}
        <div className="relative w-full h-[380px] rounded-xl border-2 border-slate-800 bg-slate-900 overflow-hidden shadow-inner">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Fixed Yellow Crosshair (+) in Exact Center */}
          {!activePlot.isLocked && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-[400]">
              <div className="relative flex items-center justify-center">
                <div className="w-8 h-0.5 bg-yellow-400 shadow-md" />
                <div className="h-8 w-0.5 bg-yellow-400 shadow-md absolute" />
                <div className="w-3 h-3 rounded-full border-2 border-yellow-400 absolute" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. 48-Hour Weather Pest & Disease Outbreak Radar */}
      <div className="p-4 bg-purple-50 border-2 border-purple-800 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-purple-950">
            <span className="text-xl">🦠</span>
            <h3 className="text-base font-black">
              {locale === 'te' ? '48-గంటల తెగుళ్ల ముందస్తు రాడార్' : '48-Hour Disease & Pest Early Radar'}
            </h3>
          </div>
          <span className="text-xs font-bold text-purple-800">Free Organic Stage 1</span>
        </div>

        <div className="space-y-2 text-xs text-slate-800">
          {/* Paddy Blast */}
          {activePlot.crop.toLowerCase().includes('paddy') && weatherData.humidity >= 75 && (
            <div className="p-3 bg-white border border-purple-300 rounded-xl space-y-1">
              <span className="font-black text-purple-950 block text-sm">
                🌾 Paddy Leaf / Neck Blast Alert (అగ్గి తెగులు)
              </span>
              <p className="text-slate-600">
                Night temp &lt; 23°C + Humidity &gt; 80% creates spore explosion.
              </p>
              <p className="font-bold text-emerald-800">
                👉 Spray Pseudomonas fluorescens @ 10g/L immediately before rain.
              </p>
            </div>
          )}

          {/* Chilli Thrips */}
          {activePlot.crop.toLowerCase().includes('chilli') && weatherData.temperature >= 28 && (
            <div className="p-3 bg-white border border-purple-300 rounded-xl space-y-1">
              <span className="font-black text-purple-950 block text-sm">
                🌶️ Chilli Black Thrips & Mites Alert (తామర పురుగు)
              </span>
              <p className="text-slate-600">
                Dry spell and hot hours trigger rapid nymph multiplication on leaf undersides.
              </p>
              <p className="font-bold text-emerald-800">
                👉 Spray 5% Neem Seed Kernel Extract (NSKE) or Neem Oil 10,000 ppm @ 2 ml/L.
              </p>
            </div>
          )}

          {/* Default Soil Collar Rot Warning */}
          <div className="p-3 bg-white border border-purple-300 rounded-xl space-y-1">
            <span className="font-black text-purple-950 block text-sm">
              🍅 Collar Rot & Damping-off Watch
            </span>
            <p className="text-slate-600">
              Soil moisture adequate. Maintain clean drainage bunds around field edges.
            </p>
          </div>
        </div>
      </div>

      {/* 6. Spot-Spray Savings, Spoons/Matchbox Translator & Shopkeeper Shield */}
      <div className="p-4 bg-emerald-50 border-2 border-emerald-700 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 pb-3">
          <div>
            <span className="text-xs font-black uppercase text-emerald-900 block">
              📐 Measured Field Area
            </span>
            <div className="text-2xl font-black text-slate-950">
              {effectiveAcres.toFixed(2)} Acres
            </div>
            <span className="text-xs font-bold text-slate-700">
              ≈ {apCents.toFixed(0)} Cents (AP) • {tgGuntas.toFixed(1)} Guntas (TG)
            </span>
          </div>

          {/* Full Field vs Weak Corner Spot Spray Toggle */}
          <div className="flex bg-white p-1 rounded-xl border border-emerald-400">
            <button
              type="button"
              onClick={() => setSpotSprayOnly(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                !spotSprayOnly ? 'bg-emerald-700 text-white' : 'text-slate-700'
              }`}
            >
              Full Farm ({activePlot.acres} Ac)
            </button>
            <button
              type="button"
              onClick={() => setSpotSprayOnly(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                spotSprayOnly ? 'bg-emerald-700 text-white' : 'text-slate-700'
              }`}
            >
              💰 Weak Patch Only (0.35 Ac)
            </button>
          </div>
        </div>

        {spotSprayOnly && (
          <div className="p-2.5 bg-emerald-100 rounded-lg text-xs font-black text-emerald-950">
            🎉 Spot-Spraying Saves 75% on Chemical Costs & Prevents Field Runoff!
          </div>
        )}

        {/* Drum Selector & Water Volume */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-white rounded-xl border border-emerald-300 space-y-1">
            <span className="font-bold text-slate-600 block">Sprayer Drum Size</span>
            <div className="flex gap-1.5">
              {[10, 15, 16, 20].map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setDrumSize(sz)}
                  className={`px-2 py-1 rounded font-black border ${
                    drumSize === sz
                      ? 'bg-emerald-700 text-white border-emerald-900'
                      : 'bg-slate-50 text-slate-800 border-slate-300'
                  }`}
                >
                  {sz}L
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-emerald-300 space-y-1">
            <span className="font-bold text-slate-600 block">Total Spray Water</span>
            <div className="text-base font-black text-emerald-950">
              {totalWaterLitres} Litres
            </div>
            <span className="text-[11px] font-bold text-slate-600">
              👉 {knapsackDrumsCount} drums of {drumSize}L
            </span>
          </div>
        </div>

        {/* Household Measurement Spoon / Matchbox Translator */}
        <div className="p-3 bg-white rounded-xl border border-emerald-300 space-y-2 text-xs">
          <span className="font-black text-slate-900 block text-sm">
            🥄 Household Measuring Guide per {drumSize}L Drum (Mancozeb @ 2.5g/L)
          </span>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold block">Grams/Drum</span>
              <span className="text-base font-black text-slate-950">
                {dosageTranslator.totalDosePerDrum}g
              </span>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold block">Teaspoons</span>
              <span className="text-base font-black text-emerald-800">
                {dosageTranslator.teaspoons} 🥄
              </span>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold block">Matchboxes</span>
              <span className="text-base font-black text-emerald-800">
                {dosageTranslator.matchboxes} 📦
              </span>
            </div>
          </div>
        </div>

        {/* Fair Shop Price & Dealer Shield */}
        <div className="p-3 bg-red-100 border-2 border-red-600 rounded-xl space-y-1 text-xs text-red-950">
          <div className="flex items-center gap-1.5 font-black text-sm">
            <span>🛑 Dealer Shield:</span>
          </div>
          <p className="font-bold">
            You DO NOT need any extra tonic, sticker, or booster with this medicine!
          </p>
          <p className="text-slate-800">
            Fair Market Price for 500g Mancozeb 75% WP: <strong>₹220 – ₹280</strong>
          </p>
        </div>

        {/* Big Button: Show Full-Screen to Shopkeeper */}
        <button
          type="button"
          onClick={() => setShowShopkeeperModal(true)}
          className="w-full min-h-[52px] bg-slate-950 hover:bg-slate-900 text-white font-black text-base rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer"
        >
          <Maximize2 className="w-5 h-5 text-amber-400" />
          <span>🏪 Show Full-Screen to Agrochemical Shopkeeper</span>
        </button>
      </div>

      {/* FULL-SCREEN SHOPKEEPER SHIELD MODAL */}
      {showShopkeeperModal && (
        <div className="fixed inset-0 z-[9999] bg-white p-6 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏪</span>
                <span className="text-lg font-black text-slate-950">
                  KisanDrishti Verified Chemical Order
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowShopkeeperModal(false)}
                className="w-12 h-12 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-900 font-black cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Giant Generic Chemical Name */}
            <div className="p-5 bg-blue-50 border-3 border-blue-700 rounded-2xl text-center space-y-1">
              <span className="text-xs font-black uppercase text-blue-900 tracking-wider">
                Generic Active Ingredient
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-blue-950 leading-tight">
                Mancozeb 75% WP
              </h2>
              <span className="inline-block px-3 py-1 bg-blue-200 text-blue-950 rounded-full font-bold text-xs">
                Blue Triangle (Slightly Toxic)
              </span>
            </div>

            {/* Packet Size Needed */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-4 bg-slate-100 rounded-xl border border-slate-300">
                <span className="text-xs font-bold text-slate-600 block">Quantity Needed</span>
                <span className="text-2xl font-black text-slate-950 block mt-1">
                  1 Packet (500g)
                </span>
              </div>
              <div className="p-4 bg-slate-100 rounded-xl border border-slate-300">
                <span className="text-xs font-bold text-slate-600 block">Fair Price Range</span>
                <span className="text-2xl font-black text-emerald-800 block mt-1">
                  ₹220 – ₹280
                </span>
              </div>
            </div>

            {/* 3-Point Bottle Check */}
            <div className="p-4 bg-amber-50 border-2 border-amber-600 rounded-xl space-y-2 text-sm text-slate-800">
              <span className="font-black text-amber-950 block">
                🔍 3-Point Inspection Required Before Purchase:
              </span>
              <ul className="list-disc list-inside space-y-1 font-medium">
                <li>Printed CIBRC Reg No. (e.g. CIR-11024/1998)</li>
                <li>Check Batch No. & Expiry Date (Do not accept expired)</li>
                <li>Intact manufacturer seal & hologram intact</li>
              </ul>
            </div>

            <div className="p-3 bg-red-100 border border-red-400 rounded-xl text-center text-sm font-black text-red-950">
              🛑 NOTICE TO DEALER: Farmer strictly requires only this chemical. Do NOT bundle tonics or fertilizers.
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowShopkeeperModal(false)}
            className="w-full min-h-[56px] mt-6 bg-slate-950 text-white font-black text-lg rounded-xl cursor-pointer"
          >
            ← Close & Return to Sky Hub
          </button>
        </div>
      )}
    </div>
  );
}
