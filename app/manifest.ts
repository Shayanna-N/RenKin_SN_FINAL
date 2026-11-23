import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RenKin',
    short_name: 'RenKin',
    description: 'Agent-powered contactless networking',
    start_url: '/',
    display: 'standalone',
    background_color: '#faf9f6',
    theme_color: '#0f766e',
    icons: [
    { src: '/brand/rk-primary-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/brand/rk-primary-512.png', sizes: '512x512', type: 'image/png' },
  ],
  }
}
