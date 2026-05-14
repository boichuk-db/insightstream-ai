import Link from 'next/link'

export function QuizCta() {
  return (
    <section className="py-16 px-6 border-t border-brand-border">
      <div className="max-w-3xl mx-auto">
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-10 text-center">
          <div className="text-3xl mb-3">🎯</div>
          <h2 className="text-2xl font-bold mb-2">Not sure which plan is right?</h2>
          <p className="text-zinc-400 mb-6">
            Take our 2-minute quiz and we'll recommend the perfect plan based on your team and usage.
          </p>
          <Link
            href="/quiz"
            className="inline-block px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors"
          >
            Find my plan →
          </Link>
        </div>
      </div>
    </section>
  )
}
