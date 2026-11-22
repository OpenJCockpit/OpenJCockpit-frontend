import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { controltowerApp } from '../index';
import { ADMIN, ct, renderWith } from '../testUtils';

describe('policy settings section', () => {
  const POLICY = {
    enabled: true,
    url: 'http://opa:8181',
    decisionPath: 'x/decision',
    failOpen: false,
  };

  async function section() {
    return (await controltowerApp.settings![1]!.component()).default;
  }

  it('saves the policy settings and tests the connection', async () => {
    const Section = await section();
    ct.getControlTowerSettings.mockResolvedValue({ policy: POLICY, editable: true });
    ct.saveControlTowerPolicy.mockResolvedValueOnce(POLICY);
    ct.saveControlTowerPolicy.mockResolvedValueOnce({ ...POLICY, enabled: false });
    ct.testControlTowerPolicy.mockResolvedValue({
      reachable: true,
      message: 'OK',
      policies: ['a.rego', 'b.rego'],
    });
    renderWith(<Section />, { permissions: ADMIN });
    const url = await screen.findByRole('textbox', { name: /Agent URL/ });
    expect(url).toHaveValue('http://opa:8181');
    expect(screen.getByRole('button', { name: 'Save policy settings' })).toBeDisabled();
    fireEvent.change(url, { target: { value: 'http://opa:9999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save policy settings' }));
    expect(await screen.findByText(/now checked by the policies/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /Enforce policies/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save policy settings' }));
    expect(await screen.findByText(/Policy checks are off/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));
    expect(await screen.findByText(/Loaded: a.rego, b.rego/)).toBeInTheDocument();
    expect(screen.getByText('Standard policies')).toBeInTheDocument();
  });

  it('shows failures of saving and testing', async () => {
    const Section = await section();
    ct.getControlTowerSettings.mockResolvedValue({ policy: POLICY, editable: true });
    ct.saveControlTowerPolicy.mockRejectedValue(new Error('Forbidden'));
    ct.testControlTowerPolicy.mockRejectedValue(new Error('Unreachable'));
    renderWith(<Section />, { permissions: ADMIN });
    fireEvent.click(await screen.findByRole('checkbox', { name: /fail open/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save policy settings' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Forbidden');
    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));
    expect(await screen.findByText('Unreachable')).toBeInTheDocument();
  });

  it('shows an unreachable agent from the test without policies', async () => {
    const Section = await section();
    ct.getControlTowerSettings.mockResolvedValue({ policy: POLICY, editable: true });
    ct.testControlTowerPolicy.mockResolvedValue({
      reachable: false,
      message: 'No route',
      policies: [],
    });
    renderWith(<Section />, { permissions: ADMIN });
    fireEvent.change(await screen.findByRole('textbox', { name: /Decision path/ }), {
      target: { value: 'y/decision' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /Agent URL/ }), {
      target: { value: 'http://other:1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No route');
  });

  it('is read-only when the backend says the user may not edit', async () => {
    const Section = await section();
    ct.getControlTowerSettings.mockResolvedValue({ policy: POLICY, editable: false });
    renderWith(<Section />);
    expect(await screen.findByRole('textbox', { name: /Agent URL/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save policy settings' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Test connection' })).toBeNull();
  });

  it('retries a failed load', async () => {
    const Section = await section();
    ct.getControlTowerSettings.mockRejectedValueOnce(new Error('x'));
    ct.getControlTowerSettings.mockResolvedValue({ policy: POLICY, editable: true });
    renderWith(<Section />);
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('textbox', { name: /Agent URL/ })).toBeInTheDocument();
  });
});
