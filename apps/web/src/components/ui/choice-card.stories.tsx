import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { ChoiceCard } from './choice-card';

const meta: Meta<typeof ChoiceCard> = {
  title: 'UI/ChoiceCard',
  component: ChoiceCard,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ChoiceCard>;

function Controlled() {
  const [selected, setSelected] = useState(false);
  return (
    <ChoiceCard selected={selected} onClick={() => setSelected((s) => !s)}>
      Feed view
    </ChoiceCard>
  );
}

export const Default: Story = {
  render: () => <Controlled />,
};
