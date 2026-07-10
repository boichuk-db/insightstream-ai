import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { FeedbackStatus } from '@insightstream/shared-types';
import { StatusSelect } from './status-select';

const meta: Meta<typeof StatusSelect> = {
  title: 'UI/StatusSelect',
  component: StatusSelect,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof StatusSelect>;

function Controlled() {
  const [value, setValue] = useState(FeedbackStatus.NEW);
  return <StatusSelect value={value} onChange={setValue} />;
}

export const Default: Story = {
  render: () => <Controlled />,
};
