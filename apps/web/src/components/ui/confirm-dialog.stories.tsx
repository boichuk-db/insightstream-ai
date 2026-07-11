import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { ConfirmDialog } from './confirm-dialog';
import { Button } from './button';

const meta: Meta<typeof ConfirmDialog> = {
  title: 'UI/ConfirmDialog',
  component: ConfirmDialog,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ConfirmDialog>;

function Controlled() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>Delete project</Button>
      <ConfirmDialog
        isOpen={open}
        title="Delete project?"
        message="This action cannot be undone. All feedback data for this project will be permanently deleted."
        confirmLabel="Delete"
        danger
        onConfirm={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}

export const Default: Story = {
  render: () => <Controlled />,
};

export const Confirming: Story = {
  args: {
    isOpen: true,
    title: 'Delete project?',
    message: 'This action cannot be undone. All feedback data for this project will be permanently deleted.',
    confirmLabel: 'Delete',
    danger: true,
    isConfirming: true,
    onConfirm: () => {},
    onCancel: () => {},
  },
};
