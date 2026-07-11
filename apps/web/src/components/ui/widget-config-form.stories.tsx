import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { WidgetConfigForm } from './widget-config-form';
import { WIDGET_COLORS, WIDGET_SHAPES, WIDGET_POSITIONS, WIDGET_FRAMEWORKS } from '@/lib/widgetSnippet';

const meta: Meta<typeof WidgetConfigForm> = {
  title: 'UI/WidgetConfigForm',
  component: WidgetConfigForm,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof WidgetConfigForm>;

function Controlled() {
  const [color, setColor] = useState<(typeof WIDGET_COLORS)[number]['value']>(WIDGET_COLORS[0].value);
  const [shape, setShape] = useState<(typeof WIDGET_SHAPES)[number]>('rounded');
  const [position, setPosition] = useState<(typeof WIDGET_POSITIONS)[number]>('bottom-right');
  const [framework, setFramework] = useState<(typeof WIDGET_FRAMEWORKS)[number]>('html');

  return (
    <WidgetConfigForm
      color={color}
      onColorChange={setColor}
      shape={shape}
      onShapeChange={setShape}
      position={position}
      onPositionChange={setPosition}
      framework={framework}
      onFrameworkChange={setFramework}
    />
  );
}

export const Default: Story = {
  render: () => <Controlled />,
};
