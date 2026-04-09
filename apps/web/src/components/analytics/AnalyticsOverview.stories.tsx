import type { Meta, StoryObj } from '@storybook/react';
import { AnalyticsOverview } from './AnalyticsOverview';
import { mockFeedback, mockFeedback2, mockFeedback3 } from '@/stories/mocks';

const meta: Meta<typeof AnalyticsOverview> = {
  title: 'Analytics/AnalyticsOverview',
  component: AnalyticsOverview,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof AnalyticsOverview>;

export const WithData: Story = {
  args: {
    feedbacks: [mockFeedback, mockFeedback2, mockFeedback3],
  },
};

export const Empty: Story = {
  args: {
    feedbacks: [],
  },
};
