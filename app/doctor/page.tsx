'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Camera,
  Image as ImageIcon,
  RotateCcw,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Bug,
  Sprout,
  Lightbulb,
  ArrowLeft,
  Activity,
  HelpCircle,
  ShieldAlert,
  SunMedium,
  Check,
  ChevronDown,
  ChevronUp,
  Triangle,
  Shield,
  Calendar,
  CloudSun,
  Trash2,
  AlertOctagon,
  Info,
  Clock,
  Calculator,
  MessageCircle,
  Share2,
} from 'lucide-react';
import { ListenButton } from '../../components/ListenButton';
import { useI18n, SupportedLocale } from '../../lib/i18n';
import { compressImage, CompressedImageResult } from '../../lib/imageCompress';
import {
  saveSprayRecord,
  getSprayRecords,
  deleteSprayRecord,
  formatFriendlyDate,
  getDaysUntilHarvest,
  SprayRecord,
  syncSprayRecordToCloud,
  fetchAndMergeCloudSprays,
} from '../../lib/harvestDate';
import { useAuth } from '../../context/AuthContext';
import { parseDosePerLitre, calculateTankMix } from '../../lib/mixCalculator';
import { checkMoARotationRisk } from '../../lib/treatments';
import { shareConsultationCard } from '../../lib/shareCard';
import BottleAuthenticityChecklist from '../../components/BottleAuthenticityChecklist';
import ChemicalCompatibilityChecker from '../../components/ChemicalCompatibilityChecker';
import NutrientDeficiencyGuide from '../../components/NutrientDeficiencyGuide';

interface ChemicalItem {
  chemical_name: string;
  dose_per_litre: string;
  pre_harvest_interval_days: number | null;
  toxicity_class: string;
  ppe: string[];
  source_url: string;
  source_note?: string;
  verified: boolean;
  irac_frac_group?: string;
  formulation?: string;
  cibrc_reg_no?: string;
}

interface TreatmentData {
  key: string;
  crop: string;
  type: string;
  name: Record<string, string>;
  symptoms: Record<string, string>;
  stage1_organic: Array<Record<string, string>>;
  stage2_chemical: ChemicalItem[];
}

interface DiagnosisResult {
  is_plant_photo: boolean;
  image_quality: 'good' | 'fair' | 'poor';
  crop: string | null;
  problem_type:
    | 'fungal'
    | 'bacterial'
    | 'viral'
    | 'pest'
    | 'nutrient_deficiency'
    | 'environmental'
    | 'healthy'
    | 'unknown';
  problem_name: string;
  treatment_key: string | null;
  confidence_score: number;
  confidence: 'low' | 'medium' | 'high';
  affected_area_range: 'none' | 'under_10' | '10_to_30' | '30_to_60' | 'over_60' | 'unknown';
  visible_symptoms: string[];
  reasoning: string;
  retake_advice: string | null;
  treatment: TreatmentData | null;
}

function ChemicalMixCalculator({
  dosePerLitre,
  cibrcRegNo,
  chemicalName,
}: {
  dosePerLitre?: string | null;
  cibrcRegNo?: string;
  chemicalName?: string;
}) {
  const { t } = useI18n();
  const [tankSize, setTankSize] = useState<number>(16);
  const [customInput, setCustomInput] = useState<string>('16');
  const [isCustom, setIsCustom] = useState<boolean>(false);

  const parsed = parseDosePerLitre(dosePerLitre);
  if (!parsed) {
    // If dose_per_litre cannot be parsed into number and unit, hide the calculator (Rule 3)
    return null;
  }

  const result = calculateTankMix(parsed.doseNumber, tankSize, parsed.unit);
  const presetSizes = [10, 15, 16, 20];

  const handleSelectPreset = (size: number) => {
    setTankSize(size);
    setCustomInput(String(size));
    setIsCustom(false);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setTankSize(num);
    }
  };

  return (
    <div className="p-4 bg-emerald-50/70 border-2 border-emerald-600 rounded-xl space-y-3 shadow-xs">
      <div className="flex items-center gap-2 text-emerald-950">
        <Calculator className="w-5 h-5 text-emerald-700 shrink-0" aria-hidden="true" />
        <h4 className="text-base font-black">
          {t('mixCalculator.title')}
        </h4>
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-bold text-slate-700 block">
          {t('mixCalculator.tankSize')}
        </span>
        <div className="flex flex-wrap gap-2">
          {presetSizes.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => handleSelectPreset(size)}
              className={`min-h-[44px] px-3.5 py-1.5 rounded-lg text-sm font-black border transition-colors cursor-pointer ${
                !isCustom && tankSize === size
                  ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                  : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {size} L
            </button>
          ))}
          <button
            type="button"
            onClick={() => setIsCustom(true)}
            className={`min-h-[44px] px-3.5 py-1.5 rounded-lg text-sm font-black border transition-colors cursor-pointer ${
              isCustom
                ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
            }`}
          >
            {t('mixCalculator.custom')}
          </button>
        </div>
      </div>

      {isCustom && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            max="1000"
            step="0.5"
            value={customInput}
            onChange={handleCustomChange}
            placeholder="e.g. 16"
            className="w-28 min-h-[44px] px-3 py-2 bg-white border-2 border-emerald-600 rounded-lg text-base font-bold text-slate-900 focus:outline-none"
          />
          <span className="text-sm font-bold text-slate-700">Litres</span>
        </div>
      )}

      {result && (
        <div className="p-3 bg-white border border-emerald-300 rounded-xl space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase block">
            {t('mixCalculator.amountPerTank')}
          </span>
          <div className="text-2xl font-black text-emerald-950">
            {result.formatted}
          </div>
          <span className="text-xs text-slate-600 font-semibold block">
            ({parsed.doseNumber} {parsed.unit}/L × {tankSize} L)
          </span>
        </div>
      )}

      {/* Mandatory line: Check product label before mixing (Rule 4) */}
      <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-amber-950 text-xs font-black leading-tight flex items-start gap-1.5">
        <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
        <span>{t('mixCalculator.labelWarning')}</span>
      </div>

      {/* 3-Second Genuine Bottle & Expiry Checklist */}
      <BottleAuthenticityChecklist cibrcRegNo={cibrcRegNo} chemicalName={chemicalName} />
    </div>
  );
}

export default function DoctorPage() {
  const { t, locale } = useI18n();
  const { user } = useAuth();

  // State
  const [selectedCrop, setSelectedCrop] = useState<string>('');
  const [compressedImage, setCompressedImage] = useState<CompressedImageResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<number>(1);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [errorState, setErrorState] = useState<string | null>(null);

  // Accordion for Stage 2 (Chemicals) - collapsed by default
  const [stage2Open, setStage2Open] = useState<boolean>(false);
  const [isSharingCard, setIsSharingCard] = useState<boolean>(false);
  const [showNutrientGuide, setShowNutrientGuide] = useState<boolean>(false);
  const [showCompatibility, setShowCompatibility] = useState<boolean>(false);

  // Spray Diary state
  const [sprayRecords, setSprayRecords] = useState<SprayRecord[]>([]);
  const [lastLoggedSpray, setLastLoggedSpray] = useState<{
    chemical: string;
    safeDate: string;
  } | null>(null);

  const handleShareToOfficer = async () => {
    if (!result) return;
    setIsSharingCard(true);
    try {
      await shareConsultationCard({
        cropName: result.crop || selectedCrop || 'Crop',
        problemName: result.problem_name,
        confidenceScore: result.confidence_score,
        confidenceLevel: result.confidence === 'high' ? 'medium' : result.confidence,
        districtName: 'Andhra Pradesh / Telangana',
        photoUrl: compressedImage?.previewUrl,
        lang: locale as any,
      });
    } catch (err) {
      console.error('Officer share error:', err);
    } finally {
      setIsSharingCard(false);
    }
  };

  // Load and merge spray records on mount or when user auth changes
  useEffect(() => {
    if (user?.uid) {
      fetchAndMergeCloudSprays(user.uid).then((merged) => {
        setSprayRecords(merged);
      });
    } else {
      setSprayRecords(getSprayRecords());
    }
  }, [user]);

  // Hidden file input refs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Friendly rotating loading messages
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      setLoadingStep(1);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev % 4) + 1);
      }, 2500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);

  // Handle image selection and client-side compression
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorState(null);
    setResult(null);
    setStage2Open(false);
    setLastLoggedSpray(null);

    try {
      const compressed = await compressImage(file, 1024, 0.8);
      setCompressedImage(compressed);
    } catch {
      setErrorState(t('doctor.errors.generic'));
    } finally {
      e.target.value = '';
    }
  };

  // Submit image to /api/agri-diagnose
  const handleDiagnose = async () => {
    if (!compressedImage) return;

    setIsLoading(true);
    setErrorState(null);
    setStage2Open(false);

    try {
      const response = await fetch('/api/agri-diagnose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: compressedImage.imageBase64,
          mimeType: compressedImage.mimeType,
          language: locale,
          cropHint: selectedCrop || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setErrorState(data.message || t('doctor.errors.quota'));
        } else {
          setErrorState(data.message || t('doctor.errors.generic'));
        }
        return;
      }

      setResult(data);
    } catch {
      setErrorState(t('doctor.errors.network'));
    } finally {
      setIsLoading(false);
    }
  };

  // Reset to scan another leaf
  const handleReset = () => {
    setCompressedImage(null);
    setResult(null);
    setErrorState(null);
    setIsLoading(false);
    setStage2Open(false);
    setLastLoggedSpray(null);
  };

  // Save spray record to localStorage
  const handleSaveSpray = (chem: ChemicalItem) => {
    const today = new Date().toISOString().split('T')[0];
    const intervalDays = chem.pre_harvest_interval_days ?? 0;
    const cropName = result?.crop || selectedCrop || 'Crop';

    const saved = saveSprayRecord({
      crop: cropName,
      chemical: chem.chemical_name,
      sprayDate: today,
      intervalDays,
      irac_frac_group: chem.irac_frac_group,
    });

    // Sync to Cloud Firestore if user is authenticated
    if (user?.uid) {
      syncSprayRecordToCloud(saved, user.uid);
    }

    setSprayRecords(getSprayRecords());
    setLastLoggedSpray({
      chemical: chem.chemical_name,
      safeDate: saved.safeHarvestDate,
    });
  };

  // Delete spray record
  const handleDeleteSpray = (id: string) => {
    deleteSprayRecord(id);
    setSprayRecords(getSprayRecords());
  };

  // Toxicity Class details (India Labeling: Red = Extremely, Yellow = Highly, Blue = Moderately, Green = Slightly)
  // Safety Rule: Never color alone -> Colored triangle badge + Word + Icon
  const getToxicityDetails = (toxicity: string) => {
    switch (toxicity) {
      case 'extremely_toxic':
        return {
          label: t('doctor.toxicity.extremely_toxic'),
          badgeClass: 'bg-red-700 text-white border-2 border-red-950',
          triangleColor: 'fill-red-700 stroke-red-950',
        };
      case 'highly_toxic':
        return {
          label: t('doctor.toxicity.highly_toxic'),
          badgeClass: 'bg-amber-400 text-amber-950 border-2 border-amber-700 font-black',
          triangleColor: 'fill-amber-400 stroke-amber-700',
        };
      case 'moderately_toxic':
        return {
          label: t('doctor.toxicity.moderately_toxic'),
          badgeClass: 'bg-blue-600 text-white border-2 border-blue-900',
          triangleColor: 'fill-blue-600 stroke-blue-900',
        };
      case 'slightly_toxic':
        return {
          label: t('doctor.toxicity.slightly_toxic'),
          badgeClass: 'bg-emerald-600 text-white border-2 border-emerald-900',
          triangleColor: 'fill-emerald-600 stroke-emerald-900',
        };
      default:
        return {
          label: t('doctor.toxicity.TODO_VERIFY'),
          badgeClass: 'bg-slate-600 text-white border-2 border-slate-900',
          triangleColor: 'fill-slate-600 stroke-slate-900',
        };
    }
  };

  // Problem type icon & color mapper (Icon + Word)
  const getProblemTypeBadge = (type: string) => {
    switch (type) {
      case 'fungal':
        return {
          icon: Activity,
          text: t('doctor.types.fungal'),
          bg: 'bg-orange-100 text-orange-950 border-orange-700',
        };
      case 'bacterial':
        return {
          icon: ShieldAlert,
          text: t('doctor.types.bacterial'),
          bg: 'bg-red-100 text-red-950 border-red-700',
        };
      case 'viral':
        return {
          icon: ShieldAlert,
          text: t('doctor.types.viral'),
          bg: 'bg-purple-100 text-purple-950 border-purple-700',
        };
      case 'pest':
        return {
          icon: Bug,
          text: t('doctor.types.pest'),
          bg: 'bg-rose-100 text-rose-950 border-rose-700',
        };
      case 'nutrient_deficiency':
        return {
          icon: Sprout,
          text: t('doctor.types.nutrient_deficiency'),
          bg: 'bg-amber-100 text-amber-950 border-amber-700',
        };
      case 'environmental':
        return {
          icon: SunMedium,
          text: t('doctor.types.environmental'),
          bg: 'bg-sky-100 text-sky-950 border-sky-700',
        };
      case 'healthy':
        return {
          icon: CheckCircle2,
          text: t('doctor.types.healthy'),
          bg: 'bg-emerald-100 text-emerald-950 border-emerald-700',
        };
      default:
        return {
          icon: HelpCircle,
          text: t('doctor.types.unknown'),
          bg: 'bg-slate-100 text-slate-950 border-slate-700',
        };
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Top Header bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 min-h-[48px] px-3 py-2 text-base font-bold text-emerald-950 bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 rounded-lg border border-emerald-300 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span>Home</span>
        </Link>
        <span className="text-base font-black text-emerald-900 tracking-tight">
          {t('doctor.title')}
        </span>
      </div>

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
      <input
        type="file"
        ref={galleryInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* VIEW 1: Initial Capture & Upload Controls */}
      {!compressedImage && !result && !isLoading && (
        <div className="space-y-4">
          <div className="bg-emerald-50 border-2 border-emerald-700 rounded-2xl p-4 shadow-sm text-center">
            <h1 className="text-xl font-black text-emerald-950 leading-tight">
              {t('doctor.title')}
            </h1>
            <p className="text-base text-emerald-900 font-medium mt-1">
              {t('doctor.subtitle')}
            </p>
          </div>

          {/* Optional Crop Selector */}
          <div className="bg-white border-2 border-slate-300 rounded-xl p-3 shadow-sm">
            <label
              htmlFor="crop-select"
              className="block text-base font-black text-slate-900 mb-1"
            >
              {t('doctor.cropSelectorLabel')}
            </label>
            <select
              id="crop-select"
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              className="w-full min-h-[48px] px-3 py-2 text-base font-medium text-slate-900 bg-slate-50 border-2 border-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
            >
              <option value="">{t('doctor.cropAll')}</option>
              <option value="paddy">{t('doctor.cropPaddy')}</option>
              <option value="chilli">{t('doctor.cropChilli')}</option>
              <option value="tomato">{t('doctor.cropTomato')}</option>
            </select>
          </div>

          {/* Action Button 1: Take Photo */}
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="w-full min-h-[56px] py-3.5 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-black text-lg rounded-xl shadow-md border-2 border-emerald-900 flex items-center justify-center gap-3 transition-colors cursor-pointer"
          >
            <Camera className="w-6 h-6 stroke-[2.3]" aria-hidden="true" />
            <span>{t('doctor.takePhotoButton')}</span>
          </button>

          {/* Action Button 2: Choose from Gallery */}
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="w-full min-h-[52px] py-3 px-4 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-900 font-black text-base rounded-xl shadow-sm border-2 border-slate-400 flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
          >
            <ImageIcon className="w-5 h-5 text-slate-700" aria-hidden="true" />
            <span>{t('doctor.galleryButton')}</span>
          </button>

          {/* Photography Tips Card */}
          <div className="bg-amber-50 border-2 border-amber-500 rounded-xl p-3.5 flex items-start gap-3 shadow-sm">
            <Lightbulb className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-amber-950">
              <h2 className="text-base font-black leading-snug">
                {t('doctor.tips.title')}
              </h2>
              <p className="text-base font-medium leading-relaxed mt-0.5">
                {t('doctor.tips.instruction')}
              </p>
            </div>
          </div>

          {/* Quick Rural Diagnostic Tools: Deficiency & Compatibility */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setShowNutrientGuide(!showNutrientGuide)}
                className="w-full min-h-[48px] px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 border-2 border-amber-600 rounded-xl text-amber-950 font-black text-sm flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span>🍃</span>
                  <span>
                    {locale === 'te'
                      ? 'పసుపు ఆకుల లోపాల గైడ్ (2-ట్యాప్)'
                      : locale === 'hi'
                      ? 'पीली पत्ती पोषण कमी गाइड'
                      : 'Yellow Leaf Deficiency Guide'}
                  </span>
                </span>
                <span className="text-xs text-amber-800 font-bold">
                  {showNutrientGuide ? '▲' : '▼'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowCompatibility(!showCompatibility)}
                className="w-full min-h-[48px] px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-600 rounded-xl text-emerald-950 font-black text-sm flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span>🧪</span>
                  <span>
                    {locale === 'te'
                      ? 'మందుల కలయిక తనిఖీ (W-A-L-E)'
                      : locale === 'hi'
                      ? 'दवा मिलान व जार टेस्ट'
                      : 'Can I Mix These? (Jar Check)'}
                  </span>
                </span>
                <span className="text-xs text-emerald-800 font-bold">
                  {showCompatibility ? '▲' : '▼'}
                </span>
              </button>
            </div>

            {showNutrientGuide && <NutrientDeficiencyGuide />}
            {showCompatibility && <ChemicalCompatibilityChecker />}
          </div>

          {/* Saved Sprays List (when on home capture screen) */}
          {sprayRecords.length > 0 && (
            <div className="bg-white border-2 border-slate-300 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <Calendar className="w-5 h-5 text-emerald-700" aria-hidden="true" />
                <h2 className="text-base font-black text-slate-900">
                  {t('doctor.treatment.mySpraysTitle')}
                </h2>
              </div>
              <div className="space-y-2">
                {sprayRecords.map((record) => {
                  const daysLeft = getDaysUntilHarvest(record.safeHarvestDate);
                  return (
                    <div
                      key={record.id}
                      className="p-3 bg-slate-50 border border-slate-300 rounded-xl flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-black text-slate-950 text-sm truncate">
                          {record.crop} — {record.chemical}
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5 font-medium">
                          Sprayed: {formatFriendlyDate(record.sprayDate)}
                        </div>
                        <div className="text-xs font-bold text-amber-900 mt-0.5">
                          {t('doctor.treatment.doNotHarvestBefore')}:{' '}
                          <span className="font-black underline">
                            {formatFriendlyDate(record.safeHarvestDate)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className={`text-xs font-black px-2 py-0.5 rounded-full border ${
                            daysLeft > 0
                              ? 'bg-amber-100 text-amber-950 border-amber-600'
                              : 'bg-emerald-100 text-emerald-950 border-emerald-600'
                          }`}
                        >
                          {daysLeft > 0
                            ? `${daysLeft} ${t('doctor.treatment.daysRemaining')}`
                            : t('doctor.treatment.safeToHarvest')}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteSpray(record.id)}
                          className="text-xs text-red-700 hover:text-red-900 underline flex items-center gap-0.5 p-1"
                          aria-label="Delete spray record"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{t('doctor.treatment.deleteRecord')}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: Photo Selected / Preview State */}
      {compressedImage && !result && !isLoading && (
        <div className="space-y-4">
          <div className="bg-white border-2 border-slate-300 rounded-2xl p-3 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-base font-black text-slate-900">
                {t('doctor.previewTitle')}
              </span>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="text-emerald-800 font-bold text-sm underline min-h-[48px] px-2 flex items-center"
              >
                {t('doctor.changePhoto')}
              </button>
            </div>

            <div className="relative aspect-square w-full rounded-xl overflow-hidden border-2 border-slate-300 bg-slate-100 shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={compressedImage.previewUrl}
                alt="Selected crop leaf preview"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Diagnose Button */}
          <button
            type="button"
            onClick={handleDiagnose}
            className="w-full min-h-[56px] py-3.5 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-black text-lg rounded-xl shadow-md border-2 border-emerald-900 flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
          >
            <Activity className="w-6 h-6 stroke-[2.3]" aria-hidden="true" />
            <span>{t('doctor.diagnoseButton')}</span>
          </button>
        </div>
      )}

      {/* VIEW 3: Friendly Loading State */}
      {isLoading && (
        <div className="bg-emerald-50 border-2 border-emerald-700 rounded-2xl p-6 text-center space-y-5 shadow-sm">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-200 border-4 border-emerald-600 border-t-transparent animate-spin flex items-center justify-center shadow" />
          <div className="space-y-2">
            <h2 className="text-xl font-black text-emerald-950">
              {loadingStep === 1 && t('doctor.loading.step1')}
              {loadingStep === 2 && t('doctor.loading.step2')}
              {loadingStep === 3 && t('doctor.loading.step3')}
              {loadingStep === 4 && t('doctor.loading.step4')}
            </h2>
            <p className="text-base text-emerald-800 font-medium">
              Connecting with verified plant-health database...
            </p>
          </div>
        </div>
      )}

      {/* VIEW 4: Error State with Retry Button */}
      {errorState && (
        <div className="bg-red-50 border-3 border-red-600 rounded-2xl p-5 space-y-4 shadow-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-red-950">
              <h2 className="text-lg font-black">Error</h2>
              <p className="text-base font-medium mt-1 leading-relaxed">
                {errorState}
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleDiagnose}
              className="flex-1 min-h-[48px] px-4 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-black text-base rounded-xl border-2 border-red-900 flex items-center justify-center gap-2 shadow cursor-pointer"
            >
              <RotateCcw className="w-5 h-5" aria-hidden="true" />
              <span>{t('doctor.errors.retry')}</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="min-h-[48px] px-4 py-2.5 bg-white text-slate-800 font-bold text-base rounded-xl border-2 border-slate-300 cursor-pointer"
            >
              {t('doctor.result.scanAnother')}
            </button>
          </div>
        </div>
      )}

      {/* VIEW 5: Complete Result Screen with Stage 1 & Stage 2 Treatments */}
      {result && !isLoading && (
        <div className="space-y-4">
          {/* Toast Notification when a spray is recorded */}
          {lastLoggedSpray && (
            <div className="bg-emerald-800 text-white p-4 rounded-xl shadow-lg border-2 border-emerald-950 flex items-start gap-3">
              <Calendar className="w-6 h-6 text-emerald-300 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1">
                <div className="font-bold text-sm text-emerald-200 uppercase tracking-wider">
                  Spray Logged Successfully
                </div>
                <div className="text-base font-black mt-0.5">
                  {lastLoggedSpray.chemical}
                </div>
                <div className="text-base font-bold text-amber-300 mt-1">
                  {t('doctor.treatment.doNotHarvestBefore')}:{' '}
                  <span className="underline text-white font-black">
                    {formatFriendlyDate(lastLoggedSpray.safeDate)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 1. Diagnosis Summary Card */}
          <div className="bg-white border-2 border-slate-300 rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <span className="text-xs uppercase font-black text-slate-500 tracking-wider">
                  {t('doctor.result.identifiedCrop')}: {result.crop || 'Crop Leaf'}
                </span>
                <h1 className="text-2xl font-black text-slate-950 leading-tight mt-0.5">
                  {result.problem_name}
                </h1>
              </div>

              <div className="flex flex-col items-end gap-1.5 shrink-0">
                {/* Problem Type Badge (Icon + Word) */}
                {(() => {
                  const badge = getProblemTypeBadge(result.problem_type);
                  const Icon = badge.icon;
                  return (
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black border ${badge.bg} shrink-0`}
                    >
                      <Icon className="w-4 h-4" aria-hidden="true" />
                      <span>{badge.text}</span>
                    </span>
                  );
                })()}

                {/* Listen to Diagnosis */}
                <ListenButton
                  text={`${result.crop || 'Crop'}: ${result.problem_name}. ${result.reasoning || ''}`}
                  compact
                />
              </div>
            </div>

            {/* Confidence Display (Bar AND Word) */}
            <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between text-base font-black">
                <span className="text-slate-900">{t('doctor.result.confidence')}</span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm font-black ${
                    result.confidence === 'high'
                      ? 'bg-emerald-100 text-emerald-950 border border-emerald-600'
                      : result.confidence === 'medium'
                      ? 'bg-amber-100 text-amber-950 border border-amber-600'
                      : 'bg-red-100 text-red-950 border border-red-600'
                  }`}
                >
                  {result.confidence === 'high' && t('doctor.confidenceLevels.high')}
                  {result.confidence === 'medium' && t('doctor.confidenceLevels.medium')}
                  {result.confidence === 'low' && t('doctor.confidenceLevels.low')}
                  <span className="text-xs font-bold text-slate-600">
                    ({Math.round(result.confidence_score * 100)}%)
                  </span>
                </span>
              </div>

              {/* Confidence Progress Bar */}
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden border border-slate-300">
                <div
                  className={`h-full transition-all duration-500 ${
                    result.confidence === 'high'
                      ? 'bg-emerald-600'
                      : result.confidence === 'medium'
                      ? 'bg-amber-500'
                      : 'bg-red-600'
                  }`}
                  style={{
                    width: `${Math.max(5, Math.min(100, Math.round(result.confidence_score * 100)))}%`,
                  }}
                />
              </div>
            </div>

            {/* Affected Area Range */}
            <div className="flex items-center justify-between py-2 border-b border-slate-200 text-base">
              <span className="font-bold text-slate-700">{t('doctor.result.affectedArea')}</span>
              <span className="font-black text-slate-950">
                {String(t(`doctor.areaRanges.${result.affected_area_range}` as any) || result.affected_area_range)}
              </span>
            </div>

            {/* Visible Symptoms */}
            {result.visible_symptoms && result.visible_symptoms.length > 0 && (
              <div className="space-y-2 pt-1">
                <h3 className="text-base font-black text-slate-900">
                  {t('doctor.result.symptoms')}
                </h3>
                <ul className="space-y-1.5">
                  {result.visible_symptoms.map((symptom, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-base text-slate-800 font-medium">
                      <Check className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{symptom}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Doctor Explanation / Reasoning */}
            {result.reasoning && (
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 space-y-1">
                <h3 className="text-base font-black text-emerald-950">
                  {t('doctor.result.reasoning')}
                </h3>
                <p className="text-base text-emerald-900 leading-relaxed font-medium">
                  {result.reasoning}
                </p>
              </div>
            )}
          </div>

          {/* SAFETY RULE 5: Medium Confidence Warning */}
          {result.confidence === 'medium' && (
            <div className="bg-amber-100 border-2 border-amber-600 rounded-xl p-4 flex items-start gap-3 shadow-sm">
              <AlertTriangle className="w-6 h-6 text-amber-800 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-amber-950">
                <h3 className="text-base font-black leading-snug">
                  Safety Warning
                </h3>
                <p className="text-base font-bold leading-normal mt-0.5">
                  {t('doctor.warnings.medium')}
                </p>
              </div>
            </div>
          )}

          {/* SAFETY RULE 5: Low Confidence or Poor Photo -> Retake Advice, NO Treatment */}
          {(result.confidence === 'low' || result.image_quality === 'poor' || !result.is_plant_photo) && (
            <div className="bg-red-50 border-3 border-red-600 rounded-2xl p-4 space-y-3 shadow-sm">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-6 h-6 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="text-red-950">
                  <h3 className="text-base font-black">
                    {!result.is_plant_photo
                      ? t('doctor.warnings.notPlant')
                      : t('doctor.warnings.low')}
                  </h3>
                  {result.retake_advice && (
                    <p className="text-base font-bold text-red-900 leading-relaxed mt-1">
                      {result.retake_advice}
                    </p>
                  )}
                </div>
              </div>

              {/* Photo tip box */}
              <div className="bg-white border-2 border-red-300 rounded-xl p-3 flex items-start gap-2.5 text-slate-900">
                <Lightbulb className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-base font-medium leading-relaxed">
                  {t('doctor.tips.instruction')}
                </p>
              </div>
            </div>
          )}

          {/* Feature 3: 1-Tap WhatsApp "Ask MPEO / Rythu Bharosa Card" */}
          {(result.confidence === 'medium' || result.confidence === 'low') && (
            <div className="bg-emerald-50 border-2 border-emerald-700 rounded-2xl p-4 shadow-sm space-y-2.5">
              <div className="flex items-start gap-2.5">
                <MessageCircle className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <h4 className="text-base font-black text-emerald-950">
                    {locale === 'te'
                      ? 'వ్యవసాయ అధికారి / రైతు భరోసా కేంద్రం (RBK) పరిశీలన'
                      : locale === 'hi'
                      ? 'कृषि अधिकारी / किसान सेवा केंद्र परामर्श कार्ड'
                      : 'Ask Agriculture Extension Officer / Rythu Bharosa (RBK)'}
                  </h4>
                  <p className="text-xs font-semibold text-emerald-800 mt-0.5 leading-snug">
                    {locale === 'te'
                      ? 'ఖచ్చితత్వం తక్కువ/మధ్యస్థంగా ఉంది కాబట్టి రసాయనాలు దాచబడ్డాయి. ఫోటో మరియు వాతావరణ వివరాలతో కూడిన కార్డును నేరుగా మీ గ్రామ వ్యవసాయ అధికారి (MPEO/VAA) వాట్సాప్‌కు పంపండి.'
                      : locale === 'hi'
                      ? 'सटीकता स्तर कम/मध्यम होने के कारण दवा का डोज छुपाया गया है। फोटो व मौसम विवरण सहित कार्ड सीधे अपने कृषि अधिकारी को व्हाट्सएप करें।'
                      : 'Chemical dosages are safely withheld due to low/medium confidence. Share this verified photo and field card directly with your village Agriculture Officer.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleShareToOfficer}
                disabled={isSharingCard}
                className="w-full min-h-[48px] px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 disabled:opacity-60 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4 shrink-0" />
                <span>
                  {isSharingCard
                    ? locale === 'te'
                      ? 'కార్డు రూపొందిస్తోంది...'
                      : 'Generating Card...'
                    : locale === 'te'
                    ? '1-ట్యాప్ వాట్సాప్ షేర్ (వ్యవసాయ అధికారి కార్డు)'
                    : locale === 'hi'
                    ? '1-टैप व्हाट्सएप शेयर (कृषि अधिकारी कार्ड)'
                    : '1-Tap WhatsApp Share (Officer Card)'}
                </span>
              </button>
            </div>
          )}

          {/* 2. STAGE 1: Organic & Preventive Steps Card */}
          {result.treatment?.stage1_organic && result.treatment.stage1_organic.length > 0 && (
            <div className="bg-emerald-50 border-2 border-emerald-700 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="bg-emerald-700 text-white p-2 rounded-xl shrink-0 mt-0.5">
                    <Sprout className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-emerald-950 leading-snug">
                      {t('doctor.treatment.stage1Title')}
                    </h2>
                    <p className="text-sm font-bold text-emerald-800 leading-tight mt-0.5">
                      {t('doctor.treatment.stage1Subtitle')}
                    </p>
                  </div>
                </div>
                <ListenButton
                  text={result.treatment.stage1_organic
                    .map((step, idx) => `${idx + 1}. ${(step as any)[locale] || step.en || ''}`)
                    .join('. ')}
                  compact
                />
              </div>

              {/* Numbered Steps */}
              <ol className="space-y-2.5 pt-1">
                {result.treatment.stage1_organic.map((step, idx) => {
                  const stepText = (step as any)[locale] || step.en || '';
                  return (
                    <li
                      key={idx}
                      className="flex items-start gap-3 p-3 bg-white rounded-xl border border-emerald-300 shadow-xs"
                    >
                      <span className="w-7 h-7 rounded-full bg-emerald-700 text-white font-black text-sm flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-base font-semibold text-slate-900 leading-relaxed">
                        {stepText}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {/* 3. STAGE 2: Chemical Stage (Collapsible Accordion) */}
          {result.treatment && (
            <div className="bg-white border-2 border-slate-300 rounded-2xl overflow-hidden shadow-sm">
              {/* If verified chemicals exist */}
              {result.treatment.stage2_chemical && result.treatment.stage2_chemical.length > 0 ? (
                <>
                  {/* Collapsible Accordion Header */}
                  <button
                    type="button"
                    onClick={() => setStage2Open(!stage2Open)}
                    className="w-full min-h-[56px] p-4 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border-b border-slate-300 flex items-center justify-between text-left transition-colors cursor-pointer"
                    aria-expanded={stage2Open}
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0" aria-hidden="true" />
                      <div>
                        <span className="text-base font-black text-slate-950 block">
                          {t('doctor.treatment.stage2Title')}
                        </span>
                        <span className="text-xs font-bold text-slate-600 block">
                          {stage2Open ? 'Tap to collapse' : 'Collapsed by default — tap to expand'}
                        </span>
                      </div>
                    </div>
                    {stage2Open ? (
                      <ChevronUp className="w-5 h-5 text-slate-700 shrink-0" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-700 shrink-0" aria-hidden="true" />
                    )}
                  </button>

                  {/* Accordion Content */}
                  {stage2Open && (
                    <div className="p-4 space-y-4 bg-white">
                      {/* Note: Use only if organic steps are not enough */}
                      <div className="p-3 bg-amber-50 border-2 border-amber-500 rounded-xl flex items-start gap-2.5 text-amber-950">
                        <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
                        <p className="text-base font-black leading-snug">
                          {t('doctor.treatment.stage2Subtitle')}
                        </p>
                      </div>

                      {/* Chemical Items */}
                      {result.treatment.stage2_chemical.map((chem, chemIdx) => {
                        const tox = getToxicityDetails(chem.toxicity_class);
                        const rotationAlert = checkMoARotationRisk(chem as any, sprayRecords);
                        return (
                          <div
                            key={chemIdx}
                            className="p-4 border-2 border-slate-300 rounded-2xl bg-slate-50/60 space-y-4 shadow-sm"
                          >
                            {/* Feature 2: Anti-Resistance MoA Rotation Guard Alert */}
                            {rotationAlert.hasRisk && (
                              <div className="p-3.5 bg-amber-100 border-2 border-amber-600 rounded-xl text-amber-950 space-y-1">
                                <div className="font-black text-sm flex items-start gap-2">
                                  <AlertTriangle className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
                                  <span>
                                    {rotationAlert.warningBadge?.[locale as 'en' | 'te' | 'hi'] ||
                                      rotationAlert.warningBadge?.en}
                                  </span>
                                </div>
                                {rotationAlert.recommendation && (
                                  <p className="text-xs font-bold text-amber-900 pl-7">
                                    {rotationAlert.recommendation[locale as 'en' | 'te' | 'hi'] ||
                                      rotationAlert.recommendation.en}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Chemical Name & MoA Tag */}
                            <div className="border-b border-slate-200 pb-2 flex flex-wrap items-center justify-between gap-2">
                              <h3 className="text-xl font-black text-slate-950">
                                {chem.chemical_name}
                              </h3>
                              {chem.irac_frac_group && (
                                <span className="px-2.5 py-1 bg-slate-200 text-slate-800 rounded-md font-mono text-xs font-bold border border-slate-300">
                                  {chem.irac_frac_group}
                                </span>
                              )}
                            </div>

                            {/* Dose & Pre-Harvest Interval */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-base">
                              <div className="p-3 bg-white rounded-xl border border-slate-300">
                                <span className="text-xs font-bold text-slate-500 uppercase block">
                                  {t('doctor.treatment.dosePerLitre')}
                                </span>
                                <span className="text-lg font-black text-slate-900 mt-0.5 block">
                                  {chem.dose_per_litre}
                                </span>
                              </div>

                              <div className="p-3 bg-white rounded-xl border border-slate-300">
                                <span className="text-xs font-bold text-slate-500 uppercase block">
                                  {t('doctor.treatment.preHarvestInterval')}
                                </span>
                                <span className="text-lg font-black text-amber-900 mt-0.5 block">
                                  {chem.pre_harvest_interval_days !== null
                                    ? `${chem.pre_harvest_interval_days} ${t('doctor.treatment.days')}`
                                    : 'N/A'}
                                </span>
                              </div>
                            </div>

                            {/* Mix Calculator with 3-Second Bottle Authenticity Checklist (F10) */}
                            <ChemicalMixCalculator
                              dosePerLitre={chem.dose_per_litre}
                              cibrcRegNo={chem.cibrc_reg_no}
                              chemicalName={chem.chemical_name}
                            />

                            {/* SAFETY CARD (F3 & Safety Rule 6) */}
                            <div className="p-4 bg-white rounded-xl border-2 border-slate-400 space-y-3">
                              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                <div className="flex items-center gap-2">
                                  <Shield className="w-5 h-5 text-slate-800" aria-hidden="true" />
                                  <h4 className="text-base font-black text-slate-950">
                                    {t('doctor.treatment.safetyCardTitle')}
                                  </h4>
                                </div>
                                <ListenButton
                                  text={`${chem.chemical_name}. Dose: ${chem.dose_per_litre}. Waiting period: ${chem.pre_harvest_interval_days ?? 'none'} days. Required gear: ${chem.ppe?.join(', ') || 'standard protection'}. ${t('doctor.treatment.labelAuthority')}`}
                                  compact
                                />
                              </div>

                              {/* Toxicity Class: Colored Triangle Badge + Word + Icon */}
                              <div className="space-y-1">
                                <span className="text-xs font-bold text-slate-600 block">
                                  {t('doctor.treatment.toxicityClass')}
                                </span>
                                <div
                                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-black shadow-xs ${tox.badgeClass}`}
                                >
                                  <Triangle className={`w-4 h-4 ${tox.triangleColor}`} aria-hidden="true" />
                                  <span>{tox.label}</span>
                                </div>
                              </div>

                              {/* Protective Gear (PPE) */}
                              {chem.ppe && chem.ppe.length > 0 && (
                                <div className="space-y-1 pt-1">
                                  <span className="text-xs font-bold text-slate-600 block">
                                    {t('doctor.treatment.protectiveGear')}
                                  </span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {chem.ppe.map((gear, gearIdx) => (
                                      <span
                                        key={gearIdx}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-900 border border-slate-400 rounded-md text-sm font-bold capitalize"
                                      >
                                        <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                                        <span>{gear}</span>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Mandatory Notice: Safety Rule 6 */}
                              <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-amber-950 text-xs font-black leading-tight flex items-start gap-1.5">
                                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
                                <span>{t('doctor.treatment.labelAuthority')}</span>
                              </div>
                            </div>

                            {/* Button: "I sprayed today" (F5) */}
                            <button
                              type="button"
                              onClick={() => handleSaveSpray(chem)}
                              className="w-full min-h-[48px] px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-black text-base rounded-xl border-2 border-emerald-900 flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                            >
                              <Calendar className="w-5 h-5" aria-hidden="true" />
                              <span>{t('doctor.treatment.iSprayedToday')}</span>
                            </button>

                            {/* Red Button: "I touched this chemical" (goes to /emergency) */}
                            <Link
                              href="/emergency"
                              className="w-full min-h-[48px] px-4 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-black text-base rounded-xl border-2 border-red-900 flex items-center justify-center gap-2 shadow-sm transition-colors text-center"
                            >
                              <AlertOctagon className="w-5 h-5" aria-hidden="true" />
                              <span>{t('doctor.treatment.iTouchedChemical')}</span>
                            </Link>

                            {/* Link: "Is the weather safe for spraying?" (goes to /weather) */}
                            <Link
                              href="/weather"
                              className="w-full min-h-[48px] px-4 py-2.5 bg-sky-50 hover:bg-sky-100 active:bg-sky-200 text-sky-950 font-black text-base rounded-xl border-2 border-sky-600 flex items-center justify-center gap-2 shadow-xs transition-colors text-center"
                            >
                              <CloudSun className="w-5 h-5 text-sky-700" aria-hidden="true" />
                              <span>{t('doctor.treatment.checkWeather')}</span>
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                /* No verified chemicals -> show KVK fallback notice (Safety Rule 2) */
                <div className="p-4 bg-slate-50 border-2 border-slate-300 rounded-2xl flex items-start gap-3">
                  <Info className="w-6 h-6 text-slate-700 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Chemical Treatment Advisory
                    </h3>
                    <p className="text-base font-bold text-slate-700 leading-normal mt-0.5">
                      {t('doctor.treatment.noVerifiedChemicals')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. "My Sprays" Diary List (on same page) */}
          {sprayRecords.length > 0 && (
            <div className="bg-white border-2 border-slate-300 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <Clock className="w-5 h-5 text-emerald-700" aria-hidden="true" />
                <h3 className="text-base font-black text-slate-950">
                  {t('doctor.treatment.mySpraysTitle')}
                </h3>
              </div>

              <div className="space-y-2">
                {sprayRecords.map((record) => {
                  const daysLeft = getDaysUntilHarvest(record.safeHarvestDate);
                  return (
                    <div
                      key={record.id}
                      className="p-3 bg-slate-50 border border-slate-300 rounded-xl flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-black text-slate-950 text-sm truncate">
                          {record.crop} — {record.chemical}
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5 font-medium">
                          Sprayed: {formatFriendlyDate(record.sprayDate)} ({record.intervalDays}d wait)
                        </div>
                        <div className="text-xs font-bold text-amber-900 mt-0.5">
                          {t('doctor.treatment.doNotHarvestBefore')}:{' '}
                          <span className="font-black underline">
                            {formatFriendlyDate(record.safeHarvestDate)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className={`text-xs font-black px-2 py-0.5 rounded-full border ${
                            daysLeft > 0
                              ? 'bg-amber-100 text-amber-950 border-amber-600'
                              : 'bg-emerald-100 text-emerald-950 border-emerald-600'
                          }`}
                        >
                          {daysLeft > 0
                            ? `${daysLeft} ${t('doctor.treatment.daysRemaining')}`
                            : t('doctor.treatment.safeToHarvest')}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteSpray(record.id)}
                          className="text-xs text-red-700 hover:text-red-900 underline flex items-center gap-0.5 p-1"
                          aria-label="Delete spray record"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{t('doctor.treatment.deleteRecord')}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. Scan Another Leaf Button */}
          <button
            type="button"
            onClick={handleReset}
            className="w-full min-h-[52px] py-3 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-black text-base rounded-xl shadow-md border-2 border-emerald-900 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" aria-hidden="true" />
            <span>{t('doctor.result.scanAnother')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
