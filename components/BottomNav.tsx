'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Stethoscope, Layers, CloudSun, Landmark } from 'lucide-react';
import { useI18n } from '../lib/i18n';

export function BottomNav() {
  const { t } = useI18n();
  const pathname = usePathname();

  const navItems = [
    {
      href: '/doctor',
      label: t('nav.doctor'),
      icon: Stethoscope,
    },
    {
      href: '/soil',
      label: t('nav.soil'),
      icon: Layers,
    },
    {
      href: '/weather',
      label: t('nav.weather'),
      icon: CloudSun,
    },
    {
      href: '/schemes',
      label: t('nav.schemes'),
      icon: Landmark,
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-emerald-950/10 shadow-[0_-10px_30px_rgba(6,78,59,0.08)] rounded-t-3xl"
      aria-label="Main Navigation"
    >
      <div className="max-w-md mx-auto grid grid-cols-4 items-center px-1.5 py-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || (item.href === '/weather' && pathname === '/satellite');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`min-h-[52px] py-1.5 px-1 flex flex-col items-center justify-center text-center rounded-2xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-700 ${
                isActive
                  ? 'bg-emerald-900 text-white shadow-sm'
                  : 'text-slate-700 font-bold hover:text-emerald-950 hover:bg-emerald-50/60'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className={`w-5 h-5 mb-0.5 shrink-0 transition-transform ${
                  isActive ? 'text-emerald-300 stroke-[2.5] scale-105' : 'text-slate-600 stroke-[2]'
                }`}
                aria-hidden="true"
              />
              <span className={`text-[11px] leading-tight tracking-tight line-clamp-1 ${
                isActive ? 'font-black text-white' : 'font-semibold text-slate-700'
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
