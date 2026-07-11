import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Overlay } from './overlay';

const meta: Meta<typeof Overlay> = {
  title: 'UI/Overlay',
  component: Overlay,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Overlay>;

export const Default: Story = {
  args: {},
};
