import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Sidebar } from './Sidebar';
import { mockProject, mockProject2, mockUser, mockTeam } from '@/stories/mocks';

const meta: Meta<typeof Sidebar> = {
  title: 'Dashboard/Sidebar',
  component: Sidebar,
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
type Story = StoryObj<typeof Sidebar>;

export const Open: Story = {
  args: {
    projects: [mockProject, mockProject2],
    activeProject: mockProject,
    onSelectProject: () => {},
    onCreateProject: () => {},
    onDeleteProject: () => {},
    isDeletingProject: false,
    userProfile: mockUser,
    onLogout: () => {},
    isOpen: true,
    onClose: () => {},
    teams: [mockTeam],
    activeTeam: mockTeam,
    onSwitchTeam: () => {},
    userRole: 'owner',
  },
};

export const NoProjects: Story = {
  args: {
    projects: [],
    activeProject: null,
    onSelectProject: () => {},
    onCreateProject: () => {},
    onDeleteProject: () => {},
    isDeletingProject: false,
    userProfile: mockUser,
    onLogout: () => {},
    isOpen: true,
    onClose: () => {},
    teams: [mockTeam],
    activeTeam: mockTeam,
    onSwitchTeam: () => {},
    userRole: 'owner',
  },
};
