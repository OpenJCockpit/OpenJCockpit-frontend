import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useTranslation } from '@openjcockpit/i18n';
import { SettingsLeaveGuardContext, type SettingsLeaveGuard } from '@openjcockpit/hub-contract';
import { SettingsDirtyContext, useConfirmDialog } from '@openjcockpit/ui';

/**
 * Tracks which forms of the open section hold unsaved edits, asks before navigating away from them
 * and warns before the tab closes. The browser's back button is not guarded: the dashboard uses
 * `<BrowserRouter>`, which has no `useBlocker`.
 */
export function SettingsDirtyProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation('dashboard');
  const { confirm, dialog } = useConfirmDialog();
  const dirtySources = useRef(new Set<string>());

  const report = useCallback((source: string, dirty: boolean) => {
    if (dirty) dirtySources.current.add(source);
    else dirtySources.current.delete(source);
  }, []);

  const guard = useMemo<SettingsLeaveGuard>(() => {
    const isDirty = () => dirtySources.current.size > 0;
    return {
      isDirty,
      confirmLeave: (proceed) => {
        if (!isDirty()) {
          proceed();
          return;
        }
        confirm({
          title: t('settings.unsaved.title'),
          message: t('settings.unsaved.message'),
          confirmLabel: t('settings.unsaved.leave'),
          cancelLabel: t('settings.unsaved.stay'),
          busyLabel: t('settings.unsaved.leaving'),
          onConfirm: () => {
            // The section unmounts on navigation and clears its own entry; drop it now so the next
            // guard check does not see edits the user just discarded.
            dirtySources.current.clear();
            proceed();
          },
        });
      },
    };
  }, [confirm, t]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirtySources.current.size === 0) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  return (
    <SettingsDirtyContext.Provider value={report}>
      <SettingsLeaveGuardContext.Provider value={guard}>
        {children}
        {dialog}
      </SettingsLeaveGuardContext.Provider>
    </SettingsDirtyContext.Provider>
  );
}
