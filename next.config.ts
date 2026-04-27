import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Flows públicos: permitir embed en cualquier origen.
        // Nota: no usamos X-Frame-Options aquí; CSP es la fuente de verdad.
        source: '/f/:flowId*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: 'frame-ancestors *',
          },
        ],
      },
      {
        // embed.js: caché en CDN para no descargarse en cada visita.
        source: '/embed.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
    ]
  },
}

export default nextConfig
