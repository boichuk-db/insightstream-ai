import type { Meta, StoryObj } from '@storybook/react';
import { FilterBar } from './FilterBar';

const meta: Meta<typeof FilterBar> = {
  title: 'Dashboard/FilterBar',
  component: FilterBar,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof FilterBar>;

const baseArgs = {
  searchText: '',
  onSearchChange: () => {},
  selectedTags: [],
  onToggleTag: () => {},
  allTags: ['onboarding', 'ux', 'export', 'kanban', 'positive'],
  totalCount: 42,
  filteredCount: 42,
  hasActiveFilters: false,
  onClearFilters: () => {},
};

export const Default: Story = {
  args: baseArgs,
};

export const WithActiveFilters: Story = {
  args: {
    ...baseArgs,
    selectedTags: ['ux', 'onboarding'],
    filteredCount: 8,
    hasActiveFilters: true,
  },
};
