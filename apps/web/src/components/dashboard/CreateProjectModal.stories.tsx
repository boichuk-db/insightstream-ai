import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateProjectModal } from './CreateProjectModal';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const meta: Meta<typeof CreateProjectModal> = {
  title: 'Dashboard/CreateProjectModal',
  component: CreateProjectModal,
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
type Story = StoryObj<typeof CreateProjectModal>;

export const Open: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    onCreated: () => {},
  },
};
