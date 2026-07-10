import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { Drawer } from './drawer';
import { Button } from './button';

const meta: Meta<typeof Drawer> = {
  title: 'UI/Drawer',
  component: Drawer,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Drawer>;

function Controlled() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open drawer</Button>
      <Drawer isOpen={open} onClose={() => setOpen(false)}>
        <div className="p-6 text-brand-fg">Drawer content</div>
      </Drawer>
    </>
  );
}

export const Default: Story = {
  render: () => <Controlled />,
};
