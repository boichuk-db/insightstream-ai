import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { Tabs } from './tabs';

const meta: Meta<typeof Tabs> = {
  title: 'UI/Tabs',
  component: Tabs,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Tabs>;

function Controlled() {
  const [active, setActive] = useState('all');
  return (
    <Tabs
      tabs={[
        { label: 'All', value: 'all' },
        { label: 'Active', value: 'active' },
        { label: 'Archived', value: 'archived' },
      ]}
      activeTab={active}
      onChange={setActive}
    />
  );
}

export const Default: Story = {
  render: () => <Controlled />,
};

function ControlledWithRightSlot() {
  const [active, setActive] = useState('all');
  return (
    <Tabs
      tabs={[
        { label: 'All', value: 'all' },
        { label: 'Active', value: 'active' },
        { label: 'Archived', value: 'archived' },
      ]}
      activeTab={active}
      onChange={setActive}
      rightSlot={<span className="text-xs text-brand-fg-muted">42 items</span>}
    />
  );
}

export const WithRightSlot: Story = {
  render: () => <ControlledWithRightSlot />,
};
