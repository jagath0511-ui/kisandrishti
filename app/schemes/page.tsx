'use client';

import React from 'react';
import Link from 'next/link';
import {
  Landmark,
  ArrowLeft,
  ExternalLink,
  AlertCircle,
  HelpCircle,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { useI18n, SupportedLocale } from '../../lib/i18n';
import { ListenButton } from '../../components/ListenButton';
import schemesData from '../../data/schemes.json';

interface LocalizedText {
  en: string;
  te: string;
  hi: string;
}

interface SchemeItem {
  id: string;
  name: LocalizedText;
  one_line: LocalizedText;
  official_url: string;
  last_checked: string;
}

const schemes = schemesData as SchemeItem[];

function getLocalized(text: LocalizedText, loc: SupportedLocale): string {
  return text[loc] || text.en;
}

export default function SchemesPage() {
  const { t, locale } = useI18n();

  // Spoken summary for ListenButton
  const getSpeechSummary = (): string => {
    const title = t('schemes.title');
    const notice = t('schemes.topNotice');
    const list = schemes
      .map((s) => `${getLocalized(s.name, locale)}: ${getLocalized(s.one_line, locale)}`)
      .join('. ');

    return `${title}. ${notice}. ${list}`;
  };

  return (
    <div className="p-4 space-y-5 pb-12 max-w-lg mx-auto">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 min-h-[48px] px-3 py-2 text-base font-bold text-indigo-950 bg-indigo-100 hover:bg-indigo-200 rounded-lg border border-indigo-300"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          <span>{locale === 'te' ? 'హోమ్' : locale === 'hi' ? 'होम' : 'Home'}</span>
        </Link>
        <ListenButton text={getSpeechSummary()} />
      </div>

      {/* Page Title Card */}
      <div className="p-4 bg-indigo-50 border-2 border-indigo-700 rounded-2xl space-y-1 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-700 text-white flex items-center justify-center flex-shrink-0">
            <Landmark className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-black text-indigo-950 leading-tight">
              {t('schemes.title')}
            </h1>
            <p className="text-xs text-indigo-800 font-medium">
              {t('schemes.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Mandatory Top Notice Banner */}
      <div className="p-3.5 bg-amber-50 border-2 border-amber-500 rounded-xl flex items-start gap-3 shadow-sm">
        <AlertCircle className="w-5 h-5 text-amber-800 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-sm font-bold text-amber-950 leading-snug">
          {t('schemes.topNotice')}
        </p>
      </div>

      {/* Schemes Cards List */}
      <div className="space-y-4">
        {schemes.map((scheme) => {
          const isUrlVerified =
            scheme.official_url &&
            scheme.official_url !== 'TODO_VERIFY' &&
            scheme.official_url.startsWith('http');

          const isDateVerified =
            scheme.last_checked && scheme.last_checked !== 'TODO_VERIFY';

          return (
            <div
              key={scheme.id}
              className="p-5 bg-white border-2 border-stone-300 rounded-2xl space-y-3.5 shadow-sm hover:border-indigo-400 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-black text-stone-950 leading-snug">
                  {getLocalized(scheme.name, locale)}
                </h2>
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center flex-shrink-0">
                  <Landmark className="w-4 h-4" aria-hidden="true" />
                </div>
              </div>

              {/* Exactly ONE plain sentence description */}
              <p className="text-sm font-medium text-stone-800 leading-relaxed">
                {getLocalized(scheme.one_line, locale)}
              </p>

              {/* Action Button or Unverified Notice */}
              <div className="pt-2 border-t border-stone-200 flex flex-col gap-2.5">
                {isUrlVerified ? (
                  <a
                    href={scheme.official_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full min-h-[48px] px-4 py-3 bg-indigo-700 hover:bg-indigo-800 active:bg-indigo-900 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow"
                  >
                    <span>{t('schemes.openOfficial')}</span>
                    <ExternalLink className="w-4 h-4" aria-hidden="true" />
                  </a>
                ) : (
                  <div className="p-3 bg-stone-100 border border-stone-300 rounded-xl flex items-center justify-between text-xs font-bold text-stone-800">
                    <span className="flex items-center gap-1.5 text-stone-700">
                      <HelpCircle className="w-4 h-4 text-stone-500" aria-hidden="true" />
                      <span>{t('schemes.askOffice')}</span>
                    </span>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-950 rounded text-[10px] uppercase font-black">
                      Official portal pending
                    </span>
                  </div>
                )}

                {/* Last Checked Date Display */}
                <div className="flex items-center gap-1.5 text-xs font-medium text-stone-500">
                  <Calendar className="w-3.5 h-3.5 text-stone-400" aria-hidden="true" />
                  {isDateVerified ? (
                    <span>
                      {t('schemes.lastChecked')}: {scheme.last_checked}
                    </span>
                  ) : (
                    <span className="italic text-stone-500">
                      {t('schemes.verificationPending')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
