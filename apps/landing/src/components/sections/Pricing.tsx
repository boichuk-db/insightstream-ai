'use client'

import { motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { PLAN_CONFIGS, PlanType } from '@/config/plans.config'
import { APP_URL } from '@/lib/constants'

const PLAN_ORDER = [PlanType.FREE, PlanType.PRO, PlanType.BUSINESS] as const

const FEATURES = [
  { key: 'maxProjects', label: 'Projects' },
  { key: 'maxFeedbacksPerMonth', label: 'Feedbacks/month' },
  { key: 'aiAnalysis', label: 'AI Analysis' },
  { key: 'weeklyDigest', label: 'Weekly Digest' },
  { key: 'dataExport', label: 'CSV Export' },
] as const

function formatValue(key: string, value: unknown): string | boolean {
  if (typeof value === 'boolean') return value
  if (value === Infinity || value === null) return 'Unlimited'
  if (typeof value === 'number') return String(value)
  if (key === 'aiAnalysis') {
    if (value === 'none') return false
    if (value === 'basic') return 'Basic'
    return 'Full'
  }
  return String(value)
}

export function Pricing() {
  return (
    <section className="py-24 px-6 border-t border-brand-border">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Pricing</div>
          <h2 className="text-3xl sm:text-4xl font-bold">Simple, transparent pricing</h2>
          <p className="text-zinc-400 mt-3">Start free, upgrade when you need more power. No hidden fees.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {PLAN_ORDER.map((planType, i) => {
            const config = PLAN_CONFIGS[planType]
            const isPro = planType === PlanType.PRO
            return (
              <motion.div
                key={planType}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative flex flex-col bg-zinc-900 rounded-2xl p-7 border ${
                  isPro
                    ? 'border-indigo-500/50 shadow-[0_0_40px_rgba(99,102,241,0.1)] md:-mt-4'
                    : 'border-brand-border'
                }`}
              >
                {isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-500 text-white text-xs font-bold rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold mb-1">{config.name}</h3>
                <p className="text-sm text-zinc-500 mb-6">{config.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold">
                    {config.price === 0 ? 'Free' : `$${config.price}`}
                  </span>
                  {config.price > 0 && <span className="text-zinc-500 text-sm">/month</span>}
                </div>
                <div className="flex-1 space-y-3 mb-8">
                  {FEATURES.map(({ key, label }) => {
                    const display = formatValue(key, config[key as keyof typeof config])
                    const enabled = display !== false
                    return (
                      <div key={key} className="flex items-center gap-2 text-sm">
                        {enabled ? (
                          <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-zinc-700 shrink-0" />
                        )}
                        <span className={enabled ? 'text-zinc-300' : 'text-zinc-600'}>
                          {typeof display === 'string' ? `${label}: ${display}` : label}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <a
                  href={`${APP_URL}/?plan=${planType.toLowerCase()}`}
                  className={`w-full py-3 rounded-xl text-sm font-semibold text-center transition-colors ${
                    isPro
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                  }`}
                >
                  {config.price === 0 ? 'Get Started Free' : `Upgrade to ${config.name}`}
                </a>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
