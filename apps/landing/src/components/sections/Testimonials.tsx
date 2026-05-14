import { motion } from 'framer-motion'

const TESTIMONIALS = [
  {
    quote: "InsightStream cut our feedback review time from 4 hours a week to 20 minutes. The AI summaries are surprisingly accurate.",
    author: 'Sarah K.',
    role: 'Head of Product, Fintech startup',
    avatar: 'SK',
  },
  {
    quote: "We finally know which bugs our users care about most. The Kanban board and AI analysis changed how we prioritize our roadmap.",
    author: 'Marcus T.',
    role: 'CTO, B2B SaaS company',
    avatar: 'MT',
  },
  {
    quote: "The embeddable widget took 5 minutes to set up. Now we get structured feedback instead of random emails. Worth every penny.",
    author: 'Ana R.',
    role: 'Founder, E-commerce tool',
    avatar: 'AR',
  },
]

export function Testimonials() {
  return (
    <section className="py-24 px-6 border-t border-brand-border">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Testimonials</div>
          <h2 className="text-3xl sm:text-4xl font-bold">Loved by product teams</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.author}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-zinc-900 border border-brand-border rounded-2xl p-6"
            >
              <p className="text-zinc-300 text-sm leading-relaxed mb-6">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-400">
                  {t.avatar}
                </div>
                <div>
                  <div className="text-sm font-semibold">{t.author}</div>
                  <div className="text-xs text-zinc-500">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
