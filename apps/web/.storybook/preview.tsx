import type { Preview } from '@storybook/react';
import { DragDropContext } from '@hello-pangea/dnd';
import React from 'react';
import '../src/app/globals.css';

const preview: Preview = {
  decorators: [
    (Story) => (
      <DragDropContext onDragEnd={() => {}}>
        <div className="bg-brand-bg min-h-screen p-6">
          <Story />
        </div>
      </DragDropContext>
    ),
  ],
  parameters: {
    backgrounds: { disable: true },
  },
};

export default preview;
