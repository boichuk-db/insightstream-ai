import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Eyebrow } from './eyebrow';

const meta: Meta<typeof Eyebrow> = {
  title: 'UI/Eyebrow',
  component: Eyebrow,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Eyebrow>;

export const Default: Story = {
  args: { children: 'Category' },
};
