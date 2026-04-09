import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './input';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: { placeholder: 'Type something...' },
};

export const WithValue: Story = {
  args: { defaultValue: 'hello@example.com', type: 'email' },
};

export const Password: Story = {
  args: { type: 'password', placeholder: 'Enter password' },
};

export const Disabled: Story = {
  args: { placeholder: 'Disabled input', disabled: true },
};

export const ErrorState: Story = {
  args: {
    defaultValue: 'invalid-email',
    className: 'border-red-500 focus-visible:ring-red-500/20',
  },
};
