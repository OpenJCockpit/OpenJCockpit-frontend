import type { ReactNode } from 'react';
import { WithTranslations as RegisterNamespace } from '@openjcockpit/i18n';
import en from './locales/en.json';

// English is bundled; every other language is its own chunk, downloaded when it is first needed.
const locales = import.meta.glob<{ default: Record<string, unknown> }>([
  './locales/*.json',
  '!**/en.json',
]);

/** Registers the project namespace with the shared i18n instance, for views that may run without the host's bundle. */
export function WithTranslations({ children }: { children: ReactNode }) {
  return (
    <RegisterNamespace namespace="project" english={en.project} locales={locales}>
      {children}
    </RegisterNamespace>
  );
}
