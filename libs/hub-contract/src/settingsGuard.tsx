import { createContext, useContext, type MouseEvent } from 'react';
import { useNavigate } from 'react-router';

/** What a settings screen offers to anything that navigates away from it. */
export interface SettingsLeaveGuard {
  /** A section has unsaved edits. */
  isDirty: () => boolean;
  /** Runs `proceed` now when nothing is unsaved, otherwise after the user confirms leaving. */
  confirmLeave: (proceed: () => void) => void;
}

const NO_GUARD: SettingsLeaveGuard = {
  isDirty: () => false,
  confirmLeave: (proceed) => proceed(),
};

export const SettingsLeaveGuardContext = createContext<SettingsLeaveGuard>(NO_GUARD);

export const useSettingsLeaveGuard = () => useContext(SettingsLeaveGuardContext);

const isPlainLeftClick = (event: MouseEvent) =>
  event.button === 0 && !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);

/**
 * Click handler for a link that must not silently discard unsaved settings. Modified clicks (new tab)
 * and clean screens are left to the link itself; otherwise navigation waits for confirmation.
 */
export function useGuardedNavigation() {
  const guard = useSettingsLeaveGuard();
  const navigate = useNavigate();
  return (event: MouseEvent, to: string) => {
    if (event.defaultPrevented || !isPlainLeftClick(event) || !guard.isDirty()) return;
    event.preventDefault();
    guard.confirmLeave(() => void navigate(to));
  };
}
