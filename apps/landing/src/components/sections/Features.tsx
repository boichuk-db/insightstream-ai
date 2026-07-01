'use client'

import { motion } from 'framer-motion'
import { Code2, Sparkles, Kanban, Mail, Users, Download } from 'lucide-react'

const FEATURES = [
  { icon: 'code2', title: 'Embeddable Widget', desc: 'Drop-in feedback widget with customizable themes and branding.' },
  { icon: 'sparkles', title: 'AI Analysis', desc: 'Gemini-powered categorization, sentiment detection, and pattern recognition.' },
  { icon: 'kanban', title: 'Kanban Board', desc: 'Organize feedback into columns. Drag, filter, and prioritize at a glance.' },
  { icon: 'mail', title: 'Weekly AI Digest', desc: 'Automated email summary of top insights and emerging trends.' },
  { icon: 'users', title: 'Team Collaboration', desc: 'Invite team members, assign feedback, add comments and context.' },
  { icon: 'download', title: 'CSV Data Export', desc: 'Export all your feedback data anytime. No lock-in.' },
]

const ICON_MAP: Record<string, React.ReactNode> = {
  code2: <Code2 className="h-6 w-6 text-brand-accent" />,
  sparkles: <Sparkles className="h-6 w-6 text-brand-accent" />,
  kanban: <Kanban className="h-6 w-6 text-brand-accent" />,
  mail: <Mail className="h-6 w-6 text-brand-accent" />,
  users: <Users className="h-6 w-6 text-brand-accent" />,
  download: <Download className="h-6 w-6 text-brand-accent" />,
}

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
              whileHover={{ y: -4, transition: { duration: 0.2, delay: 0 } }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="bg-zinc-900 border border-brand-border rounded-xl p-6 hover:border-brand-primary/40 hover:shadow-[0_0_20px_rgba(61,138,132,0.12)] transition-[border-color,box-shadow] duration-300 cursor-default"
            >
              <div className="mb-3">{ICON_MAP[f.icon]}</div>
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-zinc-500 text-sm">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
