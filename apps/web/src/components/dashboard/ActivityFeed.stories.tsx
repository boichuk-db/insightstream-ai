import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActivityFeed } from './ActivityFeed';
import { mockActivityItems, mockTeam } from '@/stories/mocks';

// Pre-seed with the exact query key the component uses: ['teamActivity', teamId]
const makeQueryClient = () => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  qc.setQueryData(['teamActivity', mockTeam.id], mockActivityItems);
  return qc;
};

const meta: Meta<typeof ActivityFeed> = {
  title: 'Dashboard/ActivityFeed',
  component: ActivityFeed,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <QueryClientProvider client={makeQueryClient()}>
        <Story />
      </QueryClientProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ActivityFeed>;

export const Default: Story = {
  args: {
    teamId: mockTeam.id,
  },
};

export const NoTeam: Story = {
  args: {
    teamId: null,
  },
};
