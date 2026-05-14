'use client'

import { motion } from 'framer-motion'

const FEATURES = [
  { icon: '🔌', title: 'Embeddable Widget', desc: 'Drop-in feedback widget with customizable themes and branding.' },
  { icon: '🧠', title: 'AI Analysis', desc: 'Gemini-powered categorization, sentiment detection, and pattern recognition.' },
  { icon: '📋', title: 'Kanban Board', desc: 'Organize feedback into columns. Drag, filter, and prioritize at a glance.' },
  { icon: '📧', title: 'Weekly AI Digest', desc: 'Automated email summary of top insights and emerging trends.' },
  { icon: '👥', title: 'Team Collaboration', desc: 'Invite team members, assign feedback, add comments and context.' },
  { icon: '📤', title: 'CSV Data Export', desc: 'Export all your feedback data anytime. No lock-in.' },
]

export function Features() {
  return (
    <section className="py-24 px-6 border-t border-brand-border">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Features</div>
          <h2 className="text-3xl sm:text-4xl font-bold">Everything you need, nothing you don't</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="bg-zinc-900 border border-brand-border rounded-xl p-6 hover:border-zinc-600 transition-colors"
            >
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-zinc-500 text-sm">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
