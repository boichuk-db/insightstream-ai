import type { Meta, StoryObj } from '@storybook/react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { KanbanCard } from './KanbanCard';
import { mockFeedback, mockFeedback3 } from '@/stories/mocks';

const withDndContext = (Story: React.FC) => (
  <DragDropContext onDragEnd={() => {}}>
    <Droppable droppableId="storybook-column">
      {(provided) => (
        <div ref={provided.innerRef} {...provided.droppableProps} className="w-72">
          <Story />
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  </DragDropContext>
);

const meta: Meta<typeof KanbanCard> = {
  title: 'Dashboard/KanbanCard',
  component: KanbanCard,
  decorators: [withDndContext],
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof KanbanCard>;

const baseArgs = {
  index: 0,
  onDelete: () => {},
  isDeleting: false,
  onStatusChange: () => {},
  onReanalyze: () => {},
  isReanalyzing: false,
  onOpenComments: () => {},
  commentCount: 3,
};

export const WithAISummary: Story = {
  args: { ...baseArgs, feedback: mockFeedback },
};

export const NotAnalyzed: Story = {
  args: { ...baseArgs, feedback: mockFeedback3 },
};

export const Deleting: Story = {
  args: { ...baseArgs, feedback: mockFeedback, isDeleting: true },
};
