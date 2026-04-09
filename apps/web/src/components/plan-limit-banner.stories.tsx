import type { Meta, StoryObj } from '@storybook/react';
import { PlanLimitBanner } from './plan-limit-banner';
import { mockPlanUsageData, mockPlanUsageDataAtLimit } from '@/stories/mocks';

function clearDismissKey() {
  const now = new Date();
  const key = `plan_banner_dismissed_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  localStorage.removeItem(key);
}

const withCleanLocalStorage = (Story: React.FC) => {
  clearDismissKey();
  return <Story />;
};

const meta: Meta<typeof PlanLimitBanner> = {
  title: 'Components/PlanLimitBanner',
  component: PlanLimitBanner,
  tags: ['autodocs'],
  decorators: [withCleanLocalStorage],
};

export default meta;
type Story = StoryObj<typeof PlanLimitBanner>;

export const NearLimit: Story = {
  args: {
    data: mockPlanUsageData,
    isAtLimit: false,
  },
};

export const AtLimit: Story = {
  args: {
    data: mockPlanUsageDataAtLimit,
    isAtLimit: true,
  },
};
