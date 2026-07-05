import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TeamProvider } from '@/contexts/TeamContext';
import { CreateTeamModal } from './CreateTeamModal';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const meta: Meta<typeof CreateTeamModal> = {
  title: 'Teams/CreateTeamModal',
  component: CreateTeamModal,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <TeamProvider>
          <Story />
        </TeamProvider>
      </QueryClientProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CreateTeamModal>;

export const Open: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
  },
};
