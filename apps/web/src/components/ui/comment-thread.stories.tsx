import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CommentThread } from './comment-thread';

const meta: Meta<typeof CommentThread> = {
  title: 'UI/CommentThread',
  component: CommentThread,
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
type Story = StoryObj<typeof CommentThread>;

export const Default: Story = {
  args: { feedbackId: 'story-feedback-id' },
};
