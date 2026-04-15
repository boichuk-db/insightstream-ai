export type QuestionType = 'cards' | 'radio' | 'multiselect'

export interface QuizOption {
  value: string
  label: string
  icon?: string
}

export interface QuizQuestion {
  id: string
  question: string
  type: QuestionType
  options: QuizOption[]
}

export interface QuizConfig {
  title: string
  subtitle: string
  questions: QuizQuestion[]
}

export const QUIZ_CONFIG: QuizConfig = {
  title: 'Find your perfect plan',
  subtitle: "Answer 5 quick questions and we'll recommend the right plan for you.",
  questions: [
    {
      id: 'team-size',
      question: 'What best describes your team?',
      type: 'cards',
      options: [
        { value: 'solo', label: 'Solo founder', icon: '👤' },
        { value: 'small', label: 'Small team (2–10)', icon: '👥' },
        { value: 'mid', label: 'Mid-size (11–50)', icon: '🏢' },
        { value: 'enterprise', label: 'Enterprise (50+)', icon: '🏗️' },
      ],
    },
    {
      id: 'feedback-volume',
      question: 'How much feedback do you collect per month?',
      type: 'radio',
      options: [
        { value: 'lt-100', label: 'Less than 100' },
        { value: '100-1k', label: '100 – 1,000' },
        { value: '1k-10k', label: '1,000 – 10,000' },
        { value: '10k+', label: '10,000+' },
      ],
    },
    {
      id: 'use-case',
      question: "What's your primary use case?",
      type: 'cards',
      options: [
        { value: 'product', label: 'Product feedback', icon: '🚀' },
        { value: 'support', label: 'Customer support', icon: '💬' },
        { value: 'nps', label: 'NPS surveys', icon: '📊' },
        { value: 'research', label: 'User research', icon: '🔍' },
      ],
    },
    {
      id: 'priority-features',
      question: 'Which features matter most?',
      type: 'multiselect',
      options: [
        { value: 'ai-analysis', label: 'AI Analysis' },
        { value: 'kanban', label: 'Kanban Dashboard' },
        { value: 'widget', label: 'Embeddable Widget' },
        { value: 'digest', label: 'Weekly Digest' },
        { value: 'teams', label: 'Team Access' },
      ],
    },
    {
      id: 'budget',
      question: "What's your monthly budget?",
      type: 'radio',
      options: [
        { value: 'free', label: 'Free (just getting started)' },
        { value: '30', label: 'Up to $30/month' },
        { value: '100', label: 'Up to $100/month' },
        { value: 'custom', label: 'Custom / Enterprise' },
      ],
    },
  ],
}
