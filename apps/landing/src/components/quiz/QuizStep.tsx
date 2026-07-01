'use client'

import { useState } from 'react'
import type { QuizQuestion } from '@/config/quiz.config'

interface QuizStepProps {
  question: QuizQuestion
  onAnswer: (questionId: string, answer: string | string[]) => void
}

export function QuizStep({ question, onAnswer }: QuizStepProps) {
  const [selected, setSelected] = useState<string[]>([])

  const handleSelect = (value: string) => {
    if (question.type === 'multiselect') {
      setSelected((prev) =>
        prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
      )
    } else {
      onAnswer(question.id, value)
    }
  }

  const handleMultiSubmit = () => {
    onAnswer(question.id, selected)
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-center mb-8">{question.question}</h2>

      {question.type === 'cards' && (
        <div className="grid grid-cols-2 gap-3">
          {question.options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className="flex flex-col items-center gap-2 p-5 bg-zinc-900 border border-brand-border rounded-xl hover:border-brand-primary hover:bg-zinc-800 transition-all text-center"
            >
              {opt.icon && <span className="text-3xl">{opt.icon}</span>}
              <span className="text-sm font-medium">{opt.label}</span>
            </button>
          ))}
        </div>
      )}

      {question.type === 'radio' && (
        <div className="flex flex-col gap-2">
          {question.options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className="flex items-center gap-3 p-4 bg-zinc-900 border border-brand-border rounded-xl hover:border-brand-primary hover:bg-zinc-800 transition-all text-left"
            >
              <div className="w-4 h-4 rounded-full border-2 border-zinc-600 shrink-0" />
              <span className="text-sm">{opt.label}</span>
            </button>
          ))}
        </div>
      )}

      {question.type === 'multiselect' && (
        <>
          <div className="flex flex-col gap-2 mb-6">
            {question.options.map((opt) => {
              const isSelected = selected.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={`flex items-center gap-3 p-4 border rounded-xl transition-all text-left ${
                    isSelected
                      ? 'border-brand-primary bg-brand-primary/10 text-white'
                      : 'border-brand-border bg-zinc-900 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center ${
                      isSelected ? 'border-brand-primary bg-brand-primary' : 'border-zinc-600'
                    }`}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm font-medium">{opt.label}</span>
                </button>
              )
            })}
          </div>
          <button
            onClick={handleMultiSubmit}
            className="w-full py-3 bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold rounded-xl transition-colors"
          >
            Continue →
          </button>
        </>
      )}
    </div>
  )
}
