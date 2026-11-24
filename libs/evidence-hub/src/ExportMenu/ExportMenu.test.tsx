import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createI18n, I18nProvider } from '@openjcockpit/i18n';
import { WithTranslations } from '../registerTranslations';
import { ExportMenu } from './ExportMenu';

function renderMenu(props: Partial<React.ComponentProps<typeof ExportMenu>> = {}) {
  const onExport = vi.fn();
  const i18n = createI18n({ locale: 'en', resources: {} });
  render(
    <I18nProvider i18n={i18n}>
      <WithTranslations>
        <ExportMenu label="Export this run" onExport={onExport} {...props} />
      </WithTranslations>
    </I18nProvider>,
  );
  return onExport;
}
const open = () => fireEvent.click(screen.getByRole('button', { name: 'Export this run' }));

describe('ExportMenu', () => {
  it('offers the four formats and exports the chosen one', () => {
    const onExport = renderMenu();
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    open();
    expect(screen.getAllByRole('button')).toHaveLength(5);
    fireEvent.click(screen.getByText('PDF (report)'));
    expect(onExport).toHaveBeenCalledWith('pdf', false);
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('passes includeOutputs for json, markdown and pdf but never for csv', () => {
    const onExport = renderMenu();
    open();
    fireEvent.click(screen.getByLabelText('Include agent outputs'));
    fireEvent.click(screen.getByText('JSON (full data)'));
    expect(onExport).toHaveBeenLastCalledWith('json', true);
    open();
    fireEvent.click(screen.getByText('CSV (timeline events)'));
    expect(onExport).toHaveBeenLastCalledWith('csv', false);
    open();
    fireEvent.click(screen.getByText('Markdown (report)'));
    expect(onExport).toHaveBeenLastCalledWith('markdown', true);
  });

  it('closes on Escape and on an outside click', () => {
    renderMenu();
    open();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    open();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('is disabled while pending and shows an inline error', () => {
    renderMenu({ pending: true, error: true });
    expect(screen.getByRole('button', { name: 'Export this run' })).toBeDisabled();
    expect(screen.getByText('Exporting…')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('The export failed. Try again.');
  });
});
