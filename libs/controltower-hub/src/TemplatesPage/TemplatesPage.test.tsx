import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { chooseOption } from '@openjcockpit/ui/testing';
import { controltowerRoutes } from '../controltowerRoutes';
import { sampleQuestions } from '../sampleQuestions';
import { ct, FEATURE_TEMPLATE, renderRoutes, TEMPLATE } from '../testUtils';

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
    fireEvent.click(screen.getByRole('button', { name: 'Edit as JSON' }));
    fireEvent.change(screen.getByRole('textbox', { name: /Questions/ }), {
      target: { value: '{' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save template' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('not valid JSON');
    expect(ct.createControlTowerTemplate).not.toHaveBeenCalled();
  });

  it('edits questions in the form editor: add, reorder and remove', async () => {
    ct.createControlTowerTemplate.mockResolvedValue(TEMPLATE_RESULT);
    renderRoutes(controltowerRoutes, { path });
    fireEvent.change((await screen.findAllByRole('textbox', { name: /Template name/ }))[0]!, {
      target: { value: 'Mine' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Remove question 3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move question 2 up' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add question' }));
    const texts = screen.getAllByRole('textbox', { name: /^Question/ });
    fireEvent.change(texts[2]!, { target: { value: 'Extra?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save template' }));
    expect(await screen.findByText('Template saved.')).toBeInTheDocument();
    const [first, second] = sampleQuestions('PROJECT');
    expect(ct.createControlTowerTemplate).toHaveBeenCalledWith({
      name: 'Mine',
      kind: 'PROJECT',
      questions: [
        second,
        first,
        {
          id: 'question-3',
          text: 'Extra?',
          required: true,
          maxFollowUps: 2,
          completionCriteria: '',
        },
      ],
    });
  });

  it('asks before replacing edited questions when the kind changes', async () => {
    renderRoutes(controltowerRoutes, { path });
    fireEvent.click(await screen.findByRole('button', { name: 'Remove question 1' }));
    chooseOption(screen.getByRole('combobox', { name: /Interview type/ }), 'New feature');
    expect(await screen.findByText('Replace edited questions?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Replace' }));
    expect(await screen.findAllByRole('group', { name: /Question/ })).toHaveLength(3);
  });

  it('edits, duplicates and deletes saved templates but protects built-in ones', async () => {
    ct.listControlTowerTemplates.mockResolvedValue([
      { ...TEMPLATE, builtIn: true },
      { ...FEATURE_TEMPLATE, questions: sampleQuestions('FEATURE') },
    ]);
    ct.updateControlTowerTemplate.mockResolvedValue(TEMPLATE_RESULT);
    ct.deleteControlTowerTemplate.mockResolvedValue(undefined);
    renderRoutes(controltowerRoutes, { path });
    await screen.findByText('Standard project');
    expect(screen.queryByRole('button', { name: 'Edit Standard project' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete Standard project' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Duplicate Standard project' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit Feature' }));
    fireEvent.change(screen.getAllByRole('textbox', { name: /Template name/ })[0]!, {
      target: { value: 'Feature v2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update template' }));
    expect(await screen.findByText('Template saved.')).toBeInTheDocument();
    expect(ct.updateControlTowerTemplate).toHaveBeenCalledWith('t2', {
      name: 'Feature v2',
      kind: 'FEATURE',
      questions: sampleQuestions('FEATURE'),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Delete Feature' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Template deleted.')).toBeInTheDocument();
    expect(ct.deleteControlTowerTemplate).toHaveBeenCalledWith('t2');
  });

  it('duplicating prefills the form as a new template', async () => {
    renderRoutes(controltowerRoutes, { path });
    fireEvent.click(await screen.findByRole('button', { name: 'Duplicate Feature' }));
    expect(screen.getAllByRole('textbox', { name: /Template name/ })[0]).toHaveValue(
      'Feature (copy)',
    );
    expect(screen.getByRole('button', { name: 'Save template' })).toBeInTheDocument();
  });

  it('shows a backend failure when saving an interview template', async () => {
    ct.createControlTowerTemplate.mockRejectedValueOnce(new Error('Name taken'));
    renderRoutes(controltowerRoutes, { path });
    fireEvent.change((await screen.findAllByRole('textbox', { name: /Template name/ }))[0]!, {
      target: { value: 'Mine' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save template' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Name taken');
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
