'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Code2, Sparkles, LayoutDashboard } from 'lucide-react'

const STEPS = [
  {
    num: '01',
    icon: Code2,
    title: 'Embed the widget',
    description:
      'One script tag. Your users can submit feedback directly inside your app — no context switching, no extra tools.',
  },
  {
    num: '02',
    icon: Sparkles,
    title: 'AI analyzes everything',
    description:
      "Gemini AI reads every piece of feedback, categorizes it, detects sentiment, and surfaces patterns you'd never find manually.",
  },
  {
    num: '03',
    icon: LayoutDashboard,
    title: 'Act on clear insights',
    description:
      'A Kanban board, weekly AI digest, and analytics overview give your team everything needed to make confident product decisions.',
  },
]

export function Solution() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="py-24 px-6 border-t border-brand-border">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">The solution</div>
          <h2 className="text-3xl sm:text-4xl font-bold">From raw feedback to clear decisions</h2>
        </div>
        <div ref={ref} className="relative grid md:grid-cols-3 gap-8">
          <svg
            className="absolute top-[36px] left-0 w-full hidden md:block pointer-events-none"
            height="2"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <line
              x1="20%" y1="1" x2="80%" y2="1"
              stroke="#3d8a84"
              strokeWidth="1.5"
              strokeDasharray="1000"
              strokeDashoffset={isInView ? 0 : 1000}
              style={{ transition: 'stroke-dashoffset 1.2s ease-out 0.4s' }}
            />
          </svg>
          {STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.3 + 0.3 }}
              className="relative"
            >
              <div className="text-6xl font-black text-zinc-800 mb-4">{step.num}</div>
              <step.icon className="h-6 w-6 text-brand-accent mb-3" />
              <h3 className="font-bold text-lg mb-2">{step.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
