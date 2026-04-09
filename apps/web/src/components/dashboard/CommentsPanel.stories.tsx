import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CommentsPanel } from './CommentsPanel';

const meta: Meta<typeof CommentsPanel> = {
  title: 'Dashboard/CommentsPanel',
  component: CommentsPanel,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <Story />
      </QueryClientProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CommentsPanel>;

export const Open: Story = {
  args: {
    feedbackId: 'fb-1',
    onClose: () => {},
    currentUserId: 'user-1',
  },
};
