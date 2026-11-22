import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DangerZone } from './DangerZone';
import { SettingsDirtyContext } from './SettingsDirty';
import { SettingsForm } from './SettingsForm';
import { SettingsGroup } from './SettingsGroup';
import { SettingsRow } from './SettingsRow';
import { SettingsStatus } from './SettingsStatus';

describe('SettingsGroup', () => {
  it('names the region after its title and exposes the anchor id', () => {
    render(
      <SettingsGroup id="general" title="General" description="Basics" className="extra">
        <p>body</p>
      </SettingsGroup>,
    );
    const region = screen.getByRole('region', { name: 'General' });
    expect(region).toHaveAttribute('id', 'general');
    expect(region).toHaveClass('extra');
    expect(screen.getByText('Basics')).toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
  });

  it('works without an id or description', () => {
    render(<SettingsGroup title="Other">x</SettingsGroup>);
    expect(screen.getByRole('region', { name: 'Other' })).not.toHaveAttribute('id');
    expect(screen.getByRole('heading', { name: 'Other' })).toBeInTheDocument();
  });

  it('renders no header without a title or description', () => {
    render(<SettingsGroup data-testid="g">x</SettingsGroup>);
    expect(screen.getByTestId('g')).not.toHaveAttribute('aria-labelledby');
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('renders a description without a title', () => {
    render(<SettingsGroup description="Only text">x</SettingsGroup>);
    expect(screen.getByText('Only text')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});

describe('SettingsRow', () => {
  it('wires the label to the control', () => {
    render(
      <SettingsRow label="Theme" description="Colour scheme" htmlFor="theme" className="extra">
        <input id="theme" />
      </SettingsRow>,
    );
    expect(screen.getByLabelText('Theme')).toBeInTheDocument();
    expect(screen.getByText('Colour scheme')).toBeInTheDocument();
  });

  it('omits the description when absent', () => {
    render(
      <SettingsRow label="Language">
        <span>control</span>
      </SettingsRow>,
    );
    expect(screen.getByText('Language')).toBeInTheDocument();
  });
});

describe('SettingsStatus', () => {
  it.each(['connected', 'notConfigured', 'failing'] as const)('renders %s', (state) => {
    render(<SettingsStatus state={state} label={`label-${state}`} data-testid="s" />);
    expect(screen.getByText(`label-${state}`)).toBeInTheDocument();
  });

  it('shows the detail line when given', () => {
    render(<SettingsStatus state="failing" label="Failing" detail="timeout" className="x" />);
    expect(screen.getByText('timeout')).toBeInTheDocument();
  });
});

function renderForm(over: Partial<React.ComponentProps<typeof SettingsForm>> = {}) {
  const onSubmit = vi.fn();
  const onReset = vi.fn();
  render(
    <SettingsForm
      onSubmit={onSubmit}
      onReset={onReset}
      dirty
      saveLabel="Save"
      savingLabel="Saving"
      savedLabel="Saved"
      resetLabel="Reset"
      {...over}
    >
      <input aria-label="name" />
    </SettingsForm>,
  );
  return { onSubmit, onReset };
}

describe('SettingsForm', () => {
  it('submits and resets when dirty', () => {
    const { onSubmit, onReset } = renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('disables both buttons and ignores submit when clean', () => {
    const { onSubmit } = renderForm({ dirty: false });
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
    fireEvent.submit(screen.getByLabelText('name').closest('form')!);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the saving label and ignores submit while saving', () => {
    const { onSubmit } = renderForm({ saving: true });
    expect(screen.getByRole('button', { name: 'Saving' })).toBeDisabled();
    fireEvent.submit(screen.getByLabelText('name').closest('form')!);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('hides Reset without a handler', () => {
    renderForm({ onReset: undefined });
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();
  });

  it('shows an alert for an error and suppresses the saved message', () => {
    renderForm({ error: 'Boom', saved: true, dirty: false });
    expect(screen.getByRole('alert')).toHaveTextContent('Boom');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the saved message only while clean', () => {
    renderForm({ saved: true, dirty: false });
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
  });

  it('hides the saved message once edited again', () => {
    renderForm({ saved: true, dirty: true });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

function renderDanger(onConfirm: () => Promise<unknown> | void) {
  render(
    <DangerZone
      title="Delete project"
      description="Cannot be undone"
      actionLabel="Delete"
      confirmTitle="Really?"
      confirmMessage="Sure?"
      confirmLabel="Yes"
      cancelLabel="No"
      busyLabel="Deleting"
      failedLabel="Failed"
      onConfirm={onConfirm}
      className="extra"
    />,
  );
}

describe('DangerZone', () => {
  it('asks before running the action and closes on success', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    renderDanger(onConfirm);
    expect(screen.queryByText('Really?')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByText('Really?')).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('confirm-action-confirm'));
    await waitFor(() => expect(screen.queryByText('Really?')).not.toBeInTheDocument());
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('cancels without running the action', () => {
    const onConfirm = vi.fn();
    renderDanger(onConfirm);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByTestId('confirm-action-cancel'));
    expect(screen.queryByText('Really?')).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('keeps the dialog open with the failure message when the action rejects', async () => {
    renderDanger(() => Promise.reject(new Error('nope')));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByTestId('confirm-action-confirm'));
    expect(await screen.findByTestId('confirm-action-error')).toHaveTextContent('Failed');
    expect(screen.getByText('Really?')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-action-cancel'));
    expect(screen.queryByTestId('confirm-action-error')).not.toBeInTheDocument();
  });

  it('shows the busy label while the action runs', async () => {
    let finish: () => void = () => undefined;
    renderDanger(() => new Promise<void>((resolve) => (finish = resolve)));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByTestId('confirm-action-confirm'));
    expect(await screen.findByText('Deleting')).toBeInTheDocument();
    finish();
    await waitFor(() => expect(screen.queryByText('Really?')).not.toBeInTheDocument());
  });
});

describe('SettingsForm dirty reporting', () => {
  it('reports its dirty state to the screen and clears it on unmount', () => {
    const report = vi.fn();
    const form = (dirty: boolean) => (
      <SettingsDirtyContext.Provider value={report}>
        <SettingsForm
          dirty={dirty}
          onSubmit={() => undefined}
          saveLabel="Save"
          savingLabel="Saving"
          savedLabel="Saved"
          resetLabel="Reset"
        >
          x
        </SettingsForm>
      </SettingsDirtyContext.Provider>
    );
    const { rerender, unmount } = render(form(true));
    const source = report.mock.calls[0]?.[0];
    expect(report).toHaveBeenLastCalledWith(source, true);
    rerender(form(false));
    expect(report).toHaveBeenLastCalledWith(source, false);
    rerender(form(true));
    unmount();
    expect(report).toHaveBeenLastCalledWith(source, false);
  });
});
