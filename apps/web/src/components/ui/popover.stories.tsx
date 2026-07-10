import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Popover } from './popover';
import { Button } from './button';

const meta: Meta<typeof Popover> = {
  title: 'UI/Popover',
  component: Popover,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Popover>;

export const Default: Story = {
  args: {
    trigger: <Button variant="secondary">Open</Button>,
    children: <div className="p-3 text-sm text-brand-fg">Popover content</div>,
  },
};
