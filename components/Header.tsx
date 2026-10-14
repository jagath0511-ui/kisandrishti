'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertCircle, Globe, Sprout } from 'lucide-react';
import { LANGUAGES, SupportedLocale, useI18n } from '../lib/i18n';
import { AuthButton } from './AuthButton';

export function Header() {
  const { locale, setLocale, t } = useI18n();
  const pathname = usePathname();
  const isEmergencyPage = pathname === '/emergency';

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white shadow-[0_4px_25px_rgba(6,78,59,0.20)] border-b border-emerald-800/30 backdrop-blur-md">
      <div className="max-w-md mx-auto px-3.5 py-2.5 flex items-center justify-between gap-2">
        {/* App Title & Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded-2xl p-1 min-h-[48px] transition-transform active:scale-95"
          aria-label="KisanDrishti Home"
        >
          <div className="w-9 h-9 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center text-emerald-300 shadow-inner">
            <Sprout className="w-5 h-5 stroke-[2.5]" aria-hidden="true" />
          </div>
          <div className="leading-tight">
            <span className="font-black text-xl tracking-tight text-white block drop-shadow-xs">
              {t('appName')}
            </span>
          </div>
        </Link>

        {/* Right side controls: Language switcher + Emergency button */}
        <div className="flex items-center gap-1.5">
          {/* Language Switcher */}
          <div className="relative flex items-center">
            <label htmlFor="language-select" className="sr-only">
              Select Language
            </label>
            <div className="flex items-center bg-emerald-950/70 border border-emerald-700/60 rounded-xl px-2 min-h-[48px] focus-within:ring-2 focus-within:ring-emerald-400 shadow-inner">
              <Globe className="w-4 h-4 text-emerald-300 mr-1 shrink-0" aria-hidden="true" />
              <select
                id="language-select"
                value={locale}
                onChange={(e) => setLocale(e.target.value as SupportedLocale)}
                className="bg-transparent text-white font-bold text-sm focus:outline-none cursor-pointer py-2 pr-1"
                aria-label="Change language"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className="text-gray-900 bg-white font-medium">
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* User Profile / Login */}
          <AuthButton />

          {/* Red Emergency Button (Section 8: Never color alone -> Color + Word + Icon) */}
          <Link
            href="/emergency"
            className={`min-h-[48px] px-3.5 py-2 rounded-xl font-black text-sm flex items-center gap-1.5 transition-all shadow-[0_4px_14px_rgba(220,38,38,0.35)] focus:outline-none focus:ring-2 focus:ring-white border ${
              isEmergencyPage
                ? 'bg-red-800 text-white border-white ring-2 ring-red-400'
                : 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white border-red-500/40 active:scale-95'
            }`}
            aria-label={t('emergencyAria')}
          >
            <AlertCircle className="w-5 h-5 shrink-0 stroke-[2.5]" aria-hidden="true" />
            <span className="tracking-tight">{t('emergency')}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
