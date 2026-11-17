import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { chooseOption } from '@openjcockpit/ui/testing';
import { controltowerApp } from '../index';
import { ct, renderWith, REPOSITORY } from '../testUtils';

describe('repository settings section', () => {
  async function section() {
    const Section = (await controltowerApp.settings![0]!.component()).default;
    return Section;
  }

  it('edits the linked repository and keeps the stored secret when left empty', async () => {
    const Section = await section();
    ct.updateControlTowerProject.mockResolvedValue(REPOSITORY);
    renderWith(<Section />);
    const name = await screen.findByRole('textbox', { name: /Repository name/ });
    expect(name).toHaveValue('demo-repo');
    fireEvent.change(name, { target: { value: 'renamed' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Base branch/ }), {
      target: { value: 'develop' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save repository' }));
    expect(await screen.findByText('Repository saved.')).toBeInTheDocument();
    expect(ct.updateControlTowerProject).toHaveBeenCalledWith('r1', {
      name: 'renamed',
      gitUrl: 'https://github.com/org/demo.git',
      defaultBranch: 'develop',
      credentialType: 'HTTPS_TOKEN',
      gitUsername: undefined,
      secret: undefined,
      workflowId: 'wf1',
      cockpitProjectId: 'cp1',
    });
  });

  it('connects a first repository to the selected project', async () => {
    const Section = await section();
    ct.getControlTowerProjectByCockpitProject.mockResolvedValue(null);
    ct.createControlTowerProject.mockResolvedValue(REPOSITORY);
    renderWith(<Section />);
    fireEvent.change(await screen.findByRole('textbox', { name: /Repository name/ }), {
      target: { value: 'new' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /Git repository URL/ }), {
      target: { value: 'https://git.example/a.git' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /workflow ID/ }), {
      target: { value: 'wf' },
    });
    chooseOption(screen.getByRole('combobox', { name: /Authentication/ }), 'Username and password');
    fireEvent.change(screen.getByRole('textbox', { name: /Git username/ }), {
      target: { value: 'me' },
    });
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'pw' } });
    fireEvent.click(screen.getByRole('button', { name: 'Connect repository' }));
    expect(await screen.findByText('Repository connected.')).toBeInTheDocument();
    expect(ct.createControlTowerProject).toHaveBeenCalledWith(
      expect.objectContaining({
        cockpitProjectId: 'cp1',
        credentialType: 'USERNAME_PASSWORD',
        gitUsername: 'me',
        secret: 'pw',
      }),
    );
  });

  it('shows a failed save', async () => {
    const Section = await section();
    ct.updateControlTowerProject.mockRejectedValue(new Error('Host not allowed'));
    renderWith(<Section />);
    await screen.findByRole('textbox', { name: /Repository name/ });
    fireEvent.click(screen.getByRole('button', { name: 'Save repository' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Host not allowed');
  });

  it('checks the connection and reports both outcomes', async () => {
    const Section = await section();
    ct.checkControlTowerConnection.mockResolvedValueOnce({
      reachable: true,
      outcome: 'OK',
      message: 'Reachable',
    });
    ct.checkControlTowerConnection.mockRejectedValueOnce(new Error('Timeout'));
    renderWith(<Section />);
    await screen.findByRole('textbox', { name: /Repository name/ });
    fireEvent.click(screen.getByRole('button', { name: 'Check connection' }));
    expect(await screen.findByText('Reachable')).toBeInTheDocument();
    expect(ct.checkControlTowerConnection).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'r1', gitUsername: undefined, secret: undefined }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Check connection' }));
    expect(await screen.findByText('Timeout')).toBeInTheDocument();
  });

  it('is read-only for a viewer', async () => {
    const Section = await section();
    renderWith(<Section />, { permissions: [] });
    expect(await screen.findByRole('textbox', { name: /Repository name/ })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save repository' })).toBeNull();
  });

  it('retries a failed load', async () => {
    const Section = await section();
    ct.getControlTowerProjectByCockpitProject.mockRejectedValueOnce(new Error('x'));
    renderWith(<Section />);
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('textbox', { name: /Repository name/ })).toBeInTheDocument();
  });

  it('shows an empty Git URL for a repository without one', async () => {
    ct.getControlTowerProjectByCockpitProject.mockResolvedValue({ ...REPOSITORY, gitUrl: null });
    const Section = await section();
    renderWith(<Section />);
    expect(await screen.findByRole('textbox', { name: /Git repository URL/ })).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Check connection' })).toBeDisabled();
  });
});
