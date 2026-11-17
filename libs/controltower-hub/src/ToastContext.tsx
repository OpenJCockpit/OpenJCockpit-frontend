import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useTranslation } from '@openjcockpit/i18n';
import { ToastRegion, useToasts } from '@openjcockpit/ui';

type Show = ReturnType<typeof useToasts>['show'];

const ToastContext = createContext<Show | null>(null);

/** Shows a success toast; `null` outside the shell (settings sections), where feedback stays inline. */
export function useShowToast(): Show | null {
  return useContext(ToastContext);
}

/** Owns the toast region of the ControlTower shell and lets any page below it raise a toast. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation('controltower');
  const { toasts, show, dismiss } = useToasts();
  const value = useMemo(() => show, [show]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastRegion toasts={toasts} onDismiss={dismiss} dismissLabel={t('dismiss')} />
    </ToastContext.Provider>
  );
}
