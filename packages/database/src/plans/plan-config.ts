export enum PlanType {
  FREE = 'FREE',
  PRO = 'PRO',
  BUSINESS = 'BUSINESS',
}

export interface PlanLimits {
  maxProjects: number;
  maxFeedbacksPerMonth: number;
  maxTeamMembers: number;
  aiAnalysis: 'none' | 'basic' | 'full';
  weeklyDigest: boolean;
  widgetCustomization: 'basic' | 'full' | 'whitelabel';
  dataExport: boolean;
}

export interface PlanConfig extends PlanLimits {
  name: string;
  description: string;
  price: number; // monthly price in USD
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
    maxProjects: Infinity,
    maxFeedbacksPerMonth: Infinity,
    maxTeamMembers: Infinity,
    aiAnalysis: 'full',
    weeklyDigest: true,
    widgetCustomization: 'whitelabel',
    dataExport: true,
  },
};
