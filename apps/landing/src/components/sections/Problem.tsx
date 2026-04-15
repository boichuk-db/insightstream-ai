'use client'

import { motion } from 'framer-motion'

const PAINS = [
  {
    icon: '📦',
    title: 'Feedback scattered everywhere',
    description:
      'Emails, Slack messages, support tickets, surveys — feedback lives in silos with no central place to see the big picture.',
  },
  {
    icon: '🕐',
    title: 'Manual analysis takes hours',
    description:
      'Reading through hundreds of responses, tagging them manually, trying to spot patterns — a full-time job that never ends.',
  },
  {
    icon: '❓',
    title: "You don't know what to build next",
    description:
      "Without structured insights, every roadmap decision is a guess. You build features users didn't ask for and miss what they actually need.",
  },
]

export function Problem() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">The problem</div>
          <h2 className="text-3xl sm:text-4xl font-bold">Sound familiar?</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {PAINS.map((pain, i) => (
            <motion.div
              key={pain.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-zinc-900 border border-brand-border rounded-2xl p-6"
            >
              <div className="text-3xl mb-4">{pain.icon}</div>
              <h3 className="font-bold text-lg mb-2">{pain.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{pain.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
