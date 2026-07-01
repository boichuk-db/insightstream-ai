export function Trust() {
  const items = [
    { label: 'Built for product teams' },
    { label: 'AI-powered analysis' },
    { label: 'Embeddable in 5 minutes' },
    { label: '14-day free trial, no card required' },
  ]

  return (
    <section className="py-8 border-y border-brand-border">
      <div className="max-w-4xl mx-auto px-6">
        <div className="hidden sm:flex items-center justify-center gap-6 flex-wrap">
          {items.map((item, i) => (
            <div key={item.label} className="flex items-center gap-6">
              <span className="text-sm font-semibold text-zinc-300">{item.label}</span>
              {i < items.length - 1 && (
                <span className="text-zinc-700">·</span>
              )}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:hidden">
          {items.map((item) => (
            <div key={item.label} className="text-center">
              <span className="text-sm font-semibold text-zinc-300">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
