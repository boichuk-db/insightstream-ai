import { describe, it, expect } from 'vitest'
import { recommendPlan } from './quiz.utils'

describe('recommendPlan', () => {
  it('returns free for solo with minimal usage and free budget', () => {
    expect(
      recommendPlan({
        'team-size': 'solo',
        'feedback-volume': 'lt-100',
        'priority-features': [],
        budget: 'free',
      })
    ).toBe('free')
  })

  it('returns pro for small team with ai-analysis and moderate volume', () => {
    expect(
      recommendPlan({
        'team-size': 'small',
        'feedback-volume': '100-1k',
        'priority-features': ['ai-analysis'],
        budget: '30',
      })
    ).toBe('pro')
  })

  it('returns business for enterprise with high volume and high budget', () => {
    expect(
      recommendPlan({
        'team-size': 'enterprise',
        'feedback-volume': '10k+',
        'priority-features': ['ai-analysis', 'teams'],
        budget: '100',
      })
    ).toBe('business')
  })

  it('returns free for empty answers (all unknowns score 0)', () => {
    expect(recommendPlan({})).toBe('free')
  })

  it('counts each selected feature independently', () => {
    // teams(2) + ai(2) + digest(1) = 5, plus small(1) = 6 → pro (score 3–7)
    expect(
      recommendPlan({
        'team-size': 'small',
        'priority-features': ['ai-analysis', 'teams', 'digest'],
      })
    ).toBe('pro')
  })
})
