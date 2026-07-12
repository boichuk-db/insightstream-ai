import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// test.globals isn't set on this project (shared config with the storybook
// project), so @testing-library/react's own automatic cleanup registration
// never engages. Without this, render()-based tests with multiple `it`
// blocks leak DOM across tests within the same file.
afterEach(cleanup);
