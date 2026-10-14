'use client';

import React from 'react';
import Link from 'next/link';
import { Stethoscope, Layers, CloudSun, Landmark, ChevronRight, Satellite, Sparkles } from 'lucide-react';
import { useI18n } from '../lib/i18n';

export default function HomePage() {
  const { t, locale } = useI18n();

  const cards = [
    {
      href: '/doctor',
      title: t('home.doctorTitle'),
      desc: t('home.doctorDesc'),
      icon: Stethoscope,
      bg: 'bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200',
      border: 'border-emerald-700',
      iconBg: 'bg-emerald-700 text-white',
      badge: 'border-emerald-600 text-emerald-900',
    },
    {
      href: '/soil',
      title: t('home.soilTitle'),
      desc: t('home.soilDesc'),
      icon: Layers,
      bg: 'bg-amber-50 hover:bg-amber-100 active:bg-amber-200',
      border: 'border-amber-700',
      iconBg: 'bg-amber-700 text-white',
      badge: 'border-amber-600 text-amber-900',
    },
    {
      href: '/weather',
      title: t('home.weatherTitle'),
      desc: t('home.weatherDesc'),
      icon: CloudSun,
      bg: 'bg-sky-50 hover:bg-sky-100 active:bg-sky-200',
      border: 'border-sky-700',
      iconBg: 'bg-sky-700 text-white',
      badge: 'border-sky-600 text-sky-900',
    },
    {
      href: '/schemes',
      title: t('home.schemesTitle'),
      desc: t('home.schemesDesc'),
      icon: Landmark,
      bg: 'bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200',
      border: 'border-indigo-700',
      iconBg: 'bg-indigo-700 text-white',
      badge: 'border-indigo-600 text-indigo-900',
    },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Title greeting */}
      <div className="pt-1">
        <h1 className="text-xl font-black text-slate-900 tracking-tight">
          {t('homeTitle')}
        </h1>
        <p className="text-base text-slate-700 font-medium">
          {t('appSubtitle')}
        </p>
      </div>

      {/* Featured: Satellite Sky Hub & Land Passbook Scanner */}
      <Link
        href="/satellite"
        className="block w-full p-4.5 rounded-2xl border-2 border-emerald-600 bg-gradient-to-br from-emerald-900 to-teal-950 text-white shadow-lg transition-all focus:outline-none focus:ring-4 focus:ring-emerald-400 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-3 opacity-15">
          <Satellite className="w-24 h-24" />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-400 text-emerald-950 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              {locale === 'te' ? 'కొత్త ఫీచర్' : locale === 'hi' ? 'नई सुविधा' : 'NEW FEATURE'}
            </span>
            <span className="text-xs font-semibold text-emerald-200">
              {locale === 'te' ? 'మీ భూమి హద్దులు & శాటిలైట్' : locale === 'hi' ? 'खेत सीमा व सैटेलाइट' : 'Farm Boundaries & Satellite'}
            </span>
          </div>

          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-white leading-tight">
                {locale === 'te'
                  ? '🛰️ ఉపగ్రహ స్కై హబ్ & పట్టాదారు పాస్‌బుక్ స్కానర్'
                  : locale === 'hi'
                  ? '🛰️ उपग्रह स्काई हब व पट्टा पासबुक स्कैनर'
                  : '🛰️ Satellite Sky Hub & Land Passbook Scanner'}
              </h2>
              <p className="text-sm text-emerald-100 font-medium leading-relaxed mt-1">
                {locale === 'te'
                  ? 'మీ పొలం 3 లెన్స్‌ల ఉపగ్రహ నిఘా, నీటి అవసరం, 10 రోజుల క్రితం vs నేటి ఆరోగ్య మచ్చలు, మరియు షాప్‌కీపర్ షీల్డ్'
                  : locale === 'hi'
                  ? '3-लेंस सैटेलाइट निगरानी, पानी की आवश्यकता, 10 दिन पहले vs आज के बीमार पैच व दुकानदार शील्ड'
                  : '3-Lens field view, 5HP motor hours, 10-day sick patch progression & Shopkeeper Shield.'}
              </p>
            </div>
            <div className="p-2.5 bg-emerald-500/20 border border-emerald-400/40 rounded-xl shrink-0 mt-1">
              <ChevronRight className="w-6 h-6 text-emerald-300" />
            </div>
          </div>
        </div>
      </Link>

      {/* 4 Large Action Cards */}
      <div className="space-y-3.5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className={`block w-full p-4 rounded-xl border-2 ${card.border} ${card.bg} shadow-sm transition-all focus:outline-none focus:ring-4 focus:ring-emerald-500`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`p-3 rounded-lg ${card.iconBg} shrink-0 mt-0.5 shadow-sm`}
                  aria-hidden="true"
                >
                  <Icon className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h2 className="text-lg font-black text-slate-950 leading-snug">
                      {card.title}
                    </h2>
                    <ChevronRight className="w-5 h-5 text-slate-700 shrink-0" aria-hidden="true" />
                  </div>
                  <p className="text-base text-slate-800 leading-normal font-medium mt-1">
                    {card.desc}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
