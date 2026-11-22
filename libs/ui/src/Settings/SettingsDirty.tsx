import { createContext, useContext, useEffect, useId } from 'react';

/** Receives the dirty state of each form in a section; the host provides it to guard against leaving. */
export type SettingsDirtyReporter = (source: string, dirty: boolean) => void;

export const SettingsDirtyContext = createContext<SettingsDirtyReporter | null>(null);

/** Reports `dirty` to the surrounding settings screen (no-op outside one) and clears it on unmount. */
export function useReportSettingsDirty(dirty: boolean) {
  const report = useContext(SettingsDirtyContext);
  const source = useId();
  useEffect(() => {
    if (!report) return undefined;
    report(source, dirty);
    return () => report(source, false);
  }, [report, source, dirty]);
}
