import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { Monitor, Sun, Moon } from 'lucide-react';
import { SegmentedControl } from './segmented-control';

const meta: Meta<typeof SegmentedControl> = {
  title: 'UI/SegmentedControl',
  component: SegmentedControl,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SegmentedControl>;

function Controlled() {
  const [value, setValue] = useState('rounded');
  return (
    <SegmentedControl
      options={[
        { label: 'Circle', value: 'circle' },
        { label: 'Square', value: 'square' },
        { label: 'Rounded', value: 'rounded' },
      ]}
      value={value}
      onChange={setValue}
    />
  );
}

export const Default: Story = {
  render: () => <Controlled />,
};

function ControlledWithIcons() {
  const [value, setValue] = useState('system');
  return (
    <SegmentedControl
      options={[
        { label: 'System', value: 'system', icon: Monitor },
        { label: 'Light', value: 'light', icon: Sun },
        { label: 'Dark', value: 'dark', icon: Moon },
      ]}
      value={value}
      onChange={setValue}
    />
  );
}

export const WithIcons: Story = {
  render: () => <ControlledWithIcons />,
};
