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

export function Hero() {
  const variant = useFeatureFlagVariantKey('landing-hero-headline')
  const headline = variant === 'test' ? HEADLINES.test : HEADLINES.control

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 px-6 overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-semibold mb-8"
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
            href={`${APP_URL}/`}
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors text-lg flex items-center gap-2"
          >
            Start Free <ArrowRight className="h-5 w-5" />
          </a>
          <Link
            href="/quiz"
            className="px-8 py-4 border border-brand-border hover:border-zinc-500 text-zinc-300 font-semibold rounded-xl transition-colors text-lg"
          >
            Find my plan →
          </Link>
        </motion.div>

        {/* Dashboard placeholder screenshot */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16 rounded-2xl border border-brand-border bg-zinc-900 overflow-hidden shadow-2xl"
        >
          <div className="h-8 bg-zinc-800 flex items-center gap-1.5 px-4">
            <div className="w-3 h-3 rounded-full bg-zinc-600" />
            <div className="w-3 h-3 rounded-full bg-zinc-600" />
            <div className="w-3 h-3 rounded-full bg-zinc-600" />
            <div className="mx-auto text-xs text-zinc-600">app.insightstream.ai/dashboard</div>
          </div>
          <div className="h-80 flex items-center justify-center text-zinc-700 text-sm">
            Dashboard screenshot placeholder
          </div>
        </motion.div>
      </div>
    </section>
  )
}
