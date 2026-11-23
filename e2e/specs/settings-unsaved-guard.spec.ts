/**
 * settings-unsaved-guard.spec.ts
 *
 * Proves the Settings screen guards unsaved edits: switching sections through the nav asks for
 * confirmation while a form is dirty, "Keep editing" stays put with the edit intact, and
 * "Leave without saving" navigates. Nothing is saved, so the spec never writes.
 * The browser back button is deliberately not guarded (the host uses <BrowserRouter>).
 */

import { test, expect } from '../support/fixtures.js';
import { enterDashboard } from '../support/enterDashboard.js';

test.describe('settings unsaved-changes guard', () => {
  test('confirms before leaving a dirty section through the nav', async ({ page }) => {
    await enterDashboard(page);
    await page.getByTestId('nav-settings').click();

    const nav = page.getByTestId('settings-nav');
    await nav.getByTestId('settings-nav-workflow-opa').click();

    const baseUrl = page.getByLabel('Base URL');
    await expect(baseUrl).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();

    await baseUrl.fill('http://unsaved-edit.invalid:8181');
    await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled();

    // Try to leave: the confirm dialog appears and the section stays.
    await nav.getByTestId('settings-nav-workflow-a2a').click();
    const dialog = page.getByRole('dialog', { name: 'Unsaved changes' });
    await expect(dialog).toBeVisible();

    // Keep editing: dialog closes, the edit survives.
    await dialog.getByRole('button', { name: 'Keep editing' }).click();
    await expect(dialog).toBeHidden();
    await expect(baseUrl).toHaveValue('http://unsaved-edit.invalid:8181');

    // Leave: the other section opens.
    await nav.getByTestId('settings-nav-workflow-a2a').click();
    await page
      .getByRole('dialog', { name: 'Unsaved changes' })
      .getByRole('button', { name: 'Leave without saving' })
      .click();
    await expect(page).toHaveURL(/\/settings\/workflow-a2a$/);
    await expect(page.getByRole('dialog', { name: 'Unsaved changes' })).toBeHidden();
  });
});
