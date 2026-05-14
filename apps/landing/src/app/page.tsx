import { Nav } from '@/components/sections/Nav'
import { Hero } from '@/components/sections/Hero'
import { Problem } from '@/components/sections/Problem'
import { Solution } from '@/components/sections/Solution'
import { Features } from '@/components/sections/Features'
import { QuizCta } from '@/components/sections/QuizCta'
import { Pricing } from '@/components/sections/Pricing'
import { Testimonials } from '@/components/sections/Testimonials'
import { Footer } from '@/components/sections/Footer'

export default function LandingPage() {
  return (
    <>
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
