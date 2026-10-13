'use client';

import React from 'react';
import { Info } from 'lucide-react';
import { useI18n } from '../lib/i18n';

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="mt-auto px-4 py-6 bg-amber-50 border-t border-amber-200">
      <div className="max-w-md mx-auto flex items-start gap-2.5 text-amber-950">
        <Info className="w-5 h-5 shrink-0 mt-0.5 text-amber-800" aria-hidden="true" />
        <p className="text-xs leading-relaxed font-medium">
          {t('disclaimer')}
        </p>
      </div>
    </footer>
  );
}
