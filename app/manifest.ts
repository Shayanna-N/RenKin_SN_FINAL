import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Renkin',
    short_name: 'Renkin',
    description: 'Agent-powered contactless networking',
    start_url: '/',
    display: 'standalone',
    background_color: '#faf9f6',
    theme_color: '#0f766e',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  }
}
