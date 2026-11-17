import { Link, useSearchParams } from 'react-router';
import { useTranslation } from '@openjcockpit/i18n';
import {
  EmptyState,
  Panel,
  PanelBody,
  PanelHeader,
  PanelTitle,
  StatusChip,
  StatusMessage,
  buttonClass,
} from '@openjcockpit/ui';
import { ControlTowerQuery } from '../ControlTowerQuery';
import { useSpecs } from '../hooks';
import { CONTROLTOWER_INTERVIEWS_PATH } from '../routePaths';
import { useRepository } from '../RepositoryGate/RepositoryGate';
import { useHandoffNotice } from './handoff';
import { SpecFilterBar } from './SpecFilterBar';
import { byStatusThenNewest, filterFromParams, filterSpecs } from './specFilter';
import { SpecRow } from './SpecRow';

/** The specification registry: browse specifications and open one for review and approval. */
export function SpecsPage() {
  const { t } = useTranslation('controltower');
  const repository = useRepository();
  const specs = useSpecs(repository.id);
  const data = specs.data;
  const handoff = useHandoffNotice();
  const [params, setParams] = useSearchParams();
  const filter = filterFromParams(params);

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>{t('specs.title')}</PanelTitle>
        {data && <StatusChip label={t('specs.count', { count: data.length })} kind="neutral" />}
      </PanelHeader>
      <PanelBody>
        {handoff !== null && (
          <StatusMessage role="status" variant="info">
            {t('specs.draftsCreated', { count: handoff })}
          </StatusMessage>
        )}
        <ControlTowerQuery
          query={specs}
          loadFailed={t('specs.loadFailed')}
          isEmpty={(rows) => rows.length === 0}
          empty={
            <EmptyState
              title={t('specs.empty')}
              action={
                <Link
                  className={buttonClass({ variant: 'secondary' })}
                  to={CONTROLTOWER_INTERVIEWS_PATH}
                >
                  {t('specs.emptyAction')}
                </Link>
              }
            />
          }
        >
          {(rows) => {
            const shown = byStatusThenNewest(filterSpecs(rows, filter));
            return (
              <>
                <SpecFilterBar
                  specs={rows}
                  filter={filter}
                  onChange={(next) =>
                    setParams(
                      (prev) => {
                        const params = new URLSearchParams(prev);
                        if (next.status) params.set('status', next.status);
                        else params.delete('status');
                        if (next.query) params.set('q', next.query);
                        else params.delete('q');
                        return params;
                      },
                      { replace: true },
                    )
                  }
                />
                {shown.length === 0 && <EmptyState title={t('specs.noMatches')} />}
                {shown.map((spec) => (
                  <SpecRow key={spec.id} spec={spec} />
                ))}
              </>
            );
          }}
        </ControlTowerQuery>
      </PanelBody>
    </Panel>
  );
}
