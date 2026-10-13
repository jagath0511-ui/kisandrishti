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
    <header className="sticky top-0 z-50 bg-emerald-800 text-white shadow-md border-b-2 border-emerald-950">
      <div className="max-w-md mx-auto px-3 py-2 flex items-center justify-between gap-2">
        {/* App Title & Logo */}
        <Link
          href="/"
          className="flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-white rounded-md p-1 min-h-[48px]"
          aria-label="KisanDrishti Home"
        >
          <div className="bg-white p-1 rounded-full text-emerald-800">
            <Sprout className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="leading-tight">
            <span className="font-extrabold text-lg tracking-tight block">
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
            <div className="flex items-center bg-emerald-900 border border-emerald-700 rounded-lg px-2 min-h-[48px] focus-within:ring-2 focus-within:ring-white">
              <Globe className="w-4 h-4 text-emerald-200 mr-1 shrink-0" aria-hidden="true" />
              <select
                id="language-select"
                value={locale}
                onChange={(e) => setLocale(e.target.value as SupportedLocale)}
                className="bg-transparent text-white font-medium text-sm focus:outline-none cursor-pointer py-2 pr-1"
                aria-label="Change language"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className="text-gray-900 bg-white">
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
            className={`min-h-[48px] px-3 py-2 rounded-lg font-bold text-sm flex items-center gap-1.5 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-white border-2 ${
              isEmergencyPage
                ? 'bg-red-800 text-white border-white ring-2 ring-red-400'
                : 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white border-red-900'
            }`}
            aria-label={t('emergencyAria')}
          >
            <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>{t('emergency')}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
