import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KisanDrishti — Crop Doctor',
    short_name: 'KisanDrishti',
    description:
      'AI crop disease diagnosis, verified safe treatments, spray weather checks, and farm guidance for small farmers.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#047857',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}

