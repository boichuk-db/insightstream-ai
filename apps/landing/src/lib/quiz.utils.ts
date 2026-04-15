export function recommendPlan(
  answers: Record<string, string | string[]>
): 'free' | 'pro' | 'business' {
  let score = 0

  const teamMap: Record<string, number> = {
    solo: 0,
    small: 1,
    mid: 3,
    enterprise: 5,
  }
  score += teamMap[answers['team-size'] as string] ?? 0

  const volumeMap: Record<string, number> = {
    'lt-100': 0,
    '100-1k': 1,
    '1k-10k': 3,
    '10k+': 5,
  }
  score += volumeMap[answers['feedback-volume'] as string] ?? 0

  const features = (answers['priority-features'] as string[]) ?? []
  if (features.includes('ai-analysis')) score += 2
  if (features.includes('teams')) score += 2
  if (features.includes('digest')) score += 1

  const budgetMap: Record<string, number> = {
    free: 0,
    '30': 2,
    '100': 4,
    custom: 6,
  }
  score += budgetMap[answers['budget'] as string] ?? 0

  if (score >= 8) return 'business'
  if (score >= 3) return 'pro'
  return 'free'
}
