'use client'

import { motion } from 'framer-motion'
import { Inbox, Clock, HelpCircle } from 'lucide-react'

const PAINS = [
  {
    icon: Inbox,
    title: 'Feedback scattered everywhere',
    description:
      'Emails, Slack messages, support tickets, surveys — feedback lives in silos with no central place to see the big picture.',
  },
  {
    icon: Clock,
    title: 'Manual analysis takes hours',
    description:
      'Reading through hundreds of responses, tagging them manually, trying to spot patterns — a full-time job that never ends.',
  },
  {
    icon: HelpCircle,
    title: "You don't know what to build next",
    description:
      "Without structured insights, every roadmap decision is a guess. You build features users didn't ask for and miss what they actually need.",
  },
]

export function Problem() {
  return (
    <section className="relative py-24 px-6 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{ backgroundImage: 'radial-gradient(circle, rgba(61,138,132,0.12) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
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
              transition={{ delay: i * 0.12 }}
              className="group bg-zinc-900 border border-brand-border rounded-2xl p-6"
            >
              <motion.div
                whileHover={{ scale: 1.12 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              >
                <pain.icon className="h-6 w-6 text-brand-accent mb-4 group-hover:drop-shadow-[0_0_8px_#6eb5af] transition-all" />
              </motion.div>
              <h3 className="font-bold text-lg mb-2">{pain.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{pain.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
