import { Outlet, useNavigate, type RouteObject } from 'react-router';
import { DASHBOARD_PATH, RequireProject, useHubHeader } from '@openjcockpit/hub-contract';
import { EvidenceDetailPage } from './EvidenceDetailPage/EvidenceDetailPage';
import { EvidenceListPage } from './EvidenceListPage/EvidenceListPage';
import { WithTranslations } from './registerTranslations';
import { EVIDENCE_ROUTE } from './routePaths';

export { EVIDENCE_ROUTE };

function ListPage() {
  const navigate = useNavigate();
  return <EvidenceListPage onBack={() => void navigate(DASHBOARD_PATH)} header={useHubHeader()} />;
}

function DetailPage() {
  const navigate = useNavigate();
  return (
    <EvidenceDetailPage onBack={() => void navigate(EVIDENCE_ROUTE)} header={useHubHeader()} />
  );
}

/** Relative to the app route, which the host mounts as `/evidence/*`. */
export const evidenceRoutes: RouteObject[] = [
  {
    element: (
      <RequireProject>
        <WithTranslations>
          <Outlet />
        </WithTranslations>
      </RequireProject>
    ),
    children: [
      { index: true, element: <ListPage /> },
      { path: ':runId', element: <DetailPage /> },
    ],
  },
];
