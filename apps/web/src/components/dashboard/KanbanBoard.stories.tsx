import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KanbanBoard } from './KanbanBoard';
import {
  mockFeedback,
  mockFeedback2,
  mockFeedback3,
} from '@/stories/mocks';

const meta: Meta<typeof KanbanBoard> = {
  title: 'Dashboard/KanbanBoard',
  component: KanbanBoard,
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
type Story = StoryObj<typeof KanbanBoard>;

export const WithFeedbacks: Story = {
  args: {
    initialFeedbacks: [mockFeedback, mockFeedback2, mockFeedback3],
    projectId: 'proj-1',
  },
};

export const Empty: Story = {
  args: {
    initialFeedbacks: [],
    projectId: 'proj-1',
  },
};
