import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { chooseOption } from '@openjcockpit/ui/testing';
import { controltowerRoutes } from '../controltowerRoutes';
import { sampleQuestions } from '../sampleQuestions';
import { ct, renderRoutes } from '../testUtils';

const TEMPLATE_RESULT = { id: 't9', name: 'Mine', kind: 'FEATURE', questions: [] };

describe('templates', () => {
  const path = '/controltower/templates';

  it('lists both kinds of templates', async () => {
    renderRoutes(controltowerRoutes, { path });
    expect(await screen.findByText('Standard project')).toBeInTheDocument();
    expect(await screen.findByText('Built-in default')).toBeInTheDocument();
    expect(screen.getByText('Custom spec template')).toBeInTheDocument();
  });

  it('saves an interview template with the sample questions of its kind', async () => {
    ct.createControlTowerTemplate.mockResolvedValue(TEMPLATE_RESULT);
    renderRoutes(controltowerRoutes, { path });
    fireEvent.change((await screen.findAllByRole('textbox', { name: /Template name/ }))[0]!, {
      target: { value: 'Mine' },
    });
    chooseOption(screen.getByRole('combobox', { name: /Interview type/ }), 'New feature');
    fireEvent.click(screen.getByRole('button', { name: 'Save template' }));
    expect(await screen.findByText('Template saved.')).toBeInTheDocument();
    expect(ct.createControlTowerTemplate).toHaveBeenCalledWith({
      name: 'Mine',
      kind: 'FEATURE',
      questions: sampleQuestions('FEATURE'),
    });
  });

  it('rejects questions that are not JSON', async () => {
    renderRoutes(controltowerRoutes, { path });
    fireEvent.change((await screen.findAllByRole('textbox', { name: /Template name/ }))[0]!, {
      target: { value: 'Mine' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /Questions/ }), {
      target: { value: '{' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save template' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('not valid JSON');
    expect(ct.createControlTowerTemplate).not.toHaveBeenCalled();
  });

  it('saves a spec template and shows a backend failure', async () => {
    ct.createControlTowerSpecTemplate.mockRejectedValueOnce(new Error('Name taken'));
    ct.createControlTowerSpecTemplate.mockResolvedValueOnce({});
    renderRoutes(controltowerRoutes, { path });
    const name = (await screen.findAllByRole('textbox', { name: /Template name/ }))[1]!;
    fireEvent.change(name, { target: { value: 'Spec' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save spec template' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Name taken');
    fireEvent.click(screen.getByRole('button', { name: 'Save spec template' }));
    expect(await screen.findByText('Spec template saved.')).toBeInTheDocument();
  });

  it('hides the forms from a viewer and shows load errors and empty lists', async () => {
    ct.listControlTowerTemplates.mockResolvedValue([]);
    ct.listControlTowerSpecTemplates.mockRejectedValue(new Error('x'));
    renderRoutes(controltowerRoutes, { path, permissions: [] });
    expect(await screen.findByText('Nothing here yet.')).toBeInTheDocument();
    expect(await screen.findByText('Failed to load the templates.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save template' })).toBeNull();
  });
});
