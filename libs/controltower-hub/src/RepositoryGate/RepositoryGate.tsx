import { Link, Outlet, useOutletContext } from 'react-router';
import { useTranslation } from '@openjcockpit/i18n';
import type { ControlTowerProject } from '@openjcockpit/api';
import { buttonClass, EmptyState } from '@openjcockpit/ui';
import { ControlTowerQuery } from '../ControlTowerQuery';
import { useControlTowerRepository, useReconcileDispatched } from '../hooks';
import { useWriteAccess } from '../useWriteAccess';
import { CONTROLTOWER_REPOSITORY_SETTINGS_PATH } from '../routePaths';

/** The repository the pages below work on, provided by `RepositoryGate`. */
export function useRepository(): ControlTowerProject {
  return useOutletContext<ControlTowerProject>();
}

/** Lets OpenJCockpit finish dispatched specs once per visit; renders nothing. */
function ReconcileDispatched({ repositoryId }: { repositoryId: string }) {
  useReconcileDispatched(repositoryId, useWriteAccess());
  return null;
}

/** Renders its child routes once the selected Cockpit project has a linked ControlTower repository. */
export function RepositoryGate() {
  const { t } = useTranslation('controltower');
  const repository = useControlTowerRepository();

  return (
    <ControlTowerQuery
      query={repository}
      loadFailed={t('repository.loadFailed')}
      none={
        <EmptyState
          title={t('repository.noneTitle')}
          hint={t('repository.noneHint')}
          action={
            <Link
              className={buttonClass({ variant: 'primary' })}
              to={CONTROLTOWER_REPOSITORY_SETTINGS_PATH}
            >
              {t('repository.connect')}
            </Link>
          }
        />
      }
    >
      {(data) => (
        <>
          <ReconcileDispatched repositoryId={data.id} />
          <Outlet context={data} />
        </>
      )}
    </ControlTowerQuery>
  );
}
