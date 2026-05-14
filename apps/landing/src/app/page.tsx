import { Nav } from '@/components/sections/Nav'
import { Hero } from '@/components/sections/Hero'
import { Problem } from '@/components/sections/Problem'
import { Solution } from '@/components/sections/Solution'
import { Features } from '@/components/sections/Features'
import { QuizCta } from '@/components/sections/QuizCta'
import { Pricing } from '@/components/sections/Pricing'
import { Testimonials } from '@/components/sections/Testimonials'
import { Footer } from '@/components/sections/Footer'

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'InsightStream AI',
  applicationCategory: 'BusinessApplication',
  description:
    'AI-powered feedback analytics platform. Collect user feedback with an embeddable widget, analyze with AI, get weekly digests.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Free plan available. Paid plans from $9/month.',
  },
  operatingSystem: 'Web',
}

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Nav />
      <main>
        <Hero />
        <Problem />
        <Solution />
        <Features />
        <QuizCta />
        <Pricing />
        <Testimonials />
      </main>
      <Footer />
    </>
  )
}
