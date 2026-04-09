import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { DragDropContext } from '@hello-pangea/dnd';
import { KanbanColumn } from './KanbanColumn';
import { mockFeedback, mockFeedback3 } from '@/stories/mocks';

const withDndContext = (Story: React.FC) => (
  <DragDropContext onDragEnd={() => {}}>
    <div className="h-[600px] flex">
      <Story />
    </div>
  </DragDropContext>
);

const meta: Meta<typeof KanbanColumn> = {
  title: 'Dashboard/KanbanColumn',
  component: KanbanColumn,
  decorators: [withDndContext],
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof KanbanColumn>;

const baseArgs = {
  id: 'In Review',
  title: 'In Review',
  colorClass: 'bg-amber-500',
  onDeleteFeedback: () => {},
  isDeleting: false,
  onStatusChange: () => {},
  onReanalyzeFeedback: () => {},
  isReanalyzing: false,
};

export const WithFeedbacks: Story = {
  args: {
    ...baseArgs,
    feedbacks: [mockFeedback, mockFeedback3],
  },
};

export const Empty: Story = {
  args: {
    ...baseArgs,
    feedbacks: [],
  },
};
