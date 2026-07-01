interface QuizProgressProps {
  current: number
  total: number
}

export function QuizProgress({ current, total }: QuizProgressProps) {
  const pct = Math.round((current / total) * 100)
  return (
    <div className="w-full max-w-xl mx-auto mb-8">
      <div className="flex justify-between text-xs text-zinc-500 mb-2">
        <span>Question {current} of {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-primary rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
