import type { Resource } from '@openjcockpit/i18n';
import en from './locales/en.json';

export const controltowerResources: Resource = { en };

declare module '@openjcockpit/i18n' {
  interface Resources {
    controltower: (typeof en)['controltower'];
  }
}
