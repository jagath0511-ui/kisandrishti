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
      iconGradient: 'from-emerald-600 to-emerald-800',
      iconShadow: 'shadow-[0_4px_12px_rgba(5,150,105,0.3)]',
      borderAccent: 'group-hover:border-emerald-600/40',
      pillBg: 'bg-emerald-50 text-emerald-900',
    },
    {
      href: '/soil',
      title: t('home.soilTitle'),
      desc: t('home.soilDesc'),
      icon: Layers,
      iconGradient: 'from-amber-600 to-amber-800',
      iconShadow: 'shadow-[0_4px_12px_rgba(217,119,6,0.3)]',
      borderAccent: 'group-hover:border-amber-600/40',
      pillBg: 'bg-amber-50 text-amber-900',
    },
    {
      href: '/weather',
      title: t('home.weatherTitle'),
      desc: t('home.weatherDesc'),
      icon: CloudSun,
      iconGradient: 'from-sky-600 to-sky-800',
      iconShadow: 'shadow-[0_4px_12px_rgba(2,132,199,0.3)]',
      borderAccent: 'group-hover:border-sky-600/40',
      pillBg: 'bg-sky-50 text-sky-900',
    },
    {
      href: '/schemes',
      title: t('home.schemesTitle'),
      desc: t('home.schemesDesc'),
      icon: Landmark,
      iconGradient: 'from-indigo-600 to-indigo-800',
      iconShadow: 'shadow-[0_4px_12px_rgba(79,70,229,0.3)]',
      borderAccent: 'group-hover:border-indigo-600/40',
      pillBg: 'bg-indigo-50 text-indigo-900',
    },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Title greeting */}
      <div className="pt-1 px-0.5">
        <h1 className="text-2xl font-black text-slate-950 tracking-tight">
          {t('homeTitle')}
        </h1>
        <p className="text-sm text-slate-700 font-semibold mt-0.5">
          {t('appSubtitle')}
        </p>
      </div>

      {/* Featured: Satellite Sky Hub & Land Passbook Scanner */}
      <Link
        href="/satellite"
        className="block w-full p-5 rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 text-white shadow-[0_14px_35px_rgba(6,78,59,0.22)] transition-all duration-200 hover:shadow-[0_18px_45px_rgba(6,78,59,0.28)] hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-emerald-400 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-3 opacity-15">
          <Satellite className="w-24 h-24" />
        </div>
        <div className="relative z-10 space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-400 text-emerald-950 flex items-center gap-1 shadow-xs">
              <Sparkles className="w-3.5 h-3.5" />
              {locale === 'te' ? 'కొత్త ఫీచర్' : locale === 'hi' ? 'नई सुविधा' : 'NEW FEATURE'}
            </span>
            <span className="text-xs font-bold text-emerald-200">
              {locale === 'te' ? 'మీ భూమి హద్దులు & శాటిలైట్' : locale === 'hi' ? 'खेत सीमा व सैटेलाइट' : 'Farm Boundaries & Satellite'}
            </span>
          </div>

          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-white leading-tight tracking-tight">
                {locale === 'te'
                  ? '🛰️ ఉపగ్రహ స్కై హబ్ & పట్టాదారు పాస్‌బుక్ స్కానర్'
                  : locale === 'hi'
                  ? '🛰️ उपग्रह स्काई हब व पट्टा पासबुक स्कैनर'
                  : '🛰️ Satellite Sky Hub & Land Passbook Scanner'}
              </h2>
              <p className="text-sm text-emerald-100/90 font-semibold leading-relaxed mt-1.5">
                {locale === 'te'
                  ? 'మీ పొలం 3 లెన్స్‌ల ఉపగ్రహ నిఘా, నీటి అవసరం, 10 రోజుల క్రితం vs నేటి ఆరోగ్య మచ్చలు, మరియు షాప్‌కీపర్ షీల్డ్'
                  : locale === 'hi'
                  ? '3-लेंस सैटेलाइट निगरानी, पानी की आवश्यकता, 10 दिन पहले vs आज के बीमार पैच व दुकानदार शील्ड'
                  : '3-Lens field view, 5HP motor hours, 10-day sick patch progression & Shopkeeper Shield.'}
              </p>
            </div>
            <div className="p-2.5 bg-white/10 backdrop-blur-xs border border-white/20 rounded-2xl shrink-0 mt-1 shadow-inner">
              <ChevronRight className="w-6 h-6 text-emerald-300 stroke-[2.5]" />
            </div>
          </div>
        </div>
      </Link>

      {/* 4 Large Action Bento Cards */}
      <div className="space-y-3.5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className={`group block w-full p-4.5 bg-white rounded-3xl border border-emerald-950/10 shadow-[0_10px_30px_rgba(6,78,59,0.08)] hover:shadow-[0_16px_36px_rgba(6,78,59,0.12)] transition-all duration-200 active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-emerald-500`}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${card.iconGradient} ${card.iconShadow} flex items-center justify-center text-white shrink-0`}
                  aria-hidden="true"
                >
                  <Icon className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h2 className="text-lg font-black text-slate-950 leading-snug tracking-tight">
                      {card.title}
                    </h2>
                    <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-emerald-100 group-hover:text-emerald-900 flex items-center justify-center text-slate-400 transition-colors shrink-0">
                      <ChevronRight className="w-5 h-5 stroke-[2.5]" aria-hidden="true" />
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 leading-normal font-semibold mt-0.5 line-clamp-2">
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
