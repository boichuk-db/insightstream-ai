'use client'

import { recommendPlan } from '@/lib/quiz.utils'
import { PLAN_CONFIGS, PlanType } from '@/config/plans.config'
import { captureEvent } from '@/lib/posthog'
import { APP_URL } from '@/lib/constants'

const PLAN_LABEL: Record<'free' | 'pro' | 'business', PlanType> = {
  free: PlanType.FREE,
  pro: PlanType.PRO,
  business: PlanType.BUSINESS,
}

const HIGHLIGHT_FEATURES: Record<PlanType, string[]> = {
  [PlanType.FREE]: ['1 project', '200 feedbacks/month', 'Basic AI analysis'],
  [PlanType.PRO]: ['5 projects', '10,000 feedbacks/month', 'Full AI analysis', 'Weekly digest', 'Data export'],
  [PlanType.BUSINESS]: ['Unlimited projects', 'Unlimited feedbacks', 'Full AI + whitelabel', 'Team access'],
}

interface QuizResultProps {
  answers: Record<string, string | string[]>
}

export function QuizResult({ answers }: QuizResultProps) {
  const recommendation = recommendPlan(answers)
  const planType = PLAN_LABEL[recommendation]
  const config = PLAN_CONFIGS[planType]

  return (
    <div className="w-full max-w-lg mx-auto text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-primary/10 border border-brand-primary/20 rounded-full text-brand-accent text-xs font-semibold mb-6">
        ✨ Based on your answers
      </div>
      <h2 className="text-3xl font-bold mb-2">
        <span className="text-brand-accent">{config.name}</span> is perfect for you
      </h2>
      <p className="text-zinc-400 mb-8">{config.description}</p>

      <div className="bg-zinc-900 border border-brand-border rounded-2xl p-6 mb-8 text-left">
        <div className="text-sm font-semibold text-zinc-300 mb-4">What's included:</div>
        <ul className="space-y-2">
          {HIGHLIGHT_FEATURES[planType].map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
              <span className="text-emerald-400">✓</span> {f}
            </li>
          ))}
        </ul>
        {config.price > 0 && (
          <div className="mt-4 pt-4 border-t border-brand-border">
            <span className="text-2xl font-bold">${config.price}</span>
            <span className="text-zinc-500 text-sm">/month</span>
          </div>
        )}
      </div>

      <a
        href={`${APP_URL}/?plan=${recommendation}`}
        onClick={() => captureEvent('quiz_cta_clicked', { plan: recommendation })}
        className="inline-block w-full py-4 bg-brand-primary hover:bg-brand-primary/90 text-white font-bold rounded-xl transition-colors text-lg"
      >
        {config.price === 0 ? 'Get Started Free →' : 'Start Free Trial →'}
      </a>
      <p className="text-xs text-zinc-600 mt-3">No credit card required</p>
    </div>
  )
}
