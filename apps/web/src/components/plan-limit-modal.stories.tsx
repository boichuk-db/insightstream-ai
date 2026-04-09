import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PlanLimitModal } from './plan-limit-modal';
import { mockPlanLimitError } from '@/stories/mocks';

const meta: Meta<typeof PlanLimitModal> = {
  title: 'Components/PlanLimitModal',
  component: PlanLimitModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    nextjs: { appDirectory: true },
  },
};

export default meta;
type Story = StoryObj<typeof PlanLimitModal>;

export const Open: Story = {
  args: {
    open: true,
    onClose: () => {},
    errorData: mockPlanLimitError,
  },
};

export const Closed: Story = {
  args: {
    open: false,
    onClose: () => {},
    errorData: mockPlanLimitError,
  },
};
