import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from './button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger', 'outline', 'brand'],
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { children: 'Save changes', variant: 'primary', size: 'md' },
};

export const Secondary: Story = {
  args: { children: 'Cancel', variant: 'secondary', size: 'md' },
};

export const Ghost: Story = {
  args: { children: 'Learn more', variant: 'ghost', size: 'md' },
};

export const Danger: Story = {
  args: { children: 'Delete project', variant: 'danger', size: 'md' },
};

export const Outline: Story = {
  args: { children: 'View details', variant: 'outline', size: 'md' },
};

export const Brand: Story = {
  args: { children: 'Get started', variant: 'brand', size: 'md' },
};

export const Loading: Story = {
  args: { children: 'Saving...', variant: 'primary', size: 'md', isLoading: true },
};

export const Disabled: Story = {
  args: { children: 'Not available', variant: 'primary', size: 'md', disabled: true },
};

export const SizeXS: Story = {
  args: { children: 'XS Button', variant: 'primary', size: 'xs' },
};

export const SizeLG: Story = {
  args: { children: 'Large Button', variant: 'primary', size: 'lg' },
};
