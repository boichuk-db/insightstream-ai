'use client'

import { useFeatureFlagVariantKey } from 'posthog-js/react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { APP_URL } from '@/lib/constants'

const HEADLINES = {
  control: 'Turn every feedback into actionable insights.',
  test: 'Stop guessing. Start knowing. AI feedback analytics for B2B teams.',
} as const

const CTA_TEXT = {
  control: 'Start Free',
  'variant-b': 'Try for Free — No Card Needed',
} as const

export function Hero() {
  const headlineVariant = useFeatureFlagVariantKey('landing-hero-headline')
  const ctaVariant = useFeatureFlagVariantKey('landing-hero-cta')

  const headline = headlineVariant === 'test' ? HEADLINES.test : HEADLINES.control
  const ctaText = ctaVariant === 'variant-b' ? CTA_TEXT['variant-b'] : CTA_TEXT.control

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 px-6 overflow-hidden">
      <style>{`
        @keyframes blob-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.07; }
          50% { transform: translate(-50%, -50%) scale(1.15); opacity: 0.13; }
        }
        @keyframes blob-pulse-2 {
          0%, 100% { transform: scale(1); opacity: 0.04; }
          50% { transform: scale(1.25); opacity: 0.09; }
        }
      `}</style>

      {/* Layer 1: dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(61,138,132,0.18) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Layer 2: SVG noise grain */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.035]" aria-hidden="true">
        <filter id="hero-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#hero-noise)" />
      </svg>

      {/* Layer 3: radial fade to hide grid edges */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,transparent_30%,#090c0c_100%)]" />

      {/* Layer 4: primary animated blob */}
      <div
        className="absolute top-1/3 left-1/2 w-[700px] h-[500px] bg-brand-primary rounded-full blur-[120px] pointer-events-none"
        style={{ animation: 'blob-pulse 8s ease-in-out infinite' }}
      />
      {/* Layer 5: secondary animated blob */}
      <div
        className="absolute bottom-1/4 left-1/4 w-[400px] h-[300px] bg-brand-accent rounded-full blur-[100px] pointer-events-none"
        style={{ animation: 'blob-pulse-2 6s ease-in-out infinite' }}
      />

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-primary/10 border border-brand-primary/20 rounded-full text-brand-accent text-xs font-semibold mb-8"
        >
          ✨ AI-Powered Feedback Analytics
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight mb-6"
        >
          {headline}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10"
        >
          Collect feedback with an embeddable widget, analyze it with AI, and get
          weekly digests that turn noise into decisions.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href={`${APP_URL}/auth/register`}
            className="px-8 py-4 bg-brand-primary hover:bg-brand-primary/90 text-white font-bold rounded-xl transition-colors text-lg flex items-center gap-2"
          >
            {ctaText} <ArrowRight className="h-5 w-5" />
          </a>
          <Link
            href="/quiz"
            className="px-8 py-4 border border-brand-border hover:border-zinc-500 text-zinc-300 font-semibold rounded-xl transition-colors text-lg"
          >
            Find my plan →
          </Link>
        </motion.div>

        {/* Code-drawn dashboard mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16 rounded-2xl border border-brand-border bg-zinc-900 overflow-hidden shadow-2xl"
        >
          {/* Browser chrome */}
          <div className="h-8 bg-zinc-800 flex items-center gap-1.5 px-4 border-b border-brand-border">
            <div className="w-3 h-3 rounded-full bg-zinc-600" />
            <div className="w-3 h-3 rounded-full bg-zinc-600" />
            <div className="w-3 h-3 rounded-full bg-zinc-600" />
            <div className="mx-auto text-xs text-zinc-600 bg-zinc-700/50 rounded px-3 py-0.5">
              dashboard
            </div>
          </div>
          {/* Dashboard layout */}
          <div className="flex h-72">
            {/* Sidebar */}
            <div className="w-44 bg-zinc-900 border-r border-brand-border p-3 flex flex-col gap-1 shrink-0">
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-2 mb-2">
                Projects
              </div>
              {['Mobile App', 'Web Dashboard', 'API Docs'].map((name, i) => (
                <div
                  key={name}
                  className={`text-xs px-2 py-1.5 rounded-md ${
                    i === 0
                      ? 'bg-brand-primary/20 text-brand-accent font-medium'
                      : 'text-zinc-500'
                  }`}
                >
                  {name}
                </div>
              ))}
            </div>
            {/* Main content */}
            <div className="flex-1 p-4 flex flex-col gap-3 overflow-hidden">
              {/* Metrics row */}
              <div className="flex gap-3">
                {[
                  { label: 'Total Feedback', value: '1,284' },
                  { label: 'Avg Sentiment', value: '4.2 / 5' },
                  { label: 'This Week', value: '+48' },
                ].map((metric) => (
                  <div key={metric.label} className="flex-1 bg-zinc-800 rounded-lg px-3 py-2 min-w-0">
                    <div className="text-xs text-zinc-500 truncate">{metric.label}</div>
                    <div className="text-sm font-bold text-zinc-200">{metric.value}</div>
                  </div>
                ))}
              </div>
              {/* Kanban columns */}
              <div className="flex gap-3 flex-1 overflow-hidden">
                {[
                  { col: 'New', count: 3, color: 'bg-blue-500/20 text-blue-400' },
                  { col: 'In Review', count: 2, color: 'bg-yellow-500/20 text-yellow-400' },
                  { col: 'Done', count: 4, color: 'bg-emerald-500/20 text-emerald-400' },
                ].map(({ col, count, color }) => (
                  <div
                    key={col}
                    className="flex-1 bg-zinc-800/50 rounded-lg p-2 flex flex-col gap-2 min-w-0"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-zinc-400">{col}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${color}`}>
                        {count}
                      </span>
                    </div>
                    {Array.from({ length: Math.min(count, 2) }).map((_, i) => (
                      <div key={i} className="bg-zinc-700/60 rounded p-2">
                        <div className="h-1.5 bg-zinc-600 rounded w-3/4 mb-1" />
                        <div className="h-1.5 bg-zinc-600/50 rounded w-1/2" />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
