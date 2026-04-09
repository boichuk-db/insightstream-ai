import type { Meta, StoryObj } from '@storybook/react';
import { DigestModal } from './DigestModal';

const meta: Meta<typeof DigestModal> = {
  title: 'Dashboard/DigestModal',
  component: DigestModal,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof DigestModal>;

export const Open: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    isLoading: false,
    error: null,
    data: {
      projectName: 'InsightStream Web',
      since: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
      totalCount: 42,
      avgSentiment: 0.71,
      categories: {
        UX: 18,
        Feature: 12,
        Bug: 8,
        Performance: 4,
      },
      topTags: ['onboarding', 'kanban', 'export', 'api', 'dashboard'],
      mostNegative: [
        {
          content:
            "The onboarding flow is confusing. I couldn't find where to add team members after signing up.",
          sentimentScore: 0.15,
        },
        {
          content:
            'Dashboard takes too long to load when there are many feedback items.',
          sentimentScore: 0.22,
        },
      ],
      aiSummary:
        '<p>This week saw <strong>42 feedback submissions</strong> with an overall positive sentiment of 71%.</p><p>The top concern was <strong>UX improvements</strong>, particularly around the onboarding experience. Users are loving the kanban view but requesting more export options.</p>',
    },
  },
};

export const Loading: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    isLoading: true,
    error: null,
    data: null,
  },
};

export const WithError: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    isLoading: false,
    error: 'Failed to generate digest. Please try again later.',
    data: null,
  },
};
