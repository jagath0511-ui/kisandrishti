'use client';

import React, { useState } from 'react';
import { ShieldCheck, ChevronDown, ChevronUp, ExternalLink, AlertTriangle, QrCode } from 'lucide-react';
import { useI18n } from '../lib/i18n';

export default function BottleAuthenticityChecklist({
  cibrcRegNo,
  chemicalName,
}: {
  cibrcRegNo?: string;
  chemicalName?: string;
}) {
  const { locale } = useI18n();
  const language = locale;
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-emerald-300 bg-emerald-50/60 rounded-xl overflow-hidden mt-3 text-slate-800">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-emerald-100/60 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" aria-hidden="true" />
          <span className="text-sm font-bold text-emerald-950">
            {language === 'te'
              ? '🔍 సీల్ వేసే ముందు 3-సెకన్ల బాటిల్ తనిఖీ (నకిలీ/గడువు ముగిసిన మందులు)'
              : language === 'hi'
              ? '🔍 ढक्कन खोलने से पहले 3-सेकंड बोतल जांच (नकली व एक्सपायरी से बचें)'
              : '🔍 3-Second Bottle Check (Avoid Fake & Expired Chemicals)'}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-emerald-700 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-emerald-700 shrink-0" />
        )}
      </button>

      {isOpen && (
        <div className="p-4 pt-2 border-t border-emerald-200 bg-white space-y-3 text-xs leading-relaxed">
          {cibrcRegNo && (
            <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-300 flex items-center justify-between">
              <div>
                <span className="font-bold text-emerald-900 block">
                  {language === 'te'
                    ? 'ధృవీకరించబడిన CIBRC రిజిస్ట్రేషన్ సంఖ్య:'
                    : language === 'hi'
                    ? 'सत्यापित CIBRC पंजीकरण संख्या:'
                    : 'Official CIBRC Registration No:'}
                </span>
                <code className="text-emerald-800 font-mono font-bold text-xs">{cibrcRegNo}</code>
              </div>
            </div>
          )}

          <ul className="space-y-2 text-slate-700">
            <li className="flex items-start gap-2">
              <span className="font-bold text-emerald-700 shrink-0">1.</span>
              <div>
                <strong className="text-slate-900">
                  {language === 'te' ? 'CIBRC రిజిస్ట్రేషన్ స్టాంప్:' : language === 'hi' ? 'CIBRC पंजीकरण नंबर:' : 'CIBRC Registration:'}
                </strong>{' '}
                {language === 'te'
                  ? 'బాటిల్ లేబుల్ లేదా మెడపై "CIR-..." తో ప్రారంభమయ్యే ప్రింటెడ్ నంబర్ ఉండాలి. చేతిరాత లేదా లేబుల్ లేని మందులు కొనవద్దు.'
                  : language === 'hi'
                  ? 'बोतल के लेबल पर "CIR-..." से शुरू होने वाला प्रिंटेड नंबर जांचें। बिना लेबल वाली दवा कदापि न लें।'
                  : 'Ensure the bottle displays a printed CIBRC number starting with "CIR-...". Never buy handwritten or unlabelled bottles.'}
              </div>
            </li>

            <li className="flex items-start gap-2">
              <span className="font-bold text-emerald-700 shrink-0">2.</span>
              <div>
                <strong className="text-slate-900">
                  {language === 'te' ? 'గడువు తేదీ & బ్యాచ్ సంఖ్య:' : language === 'hi' ? 'एक्सपायरी तारीख व बैच नंबर:' : 'Expiry Date & Batch:'}
                </strong>{' '}
                {language === 'te'
                  ? 'గడువు తీరిన మందులు పనిచేయకపోగా ఆకులను మాడ్చివేస్తాయి. ముద్రించిన తేదీని స్పష్టంగా చూడండి.'
                  : language === 'hi'
                  ? 'एक्सपायर्ड दवा बेअसर होती है और फसल को जला सकती है। बोतल पर निर्माण व एक्सपायरी तिथि जांचें।'
                  : 'Expired agrochemicals break down into phytotoxic compounds. Check printed MFG and EXP dates.'}
              </div>
            </li>

            <li className="flex items-start gap-2">
              <span className="font-bold text-emerald-700 shrink-0">3.</span>
              <div>
                <strong className="text-slate-900">
                  {language === 'te' ? 'హోలోగ్రామ్ & సీల్ తనిఖీ:' : language === 'hi' ? 'होलोग्राम और सील जांच:' : 'Intact Cap & Hologram:'}
                </strong>{' '}
                {language === 'te'
                  ? 'క్యాప్ సీల్ విరిగిపోయి ఉండకూడదు. కంపెనీ హోలోగ్రామ్ స్టిక్కర్ చెక్కుచెదరకుండా ఉండాలి.'
                  : language === 'hi'
                  ? 'बोतल की सील टूटी न हो और निर्माता का होलोग्राम सही सलामत होना चाहिए।'
                  : 'Check that the cap induction seal is intact and the tamper-proof security hologram is present.'}
              </div>
            </li>
          </ul>

          <div className="pt-2 flex flex-wrap gap-2">
            <a
              href="https://sathi.cagri.gov.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>
                {language === 'te'
                  ? 'కేంద్ర ప్రభుత్వ సాథీ (SATHI) పోర్టల్'
                  : language === 'hi'
                  ? 'सरकारी साथी (SATHI) पोर्टल खोलें'
                  : 'Govt SATHI Agrochemical Portal'}
              </span>
            </a>

            <a
              href="https://cibrc.gov.in/major-uses-of-pesticides/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-xs border border-slate-300 transition-colors cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 text-slate-600" />
              <span>
                {language === 'te'
                  ? 'CIBRC జాబితా తనిఖీ'
                  : language === 'hi'
                  ? 'CIBRC पंजीकृत सूची'
                  : 'CIBRC Approved List'}
              </span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
