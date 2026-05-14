import { motion } from 'framer-motion'

const STEPS = [
  {
    num: '01',
    icon: '🔌',
    title: 'Embed the widget',
    description:
      'One script tag. Your users can submit feedback directly inside your app — no context switching, no extra tools.',
  },
  {
    num: '02',
    icon: '🧠',
    title: 'AI analyzes everything',
    description:
      "Gemini AI reads every piece of feedback, categorizes it, detects sentiment, and surfaces patterns you'd never find manually.",
  },
  {
    num: '03',
    icon: '📊',
    title: 'Act on clear insights',
    description:
      'A Kanban board, weekly AI digest, and analytics overview give your team everything needed to make confident product decisions.',
  },
]

export function Solution() {
  return (
    <section className="py-24 px-6 border-t border-brand-border">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">The solution</div>
          <h2 className="text-3xl sm:text-4xl font-bold">From raw feedback to clear decisions</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative"
            >
              <div className="text-6xl font-black text-zinc-800 mb-4">{step.num}</div>
              <div className="text-3xl mb-3">{step.icon}</div>
              <h3 className="font-bold text-lg mb-2">{step.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
