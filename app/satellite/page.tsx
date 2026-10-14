'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const KisanSatelliteWeatherHub = dynamic(
  () => import('../../components/KisanSatelliteWeatherHub'),
  {
    ssr: false,
    loading: () => (
      <div className="p-8 text-center text-emerald-950 font-bold">
        <div className="w-10 h-10 mx-auto mb-3 border-4 border-emerald-300 border-t-emerald-700 rounded-full animate-spin" />
        <p className="text-sm">Loading Satellite Sky Hub...</p>
      </div>
    ),
  }
);

export default function SatellitePage() {
  return (
    <div className="w-full">
      <KisanSatelliteWeatherHub />
    </div>
  );
}
