export enum PlanType {
  FREE = 'FREE',
  PRO = 'PRO',
  BUSINESS = 'BUSINESS',
}

export interface PlanConfig {
  name: string;
  description: string;
  price: number;
  maxProjects: number | null; // null = unlimited
  maxFeedbacksPerMonth: number | null;
  maxTeamMembers: number | null;
  aiAnalysis: 'none' | 'basic' | 'full';
  weeklyDigest: boolean;
  widgetCustomization: 'basic' | 'full' | 'whitelabel';
  dataExport: boolean;
}

export const PLAN_CONFIGS: Record<PlanType, PlanConfig> = {
  [PlanType.FREE]: {
    name: 'Free',
    description: 'For personal projects and testing',
    price: 0,
    maxProjects: 1,
    maxFeedbacksPerMonth: 200,
    maxTeamMembers: 1,
    aiAnalysis: 'basic',
    weeklyDigest: false,
    widgetCustomization: 'basic',
    dataExport: false,
  },
  [PlanType.PRO]: {
    name: 'Pro',
    description: 'For growing teams and products',
    price: 9,
    maxProjects: 5,
    maxFeedbacksPerMonth: 10_000,
    maxTeamMembers: 5,
    aiAnalysis: 'full',
    weeklyDigest: true,
    widgetCustomization: 'full',
    dataExport: true,
  },
  [PlanType.BUSINESS]: {
    name: 'Business',
    description: 'For large-scale operations',
    price: 29,
    maxProjects: null,
    maxFeedbacksPerMonth: null,
    maxTeamMembers: null,
    aiAnalysis: 'full',
    weeklyDigest: true,
    widgetCustomization: 'whitelabel',
    dataExport: true,
  },
};

export function getPlanConfig(plan: string): PlanConfig {
  return PLAN_CONFIGS[plan as PlanType] || PLAN_CONFIGS[PlanType.FREE];
}

export function isPaidPlan(plan: string): boolean {
  return plan === PlanType.PRO || plan === PlanType.BUSINESS;
}

export function canUseFeature(plan: string, feature: keyof PlanConfig): boolean {
  const config = getPlanConfig(plan);
  const value = config[feature];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value !== 'none' && value !== 'basic';
  if (typeof value === 'number') return value > 0;
  if (value === null) return true; // unlimited
  return false;
}

export function formatLimit(value: number | null): string {
  if (value === null) return 'Unlimited';
  return value.toLocaleString();
}
