'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { QUIZ_CONFIG } from '@/config/quiz.config'
import { QuizProgress } from '@/components/quiz/QuizProgress'
import { QuizStep } from '@/components/quiz/QuizStep'
import { QuizResult } from '@/components/quiz/QuizResult'
import { captureEvent } from '@/lib/posthog'
import { recommendPlan } from '@/lib/quiz.utils'

const STORAGE_KEY = 'insightstream-quiz-answers'
const TOTAL = QUIZ_CONFIG.questions.length

function QuizContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const stepParam = searchParams.get('step') ?? '1'

  const [answers, setAnswers] = useState<Record<string, string | string[]>>(() => {
    if (typeof window === 'undefined') return {}
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  // Fire quiz_started on first step (only if no existing answers — not on back-nav)
  useEffect(() => {
    if (stepParam === '1') {
      const hasExisting = sessionStorage.getItem(STORAGE_KEY)
      if (!hasExisting) {
        captureEvent('quiz_started')
      }
    }
  }, [stepParam])

  // Fire quiz_completed when reaching result screen (deduplication guard)
  useEffect(() => {
    if (stepParam === 'result') {
      const alreadyFired = sessionStorage.getItem('insightstream-quiz-completed')
      if (!alreadyFired) {
        sessionStorage.setItem('insightstream-quiz-completed', '1')
        try {
          const saved = sessionStorage.getItem(STORAGE_KEY)
          const savedAnswers = saved ? (JSON.parse(saved) as Record<string, string | string[]>) : {}
          captureEvent('quiz_completed', {
            recommended_plan: recommendPlan(savedAnswers),
          })
        } catch {
          // sessionStorage unavailable
        }
      }
    }
  }, [stepParam])

  // Redirect to step 1 if step param is invalid
  useEffect(() => {
    if (stepParam !== 'result') {
      const stepNum = parseInt(stepParam)
      if (isNaN(stepNum) || !QUIZ_CONFIG.questions[stepNum - 1]) {
        router.replace('/quiz?step=1')
      }
    }
  }, [stepParam, router])

  const handleAnswer = (questionId: string, answer: string | string[]) => {
    const stepNum = parseInt(stepParam)
    const newAnswers = { ...answers, [questionId]: answer }
    setAnswers(newAnswers)
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newAnswers))

    captureEvent('quiz_step_completed', {
      step: stepNum,
      question_id: questionId,
      answer,
    })

    if (stepNum >= TOTAL) {
      router.push('/quiz?step=result')
    } else {
      router.push(`/quiz?step=${stepNum + 1}`)
    }
  }

  if (stepParam === 'result') {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center px-4 py-16">
        <QuizResult answers={answers} />
      </div>
    )
  }

  const stepNum = parseInt(stepParam)
  const question = QUIZ_CONFIG.questions[stepNum - 1]

  if (!question) return null

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl">
        <QuizProgress current={stepNum} total={TOTAL} />
        {stepNum > 1 && (
          <button
            onClick={() => router.push(`/quiz?step=${stepNum - 1}`)}
            className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
        )}
        <QuizStep key={question.id} question={question} onAnswer={handleAnswer} />
      </div>
    </div>
  )
}

export default function QuizPage() {
  return (
    <Suspense>
      <QuizContent />
    </Suspense>
  )
}
