import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { LayoutDashboard } from 'lucide-react';
import { NavItem } from './nav-item';

const meta: Meta<typeof NavItem> = {
  title: 'UI/NavItem',
  component: NavItem,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof NavItem>;

export const Default: Story = {
  args: { href: '#', icon: LayoutDashboard, label: 'Dashboard', active: false },
};

export const Active: Story = {
  args: { href: '#', icon: LayoutDashboard, label: 'Dashboard', active: true },
};

export const WithBadge: Story = {
  args: {
    href: '#',
    icon: LayoutDashboard,
    label: 'Feedback',
    active: false,
    badge: (
      <span className="bg-brand-accent text-brand-bg rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">
        3
      </span>
    ),
  },
};
