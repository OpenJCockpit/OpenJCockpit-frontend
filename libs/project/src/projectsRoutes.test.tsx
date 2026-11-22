import { Route, Routes, useNavigate, useRoutes } from 'react-router';
import { useEffect, useRef } from 'react';
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import * as api from '@openjcockpit/api';
import { clickAsync } from './testUtils';
import { renderHub } from './testHub';
import { projectsRoutes } from './projectsRoutes';

vi.mock('@openjcockpit/api', async (importOriginal) =>
  (await import('./testUtils')).automockApiClients(await importOriginal()),
);
// The wizard chunk never arrives, so the Suspense fallback stays on screen.
vi.mock('./ProjectWizard/ProjectWizard', () => new Promise(() => {}));

function Mounted() {
  return useRoutes(projectsRoutes);
}

function GoTo({ to }: { to: string }) {
  const navigate = useNavigate();
  const done = useRef(false);
  // Once only: `navigate` changes with the location, which would pull the page back here.
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void navigate(to);
  }, [navigate, to]);
  return null;
}

describe('projectsRoutes', () => {
  it('shows the page chrome while the wizard loads and goes back to the list', async () => {
    vi.mocked(api.loadAllProjects).mockResolvedValue([]);
    await renderHub(
      <>
        <Routes>
          <Route path="/projects/*" element={<Mounted />} />
        </Routes>
        <GoTo to="/projects/new" />
      </>,
    );
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/projects/new'));
    expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument();

    await clickAsync(screen.getByRole('button', { name: /back/i }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/projects$/));
  });
});
