import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createI18n, I18nProvider, useTranslation, type Locale } from '@openjcockpit/i18n';
import { WithTranslations } from './registerTranslations';

function Title() {
  const { t } = useTranslation('project');
  return <h1>{t('page.title')}</h1>;
}

describe('WithTranslations', () => {
  it.each<[Locale, string]>([
    ['en', 'Projects'],
    ['nl', 'Projecten'],
    ['de', 'Projekte'],
    ['es', 'Proyectos'],
  ])('registers the project texts without the host (%s)', async (locale, title) => {
    const i18n = createI18n({ locale, resources: {} });
    render(
      <I18nProvider i18n={i18n}>
        <WithTranslations>
          <Title />
        </WithTranslations>
      </I18nProvider>,
    );
    expect(await screen.findByText(title)).toBeInTheDocument();
  });
});
