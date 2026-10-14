'use client';

import React, { useState } from 'react';
import { Sparkles, Layers, CheckCircle2, ChevronRight, AlertCircle, HelpCircle } from 'lucide-react';
import { getDeficienciesByPosition, DeficiencyEntry } from '../lib/deficiencies';
import { useI18n } from '../lib/i18n';

export default function NutrientDeficiencyGuide() {
  const { locale } = useI18n();
  const language = locale;
  const [position, setPosition] = useState<'top_new' | 'bottom_old'>('top_new');
  const [selectedCrop, setSelectedCrop] = useState<string>('all');

  const deficiencies = getDeficienciesByPosition(position).filter((d) =>
    selectedCrop === 'all' ? true : d.crops.includes(selectedCrop)
  );

  const getLocalized = (textObj: { en: string; te: string; hi: string }) => {
    return textObj[language as 'en' | 'te' | 'hi'] || textObj.en;
  };

  return (
    <div className="p-4 sm:p-5 bg-white border-2 border-amber-600 rounded-2xl space-y-4 shadow-sm text-slate-900">
      <div className="flex items-center gap-2.5 text-amber-950">
        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
          <Layers className="w-5 h-5" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-base font-black">
            {language === 'te'
              ? '🍃 పోషకాల లోపాల నిర్ధారణ (ఆకు స్థానం ఆధారంగా 2-ట్యాప్ గైడ్)'
              : language === 'hi'
              ? '🍃 पोषक तत्वों की कमी गाइड (पत्तियों की स्थिति से पहचान)'
              : '🍃 Nutrient Deficiency & Yellow Leaf Diagnostic Guide'}
          </h3>
          <p className="text-xs text-slate-600 font-medium">
            {language === 'te'
              ? 'పసుపు ఆకులన్నీ తెగుళ్లు కావు! జింక్, నత్రజని లోపాలకు అనవసరంగా ఫంగిసైడ్ పిచికారీ చేసి ఖర్చు చేయకండి.'
              : language === 'hi'
              ? 'हर पीली पत्ती बीमारी नहीं होती! पोषक तत्वों की कमी पहचानें और अनावश्यक दवाओं का खर्च बचाएं।'
              : 'Every yellow leaf is not a fungal infection! Identify Zinc, Nitrogen, or Iron deficiency in 2 taps.'}
          </p>
        </div>
      </div>

      {/* 2-Tap Position Filter */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-700 block">
          {language === 'te'
            ? 'ప్రశ్న 1: పసుపు రంగు ఎక్కడ ప్రారంభమైంది?'
            : language === 'hi'
            ? 'प्रश्न 1: पत्तियां पीली कहां से शुरू हुईं?'
            : 'Step 1: Where did leaf yellowing start on your plant?'}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setPosition('top_new')}
            className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
              position === 'top_new'
                ? 'bg-amber-100 border-amber-700 text-amber-950 shadow-xs'
                : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="font-bold text-sm flex items-center justify-between">
              <span>
                {language === 'te'
                  ? '🌱 పై లేత చిగురు ఆకులు'
                  : language === 'hi'
                  ? '🌱 ऊपरी नई कोपलें / पत्तियां'
                  : '🌱 Top / Young New Leaves'}
              </span>
              {position === 'top_new' && <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0" />}
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              {language === 'te'
                ? 'జింక్ (ఖైరా), ఇనుము, బోరాన్ లోపాలు'
                : language === 'hi'
                ? 'जिंक (खैरा), आयरन, बोरॉन की कमी'
                : 'Zinc (Khaira), Iron, Boron, Calcium'}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setPosition('bottom_old')}
            className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
              position === 'bottom_old'
                ? 'bg-amber-100 border-amber-700 text-amber-950 shadow-xs'
                : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="font-bold text-sm flex items-center justify-between">
              <span>
                {language === 'te'
                  ? '🍂 కింది ముదిరిన పాత ఆకులు'
                  : language === 'hi'
                  ? '🍂 निचली पुरानी पत्तियां'
                  : '🍂 Bottom / Older Leaves First'}
              </span>
              {position === 'bottom_old' && <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0" />}
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              {language === 'te'
                ? 'నత్రజని (యూరియా), పొటాష్, మెగ్నీషియం'
                : language === 'hi'
                ? 'नाइट्रोजन (यूरिया), पोटाश, मैग्नीशियम'
                : 'Nitrogen, Potassium, Magnesium, Phosphorus'}
            </p>
          </button>
        </div>
      </div>

      {/* Crop Filter Pill Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="font-bold text-slate-500 mr-1">
          {language === 'te' ? 'పంట:' : language === 'hi' ? 'फसल:' : 'Crop:'}
        </span>
        {[
          { key: 'all', label: language === 'te' ? 'అన్నీ' : language === 'hi' ? 'सभी' : 'All Crops' },
          { key: 'paddy', label: language === 'te' ? 'వరి (Paddy)' : language === 'hi' ? 'धान' : 'Paddy' },
          { key: 'chilli', label: language === 'te' ? 'మిరప (Chilli)' : language === 'hi' ? 'मिर्च' : 'Chilli' },
          { key: 'cotton', label: language === 'te' ? 'పత్తి (Cotton)' : language === 'hi' ? 'कपास' : 'Cotton' },
          { key: 'tomato', label: language === 'te' ? 'టమాట (Tomato)' : language === 'hi' ? 'टमाटर' : 'Tomato' },
        ].map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setSelectedCrop(c.key)}
            className={`px-3 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer ${
              selectedCrop === c.key
                ? 'bg-amber-700 text-white border-amber-800'
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Matching Deficiencies List */}
      <div className="space-y-3 pt-1">
        {deficiencies.length === 0 ? (
          <p className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
            {language === 'te'
              ? 'ఈ వర్గానికి సరిపోయే లోపాలు కనిపించలేదు.'
              : 'No nutrient deficiency found for this specific crop and position.'}
          </p>
        ) : (
          deficiencies.map((def) => (
            <div
              key={def.key}
              className="p-3.5 bg-amber-50/50 border border-amber-300 rounded-xl space-y-2 text-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-black text-amber-950">
                  {getLocalized(def.nutrient)}
                </h4>
                <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded font-bold text-[10px] uppercase">
                  {def.leaf_position === 'top_new'
                    ? language === 'te'
                      ? 'పై ఆకులు'
                      : 'Top Leaves'
                    : language === 'te'
                    ? 'కింది ఆకులు'
                    : 'Bottom Leaves'}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-amber-200 space-y-1 text-slate-800">
                <p>
                  <strong className="text-slate-900 font-bold">
                    {language === 'te' ? 'గుర్తించే లక్షణం:' : language === 'hi' ? 'पहचान लक्षण:' : 'Visual Marker:'}{' '}
                  </strong>
                  {getLocalized(def.visual_marker)}
                </p>
                <p className="text-slate-600">
                  {getLocalized(def.symptoms)}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-slate-800">
                <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-300 space-y-1">
                  <span className="font-bold text-emerald-950 block">
                    {language === 'te' ? '🌿 ఆకులపై పిచికారీ నివారణ:' : language === 'hi' ? '🌿 पर्णीय छिड़काव उपाय:' : '🌿 Foliar Spray Fix:'}
                  </span>
                  <p className="text-emerald-900">{getLocalized(def.foliar_remedy)}</p>
                </div>

                <div className="p-2.5 bg-stone-100 rounded-lg border border-stone-300 space-y-1">
                  <span className="font-bold text-stone-900 block">
                    {language === 'te' ? '🪴 నేల ఎరువుల యాజమాన్యం:' : language === 'hi' ? '🪴 मिट्टी में खाद प्रबंधन:' : '🪴 Soil Application:'}
                  </span>
                  <p className="text-stone-800">{getLocalized(def.soil_remedy)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
