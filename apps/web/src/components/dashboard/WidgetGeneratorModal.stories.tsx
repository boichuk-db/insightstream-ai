import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { WidgetGeneratorModal } from './WidgetGeneratorModal';
import { mockProject } from '@/stories/mocks';

const meta: Meta<typeof WidgetGeneratorModal> = {
  title: 'Dashboard/WidgetGeneratorModal',
  component: WidgetGeneratorModal,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof WidgetGeneratorModal>;

export const Open: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    apiKey: mockProject.widgetKey,
  },
};
