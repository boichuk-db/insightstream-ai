import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Select } from './select';

const meta: Meta<typeof Select> = {
  title: 'UI/Select',
  component: Select,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Select>;

const OPTIONS = ['all', 'bug', 'feature', 'ux', 'performance'];

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState('all');
    return <Select value={value} onChange={setValue} options={OPTIONS} />;
  },
};

export const WithPlaceholder: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <Select
        value={value}
        onChange={setValue}
        options={OPTIONS}
        placeholder="Select category"
      />
    );
  },
};
