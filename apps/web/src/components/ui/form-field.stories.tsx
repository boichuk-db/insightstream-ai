import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Mail } from 'lucide-react';
import { FormField } from './form-field';
import { Input } from './input';

const meta: Meta<typeof FormField> = {
  title: 'UI/FormField',
  component: FormField,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof FormField>;

export const Default: Story = {
  args: {
    label: 'Email',
    required: true,
    icon: Mail,
    // Scoped, not the bare field name ("email") — a consumer copying this
    // pattern into two forms on the same page (e.g. login + team invite,
    // both with an email field) would otherwise collide on a duplicate DOM id.
    htmlFor: 'form-field-demo-email',
    children: <Input id="form-field-demo-email" type="email" placeholder="you@example.com" />,
  },
};
