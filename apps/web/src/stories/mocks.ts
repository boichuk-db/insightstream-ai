export const mockFeedback = {
  id: 'fb-1',
  content:
    "The onboarding flow is confusing. I couldn't find where to add team members after signing up.",
  source: 'Widget',
  category: 'UX',
  sentimentScore: 0.3,
  tags: ['onboarding', 'ux'],
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  status: 'In Review',
  aiSummary: 'User struggled with team member invitation during onboarding.',
};

export const mockFeedback2 = {
  id: 'fb-2',
  content: 'Love the kanban view! Makes it easy to prioritize what to fix.',
  source: 'Direct',
  category: 'Feature',
  sentimentScore: 0.9,
  tags: ['kanban', 'positive'],
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  status: 'Done',
  aiSummary: 'Positive feedback about the kanban board feature.',
};

export const mockFeedback3 = {
  id: 'fb-3',
  content: 'Export to CSV would be really useful for our weekly reports.',
  source: 'Widget',
  category: 'Feature',
  sentimentScore: 0.6,
  tags: ['export', 'csv'],
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  status: 'In Progress',
  aiSummary: null,
};

export const mockProject = {
  id: 'proj-1',
  name: 'InsightStream Web',
  widgetKey: 'wk_abc123',
};

export const mockProject2 = {
  id: 'proj-2',
  name: 'Mobile App',
  widgetKey: 'wk_def456',
};

export const mockUser = {
  id: 'user-1',
  email: 'demo@insightstream.dev',
  name: 'Alex Demo',
  plan: 'pro',
};

export const mockTeam = {
  id: 'team-1',
  name: 'Acme Corp',
  role: 'owner',
};

export const mockPlanUsageData = {
  feedbacksThisMonth: {
    current: 80,
    max: 100,
  },
};

export const mockPlanUsageDataAtLimit = {
  feedbacksThisMonth: {
    current: 100,
    max: 100,
  },
};

export const mockPlanLimitError = {
  message:
    "You've reached your monthly feedback limit of 100 feedbacks on the Free plan.",
  currentPlan: 'free',
  limit: 100,
  current: 100,
};

export const mockActivityItems = [
  {
    id: 'a-1',
    action: 'member_joined',
    actorName: 'Alex Demo',
    targetName: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
  {
    id: 'a-2',
    action: 'feedback_added',
    actorName: 'System',
    targetName: 'InsightStream Web',
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
];
