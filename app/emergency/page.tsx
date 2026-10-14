'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  PhoneCall,
  Volume2,
  Eye,
  Droplets,
  Wind,
  AlertOctagon,
  ArrowLeft,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import firstAidData from '../../data/first-aid.json';
import { ListenButton } from '../../components/ListenButton';
import { EMERGENCY_HELPLINES } from '../../config/helplines';

// TODO: Offline cache service worker (PWA cache registration) for static offline resilience.
// This page uses only local static JSON and requires no network/API calls after initial bundle download.

type IncidentKey = 'skin' | 'eyes' | 'breathed' | 'swallowed';

export default function EmergencyPage() {
  const { locale } = useI18n();
  const [selectedIncident, setSelectedIncident] = useState<IncidentKey | null>(null);

  const incidents = firstAidData.incidents;

  const incidentButtons = [
    {
      key: 'skin' as IncidentKey,
      title: incidents.skin.title[locale as 'en' | 'te' | 'hi'] || incidents.skin.title.en,
      subtitle: incidents.skin.subtitle[locale as 'en' | 'te' | 'hi'] || incidents.skin.subtitle.en,
      icon: Droplets,
      bg: 'bg-amber-50 hover:bg-amber-100 active:bg-amber-200 border-amber-600 text-amber-950',
      iconBg: 'bg-amber-600 text-white',
    },
    {
      key: 'eyes' as IncidentKey,
      title: incidents.eyes.title[locale as 'en' | 'te' | 'hi'] || incidents.eyes.title.en,
      subtitle: incidents.eyes.subtitle[locale as 'en' | 'te' | 'hi'] || incidents.eyes.subtitle.en,
      icon: Eye,
      bg: 'bg-sky-50 hover:bg-sky-100 active:bg-sky-200 border-sky-600 text-sky-950',
      iconBg: 'bg-sky-600 text-white',
    },
    {
      key: 'breathed' as IncidentKey,
      title: incidents.breathed.title[locale as 'en' | 'te' | 'hi'] || incidents.breathed.title.en,
      subtitle: incidents.breathed.subtitle[locale as 'en' | 'te' | 'hi'] || incidents.breathed.subtitle.en,
      icon: Wind,
      bg: 'bg-purple-50 hover:bg-purple-100 active:bg-purple-200 border-purple-600 text-purple-950',
      iconBg: 'bg-purple-600 text-white',
    },
    {
      key: 'swallowed' as IncidentKey,
      title: incidents.swallowed.title[locale as 'en' | 'te' | 'hi'] || incidents.swallowed.title.en,
      subtitle: incidents.swallowed.subtitle[locale as 'en' | 'te' | 'hi'] || incidents.swallowed.subtitle.en,
      icon: AlertOctagon,
      bg: 'bg-red-50 hover:bg-red-100 active:bg-red-200 border-red-700 text-red-950',
      iconBg: 'bg-red-700 text-white',
    },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Top Bar with Home Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 min-h-[48px] px-3 py-2 text-base font-bold text-red-950 bg-red-100 hover:bg-red-200 active:bg-red-300 rounded-lg border border-red-300 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span>Exit Emergency</span>
        </Link>
        <span className="text-sm font-black text-red-700 uppercase tracking-widest bg-red-100 px-2 py-1 rounded border border-red-300">
          STATIC / OFFLINE READY
        </span>
      </div>

      {/* TOP SECTION: Large Call Helpline Buttons (Always visible at top) */}
      <div className="bg-gradient-to-br from-red-800 to-rose-950 text-white p-5 rounded-3xl shadow-[0_12px_36px_rgba(220,38,38,0.25)] border border-red-700/50 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-amber-300 stroke-[2.5]" aria-hidden="true" />
          <h2 className="text-lg font-black tracking-tight text-white uppercase">
            Emergency Call Helplines
          </h2>
        </div>

        <div className="space-y-2.5">
          {/* Main 108 Ambulance Call Button (AP & Telangana Native Emergency) */}
          <a
            href="tel:108"
            className="w-full min-h-[58px] py-3.5 px-4 bg-white hover:bg-emerald-50 active:bg-emerald-100 text-emerald-800 font-black text-xl rounded-2xl shadow-md border-2 border-emerald-600 flex items-center justify-between transition-all active:scale-[0.99]"
            aria-label="Call 108 Free Medical Ambulance (AP & Telangana)"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-sm">
                <PhoneCall className="w-6 h-6 stroke-[2.5]" aria-hidden="true" />
              </div>
              <div className="text-left leading-tight">
                <span className="block text-2xl font-black text-emerald-950">CALL 108</span>
                <span className="block text-xs font-bold text-slate-700">
                  Medical Ambulance (Free AP & TG 24/7)
                </span>
              </div>
            </div>
            <span className="text-xs font-black uppercase bg-emerald-700 text-white px-2.5 py-1 rounded-xl shadow-xs">
              FREE
            </span>
          </a>

          {/* Main 112 Call Button */}
          <a
            href="tel:112"
            className="w-full min-h-[58px] py-3.5 px-4 bg-white hover:bg-red-50 active:bg-red-100 text-red-700 font-black text-xl rounded-2xl shadow-md border border-red-950/20 flex items-center justify-between transition-all active:scale-[0.99]"
            aria-label="Call National Emergency 112"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-red-700 text-white flex items-center justify-center shrink-0 shadow-sm">
                <PhoneCall className="w-6 h-6 stroke-[2.5]" aria-hidden="true" />
              </div>
              <div className="text-left leading-tight">
                <span className="block text-2xl font-black">CALL 112</span>
                <span className="block text-xs font-bold text-slate-700">
                  Ambulance & Police (All India 24/7)
                </span>
              </div>
            </div>
            <span className="text-xs font-black uppercase bg-red-700 text-white px-2.5 py-1 rounded-xl shadow-xs">
              FREE
            </span>
          </a>

          {/* National Poison Centre (AIIMS) */}
          <a
            href="tel:1800116117"
            className="w-full min-h-[52px] py-2.5 px-3.5 bg-red-950/80 hover:bg-red-950 text-white font-black text-base rounded-2xl shadow-sm border border-red-500/30 flex items-center justify-between transition-all active:scale-[0.99]"
            aria-label="Call National Poisons Information Centre"
          >
            <div className="flex items-center gap-2.5">
              <PhoneCall className="w-5 h-5 text-amber-300 shrink-0 stroke-[2.5]" aria-hidden="true" />
              <div className="text-left leading-tight">
                <span className="block text-base font-black">Poison Centre: 1800-116-117</span>
                <span className="block text-xs font-semibold text-red-200">
                  National Poisons Info Centre (AIIMS)
                </span>
              </div>
            </div>
            <span className="text-xs font-black text-amber-300 underline">CALL</span>
          </a>

          {/* Kisan Call Centre */}
          <a
            href="tel:18001801551"
            className="w-full min-h-[48px] py-2 px-3.5 bg-red-950/50 hover:bg-red-950 text-white font-bold text-sm rounded-2xl border border-red-500/20 flex items-center justify-between transition-all active:scale-[0.99]"
            aria-label="Call Kisan Call Centre"
          >
            <div className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-emerald-300 shrink-0 stroke-[2.5]" aria-hidden="true" />
              <span>Kisan Helpline: 1800-180-1551</span>
            </div>
            <span className="text-xs font-black text-emerald-300 underline">CALL</span>
          </a>
        </div>
      </div>

      {/* QUESTION: "What happened?" */}
      <div className="pt-1">
        <h1 className="text-2xl font-black text-slate-950 tracking-tight leading-tight">
          What happened?
        </h1>
        <p className="text-sm text-slate-700 font-semibold mt-0.5">
          Choose the situation below for immediate step-by-step first aid:
        </p>
      </div>

      {/* 4 VERY LARGE BUTTONS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {incidentButtons.map((btn) => {
          const Icon = btn.icon;
          const isSelected = selectedIncident === btn.key;
          return (
            <button
              key={btn.key}
              type="button"
              onClick={() => setSelectedIncident(btn.key)}
              className={`min-h-[72px] p-4.5 rounded-3xl border text-left transition-all shadow-[0_6px_20px_rgba(0,0,0,0.05)] flex items-center gap-3.5 cursor-pointer active:scale-[0.99] ${
                isSelected
                  ? 'ring-4 ring-red-500 border-red-800 bg-red-100/90'
                  : `${btn.bg}`
              }`}
              aria-pressed={isSelected}
            >
              <div
                className={`w-12 h-12 rounded-2xl ${btn.iconBg} flex items-center justify-center shrink-0 shadow-sm`}
                aria-hidden="true"
              >
                <Icon className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <span className="block text-xl font-black leading-tight tracking-tight">
                  {btn.title}
                </span>
                <span className="block text-xs font-semibold opacity-85 mt-0.5 line-clamp-1">
                  {btn.subtitle}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* FIRST AID STEPS DISPLAY (When an incident is selected) */}
      {selectedIncident && (
        <div className="bg-white border border-red-600/30 rounded-3xl p-5 shadow-[0_12px_36px_rgba(220,38,38,0.12)] space-y-4 animate-in fade-in duration-200">
          {/* Header of selected incident */}
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3.5">
            <div>
              <span className="text-xs uppercase font-black text-red-700 tracking-wider">
                Immediate Action Steps
              </span>
              <h2 className="text-2xl font-black text-slate-950 leading-tight tracking-tight">
                {incidents[selectedIncident].title[locale as 'en' | 'te' | 'hi'] ||
                  incidents[selectedIncident].title.en}
              </h2>
            </div>

            {/* Listen Button Component with Voice Detection and Speed Options */}
            <ListenButton
              text={incidents[selectedIncident].steps
                .map((s, idx) => `${idx + 1}. ${(s as any)[locale] || s.en}`)
                .join('. ')}
            />
          </div>

          {/* Large Numbered Steps */}
          <ol className="space-y-3">
            {incidents[selectedIncident].steps.map((step, idx) => {
              const text = (step as any)[locale] || step.en;
              return (
                <li
                  key={idx}
                  className="flex items-start gap-3.5 p-4 bg-red-50/70 border border-red-200/80 rounded-2xl"
                >
                  <span className="w-8 h-8 rounded-full bg-red-700 text-white font-black text-base flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    {idx + 1}
                  </span>
                  <p className="text-base font-black text-slate-950 leading-snug">
                    {text}
                  </p>
                </li>
              );
            })}
          </ol>

          {/* Urgent Reminder Notice */}
          <div className="p-3 bg-amber-100 border-2 border-amber-600 rounded-xl flex items-start gap-2.5 text-amber-950">
            <AlertTriangle className="w-6 h-6 text-amber-800 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-sm font-black leading-tight">
              IMPORTANT: Take the pesticide container or label with you to the doctor or hospital so they know the exact chemical!
            </div>
          </div>

          {/* Quick Clear / Choose another */}
          <button
            type="button"
            onClick={() => setSelectedIncident(null)}
            className="w-full min-h-[48px] py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-base rounded-xl border border-slate-300 flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>Choose different situation</span>
          </button>
        </div>
      )}
    </div>
  );
}
