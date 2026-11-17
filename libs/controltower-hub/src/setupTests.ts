import '@testing-library/jest-dom/vitest';
import { beforeEach, vi } from 'vitest';
import { stubApi } from './testUtils';

vi.mock('@openjcockpit/api', async (importOriginal) => {
  // Every ControlTower request becomes a mock; the rest of the library stays real.
  const original = await importOriginal<Record<string, unknown>>();
  const mocked = Object.fromEntries(
    Object.entries(original)
      .filter(([name, value]) => /ControlTower/.test(name) && typeof value === 'function')
      .map(([name]) => [name, vi.fn()]),
  );
  return { ...original, ...mocked };
});

beforeEach(() => {
  sessionStorage.clear();
  stubApi();
});
