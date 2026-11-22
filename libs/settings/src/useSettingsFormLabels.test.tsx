import { renderHook } from '@testing-library/react';
import { withI18n } from '@openjcockpit/i18n/testing';
import { describe, expect, it } from 'vitest';
import { useSettingsFormLabels } from './useSettingsFormLabels';

describe('useSettingsFormLabels', () => {
  it('returns the four standard form texts', () => {
    const { result } = renderHook(() => useSettingsFormLabels(), {
      wrapper: ({ children }) => withI18n(<>{children}</>),
    });
    expect(result.current).toEqual({
      saveLabel: 'Save',
      savingLabel: 'Saving…',
      savedLabel: 'Saved.',
      resetLabel: 'Reset',
    });
  });
});
