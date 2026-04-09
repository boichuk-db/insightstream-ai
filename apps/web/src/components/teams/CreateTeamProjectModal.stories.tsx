import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateTeamProjectModal } from './CreateTeamProjectModal';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const meta: Meta<typeof CreateTeamProjectModal> = {
  title: 'Teams/CreateTeamProjectModal',
  component: CreateTeamProjectModal,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <Story />
      </QueryClientProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CreateTeamProjectModal>;

export const Open: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    teamId: 'team-1',
    onCreated: () => {},
  },
};
