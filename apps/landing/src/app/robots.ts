import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_LANDING_URL ?? 'https://insightstream.ai'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
