'use client';

import React, { useState } from 'react';
import { Beaker, AlertOctagon, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { checkMixCompatibility, getWaleStepsGuide, getJarTestGuide } from '../lib/compatibility';
import { useI18n } from '../lib/i18n';

const FORMULATION_OPTIONS = [
  { value: 'WP', label: 'WP (Wettable Powder / తడిపొడి / घुलनशील पाउडर)' },
  { value: 'EC', label: 'EC (Emulsifiable Concentrate / ద్రవ సాంద్రీకృతం)' },
  { value: 'SC', label: 'SC (Suspension Concentrate)' },
  { value: 'SL', label: 'SL (Soluble Liquid)' },
  { value: 'COPPER', label: 'Copper Fungicide (COC / Bordeaux Mixture)' },
  { value: 'SULPHUR', label: 'Sulphur (WP/WDG గంధకం)' },
  { value: 'FERTILIZER', label: 'NPK Foliar Spray (19-19-19 / Urea / Micronutrients)' },
];

export default function ChemicalCompatibilityChecker() {
  const { locale } = useI18n();
  const language = locale;
  const [form1, setForm1] = useState<string>('COPPER');
  const [form2, setForm2] = useState<string>('EC');
  const [showWale, setShowWale] = useState<boolean>(false);
  const [showJarTest, setShowJarTest] = useState<boolean>(false);

  const verdict = checkMixCompatibility(form1, form2, 'Chemical 1', 'Chemical 2', (language as any) || 'en');
  const waleGuide = getWaleStepsGuide();
  const jarGuide = getJarTestGuide();

  return (
    <div className="p-5 bg-white border border-emerald-950/10 rounded-3xl space-y-4 shadow-[0_10px_30px_rgba(6,78,59,0.08)] text-slate-900">
      <div className="flex items-center gap-3 text-emerald-950">
        <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-xs">
          <Beaker className="w-5 h-5 stroke-[2.5]" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-base font-black text-slate-950 tracking-tight">
            {language === 'te'
              ? '🧪 పురుగుమందుల కలయిక తనిఖీ (జార్ టెస్ట్ & W-A-L-E నియమం)'
              : language === 'hi'
              ? '🧪 रासायनिक अनुकूलता व जार टेस्ट (क्या इन्हें मिला सकते हैं?)'
              : '🧪 Chemical Compatibility & Jar Mix Checker'}
          </h3>
          <p className="text-xs text-slate-700 font-semibold leading-relaxed mt-0.5">
            {language === 'te'
              ? 'రెండు రసాయనాలు కలిపితే ఆకులు మాడిపోవడం లేదా ముద్దకట్టడం జరగకుండా ముందుగానే తనిఖీ చేయండి.'
              : language === 'hi'
              ? 'दो दवाओं को मिलाने से पहले जांचें ताकि पत्तियां न जलें और नोजल जाम न हो।'
              : 'Check before mixing two agrochemicals in a single 15L tank to prevent curdling and leaf scorch.'}
          </p>
        </div>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-800 block">
            {language === 'te' ? '1వ మందు రకం (Chemical 1)' : language === 'hi' ? 'दवा 1 का प्रकार' : 'Chemical 1 Formulation'}
          </label>
          <select
            value={form1}
            onChange={(e) => setForm1(e.target.value)}
            className="w-full min-h-[48px] px-3.5 py-2.5 bg-slate-50 border border-slate-300/80 rounded-2xl text-sm font-bold text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-400 focus:outline-none cursor-pointer"
          >
            {FORMULATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-800 block">
            {language === 'te' ? '2వ మందు రకం (Chemical 2)' : language === 'hi' ? 'दवा 2 का प्रकार' : 'Chemical 2 Formulation'}
          </label>
          <select
            value={form2}
            onChange={(e) => setForm2(e.target.value)}
            className="w-full min-h-[48px] px-3.5 py-2.5 bg-slate-50 border border-slate-300/80 rounded-2xl text-sm font-bold text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-400 focus:outline-none cursor-pointer"
          >
            {FORMULATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Verdict Banner */}
      <div
        className={`p-4 rounded-2xl border space-y-1.5 transition-colors shadow-xs ${
          verdict.status === 'INCOMPATIBLE'
            ? 'bg-red-50/90 border-red-600/50 text-red-950'
            : verdict.status === 'CAUTION'
            ? 'bg-amber-50/90 border-amber-600/50 text-amber-950'
            : 'bg-emerald-50/90 border-emerald-600/50 text-emerald-950'
        }`}
      >
        <div className="flex items-center gap-2">
          {verdict.status === 'INCOMPATIBLE' && (
            <AlertOctagon className="w-5 h-5 text-red-700 shrink-0 stroke-[2.5]" aria-hidden="true" />
          )}
          {verdict.status === 'CAUTION' && (
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 stroke-[2.5]" aria-hidden="true" />
          )}
          {(verdict.status === 'SAFE_TO_MIX' || verdict.status === 'COMPATIBLE_WITH_WALE') && (
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 stroke-[2.5]" aria-hidden="true" />
          )}
          <span className="text-base font-black uppercase tracking-wide">
            {verdict.statusLabel || verdict.status}
          </span>
        </div>
        <p className="text-xs sm:text-sm font-semibold leading-relaxed">
          {verdict.reason}
        </p>
      </div>

      {/* Collapsible W-A-L-E Guide */}
      <div className="border border-emerald-950/10 rounded-2xl overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setShowWale(!showWale)}
          className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left text-xs font-black text-slate-800 cursor-pointer transition-colors"
        >
          <span className="flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-700 stroke-[2.5]" />
            {language === 'te'
              ? 'మందులు డ్రమ్ములో వేసే సరైన క్రమం: W-A-L-E నియమం'
              : language === 'hi'
              ? 'टैंक में दवा घोलने का सही क्रम: W-A-L-E नियम'
              : 'Universal Tank Mixing Sequence: The W-A-L-E Rule'}
          </span>
          {showWale ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showWale && (
          <div className="p-3.5 bg-white space-y-2 text-xs">
            <ol className="space-y-2 text-slate-800 font-semibold">
              {waleGuide.map((step, idx) => (
                <li key={idx} className="leading-snug">
                  <span className="inline-block w-6 h-6 rounded-full bg-emerald-700 text-white font-black text-center leading-6 mr-2">
                    {step.letter}
                  </span>
                  <strong className="text-emerald-950 font-bold">{step.title}: </strong>
                  <span>{step.desc}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* Collapsible 15-Minute Jar Test */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowJarTest(!showJarTest)}
          className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left text-xs font-bold text-slate-800 cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Beaker className="w-4 h-4 text-emerald-700" />
            {language === 'te'
              ? '15-నిమిషాల గాజు సీసా పరీక్ష (జార్ టెస్ట్ పద్ధతి)'
              : language === 'hi'
              ? '15-मिनट शीशे के जार में परीक्षण विधि'
              : '15-Minute Miniature Jar Test Guide'}
          </span>
          {showJarTest ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showJarTest && (
          <div className="p-3 bg-white space-y-2 text-xs">
            <p className="font-bold text-slate-800">
              {jarGuide.title}
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-700">
              {jarGuide.steps.map((st, idx) => (
                <li key={idx} className="leading-relaxed">
                  {st}
                </li>
              ))}
            </ol>
            <div className="p-2 bg-amber-50 rounded border border-amber-200 text-amber-950 mt-2">
              <span className="font-bold block">Danger Signs:</span>
              <ul className="list-disc list-inside space-y-0.5 mt-0.5">
                {jarGuide.bad_signs.map((sign, idx) => (
                  <li key={idx}>{sign}</li>
                ))}
              </ul>
            </div>
            <p className="font-bold text-red-700 mt-1">{jarGuide.conclusion}</p>
          </div>
        )}
      </div>
    </div>
  );
}
