'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FlaskConical,
  Camera,
  Image as ImageIcon,
  ArrowLeft,
  Info,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  Sliders,
  BookOpen,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { useI18n, SupportedLocale } from '../../lib/i18n';
import { ListenButton } from '../../components/ListenButton';
import {
  evaluateSoilTexture,
  SoilTextureResult,
  LocalizedText,
} from '../../lib/soilTexture';
import schemesData from '../../data/schemes.json';

interface SchemeItem {
  id: string;
  name: LocalizedText;
  one_line: LocalizedText;
  official_url: string;
  last_checked: string;
}

const schemes = schemesData as SchemeItem[];
const soilHealthScheme = schemes.find((s) => s.id === 'soil-health-card');

function getLocalized(text: LocalizedText, loc: SupportedLocale): string {
  return text[loc] || text.en;
}

export default function SoilPage() {
  const { t, locale } = useI18n();

  // Active Tab: 'guide' (Part A) | 'measure' (Part B)
  const [activeTab, setActiveTab] = useState<'guide' | 'measure'>('guide');

  // Photo state
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Line positions as percentages from top of the container (0 to 100)
  // Default values representing a typical jar layout:
  // Base of jar is near 90%
  // Line 1 (top of sand): 70% (20% sand height)
  // Line 2 (top of silt): 50% (20% silt height)
  // Line 3 (top of total soil): 40% (10% clay height, total soil height = 50%)
  const [sandLine, setSandLine] = useState<number>(70);
  const [siltLine, setSiltLine] = useState<number>(50);
  const [totalLine, setTotalLine] = useState<number>(40);
  const baseLine = 90; // Fixed baseline representing jar bottom

  // Active drag handle
  const [draggingLine, setDraggingLine] = useState<'sand' | 'silt' | 'total' | null>(null);

  // Result state
  const [result, setResult] = useState<SoilTextureResult>(() =>
    evaluateSoilTexture(40, 40, 20)
  );

  // Recalculate fractions whenever line positions change
  const recalculateFromLines = useCallback((sandPos: number, siltPos: number, totalPos: number) => {
    const totalHeight = baseLine - totalPos;
    if (totalHeight <= 0) return;

    const sandHeight = Math.max(0, baseLine - sandPos);
    const siltHeight = Math.max(0, sandPos - siltPos);
    const clayHeight = Math.max(0, siltPos - totalPos);

    const sandPct = (sandHeight / totalHeight) * 100;
    const siltPct = (siltHeight / totalHeight) * 100;
    const clayPct = (clayHeight / totalHeight) * 100;

    const res = evaluateSoilTexture(sandPct, siltPct, clayPct);
    setResult(res);
  }, [baseLine]);

  useEffect(() => {
    recalculateFromLines(sandLine, siltLine, totalLine);
  }, [sandLine, siltLine, totalLine, recalculateFromLines]);

  // Handle image upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageSrc(event.target?.result as string);
      setActiveTab('measure');
    };
    reader.readAsDataURL(file);
  };

  // Dragging event handlers
  const handlePointerDown = (line: 'sand' | 'silt' | 'total') => {
    setDraggingLine(line);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingLine || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clientY = e.clientY;
    const relY = ((clientY - rect.top) / rect.height) * 100;

    // Clamp between 10% and 88%
    const clampedY = Math.min(Math.max(relY, 10), 88);

    if (draggingLine === 'total') {
      if (clampedY < siltLine - 2) {
        setTotalLine(Math.round(clampedY));
      }
    } else if (draggingLine === 'silt') {
      if (clampedY > totalLine + 2 && clampedY < sandLine - 2) {
        setSiltLine(Math.round(clampedY));
      }
    } else if (draggingLine === 'sand') {
      if (clampedY > siltLine + 2 && clampedY < baseLine - 2) {
        setSandLine(Math.round(clampedY));
      }
    }
  };

  const handlePointerUp = () => {
    setDraggingLine(null);
  };

  // Speech summary generator
  const getSpeechText = (): string => {
    if (activeTab === 'guide') {
      return `${t('soil.title')}. ${t('soil.honestyNotice')}. ${t('soil.jarTestTitle')}: ${t('soil.jarStep1')} ${t('soil.jarStep2')} ${t('soil.jarStep3')} ${t('soil.sandLayer')} ${t('soil.siltLayer')} ${t('soil.clayLayer')}. ${t('soil.phTestTitle')}: ${t('soil.phVinegarDesc')} ${t('soil.phBakingSodaDesc')} ${t('soil.phNeutral')}`;
    }

    const className = getLocalized(result.info.name, locale);
    const desc = getLocalized(result.info.description, locale);
    const fractionsText =
      locale === 'te'
        ? `ఇసుక ${result.fractions.sand} శాతం, సిల్ట్ ${result.fractions.silt} శాతం, బంకమట్టి ${result.fractions.clay} శాతం.`
        : locale === 'hi'
        ? `रेत ${result.fractions.sand} प्रतिशत, सिल्ट ${result.fractions.silt} प्रतिशत, चिकनी मिट्टी ${result.fractions.clay} प्रतिशत।`
        : `Sand ${result.fractions.sand} percent, Silt ${result.fractions.silt} percent, Clay ${result.fractions.clay} percent.`;

    const firstTip =
      result.info.tips.length > 0
        ? getLocalized(result.info.tips[0], locale)
        : '';

    return `${className}. ${fractionsText} ${desc}. ${firstTip}`;
  };

  // Ternary plot coordinates in SVG (viewBox 0 0 300 260)
  // Clay peak: (150, 20), Sand: (20, 240), Silt: (280, 240)
  const dotCx = 20 + result.triangleCoords.x * 260;
  const dotCy = 20 + result.triangleCoords.y * 220;

  return (
    <div className="p-4 space-y-5 pb-12 max-w-lg mx-auto">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 min-h-[48px] px-3 py-2 text-base font-bold text-emerald-950 bg-emerald-100 hover:bg-emerald-200 rounded-lg border border-emerald-300"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          <span>{locale === 'te' ? 'హోమ్' : locale === 'hi' ? 'होम' : 'Home'}</span>
        </Link>
        <ListenButton text={getSpeechText()} />
      </div>

      {/* Main Page Title Card */}
      <div className="p-4 bg-emerald-50 border-2 border-emerald-700 rounded-2xl space-y-1 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center flex-shrink-0">
            <FlaskConical className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-black text-emerald-950 leading-tight">
              {t('soil.title')}
            </h1>
            <p className="text-xs text-emerald-800 font-medium">
              {t('soil.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Mandatory Honesty Notice Banner */}
      <div className="p-3.5 bg-amber-50 border-2 border-amber-500 rounded-xl flex items-start gap-3 shadow-sm">
        <Info className="w-5 h-5 text-amber-800 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-sm font-bold text-amber-950 leading-snug">
          {t('soil.honestyNotice')}
        </p>
      </div>

      {/* Segmented Tab Buttons (Part A Guide vs Part B Measure) */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-stone-200 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveTab('guide')}
          className={`min-h-[48px] px-3 py-2 text-sm font-black rounded-lg transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'guide'
              ? 'bg-white text-emerald-950 shadow'
              : 'text-stone-700 hover:text-stone-900'
          }`}
        >
          <BookOpen className="w-4 h-4" aria-hidden="true" />
          <span>{t('soil.tabGuide')}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('measure')}
          className={`min-h-[48px] px-3 py-2 text-sm font-black rounded-lg transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'measure'
              ? 'bg-white text-emerald-950 shadow'
              : 'text-stone-700 hover:text-stone-900'
          }`}
        >
          <Sliders className="w-4 h-4" aria-hidden="true" />
          <span>{t('soil.tabMeasure')}</span>
        </button>
      </div>

      {/* PART A: GUIDE */}
      {activeTab === 'guide' && (
        <div className="space-y-5">
          {/* Jar Test Instructions Card */}
          <div className="p-5 bg-white border-2 border-stone-300 rounded-2xl space-y-4 shadow-sm">
            <h2 className="text-lg font-black text-stone-950 flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-emerald-700" aria-hidden="true" />
              <span>{t('soil.jarTestTitle')}</span>
            </h2>

            {/* Visual Jar Diagram SVG */}
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-center">
              <svg
                viewBox="0 0 160 200"
                className="w-36 h-44 drop-shadow-sm"
                aria-label="Jar Test Diagram"
              >
                {/* Glass Jar Body */}
                <rect x="25" y="30" width="110" height="150" rx="12" fill="#e0f2fe" stroke="#0284c7" strokeWidth="3" />
                <rect x="40" y="15" width="80" height="15" rx="4" fill="#64748b" stroke="#334155" strokeWidth="2" />

                {/* Layer 1: Sand (Bottom) */}
                <rect x="28" y="145" width="104" height="32" rx="4" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
                <text x="80" y="165" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#78350f">
                  {t('soil.sandPct')} (1 min)
                </text>

                {/* Layer 2: Silt (Middle) */}
                <rect x="28" y="115" width="104" height="30" fill="#f97316" stroke="#c2410c" strokeWidth="1" />
                <text x="80" y="133" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#7c2d12">
                  {t('soil.siltPct')} (2 hrs)
                </text>

                {/* Layer 3: Clay (Top) */}
                <rect x="28" y="85" width="104" height="30" fill="#a855f7" stroke="#7e22ce" strokeWidth="1" />
                <text x="80" y="103" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#4c1d95">
                  {t('soil.clayPct')} (24 hrs)
                </text>

                {/* Water layer on top */}
                <text x="80" y="60" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#0369a1">
                  Water / Detergent
                </text>
              </svg>
            </div>

            {/* Step-by-step numbered points */}
            <ol className="space-y-3 text-sm font-medium text-stone-900">
              <li className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                  1
                </span>
                <span>{t('soil.jarStep1')}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                  2
                </span>
                <span>{t('soil.jarStep2')}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                  3
                </span>
                <span>{t('soil.jarStep3')}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                  4
                </span>
                <div className="space-y-1">
                  <p className="font-bold">{t('soil.jarStep4')}</p>
                  <p className="text-amber-900">• {t('soil.sandLayer')}</p>
                  <p className="text-orange-900">• {t('soil.siltLayer')}</p>
                  <p className="text-purple-900">• {t('soil.clayLayer')}</p>
                </div>
              </li>
            </ol>

            {/* Direct button to measure */}
            <button
              type="button"
              onClick={() => setActiveTab('measure')}
              className="w-full min-h-[50px] px-4 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow"
            >
              <Camera className="w-5 h-5" aria-hidden="true" />
              <span>{t('soil.tabMeasure')}</span>
            </button>
          </div>

          {/* Rough Kitchen pH Test Guide */}
          <div className="p-5 bg-white border-2 border-stone-300 rounded-2xl space-y-4 shadow-sm">
            <h2 className="text-lg font-black text-stone-950 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-700" aria-hidden="true" />
              <span>{t('soil.phTestTitle')}</span>
            </h2>
            <p className="text-sm font-medium text-stone-800">
              {t('soil.phDesc')}
            </p>

            <div className="space-y-3">
              {/* Vinegar Test */}
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                <h3 className="text-sm font-black text-blue-950">
                  {t('soil.phVinegarTitle')}
                </h3>
                <p className="text-sm font-medium text-blue-900 leading-relaxed">
                  {t('soil.phVinegarDesc')}
                </p>
              </div>

              {/* Baking Soda Test */}
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                <h3 className="text-sm font-black text-amber-950">
                  {t('soil.phBakingSodaTitle')}
                </h3>
                <p className="text-sm font-medium text-amber-900 leading-relaxed">
                  {t('soil.phBakingSodaDesc')}
                </p>
              </div>

              {/* Neutral Result */}
              <div className="p-3.5 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-sm font-bold text-green-950 leading-relaxed">
                  ✓ {t('soil.phNeutral')}
                </p>
              </div>
            </div>

            <p className="text-xs font-semibold text-stone-600 bg-stone-100 p-2.5 rounded-lg border border-stone-200">
              {t('soil.phLabNotice')}
            </p>
          </div>
        </div>
      )}

      {/* PART B: PHOTO & MEASURE */}
      {activeTab === 'measure' && (
        <div className="space-y-5">
          {/* Photo Upload Buttons */}
          <div className="p-4 bg-white border-2 border-stone-300 rounded-2xl space-y-3 shadow-sm">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.capture = 'environment';
                    fileInputRef.current.click();
                  }
                }}
                className="min-h-[50px] px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow"
              >
                <Camera className="w-5 h-5" aria-hidden="true" />
                <span className="text-sm">{t('soil.takePhoto')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.removeAttribute('capture');
                    fileInputRef.current.click();
                  }
                }}
                className="min-h-[50px] px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-900 border border-stone-300 font-bold rounded-xl flex items-center justify-center gap-2"
              >
                <ImageIcon className="w-5 h-5" aria-hidden="true" />
                <span className="text-sm">{t('soil.choosePhoto')}</span>
              </button>
            </div>

            {/* Helper Instructions */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5">
              <HelpCircle className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs font-bold text-blue-950 leading-relaxed">
                {t('soil.helperDrag')}
              </p>
            </div>
          </div>

          {/* Interactive Photo Canvas with Draggable Lines */}
          <div className="p-4 bg-white border-2 border-stone-300 rounded-2xl space-y-3 shadow-sm">
            <div
              ref={containerRef}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="relative w-full h-80 bg-stone-100 rounded-xl overflow-hidden border-2 border-stone-400 select-none touch-none shadow-inner"
            >
              {/* Uploaded Jar Image or Default Schematic Jar */}
              {imageSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageSrc}
                  alt="Jar sediment layers"
                  className="w-full h-full object-contain pointer-events-none"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 text-stone-500">
                  <FlaskConical className="w-12 h-12 text-stone-400 mb-2" aria-hidden="true" />
                  <p className="text-xs font-bold">
                    {locale === 'te'
                      ? 'సీసా ఫోటోను అప్‌లోడ్ చేయండి లేదా క్రింది గీతలను పరీక్షించండి'
                      : locale === 'hi'
                      ? 'जार की फोटो अपलोड करें या नीचे दी गई रेखाओं को सरकाएं'
                      : 'Upload jar photo or drag the sample lines below'}
                  </p>
                </div>
              )}

              {/* Baseline (Bottom of Jar) */}
              <div
                style={{ top: `${baseLine}%` }}
                className="absolute left-0 right-0 h-0.5 bg-stone-900 pointer-events-none border-t border-dashed border-stone-600"
              >
                <span className="absolute right-2 -top-5 px-2 py-0.5 text-[10px] font-black bg-stone-900 text-white rounded">
                  {locale === 'te' ? 'సీసా అడుగుభాగం' : locale === 'hi' ? 'जार की तली' : 'Jar Bottom'}
                </span>
              </div>

              {/* Line 1: Top of Sand (Blue Handle) */}
              <div
                style={{ top: `${sandLine}%` }}
                className="absolute left-0 right-0 h-1 bg-amber-500 z-10 cursor-row-resize"
              >
                <div
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    handlePointerDown('sand');
                  }}
                  className="absolute left-2 -top-4 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-black text-xs rounded-full shadow-md cursor-grab active:cursor-grabbing flex items-center gap-1"
                >
                  <span>1. {t('soil.sandLine')}</span>
                </div>
              </div>

              {/* Line 2: Top of Silt (Orange Handle) */}
              <div
                style={{ top: `${siltLine}%` }}
                className="absolute left-0 right-0 h-1 bg-orange-500 z-20 cursor-row-resize"
              >
                <div
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    handlePointerDown('silt');
                  }}
                  className="absolute left-2 -top-4 px-2.5 py-1 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-black text-xs rounded-full shadow-md cursor-grab active:cursor-grabbing flex items-center gap-1"
                >
                  <span>2. {t('soil.siltLine')}</span>
                </div>
              </div>

              {/* Line 3: Top of Total Soil (Purple Handle) */}
              <div
                style={{ top: `${totalLine}%` }}
                className="absolute left-0 right-0 h-1 bg-purple-600 z-30 cursor-row-resize"
              >
                <div
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    handlePointerDown('total');
                  }}
                  className="absolute left-2 -top-4 px-2.5 py-1 bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white font-black text-xs rounded-full shadow-md cursor-grab active:cursor-grabbing flex items-center gap-1"
                >
                  <span>3. {t('soil.totalLine')}</span>
                </div>
              </div>
            </div>

            {/* Quick Micro-Adjustment Sliders */}
            <div className="space-y-2 pt-2 border-t border-stone-200">
              <p className="text-xs font-bold text-stone-600">
                {locale === 'te' ? 'గీతలను సర్దుబాటు చేయండి:' : locale === 'hi' ? 'रेखाएं समायोजित करें:' : 'Adjust layer boundary sliders:'}
              </p>
              <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                <div className="p-2 bg-amber-50 border border-amber-300 rounded-lg text-center">
                  <p className="text-amber-900">{t('soil.sandPct')}</p>
                  <p className="text-base font-black text-amber-950">{result.fractions.sand}%</p>
                </div>
                <div className="p-2 bg-orange-50 border border-orange-300 rounded-lg text-center">
                  <p className="text-orange-900">{t('soil.siltPct')}</p>
                  <p className="text-base font-black text-orange-950">{result.fractions.silt}%</p>
                </div>
                <div className="p-2 bg-purple-50 border border-purple-300 rounded-lg text-center">
                  <p className="text-purple-900">{t('soil.clayPct')}</p>
                  <p className="text-base font-black text-purple-950">{result.fractions.clay}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Result Card */}
          <div className="p-5 bg-emerald-50 border-3 border-emerald-700 rounded-2xl space-y-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="inline-block px-2.5 py-0.5 text-xs font-black uppercase tracking-wider bg-emerald-200 text-emerald-950 rounded-full mb-1">
                  USDA Texture Class
                </span>
                <h2 className="text-2xl font-black text-emerald-950">
                  {getLocalized(result.info.name, locale)}
                </h2>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center flex-shrink-0 shadow">
                <CheckCircle2 className="w-7 h-7" aria-hidden="true" />
              </div>
            </div>

            <p className="text-sm font-medium text-emerald-950 leading-relaxed">
              {getLocalized(result.info.description, locale)}
            </p>

            {/* Practical Farming Tips */}
            <div className="space-y-2 pt-2 border-t border-emerald-200">
              <h3 className="text-sm font-black text-emerald-950">
                {t('soil.tipsTitle')}:
              </h3>
              <ul className="space-y-2 text-sm font-medium text-emerald-950">
                {result.info.tips.map((tip, idx) => (
                  <li key={idx} className="p-2.5 bg-white border border-emerald-200 rounded-xl leading-relaxed flex items-start gap-2">
                    <span className="text-emerald-700 font-bold">•</span>
                    <span>{getLocalized(tip, locale)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* SVG Soil Texture Triangle Visualization */}
          <div className="p-4 bg-white border-2 border-stone-300 rounded-2xl space-y-3 shadow-sm">
            <h3 className="text-base font-black text-stone-950">
              {t('soil.triangleTitle')}
            </h3>

            <div className="p-2 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-center">
              <svg
                viewBox="0 0 300 260"
                className="w-full max-w-[280px] h-auto drop-shadow-sm select-none"
                aria-label="USDA Soil Texture Triangle"
              >
                {/* Outer Equilateral Triangle */}
                <polygon
                  points="150,20 20,240 280,240"
                  fill="#f1f5f9"
                  stroke="#334155"
                  strokeWidth="2.5"
                />

                {/* Internal Guideline Grid */}
                {/* 20% Clay line */}
                <line x1="46" y1="196" x2="254" y2="196" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
                {/* 40% Clay line */}
                <line x1="72" y1="152" x2="228" y2="152" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
                {/* 60% Clay line */}
                <line x1="98" y1="108" x2="202" y2="108" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />

                {/* Loam Central Area Shading */}
                <polygon
                  points="115,196 185,196 165,152 135,152"
                  fill="#bbf7d0"
                  fillOpacity="0.4"
                  stroke="#22c55e"
                  strokeWidth="1"
                />

                {/* Vertex Labels */}
                <text x="150" y="14" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#6b21a8">
                  CLAY (100%)
                </text>
                <text x="25" y="255" textAnchor="start" fontSize="10" fontWeight="bold" fill="#b45309">
                  SAND (100%)
                </text>
                <text x="275" y="255" textAnchor="end" fontSize="10" fontWeight="bold" fill="#ea580c">
                  SILT (100%)
                </text>

                {/* Result Marker Dot */}
                <circle
                  cx={dotCx}
                  cy={dotCy}
                  r="7"
                  fill="#dc2626"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  className="animate-pulse"
                />
                <circle
                  cx={dotCx}
                  cy={dotCy}
                  r="13"
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth="1.5"
                  strokeOpacity="0.5"
                />
              </svg>
            </div>
            <p className="text-center text-xs font-semibold text-stone-600">
              Red dot indicates your estimated soil position.
            </p>
          </div>

          {/* Link to Soil Health Card Scheme Card */}
          <div className="p-4 bg-sky-50 border-2 border-sky-600 rounded-2xl space-y-2.5 shadow-sm">
            <h3 className="text-base font-black text-sky-950">
              {t('soil.soilHealthCardTitle')}
            </h3>
            <p className="text-sm font-medium text-sky-900 leading-relaxed">
              {t('soil.soilHealthCardDesc')}
            </p>
            {soilHealthScheme && (
              <a
                href={soilHealthScheme.official_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-[48px] px-4 py-2.5 bg-sky-700 hover:bg-sky-800 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow"
              >
                <span>{t('soil.soilHealthCardLink')}</span>
                <ExternalLink className="w-4 h-4" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
