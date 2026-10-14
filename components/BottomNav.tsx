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
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-gray-300 shadow-lg"
      aria-label="Main Navigation"
    >
      <div className="max-w-md mx-auto grid grid-cols-4 items-center">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || (item.href === '/weather' && pathname === '/satellite');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`min-h-[56px] py-1.5 px-1 flex flex-col items-center justify-center text-center transition-colors focus:outline-none focus:bg-emerald-50 ${
                isActive
                  ? 'text-emerald-900 font-extrabold border-t-4 border-emerald-700 bg-emerald-50/70'
                  : 'text-gray-700 font-medium hover:text-emerald-800 hover:bg-gray-100'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className={`w-5 h-5 mb-0.5 shrink-0 ${
                  isActive ? 'text-emerald-800 stroke-[2.5]' : 'text-gray-600'
                }`}
                aria-hidden="true"
              />
              <span className="text-xs leading-tight tracking-tight line-clamp-1">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
