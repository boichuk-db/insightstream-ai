'use client'

import { motion } from 'framer-motion'

export function Trust() {
  const items = [
    { label: 'Built for product teams' },
    { label: 'AI-powered analysis' },
    { label: 'Embeddable in 5 minutes' },
    { label: '14-day free trial, no card required' },
  ]

  return (
    <section className="relative py-8 border-y border-brand-border overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{ backgroundImage: 'radial-gradient(circle, rgba(61,138,132,0.12) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      <div className="max-w-4xl mx-auto px-6">
        <div className="hidden sm:flex items-center justify-center gap-6 flex-wrap">
          {items.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="flex items-center gap-6"
            >
              <span className="text-sm font-semibold text-zinc-300">{item.label}</span>
              {i < items.length - 1 && (
                <span className="text-zinc-700">·</span>
              )}
            </motion.div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:hidden">
          {items.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="text-center"
            >
              <span className="text-sm font-semibold text-zinc-300">{item.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
